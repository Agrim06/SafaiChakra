from supabase import create_client
from dotenv import load_dotenv

url = "DATABASE_URL"
key = ANON_KEY

supabase = create_client(url, key)