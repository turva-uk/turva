from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from endpoints import endpoints_base
from contextlib import asynccontextmanager
from databases import Database
from models._database import database
from config import Config
from authentication.middleware import TurvaAuthenticationBackend
from starlette.middleware.authentication import AuthenticationMiddleware
from starlette.middleware.sessions import SessionMiddleware


@asynccontextmanager
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


app = FastAPI(lifespan=lifespan)
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


@app.get("/")
async def read_root():
    return {
        "author": "https://www.turva.org",
        "description": "Turva API",
        "github": "https://github.com/digital-clinical-safety-alliance/turva/",
    }
