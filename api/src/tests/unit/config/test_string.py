import os
import pytest
from importlib import reload
import config


class EnvironmentContextManager:
    def __init__(self):
        self._env = None

    def __enter__(self):
        reload(config)
        self._env = os.environ.copy()
        return self

    def __exit__(self, *args):
        os.environ = self._env


def test_config_str_required_pass():
    envvar_name = "TEST_STR_REQUIRED"
    envvar_value = "Hello, world!"

    with EnvironmentContextManager():
        os.environ[envvar_name] = str(envvar_value)
        assert config.parseString(envvar_name, True) == envvar_value


def test_config_str_required_fail_no_value():
    envvar_name = "TEST_STR_REQUIRED"

    with EnvironmentContextManager():
        with pytest.raises(config.ConfigurationError, match=envvar_name):
            config.parseString(envvar_name, True)


def test_config_str_optional_pass():
    envvar_name = "TEST_STR_OPTIONAL"

    with EnvironmentContextManager():
        assert config.parseString(envvar_name, False) == None


def test_config_str_optional_pass_with_value():
    envvar_name = "TEST_STR_OPTIONAL"
    envvar_value = "Hello, world!"

    with EnvironmentContextManager():
        os.environ[envvar_name] = str(envvar_value)
        assert config.parseString(envvar_name, False) == envvar_value
