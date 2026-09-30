import {readFileSync,writeFileSync,existsSync,mkdirSync,renameSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
import {JsonRpcProvider,Wallet,ContractFactory,Contract,ZeroAddress,formatEther,keccak256,getCreateAddress} from 'ethers';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const provider=new JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc',421614,{staticNetwork:true});
const configPath=resolve(root,'public/config.json'),journalPath=resolve(root,'deployments/sepolia-pending.json');
const artifact=JSON.parse(readFileSync(resolve(root,'public/artifacts/ReviewPool.json')));
function save(path,value){mkdirSync(dirname(path),{recursive:true});writeFileSync(path+'.tmp',JSON.stringify(value,null,2)+'\n');renameSync(path+'.tmp',path)}
function secret(){return new Promise((done,reject)=>{const input=process.stdin;if(!input.isTTY)return reject(Error('Run in an interactive terminal.'));let value='';process.stdout.write('Test-wallet private key (hidden, kept in memory only): ');input.setRawMode(true);input.resume();const finish=()=>{input.setRawMode(false);input.pause();input.off('data',onData);process.stdout.write('\n')};const onData=chunk=>{for(const char of chunk.toString()){if(char==='\u0003'){finish();reject(Error('Cancelled'));return}if(char==='\r'||char==='\n'){finish();done(value.trim());return}if(char==='\u007f'||char==='\b')value=value.slice(0,-1);else if(char>=' ')value+=char}};input.on('data',onData)})}
async function complete(hash,expected){const receipt=await provider.waitForTransaction(hash,1,120000);if(!receipt)throw Error('Confirmation timed out. Run this command again to check the saved transaction; do not redeploy.');if(receipt.status!==1)throw Error('Deployment reverted. Inspect its explorer record before removing deployments/sepolia-pending.json.');if(!receipt.contractAddress||receipt.contractAddress.toLowerCase()!==expected.toLowerCase())throw Error('Unexpected deployment address');const pool=new Contract(expected,artifact.abi,provider);if(await pool.token()!==ZeroAddress)throw Error('Unexpected reward asset');save(configPath,{pool:expected,token:ZeroAddress,symbol:'ETH',startBlock:receipt.blockNumber});save(resolve(root,'deployments/arbitrum-sepolia.json'),{chainId:421614,address:expected,transactionHash:hash,blockNumber:receipt.blockNumber,asset:ZeroAddress});console.log('Deployed and configured:',expected);console.log('Transaction: https://sepolia.arbiscan.io/tx/'+hash);console.log('Next: node scripts/check-deployment.mjs');}
try{
 if(BigInt(await provider.send('eth_chainId',[]))!==421614n)throw Error('Wrong chain; refusing deployment.');
 const existing=existsSync(configPath)?JSON.parse(readFileSync(configPath)):{};
 if(existing.pool){console.log('A contract is already configured:',existing.pool);console.log('Run node scripts/check-deployment.mjs. No new deployment was sent.');}
 else if(existsSync(journalPath)){const prior=JSON.parse(readFileSync(journalPath));console.log('Checking previous deployment:',prior.hash);await complete(prior.hash,prior.address);}
 else{
 console.log('One-time Parry ETH reward-contract deployment on Arbitrum Sepolia.');console.log('Use a dedicated test wallet. Never paste your key into chat or a shell command.');
 let key=await secret();if(!/^(0x)?[a-fA-F0-9]{64}$/.test(key))throw Error('Invalid private-key format');let wallet;try{wallet=new Wallet(key.startsWith('0x')?key:'0x'+key,provider)}catch{throw Error('Invalid test-wallet private key')}finally{key=''}
 console.log('Deployer:',wallet.address);console.log('Balance:',formatEther(await provider.getBalance(wallet.address)),'test ETH');
 const factory=new ContractFactory(artifact.abi,artifact.bytecode,wallet);const request=await factory.getDeployTransaction(ZeroAddress);const gas=await provider.estimateGas({...request,from:wallet.address});const fees=await provider.getFeeData();const price=fees.maxFeePerGas??fees.gasPrice;if(!price)throw Error('Gas pricing unavailable');const gasLimit=gas*120n/100n;console.log('Estimated maximum gas cost with buffer:',formatEther(gasLimit*price),'ETH');
 if(await provider.getBalance(wallet.address)<gasLimit*price)throw Error('Insufficient test ETH for deployment');
 const rl=createInterface({input:process.stdin,output:process.stdout});const answer=await rl.question('Type DEPLOY to send this deployment: ');rl.close();if(answer!=='DEPLOY')throw Error('Cancelled');
 const populated=await wallet.populateTransaction({...request,gasLimit});const signed=await wallet.signTransaction(populated);const hash=keccak256(signed),address=getCreateAddress({from:wallet.address,nonce:populated.nonce});save(journalPath,{hash,address,chainId:421614});
 console.log('Deployment transaction: https://sepolia.arbiscan.io/tx/'+hash);
 await provider.broadcastTransaction(signed);await complete(hash,address);
 }
}catch(e){console.error(e.shortMessage||e.message||'Deployment failed.');process.exitCode=1}finally{provider.destroy()}
