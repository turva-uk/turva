import random
import string
import databases
import ormar
import sqlalchemy
from sqlalchemy.ext.asyncio import create_async_engine
import datetime

from config import Config

is_testing_environment = Config.Application.is_testing_environment

base_database_url = (
    f"postgresql+asyncpg://{Config.Database.user}:{Config.Database.password}"
    f"@{Config.Database.host}:{Config.Database.port}"
)

random_test_db_file_name = "".join(
    random.choices(string.ascii_lowercase + string.digits, k=10)  # nosec
)

_test_database_url = f"sqlite+aiosqlite:///./{random_test_db_file_name}.db"

_prod_database_url = f"{base_database_url}/{Config.Database.database}?options=-csearch_path={Config.Database.schema}"

DATABASE_URL = _test_database_url if is_testing_environment else _prod_database_url

args = {}
if is_testing_environment is not True:
    args = {"server_settings": {"search_path": Config.Database.schema}}

database = databases.Database(DATABASE_URL, **args)  # type: ignore

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
