import os

# from asgi_lifespan import LifespanManager
from dotenv import load_dotenv

os.environ["TESTING"] = "true"
load_dotenv("../.env.test")

import asyncio

import email_validator
import pytest_asyncio
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine

from app import app
from async_database_utils import create_database, database_exists, drop_database
from models._database import DATABASE_URL, metadata

email_validator.TEST_ENVIRONMENT = True

"""
cd /api/src
coverage run -m pytest . --cov-config=../pyproject.toml
coverage report
coverage html
"""


# Creates the event loop and closes it after all tests are done
@pytest_asyncio.fixture(scope="session")
async def event_loop():
    loop = asyncio.get_event_loop()
    yield loop
    loop.close()


# Creates the test database engine and metadata and drops them after all tests are done
@pytest_asyncio.fixture(scope="session")
async def _test_database():
    if await database_exists(DATABASE_URL):
        await drop_database(DATABASE_URL)
    await create_database(DATABASE_URL)

    # This needs to be run using run_sync because it's not async

    engine = create_async_engine(DATABASE_URL)
    yield engine, metadata
    await drop_database(DATABASE_URL)


# Creates the test database tables and drops them after the test
@pytest_asyncio.fixture(scope="function")
async def db(_test_database):
    engine, metadata = _test_database
    async with engine.begin() as conn:
        await conn.run_sync(metadata.drop_all)
        await conn.run_sync(metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(metadata.drop_all)


@pytest_asyncio.fixture
async def test_client(db):
    async with LifespanManager(app):
        async with AsyncClient(
            transport=ASGITransport(app),
            base_url="http://testserver",
        ) as client:
            yield client
