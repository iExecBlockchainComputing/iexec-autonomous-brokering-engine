import { ethers       } from 'ethers';
import { IExec, utils } from 'iexec';
import * as types       from './utils/types';

export class WithIexec
{
	iexec: IExec;

	constructor(ethProvider: string, chainId: number)
	{
		this.iexec = new IExec({ ethProvider, chainId });
	}

	async getCompatibleAppOrder(requestorder: types.RequestOrder): Promise<types.AppOrder>
	{
		return (await this.iexec.orderbook.fetchAppOrderbook(
			requestorder.app,
			{
				dataset:    requestorder.dataset,
				workerpool: requestorder.workerpool,
				requester:  requestorder.requester,
			}
		))
		.appOrders
		.map(({ order }) => order)
		.filter(({ appprice }) => appprice <= requestorder.appmaxprice)[0];
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
			return (await this.iexec.orderbook.fetchDatasetOrderbook(
				requestorder.dataset,
				{
					app:        requestorder.app,
					workerpool: requestorder.workerpool,
					requester:  requestorder.requester,
				}
			))
			.datasetOrders
			.map(({ order }) => order)
			.filter(({ datasetprice }) => datasetprice <= requestorder.datasetmaxprice)[0];
		}
	}

	async getCompatibleWorkerpoolOrder(requestorder: types.RequestOrder): Promise<types.WorkerpoolOrder>
	{
		return (await this.iexec.orderbook.fetchWorkerpoolOrderbook(
			requestorder.category,
			{
				workerpoolAddress: requestorder.workerpool != ethers.constants.AddressZero ? requestorder.workerpool : null,
				minTrust:          requestorder.trust,
				// minTag:            requestorder.workerpool, // TODO
			}
		)).workerpoolOrders
		.map(({ order }) => order)
		.filter(({ workerpoolprice }) => workerpoolprice <= requestorder.workerpoolmaxprice)[0];
	}
}
