export default function(value: boolean, reason: string = "") : void
{
	if (!value){
	    console.log(reason)
	    throw Error(reason);
	}
}
