import { ethers            } from 'ethers';
import { TypedDataUtils    } from 'eth-sig-util';
import { IexecOrderFetcher } from './iexecorderfetcher';
import * as utils            from './utils';
import * as types            from './utils/types';

const IexecInterface = require('/home/amxx/Work/iExec/code/PoCo-dev/build/contracts-min/IexecInterfaceToken.json');
const IERC1271       = require('/home/amxx/Work/iExec/code/PoCo-dev/build/contracts-min/IERC1271.json');

export default class Core extends IexecOrderFetcher
{
	contract: ethers.Contract;
	domain:   types.ERC712Domain;

	constructor(
		network: string,
		chainId: number,
		signer:  ethers.Signer,
		address: string = "core.v5.iexec.eth",
	)
	{
		super(network, chainId);
		this.contract = new ethers.Contract(address, IexecInterface.abi, signer);
	}

	async launch() : Promise<void>
	{
		this.domain = types.toERC712Domain(await this.contract.domain());

		console.log(`[ Starting event listener ]`);
		this.contract.on(
			this.contract.filters.BroadcastRequestOrder(),
			this.trigger.bind(this)
		);
		console.log(`[    Daemon is running    ]`);
	}

	async trigger(raw) : Promise<void>
	{
		let requestorder     = types.toRequestOrder(raw);
		let requestorderhash = this.hashRequestOrder(requestorder)

		try
		{
			console.log(`[${requestorderhash}] checking signature`)
			utils.require(
				(await this.checkPresignature(requestorder.requester, requestorderhash)) || (await this.checkSignatureWithERC1271(requestorder.requester, requestorderhash, requestorder.sign)),
				"invalid requestorder signature"
			);

			while (requestorder.volume > await this.contract.viewConsumed(requestorderhash))
			{
				console.log(`[${requestorderhash}] fetching compatible orders`)
				let apporder:        types.AppOrder        = await this.getCompatibleAppOrder(requestorder);
				let datasetorder:    types.DatasetOrder    = await this.getCompatibleDatasetOrder(requestorder);
				let workerpoolorder: types.WorkerpoolOrder = await this.getCompatibleWorkerpoolOrder(requestorder);

				console.log(`[${requestorderhash}] sending match to core`)
				await this.contract.matchOrders(apporder, datasetorder, workerpoolorder, requestorder);
			}
			console.log(`[${requestorderhash}] matching success`)
		}
		catch (e)
		{
			console.log(`[${requestorderhash}] ${e}`)
		}
	}

	hashRequestOrder(requestorder): string
	{
		return '0x'+TypedDataUtils.sign({
			types:       types.TYPES,
			primaryType: 'RequestOrder',
			domain:      this.domain,
			message:     requestorder,
		}).toString("hex");
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

	async checkSignatureWithERC1271(identity: string, hash: string, sign: string): Promise<boolean>
	{
		if (await this.checkSignature(identity, hash, sign))
		{
			return true;
		}
		else
		{
			return "0x20c13b0b" == await (new ethers.Contract(identity, IERC1271.abi, this.contract.provider)).isValidSignature(hash, sign);
		}
	}
}
