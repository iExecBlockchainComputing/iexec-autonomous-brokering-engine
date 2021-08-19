import { ethers       } from 'ethers';
import { IExec, utils } from 'iexec';
import * as types       from './utils/types';

const randomChoice = items => items[items.length * Math.random() | 0];

const chain:       string        = process.env.CHAIN || 'goerli';
const address:     string        = process.env.PROXY || 'core.v5.iexec.eth';

export class IexecOrderFetcher
{
	iexec:          IExec;
	iexecAsPromise: Promise<IExec>

	constructor(provider: ethers.providers.Provider, privatekey: string = ethers.utils.hexlify(ethers.utils.randomBytes(32)))
	{
		this.iexecAsPromise = new Promise((resolve, reject) => {
			provider.getNetwork()
			.then(({ name, chainId }) => {
				this.iexec = new IExec({
					ethProvider: utils.getSignerFromPrivateKey(chain, privatekey),
					chainId,
				},
				{ hubAddress: address });
				resolve(this.iexec);
			})
			.catch(reject);
		});
	}

	async ready() : Promise<void>
	{
		await this.iexecAsPromise;
	}

	async getCompatibleAppOrder(requestorder: types.RequestOrder): Promise<types.AppOrder>
	{
		return randomChoice(
			(await this.iexec.orderbook.fetchAppOrderbook(
				requestorder.app,
				{
					dataset:    requestorder.dataset,
					workerpool: requestorder.workerpool,
					requester:  requestorder.requester,
				}
			))
			.appOrders
			.map(({ order }) => order)
			.filter(({ appprice }) => appprice <= requestorder.appmaxprice)
		);
	}

	async getCompatibleDatasetOrder(requestorder: types.RequestOrder): Promise<types.DatasetOrder>
	{
		if (requestorder.dataset == ethers.constants.AddressZero)
		{
			return {
				dataset:            ethers.constants.AddressZero,
				datasetprice:       0,
				volume:             0,
				tag:                ethers.constants.HashZero,
				apprestrict:        ethers.constants.AddressZero,
				workerpoolrestrict: ethers.constants.AddressZero,
				requesterrestrict:  ethers.constants.AddressZero,
				salt:               ethers.constants.HashZero,
				sign:               "0x",
			};
		}
		else
		{
			return randomChoice(
				(await this.iexec.orderbook.fetchDatasetOrderbook(
					requestorder.dataset,
					{
						app:        requestorder.app,
						workerpool: requestorder.workerpool,
						requester:  requestorder.requester,
					}
				))
				.datasetOrders
				.map(({ order }) => order)
				.filter(({ datasetprice }) => datasetprice <= requestorder.datasetmaxprice)
			);
		}
	}

	async getCompatibleWorkerpoolOrder(requestorder: types.RequestOrder): Promise<types.WorkerpoolOrder>
	{
		return randomChoice(
			(await this.iexec.orderbook.fetchWorkerpoolOrderbook(
				{
					workerpool:	requestorder.workerpool != ethers.constants.AddressZero ? requestorder.workerpool : null,
					minTrust:   requestorder.trust,
					category:   requestorder.category
					// minTag:            requestorder.workerpool, // TODO
				}
			)).workerpoolOrders
			.map(({ order }) => order)
			.filter(({ workerpoolprice }) => workerpoolprice <= requestorder.workerpoolmaxprice)
		);
	}
}
