import express         from 'express';
import bodyParser      from 'body-parser';
import { ethers      } from 'ethers';
import { utils       } from 'iexec';
import { iExecBroker } from './iexecbroker';



// ------------[ Configuration - Begin ]------------
const network:    string = process.env.CHAIN || "goerli";
const address:    string = process.env.PROXY || "core.v5.iexec.eth";
const privatekey: string = process.env.MNEMONIC;
// ------------[  Configuration - End  ]------------



(async () => {
	let wallet:  ethers.Signer = utils.getSignerFromPrivateKey(network, privatekey);
	let service: iExecBroker   = new iExecBroker(wallet, address);

	/**
	 * blockchain listener
	 */
	process.env.LISTEN && service.listen();

	/**
	 * HTTP endpoint
	 */
	const app = express();
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	// configure route
	app.route('/submit')
	.post(async (req, res) => {
		try
		{
			service.trigger(req.body)
			.then(result => res.json(result))
			.catch(error => res.json({ error: error.toString() }));
		}
		catch (error)
		{
			res.json({ error: error.message });
		}
	});
	// start when service is ready
	service.ready().then(() => {
		process.env.PORT && app.listen(process.env.PORT);
	});

})().catch(console.error);
