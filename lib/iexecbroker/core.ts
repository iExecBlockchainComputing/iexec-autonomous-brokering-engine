import { ethers            } from 'ethers';
import { NonceManager      } from '@ethersproject/experimental';
import { IexecOrderFetcher } from './iexec-order-fetcher';
import * as utils            from './utils';
import * as types            from './utils/types';

const IexecInterface = require('@iexec/poco/build/contracts-min/IexecInterfaceToken.json');
const IERC1654       = require('@iexec/poco/build/contracts-min/IERC1654.json');

export default class Core extends IexecOrderFetcher
{
	contract:        ethers.Contract;
	domain:          types.ERC712Domain;
	domainAsPromise: Promise<types.ERC712Domain>;

	constructor(
		signer:  ethers.Signer,
		address: string = 'core.v5.iexec.eth',
	)
	{
		super(signer.provider);
		this.contract = new ethers.Contract(address, IexecInterface.abi, signer);

		this.domainAsPromise = new Promise((resolve, reject) => {
			this.contract.domain()
			.then(domain => {
				this.domain = types.toERC712Domain(domain);
				resolve(this.domain);
			})
			.catch(reject);
		});
	}

	async ready() : Promise<void>
	{
		await super.ready();
		await this.contract.resolvedAddress;
		await this.domainAsPromise;
	}

	async listen() : Promise<void>
	{
		await this.ready()
		console.log(`[ Starting event listener ]`);
		this.contract.on(
			this.contract.filters.BroadcastRequestOrder(),
			this.trigger.bind(this)
		);
		console.log(`[    Daemon is running    ]`);
	}

	async tryMatch(requestorder: types.RequestOrder, requestorderhash: string) : Promise<types.DealDescriptor>
	{
		console.log(`[${requestorderhash}] INFO: tryMatch`);
		console.log(`[${requestorderhash}] INFO: fetching compatible orders`);
		const apporder:        types.AppOrder        = await this.getCompatibleAppOrder(requestorder);
		const datasetorder:    types.DatasetOrder    = await this.getCompatibleDatasetOrder(requestorder);
		const workerpoolorder: types.WorkerpoolOrder = await this.getCompatibleWorkerpoolOrder(requestorder);
		utils.require(Boolean(apporder),        'no compatible apporder found');
		utils.require(Boolean(datasetorder),    'no compatible datasetorder found');
		utils.require(Boolean(workerpoolorder), 'no compatible workerpoolorder found');

		console.log(`[${requestorderhash}] INFO: sending match to core`);
		const tx    = await (await this.contract.matchOrders(apporder, datasetorder, workerpoolorder, requestorder)).wait()
		const event = tx.events.filter(({ event }) => event == 'OrdersMatched').find(Boolean);
		const deal: types.DealDescriptor = {
			dealid: event.args.dealid,
			volume: event.args.volume.toNumber(),
			txHash: tx.transactionHash,
		};

		return deal;
	}

	async retryMatch(requestorder: types.RequestOrder, requestorderhash: string, count: number = 3) : Promise<types.DealDescriptor>
	{
		for (let i = 0; i < count; ++i)
		{
			try
			{
				return await this.tryMatch(requestorder, requestorderhash);
			}
			catch (err)
			{
				console.log(`[${requestorderhash}] WARNING: failed to match with ${err.toString()}`);
			}
			finally
			{
				await utils.sleep(1000);
			}
		}
		throw Error(`Failed to match order ${count} times`);
	}

