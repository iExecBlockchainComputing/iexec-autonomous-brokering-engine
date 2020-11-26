import { ethers       } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { MultiSigner  } from './multi-signer';

export class SignerRotateDistribute implements MultiSigner
{
	readonly provider: ethers.providers.Provider;
	index:             number;
	target:            number;
	signers:           Map<string, NonceManager>;
	waiting:           Array<string>;
	active:            Array<string>;
	activeAsPromise:   Promise<Array<string>>;
	timer:             ReturnType<typeof setInterval>;

	constructor(
		provider:  ethers.providers.Provider,
		target:    number = 1,
		frequency: number = null,
	)
	{
		this.provider        = provider;
		this.index           = 0;
		this.target          = target;
		this.signers         = new Map<string, NonceManager>();
		this.waiting         = new Array<string>();
		this.active          = new Array<string>();
		this.activeAsPromise = Promise.resolve(this.active);
		frequency && this.start(frequency);
	}

	start(frequency : number = 300000) : Promise<void>
	{
		return new Promise((resolve, reject) => {
			if (!this.timer)
			{
				this.step()
				.then(() => {
					this.timer = setInterval(this.step.bind(this), frequency);
					resolve();
				})
				.catch(reject);
			}
			else
			{
				resolve();
			}
		});
	}

	stop() : void
	{
		if (this.timer)
		{
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	current() : NonceManager
	{
		return this.signers.get(this.active[++this.index % this.active.length]);
	}

	addSigner(signer: ethers.Signer) : Promise<void>
	{
		return new Promise((resolve, reject) => {
			const nmsigner : NonceManager = (new NonceManager(signer)).connect(this.provider);
			nmsigner.getAddress().then(address => {
				console.log(`[SignerRotate] wallet ${address} added to the signers`);
				this.signers.set(address, nmsigner);
				Promise.resolve(this.activeAsPromise).then(active => {
					this.waiting.push(address);
					if (active.length < this.target)
					{
						this.step().then(resolve).catch(reject);
					}
					else
					{
						resolve();
					}
				});
			});
		});
	}

	step() : Promise<void>
	{
		return new Promise((resolve, reject) => {
			Promise.resolve(this.activeAsPromise).then(_active => {
				const active = Array.from(_active);
				this.activeAsPromise = new Promise(publish => {
					if (this.waiting.length)
					{
						if (active.length == this.target) this.waiting.push(active.shift());
						const address  = this.waiting.shift();
						const nmsigner = this.signers.get(address);
						nmsigner.signer.getTransactionCount("pending").then(count => {
							nmsigner.setTransactionCount(count);
							console.log(`[SignerRotate] wallet ${address} refreshed and enabled`);
							active.push(address);
							this.active = active;
							publish(this.active);
							resolve();
						});
					}
					else
					{
						publish(this.active);
						resolve();
					}
				});
			});
		});
	}
}

// (async () => {
//
// 	let entry = new SignerRotateDistribute(ethers.getDefaultProvider('https://rpcgoerli1w7wagudqhtw5khzsdtv.iex.ec'), 3);
// 	await entry.addSigner(ethers.Wallet.createRandom());
// 	await entry.addSigner(ethers.Wallet.createRandom());
// 	await entry.addSigner(ethers.Wallet.createRandom());
// 	await entry.addSigner(ethers.Wallet.createRandom());
// 	await entry.addSigner(ethers.Wallet.createRandom());
// 	await entry.addSigner(ethers.Wallet.createRandom());
//
// 	entry.start(1000);
// 	const i = setInterval(() => {
// 		console.log(entry.active, entry.waiting);
// 		console.log((entry.current().signer as ethers.Wallet).address)
// 		console.log((entry.current().signer as ethers.Wallet).address)
// 		console.log((entry.current().signer as ethers.Wallet).address)
// 		console.log((entry.current().signer as ethers.Wallet).address)
// 		console.log((entry.current().signer as ethers.Wallet).address)
// 	}, 1010);
//
// 	setTimeout(() => {
// 		entry.stop();
// 		clearTimeout(i)
// 	}, 10000);
//
// })().catch(console.error);
