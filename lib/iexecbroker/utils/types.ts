export const TYPES: object =
{
	EIP712Domain: [
		{ name: "name",               type: "string"  },
		{ name: "version",            type: "string"  },
		{ name: "chainId",            type: "uint256" },
		{ name: "verifyingContract",  type: "address" },
	],
	RequestOrder: [
		{ name: "app",                type: "address" },
		{ name: "appmaxprice",        type: "uint256" },
		{ name: "dataset",            type: "address" },
		{ name: "datasetmaxprice",    type: "uint256" },
		{ name: "workerpool",         type: "address" },
		{ name: "workerpoolmaxprice", type: "uint256" },
		{ name: "requester",          type: "address" },
		{ name: "volume",             type: "uint256" },
		{ name: "tag",                type: "bytes32" },
		{ name: "category",           type: "uint256" },
		{ name: "trust",              type: "uint256" },
		{ name: "beneficiary",        type: "address" },
		{ name: "callback",           type: "address" },
		{ name: "params",             type: "string"  },
		{ name: "salt",               type: "bytes32" },
	],
}

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
		app:                String(order[0]),
		appmaxprice:        Number(order[1]),
		dataset:            String(order[2]),
		datasetmaxprice:    Number(order[3]),
		workerpool:         String(order[4]),
		workerpoolmaxprice: Number(order[5]),
		requester:          String(order[6]),
		volume:             Number(order[7]),
		tag:                String(order[8]),
		category:           Number(order[9]),
		trust:              Number(order[10]),
		beneficiary:        String(order[11]),
		callback:           String(order[12]),
		params:             String(order[13]),
		salt:               String(order[14]),
		sign:               String(order[15]),
	};
}
