from pathlib import Path
from getpass import getpass
import os,re
root=Path(__file__).resolve().parent.parent
url=input('Supabase Project URL: ').strip().rstrip('/')
if not re.fullmatch(r'https://[a-z0-9-]+\.supabase\.co',url):raise SystemExit('Use the Project URL, not the dashboard address.')
key=getpass('Supabase secret key (hidden): ').strip()
if not re.fullmatch(r'(sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+)',key):raise SystemExit('Use a secret key or legacy service-role key, not a publishable key.')
p=root/'.env.local'
lines=p.read_text().splitlines() if p.exists() else []
lines=[line for line in lines if not re.match(r'^(SUPABASE_URL|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY)=',line)]
lines+=['SUPABASE_URL='+url,'SUPABASE_SECRET_KEY='+key]
fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
with os.fdopen(fd,'w') as f:f.write('\n'.join(lines)+'\n')
os.chmod(p,0o600)
print('Saved server-only settings to .env.local. Do not upload or share that file.')
