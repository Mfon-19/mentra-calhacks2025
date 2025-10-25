import os
import ssl
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

project_root = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
cert_path = os.path.join(project_root, "prod-supabase.crt")

if os.path.exists(cert_path):
    os.environ["SSL_CERT_FILE"] = cert_path

supabase: Client = create_client(url, key)
