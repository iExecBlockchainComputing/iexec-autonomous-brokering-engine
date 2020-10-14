import { ethers            } from 'ethers';
import { IexecOrderFetcher } from './iexecorderfetcher';
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
		super(signer);
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
		await this.iexecAsPromise;
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

	async trigger(raw) : Promise<{
		success: boolean,
		matchs:  types.DealDescriptor[],
		error:   string,
	}>
	{
		let matchs: types.DealDescriptor[] = [];
		let error:  string                 = undefined;

		let requestorder     = types.toRequestOrder(raw);
		let requestorderhash = await this.iexec.order.hashRequestorder(requestorder);
		try
		{
			console.log(`[${requestorderhash}] checking signature`);

			utils.require(
				requestorder.requester != ethers.constants.AddressZero,
				'missing requester'
			);

			utils.require(
				(await this.checkPresignature(requestorder.requester, requestorderhash)) || (await this.checkSignatureWithDelegation(requestorder.requester, requestorderhash, requestorder.sign)),
				'invalid requestorder signature'
			);

			while (requestorder.volume > await this.contract.viewConsumed(requestorderhash))
			{
				console.log(`[${requestorderhash}] fetching compatible orders`);
				let apporder:        types.AppOrder        = await this.getCompatibleAppOrder(requestorder);
				let datasetorder:    types.DatasetOrder    = await this.getCompatibleDatasetOrder(requestorder);
				let workerpoolorder: types.WorkerpoolOrder = await this.getCompatibleWorkerpoolOrder(requestorder);

				utils.require(Boolean(apporder),        'no compatible apporder found');
				utils.require(Boolean(datasetorder),    'no compatible datasetorder found');
				utils.require(Boolean(workerpoolorder), 'no compatible workerpoolorder found');

				console.log(`[${requestorderhash}] sending match to core`);
				let match: types.DealDescriptor = await this.iexec.order.matchOrders({
					apporder,
					datasetorder,
					workerpoolorder,
					requestorder,
				},{
					checkRequest: false,
				});
				matchs.push(match);
			}
			console.log(`[${requestorderhash}] matching success`);

			await utils.sleep(1000);
		}
		catch (err)
		{
			console.log(`[${requestorderhash}] ${err}`)
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