	async trigger(raw) : Promise<{
		success: boolean,
		matchs:  types.DealDescriptor[],
		error:   string,
	}>
	{
		let matchs:           types.DealDescriptor[] = [];
		let error:            string                 = undefined;
		let requestorder:     types.RequestOrder     = types.toRequestOrder(raw);
		let requestorderhash: string                 = await this.iexec.order.hashRequestorder(requestorder);

		try
		{
			console.log(`[${requestorderhash}] INFO: checking signature`);
			// Check requester
			utils.require(
				requestorder.requester != ethers.constants.AddressZero,
				'missing requester'
			);
			// Check signature
			utils.require(
				(await this.checkPresignature(requestorder.requester, requestorderhash)) || (await this.checkSignatureWithDelegation(requestorder.requester, requestorderhash, requestorder.sign)),
				'invalid requestorder signature'
			);

			while (requestorder.volume > await this.contract.viewConsumed(requestorderhash))
			{
				const match: types.DealDescriptor = await this.retryMatch(requestorder, requestorderhash);
				console.log(`[${requestorderhash}] INFO: matching success`);
				matchs.push(match);
				await utils.sleep(1000);
			}
		}
		catch (err)
		{
			console.log(`[${requestorderhash}] ERROR: ${err}`)
			error = err.toString();
		}

		return {
			success: (error == undefined),
			matchs,
			error
		};
	}

    async tryMatchOrders(brokerOrder: types.BrokerOrder) : Promise<types.DealDescriptor>
    {
        let context: string = `[requester:${brokerOrder.requestorder.requester}, ` +
            `app:${brokerOrder.requestorder.app}, ` +
            `workerpool:${brokerOrder.requestorder.workerpool}, ` +
            `dataset:${brokerOrder.requestorder.dataset}]`

        console.log(`INFO: tryMatch ${context}`);

        let apporder:         types.AppOrder        = brokerOrder.apporder
        let workerpoolorder:  types.WorkerpoolOrder = brokerOrder.workerpoolorder
        let datasetorder:     types.DatasetOrder    = brokerOrder.datasetorder
        let requestorder:     types.RequestOrder    = brokerOrder.requestorder


        console.log(`INFO: sending match ${context}`);
        const tx    = await (await this.contract.matchOrders(apporder, datasetorder, workerpoolorder, requestorder)).wait()
        const event = tx.events.filter(({ event }) => event == 'OrdersMatched').find(Boolean);
        const deal: types.DealDescriptor = {
            dealid: event.args.dealid,
            volume: event.args.volume.toNumber(),
            txHash: tx.transactionHash,
        };

        return deal;
    }

    async matchOrders(raw) : Promise<{
        success: boolean,
        match:  types.DealDescriptor,
        error:   string,
    }>
    {
        let match:           types.DealDescriptor = undefined;;
        let error:           string                 = undefined;
        let brokerOrder:     types.BrokerOrder     = types.toBrokerOrder(raw);

        let context: string = `[requester:${brokerOrder.requestorder.requester}, ` +
            `app:${brokerOrder.requestorder.app}, ` +
            `workerpool:${brokerOrder.requestorder.workerpool}, ` +
            `dataset:${brokerOrder.requestorder.dataset}]`

        try
        {
            console.log(`Received ${context}`);
            match = await this.tryMatchOrders(brokerOrder);
            console.log(`INFO: matching success with deal ID:${match.dealid} ${context}`);

        }
        catch (err)
        {
            console.log(`ERROR: ${err} ${context}`)
            error = err.toString();
        }

        return {
            success: (error == undefined),
            match,
            error
        };
    }

	async checkPresignature(identity: string, hash: string): Promise<boolean>
	{
		return identity == await this.contract.viewPresigned(hash);
	}

	async checkSignature(identity: string, hash: string, sign: string) : Promise<boolean>
	{
		try
		{
			return identity == ethers.utils.recoverAddress(hash, sign);
		}
		catch
		{
			return false;
		}
	}

	async checkSignatureWithDelegation(identity: string, hash: string, sign: string): Promise<boolean>
	{
		if (await this.checkSignature(identity, hash, sign))
		{
			return true;
		}
		try
		{
			let identityContract: ethers.Contract = new ethers.Contract(identity, IERC1654.abi, this.contract.provider);
			return identityContract.interface.getSighash('isValidSignature(bytes32,bytes)') == await identityContract.isValidSignature(hash, sign);
		}
		catch
		{
			return false;
		}
	}
}
