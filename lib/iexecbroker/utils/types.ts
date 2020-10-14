export interface ERC712Domain
{
	name:              string;
	version:           string;
	chainId:           number;
	verifyingContract: string;
}

export interface AppOrder
{
	app:                string; // address;
	appprice:           number; // uint256;
	volume:             number; // uint256;
	tag:                string; // bytes32;
	datasetrestrict:    string; // address;
	workerpoolrestrict: string; // address;
	requesterrestrict:  string; // address;
	salt:               string; // bytes32;
	sign:               string; // bytes;
}

export interface DatasetOrder
{
	dataset:            string; // address;
	datasetprice:       number; // uint256;
	volume:             number; // uint256;
	tag:                string; // bytes32;
	apprestrict:        string; // address;
	workerpoolrestrict: string; // address;
	requesterrestrict:  string; // address;
	salt:               string; // bytes32;
	sign:               string; // bytes;
}

export interface WorkerpoolOrder
{
	workerpool:         string; // address;
	workerpoolprice:    number; // uint256;
	volume:             number; // uint256;
	tag:                string; // bytes32;
	category:           number; // uint256;
	trust:              number; // uint256;
	apprestrict:        string; // address;
	datasetrestrict:    string; // address;
	requesterrestrict:  string; // address;
	salt:               string; // bytes32;
	sign:               string; // bytes;
}

export interface RequestOrder
{
	app:                string; // address;
	appmaxprice:        number; // uint256;
	dataset:            string; // address;
	datasetmaxprice:    number; // uint256;
	workerpool:         string; // address;
	workerpoolmaxprice: number; // uint256;
	requester:          string; // address;
	volume:             number; // uint256;
	tag:                string; // bytes32;
	category:           number; // uint256;
	trust:              number; // uint256;
	beneficiary:        string; // address;
	callback:           string; // address;
	params:             string; // string;
	salt:               string; // bytes32;
	sign:               string; // bytes;
}

export interface DealDescriptor
{
	dealid: string;
	volume: string;
	txHash: string;
}

export function toERC712Domain(domain : any) : ERC712Domain
{
	return {
		name:              String(domain.name),
		version:           String(domain.version),
		chainId:           Number(domain.chainId),
		verifyingContract: String(domain.verifyingContract),
	};
}

export function toRequestOrder(order: any) : RequestOrder
{
	return {
		app:                String(order.app),
		appmaxprice:        Number(order.appmaxprice),
		dataset:            String(order.dataset),
		datasetmaxprice:    Number(order.datasetmaxprice),
		workerpool:         String(order.workerpool),
		workerpoolmaxprice: Number(order.workerpoolmaxprice),
		requester:          String(order.requester),
		volume:             Number(order.volume),
		tag:                String(order.tag),
		category:           Number(order.category),
		trust:              Number(order.trust),
		beneficiary:        String(order.beneficiary),
		callback:           String(order.callback),
		params:             String(order.params),
		salt:               String(order.salt),
		sign:               String(order.sign),
	};
}
