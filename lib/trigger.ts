import { ethers } from 'ethers';

const IexecClerk = require('../node_modules/@iexec/interface/build/contracts/IexecClerkInterface.json');

(async () => {

	let network:     string          = "goerli";
	let address:     string          = "clerk.v3.iexec.eth";
	let private_key: string          = process.env.MNEMONIC;
	let wallet:      ethers.Wallet   = new ethers.Wallet(private_key, ethers.getDefaultProvider(network));
	let contract:    ethers.Contract = new ethers.Contract(address, IexecClerk.abi, wallet)

	let ro = {
		app:                "0xf0120Bb2b49A41017bFB3B08C6BBbEc1e7711DBc",
		appmaxprice:        0,
		dataset:            ethers.constants.AddressZero,
		datasetmaxprice:    0,
		workerpool:         ethers.constants.AddressZero,
		workerpoolmaxprice: 20,
		requester:          wallet.address,
		volume:             1,
		tag:                ethers.constants.HashZero,
		category:           2,
		trust:              0,
		beneficiary:        ethers.constants.AddressZero,
		callback:           ethers.constants.AddressZero,
		params:             "fac0",
		salt:               ethers.utils.hexlify(ethers.utils.randomBytes(32)),
		sign:               "0x",
	}
	await contract.signRequestOrder(ro);
	await contract.broadcastRequestOrder(ro);

})().catch(console.error);
