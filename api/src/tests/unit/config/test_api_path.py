import os
from importlib import reload
import config


class EnvironmentContextManager:
    def __init__(self):
        self._env = None

    def __enter__(self):
        self._env = os.environ.copy()
        return self

    def __exit__(self, *args):
        os.environ = self._env


def test_api_path_start_end_slash():
    with EnvironmentContextManager():
        os.environ["API_PATH"] = "/api/v1/"

        reload_module = reload(config)
        assert reload_module.Config.Application.api_path == "/api/v1"


def test_api_path_no_start_slash():
    with EnvironmentContextManager():
        os.environ["API_PATH"] = "api/v1"

        reload_module = reload(config)
        assert reload_module.Config.Application.api_path == "/api/v1"


def test_api_path_no_end_slash():
    with EnvironmentContextManager():
        os.environ["API_PATH"] = "/api/v1"

        reload_module = reload(config)
        assert reload_module.Config.Application.api_path == "/api/v1"


def test_api_path_only_slash():
    with EnvironmentContextManager():
        os.environ["API_PATH"] = "/"

        reload_module = reload(config)
        assert reload_module.Config.Application.api_path == ""
