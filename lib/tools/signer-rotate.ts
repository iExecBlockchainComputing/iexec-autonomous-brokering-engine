import { ethers       } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';

export class SignerRotate extends ethers.Signer
{
	buffer: Array<ethers.Signer>;
	active: NonceManager;
	timer:  ReturnType<typeof setInterval>;

	constructor(provider: ethers.providers.Provider, frequency : number = null)
	{
		super();
		ethers.utils.defineReadOnly(this, "provider", provider || null);
		this.buffer   = new Array<ethers.Signer>();
		this.active   = null;
		frequency && this.start(frequency);
	}

	start(frequency : number = 300000)
	{
		if (!this.timer)
		{
			this.timer = setInterval(this.next.bind(this), frequency);
		}
	}

	stop()
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
		if (!this.active) this.next();
	}

	next() : Promise<ethers.Signer>
	{
		return new Promise((resolve, reject) => {
			if (this.buffer.length)
			{
				if (this.active)
				{
					this.buffer.push(this.active.signer);
				}
				this.active = (new NonceManager(this.buffer.shift())).connect(this.provider);
				this.active.getTransactionCount().then(() => resolve(this.active)).catch(reject);
				this.active.getAddress().then(address => console.log(`[SignerRotate] wallet ${address} is now active`));
			}
			else
			{
				resolve(this.active);
			}
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
