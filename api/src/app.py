from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from endpoints import endpoints_base
from contextlib import asynccontextmanager
from databases import Database
from models._database import database

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


app = FastAPI(
    lifespan=lifespan
)
app.state.database = database

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://turva.org",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints_base, prefix="/api")


@app.get("/")
async def read_root():
    return {
        "author": "https://www.turva.org",
        "description": "Turva API",
        "github": "https://github.com/digital-clinical-safety-alliance/turva/"
    }
