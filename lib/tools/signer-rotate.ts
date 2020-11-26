import { ethers       } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';

export class SignerRotate extends ethers.Signer
{
	buffer:          Array<ethers.Signer>;
	active:          NonceManager;
	activeAsPromise: Promise<NonceManager>;
	timer:           ReturnType<typeof setInterval>;

	constructor(provider: ethers.providers.Provider, frequency : number = null)
	{
		super();
		ethers.utils.defineReadOnly(this, "provider", provider || null);
		this.buffer = new Array<ethers.Signer>();
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

	addSigner(signer: ethers.Signer) : void
	{
		this.buffer.push(signer);
		signer.getAddress().then(address => console.log(`[SignerRotate] wallet ${address} added to the queue`));
	}

	step() : Promise<void>
	{
		return new Promise((resolve, reject) => {
			Promise.resolve(this.activeAsPromise)
			.then(previous => {
				if (this.buffer.length)
				{
					this.activeAsPromise = new Promise((publish) => {
						if (previous) this.buffer.push(previous.signer);
						const signer : ethers.Signer = this.buffer.shift();
						const next   : NonceManager  = (new NonceManager(signer)).connect(this.provider);
						next.getTransactionCount()
						.then(count => {
							next.getAddress().then(address => console.log(`[SignerRotate] wallet ${address} is now active`));
							this.active = next;
							publish(next);
							resolve();
						})
						.catch(reject);
					});
				}
			})
			.catch(reject);
		});
	}

	current() : ethers.Signer
	{
		return this.active;
	}

	connect(provider: ethers.providers.Provider): NonceManager {
		return this.active.connect(provider);
	}

	getAddress(): Promise<string> {
		return this.active.getAddress();
	}

	getTransactionCount(blockTag?: ethers.providers.BlockTag): Promise<number> {
		return this.active.getTransactionCount(blockTag);
	}

	signMessage(message: ethers.Bytes | string): Promise<string> {
		return this.active.signMessage(message);
	}

	signTransaction(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<string> {
		return this.active.signTransaction(transaction);
	}

	sendTransaction(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<ethers.providers.TransactionResponse> {
		return this.active.sendTransaction(transaction);
	}
}
