import {readFileSync} from 'node:fs';
import {JsonRpcProvider,Contract,ZeroAddress,isAddress} from 'ethers';
const config=JSON.parse(readFileSync('public/config.json','utf8'));
if(!isAddress(config.pool||'')||!isAddress(config.token||'')){console.error('NOT CONFIGURED: open http://localhost:3000/operator.html, deploy an ETH pool, download config.json and copy it to public/config.json.');process.exit(1)}
const provider=new JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc',421614,{staticNetwork:true});
try{
 const chain=BigInt(await provider.send('eth_chainId',[]));if(chain!==421614n)throw Error('Wrong chain');
 if(await provider.getCode(config.pool)==='0x')throw Error('No contract at configured address');
 const abi=JSON.parse(readFileSync('public/artifacts/ReviewPool.json')).abi,pool=new Contract(config.pool,abi,provider);
 if((await pool.token()).toLowerCase()!==config.token.toLowerCase())throw Error('Configured token does not match contract');
 if(await pool.RESOLUTION_WINDOW()!==604800n)throw Error('Unexpected resolution window');
 const latest=await provider.getBlockNumber();if(!Number.isSafeInteger(config.startBlock)||config.startBlock<0||config.startBlock>latest)throw Error('Invalid deployment block');
 const asset=config.token===ZeroAddress?'ETH':await new Contract(config.token,['function symbol() view returns(string)'],provider).symbol();
 console.log('PASS Chain: Arbitrum Sepolia (421614)');console.log('PASS Reward contract exists and responds');console.log('PASS Configured reward asset: '+asset);console.log('PASS Resolution window: 7 days');console.log('Explorer: https://sepolia.arbiscan.io/address/'+config.pool);console.log('This checks configuration, not source verification or a completed payment.');
}catch(e){console.error('FAIL:',e.shortMessage||e.message);process.exitCode=1}finally{provider.destroy()}
