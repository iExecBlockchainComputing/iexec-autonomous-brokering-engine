import { ethers      } from 'ethers';
import { iExecBroker } from './iexecbroker';

(async () => {

	let network:     string        = "goerli";
	let chainId:     number        = 5;
	let address:     string        = "clerk.v3.iexec.eth";
	let private_key: string        = process.env.MNEMONIC;
	let wallet:      ethers.Wallet = new ethers.Wallet(private_key, ethers.getDefaultProvider(network));

	(new iExecBroker(network, chainId, wallet, address)).launch();

})().catch(console.error);
