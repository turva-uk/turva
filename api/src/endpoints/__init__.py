"""
In this module, there are a series of other folders. Each of those folders
contain files that are used to create the endpoints for the API.

This script will import all of these files and create the endpoints for the API, using the name of
each folder as the endpoint prefix (/<folder_name>/<endpoint_name>).

It will also support nesting folders and creating the route accordingly.

For example, if you have the following folder structure:
```
endpoints
├── auth
│   ├── login.py
│   ├── register.py
|   ├── test
|       ├── dothing.py

You will have the following endpoints:
/auth/login
/auth/register
/auth/test/dothing

"""

import importlib
import logging
import os

from fastapi import APIRouter

endpoints_base = APIRouter()

for root, _dirs, files in os.walk("endpoints"):
    files.sort()
    for file in files:
        if not file.endswith(".py") or file == "__init__.py":
            continue
        # Get the module path by removing ".py" extension and replacing slashes
        module_path = os.path.join(root, file)[:-3].replace(os.path.sep, ".")

        # Import the module dynamically
        module = importlib.import_module(module_path)

        # Check if the module has a 'router' attribute
        if hasattr(module, "router"):
            logging.info(f"[endpoints] adding router from {module_path} to {root}")
            # Add the router to the FastAPI app
            endpoints_base.include_router(
                module.router, prefix=f"/{os.path.relpath(root, 'endpoints')}"
            )

# @endpoints_base.get("/")
# async def root() -> dict:
#     """
#     This endpoint is used to check if the API is running.
#     """
#     return {"message": "OUH Eureka IPC API, Digital Engineering"}
