import {createSupabaseStore} from '../supabase-store.mjs';
try{
 const store=createSupabaseStore({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,verify:async()=>{throw Error('Read-only check')}});
 const db=await store.read();console.log(`PASS Supabase storage reachable: ${db.studies.length} briefs, ${db.reviews.length} submissions.`);
 console.log('This checks server read access; run the SQL setup exactly to restrict public access.');
}catch(e){console.error(e.message);process.exitCode=1}
