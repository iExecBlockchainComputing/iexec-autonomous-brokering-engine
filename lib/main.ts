import express          from 'express';
import cors             from 'cors';
import bodyParser       from 'body-parser';
import { ethers       } from 'ethers';
import { iExecBroker  } from './iexecbroker';
import { SignerRotate } from './tools/signer-rotate';



// ------------[ Configuration - Begin ]------------
const chain:       string        = process.env.CHAIN || 'goerli';
const address:     string        = process.env.PROXY || 'core.v5.iexec.eth';
const privatekeys: Array<string> = process.env.MNEMONIC.split(';');
// ------------[  Configuration - End  ]------------



(async () => {
	const signer: SignerRotate = new SignerRotate(ethers.getDefaultProvider(chain));
	privatekeys.forEach(pk => signer.addSigner(new ethers.Wallet(pk)));
	await signer.start(300000); // every 5 mins

	const service: iExecBroker = new iExecBroker(signer, address);

	/**
	 * blockchain listener
	 */
	process.env.LISTEN && service.listen();

	/**
	 * HTTP endpoint
	 */
	const app = express();
	app.use(cors());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	// configure route
	app.route('/')
	.get(async (req, res) => {
		res.send('ready');
	});
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
		console.log('[SERVICE] ready');
		process.env.PORT && console.log(`[SERVICE] listening on port ${process.env.PORT}`);
		process.env.PORT && app.listen(process.env.PORT);
	});

})().catch(console.error);
