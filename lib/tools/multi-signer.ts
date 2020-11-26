import { ethers } from 'ethers';

export interface MultiSigner {
	provider: ethers.providers.Provider;
	current:  () => ethers.Signer;
}
