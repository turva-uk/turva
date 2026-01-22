from contextlib import asynccontextmanager

from databases import Database
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.authentication import AuthenticationMiddleware
from starlette.middleware.sessions import SessionMiddleware

from authentication.middleware import TurvaAuthenticationBackend
from config import Config
from endpoints import endpoints_base
from models._database import database


@asynccontextmanager
# Manage DB connection lifecycle during app lifespan
async def lifespan(app: FastAPI):
    # Connect to the database
    database_: Database = app.state.database
    if not database_.is_connected:
        await database_.connect()

    try:
        yield
    finally:
        # Disconnect from the database
        if database_.is_connected:
            await database_.disconnect()


is_dev_env = Config.Application.is_debug_environment is True

app = FastAPI(
    lifespan=lifespan,
    docs_url="/" if is_dev_env else None,
    redoc_url=None,
    openapi_url=f"{Config.Application.api_path}/openapi.json",
)
app.state.database = database

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.turva.org",
        "http://localhost:5173",
        "https://localhost/",
        "http://localhost/",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(AuthenticationMiddleware, backend=TurvaAuthenticationBackend())
app.add_middleware(
    SessionMiddleware,
    secret_key=Config.Application.secret_key,
    session_cookie=Config.Application.session_cookie_name,
    max_age=Config.Application.session_cookie_lifetime,
)

app.include_router(endpoints_base, prefix=Config.Application.api_path)
