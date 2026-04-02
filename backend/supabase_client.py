from supabase import create_client
import os

url = os.getenv("SUPABASE_URL")
key = os.getenv("ANON_KEY")

supabase = create_client(url, key)