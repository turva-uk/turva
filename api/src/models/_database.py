import datetime

import ormar
import sqlalchemy
from sqlalchemy.ext.asyncio import create_async_engine

from config import Config

is_testing_environment = Config.Application.is_testing_environment


def get_database_url() -> str:
    if Config.Application.is_testing_environment:
        return "sqlite+aiosqlite:///test.sqlite"

    base_database_url = (
        f"postgresql+asyncpg://{Config.Database.user}:{Config.Database.password}"
        f"@{Config.Database.host}:{Config.Database.port}"
    )

    return (
        f"{base_database_url}/{Config.Database.database}"
        f"?options=-csearch_path={Config.Database.schema}"
    )


DATABASE_URL = get_database_url()

conn_args = {}
if DATABASE_URL.startswith("postgresql"):
    conn_args = {"connect_args": {"server_settings": {"search_path": Config.Database.schema}}}

database = ormar.DatabaseConnection(DATABASE_URL, **conn_args)

metadata = sqlalchemy.MetaData()

ormar_config = ormar.OrmarConfig(
    database=database,
    metadata=metadata,
)

engine = create_async_engine(DATABASE_URL)


class DateFieldsMixins:
    created_date: datetime.datetime = ormar.DateTime(default=datetime.datetime.now)
    updated_date: datetime.datetime = ormar.DateTime(
        default=datetime.datetime.now, onupdate=datetime.datetime.now
    )
