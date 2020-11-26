import { ethers       } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';

export class SignerRotateDistribute extends ethers.Signer
{
	index:           number;
	target:          number;
	buffer:          Array<ethers.Signer>;
	active:          Array<NonceManager>;
	activeAsPromise: Promise<Array<NonceManager>>;
	timer:           ReturnType<typeof setInterval>;

	constructor(
		provider:  ethers.providers.Provider,
		target:    number = 1,
		frequency: number = null,
	)
	{
		super();
		ethers.utils.defineReadOnly(this, "provider", provider || null);
		this.index           = 0;
		this.target          = target;
		this.buffer          = new Array<ethers.Signer>();
		this.active          = new Array<NonceManager>();
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
		return this.active[++this.index % this.active.length];
	}

	addSigner(signer: ethers.Signer) : Promise<void>
	{
		return new Promise((resolve, reject) => {
			this.buffer.push(signer);
			signer.getAddress().then(address => console.log(`[SignerRotate] wallet ${address} added to the queue`));
			Promise.resolve(this.activeAsPromise)
			.then(active => {
				if (active.length < this.target)
				{
					this.step().then(resolve).catch(reject);
				}
				else
				{
					resolve();
				}
			}).catch(reject);
		});
	}

	step() : Promise<void>
	{
		return new Promise((resolve, reject) => {
			Promise.resolve(this.activeAsPromise)
			.then(_active => {
				const active = Array.from(_active);
				this.activeAsPromise = new Promise((publish) => {
					if (this.buffer.length)
					{
						if (active.length == this.target) this.buffer.push(active.shift().signer);
						const signer : ethers.Signer = this.buffer.shift();
						const next   : NonceManager  = (new NonceManager(signer)).connect(this.provider);
						next.getTransactionCount().then(count => {
							next.getAddress().then(address => console.log(`[SignerRotate] wallet ${address} is now active`));
							active.push(next);
							this.active = active;
							publish(active);
							resolve();
						});
					}
					else
					{
						publish(active);
						resolve()
					}
				});
			}).catch(reject);
		});
	}

	connect(provider: ethers.providers.Provider): NonceManager {
		return this.current().connect(provider);
	}

	getAddress(): Promise<string> {
		return this.current().getAddress();
	}

	signMessage(message: ethers.Bytes | string): Promise<string> {
		return this.current().signMessage(message);
	}

	signTransaction(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<string> {
		return this.current().signTransaction(transaction);
	}
}
