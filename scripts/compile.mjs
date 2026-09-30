import solc from 'solc';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const input={language:'Solidity',sources:{'ReviewPool.sol':{content:readFileSync('contracts/ReviewPool.sol','utf8')}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'paris',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}};
const output=JSON.parse(solc.compile(JSON.stringify(input),{import:p=>{try{return {contents:readFileSync('node_modules/'+p,'utf8')}}catch{return {error:'Missing import '+p}}}}));
for(const e of output.errors||[])if(e.severity==='error')throw Error(e.formattedMessage);
mkdirSync('public/artifacts',{recursive:true});
for(const name of ['ReviewPool','ReviewToken']){const c=output.contracts['ReviewPool.sol'][name];writeFileSync(`public/artifacts/${name}.json`,JSON.stringify({abi:c.abi,bytecode:'0x'+c.evm.bytecode.object}));}
console.log('Compiled ReviewPool and ReviewToken');
