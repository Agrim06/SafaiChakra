import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set in .env")

# Supabase requires SSL; local Postgres does not — we detect context via URL
_use_ssl = "supabase" in DATABASE_URL or os.getenv("DB_SSL", "false").lower() == "true"

connect_args = {}
if _use_ssl:
    connect_args.update({
        "sslmode": "require",
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    })

from sqlalchemy.pool import NullPool

# Detect if we are using the transaction pooler (port 6543) or direct/session pooler
_is_transaction_pooler = ":6543" in DATABASE_URL

engine_kwargs = {
    "connect_args": connect_args,
}

if _is_transaction_pooler:
    # Transaction mode works best with NullPool to avoid double-pooling issues
    engine_kwargs["poolclass"] = NullPool
else:
    # Standard / Session pooler - recycle connections every 300s and test before use
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency: yields a DB session and ensures it is closed afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()