import { ethers            } from 'ethers';
import { NonceManager      } from '@ethersproject/experimental';
import { IexecOrderFetcher } from './iexec-order-fetcher';
import { MultiSigner       } from '../tools/multi-signer';
import * as utils            from './utils';
import * as types            from './utils/types';

const IexecInterface = require('@iexec/poco/build/contracts-min/IexecInterfaceToken.json');
const IERC1654       = require('@iexec/poco/build/contracts-min/IERC1654.json');

export default class Core extends IexecOrderFetcher
{
	signer:          ethers.Signer | MultiSigner;
	contract:        ethers.Contract;
	domain:          types.ERC712Domain;
	domainAsPromise: Promise<types.ERC712Domain>;

	constructor(
		signer:  ethers.Signer | MultiSigner,
		address: string = 'core.v5.iexec.eth',
	)
	{
		super(signer.provider);
		this.signer   = signer;
		this.contract = new ethers.Contract(address, IexecInterface.abi, signer.provider);

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

		const signer      : ethers.Signer = this.signer as ethers.Signer;
		const multisigner : MultiSigner   = this.signer as MultiSigner;
		const wallet      : ethers.Signer = multisigner.current ? multisigner.current() : signer;

		console.log(`[${requestorderhash}] INFO: sending match to core (wallet: ${await wallet.getAddress()})`);
		const tx    = await (await this.contract.connect(wallet).matchOrders(apporder, datasetorder, workerpoolorder, requestorder)).wait()
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
