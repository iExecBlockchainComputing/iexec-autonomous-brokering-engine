import { ethers } from 'ethers';
import { utils  } from 'iexec';
const IexecInterface = require('/home/amxx/Work/iExec/code/PoCo-dev/build/contracts-min/IexecInterfaceToken.json');



// ------------[ Configuration - Begin ]------------
const network:    string = process.env.CHAIN || "goerli";
const address:    string = process.env.PROXY || "core.v5.iexec.eth";
const privatekey: string = process.env.MNEMONIC;
// ------------[  Configuration - End  ]------------



(async () => {
	let wallet:   ethers.Wallet   = utils.getSignerFromPrivateKey(network, privatekey);
	let contract: ethers.Contract = new ethers.Contract(address, IexecInterface.abi, wallet);

	let ro = {
		app:                "0x18De0518FEa922D376596b1Ad2a1f62F3981BE35",
		appmaxprice:        0,
		dataset:            ethers.constants.AddressZero,
		datasetmaxprice:    0,
		workerpool:         ethers.constants.AddressZero,
		workerpoolmaxprice: 20,
		requester:          wallet.address,
		volume:             1,
		tag:                ethers.constants.HashZero,
		category:           0,
		trust:              0,
		beneficiary:        ethers.constants.AddressZero,
		callback:           ethers.constants.AddressZero,
		params:             "autonomous brokering engine tester",
		salt:               ethers.utils.hexlify(ethers.utils.randomBytes(32)),
		sign:               "0x",
	}

	console.log(JSON.stringify(ro))

	await (await contract.manageRequestOrder({ order: ro, operation: 0, sign: "0x" })).wait();

	if (process.env.BROADCAST)
	{
		await (await contract.broadcastRequestOrder(ro)).wait();
	}
})().catch(console.error);
