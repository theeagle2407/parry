import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Contract,JsonRpcProvider,keccak256,toUtf8Bytes,isAddress,parseUnits,FetchRequest} from 'ethers';
const hash=x=>keccak256(toUtf8Bytes(x));
const abi=['function pools(bytes32) view returns(address creator,uint256 amount,uint64 deadline,bool resolved,bytes32 briefHash)','function submissions(bytes32,address) view returns(bytes32)','function token() view returns(address)'];
export function createStore(directory,verify){
 let queue=Promise.resolve();
 const file=resolve(directory,'records.json');
 async function read(){try{return JSON.parse(await readFile(file,'utf8'))}catch(e){if(e.code==='ENOENT')return {studies:[],reviews:[]};throw e}}
 async function put(kind,record){
  const job=queue.then(async()=>{
   const db=await read();
   if(!['studies','reviews'].includes(kind)||!record||typeof record!=='object'||Array.isArray(record)||typeof record.id!=='string'||record.id.length>100)throw Error('Invalid record.');
   const prior=db[kind].find(x=>x.id===record.id);
   if(prior){if(JSON.stringify(prior)!==JSON.stringify(record))throw Error('Published records cannot be overwritten.');return}
   if(db[kind].length>=500)throw Error('Workspace capacity reached.');
   await verify(kind,record,db);
   db[kind].push(record);if(Buffer.byteLength(JSON.stringify(db))>64000000)throw Error('Workspace storage capacity reached.');await mkdir(directory,{recursive:true});
   await writeFile(file+'.tmp',JSON.stringify(db),{mode:0o600});await rename(file+'.tmp',file);
  });queue=job.catch(()=>{});return job;
 }
 return {read,put};
}
export function chainVerifier(config, suppliedProvider){
 const request=new FetchRequest(process.env.PARRY_RPC_URL||'https://sepolia-rollup.arbitrum.io/rpc');request.timeout=15000;
 const provider=suppliedProvider||new JsonRpcProvider(request,421614);
 // Parry multiple reward pools v1
 const allowed=new Map([config,...(config.legacyPools||[])].map(c=>[c.pool.toLowerCase(),c]));
 function selectPool(address){if(typeof address!=='string'||!allowed.has(address.toLowerCase()))throw Error('Unknown reward pool.');return new Contract(address,abi,provider);}

 return async(kind,r,db)=>{
  if((await provider.getNetwork()).chainId!==421614n)throw Error('Wrong RPC network.');
  const text=(key,max,required=true)=>{if(typeof r[key]!=='string'||r[key].length>max||(required&&!r[key].trim()))throw Error('Invalid '+key);};
  if(kind==='studies'){
   for(const key of ['owner','poolAddress','tokenAddress'])if(!isAddress(r[key]))throw Error('Invalid address.');
   if(!allowed.has(r.poolAddress.toLowerCase())||r.chainId!==hash(r.id))throw Error('Unknown reward pool.');
   for(const [k,n] of [['title',120],['team',60],['description',4000],['audience',1000],['criteria',1500],['duration',60],['type',60],['deadline',80],['createdAt',80]])text(k,n);
   if(!Array.isArray(r.tasks)||r.tasks.length>100||r.tasks.some(x=>typeof x!=='string'||x.length>2000))throw Error('Invalid tasks.');
   if(r.url&&!/^https?:\/\//i.test(r.url))throw Error('Invalid product link.');
   const {briefHash,fundingTx,...bound}=r;
   if(fundingTx!==undefined&&!/^0x[a-fA-F0-9]{64}$/.test(fundingTx))throw Error('Invalid funding transaction.');
   const pool=selectPool(r.poolAddress);const [p,asset]=await Promise.all([pool.pools(r.chainId),pool.token()]);
   if(p.briefHash!==hash(JSON.stringify(bound))||briefHash!==p.briefHash||p.creator.toLowerCase()!==r.owner.toLowerCase()||asset.toLowerCase()!==r.tokenAddress.toLowerCase())throw Error('Brief is not confirmed on chain.');
   const decimals=asset==='0x0000000000000000000000000000000000000000'?18:Number(await new Contract(asset,['function decimals() view returns(uint8)'],provider).decimals());
   if(r.assetDecimals!==decimals||parseUnits(String(r.reward),decimals)!==p.amount)throw Error('Reward does not match contract.');
  }else{
   const s=db.studies.find(x=>x.id===r.study);if(!s)throw Error('Publish the funded brief first.');
   if(!isAddress(r.author))throw Error('Invalid reviewer.');
   for(const [k,n] of [['title',120],['observation',4000],['suggestion',4000],['createdAt',80]])text(k,n);
   if(!Number.isInteger(r.rating)||r.rating<1||r.rating>5)throw Error('Invalid rating.');
   if(r.evidence&&!/^https?:\/\//i.test(r.evidence))throw Error('Invalid evidence link.');
   if(!Array.isArray(r.screenshots)||r.screenshots.length>3||r.screenshots.some(x=>typeof x.name!=='string'||typeof x.data!=='string'||x.data.length>3000000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x.data)))throw Error('Invalid screenshots.');
   const pool=selectPool(s.poolAddress);const {contentHash,...bound}=r;
   if(contentHash!==hash(JSON.stringify(bound))||await pool.submissions(s.chainId,r.author)!==contentHash)throw Error('Submission is not confirmed on chain.');
  }
 };
}
