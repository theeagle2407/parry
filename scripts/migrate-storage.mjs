import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSupabaseStore} from '../supabase-store.mjs';
import {chainVerifier} from '../shared-store.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
try{
 const config=JSON.parse(await readFile(resolve(root,'public/config.json'),'utf8'));
 const store=createSupabaseStore({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,verify:chainVerifier(config)});
 const file=resolve(process.env.PARRY_DATA_DIR||resolve(root,'data'),'records.json');
 let db;try{db=JSON.parse(await readFile(file,'utf8'))}catch(e){if(e.code==='ENOENT'){console.log('No local records file. Nothing to migrate.');process.exit(0)}throw e}
 for(const kind of ['studies','reviews']){if(!Array.isArray(db[kind]))throw Error('Invalid local database.');for(const record of db[kind])await store.put(kind,record);console.log('Migrated '+db[kind].length+' '+kind+'.')}
 console.log('Complete. Local data was preserved. Re-running safely skips identical records.');process.exit(0);
}catch(e){console.error(e.shortMessage||e.message);process.exit(1)}
