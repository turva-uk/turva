import os
from importlib import reload

import pytest

import config


class EnvironmentContextManager:
    def __init__(self):
        self._env = None

    def __enter__(self):
        reload(config)
        self._env = os.environ.copy()
        return self

    def __exit__(self, *args):
        os.environ.clear()
        os.environ.update(self._env)


def test_config_bool_required_pass_true():
    envvar_name = "TEST_BOOL_REQUIRED"
    envvar_value = "true"

    with EnvironmentContextManager():
        os.environ[envvar_name] = str(envvar_value)
        assert config.parseBoolean(envvar_name, True) is True


def test_config_bool_required_pass_false():
    envvar_name = "TEST_BOOL_REQUIRED"
    envvar_value = "false"

    with EnvironmentContextManager():
        os.environ[envvar_name] = str(envvar_value)
        assert config.parseBoolean(envvar_name, True) is False


def test_config_bool_required_fail_no_value():
    envvar_name = "TEST_BOOL_REQUIRED"

    with EnvironmentContextManager():
        with pytest.raises(config.ConfigurationError, match=envvar_name):
            config.parseBoolean(envvar_name, True)


def test_config_bool_required_fail_not_bool():
    envvar_name = "TEST_BOOL_REQUIRED"
    envvar_value = "not a bool"
    with EnvironmentContextManager():
        os.environ[envvar_name] = envvar_value
        with pytest.raises(config.ConfigurationError, match=envvar_name):
            config.parseBoolean(envvar_name, True)


def test_config_bool_optional_pass():
    envvar_name = "TEST_BOOL_OPTIONAL"

    with EnvironmentContextManager():
        assert config.parseBoolean(envvar_name, False) is None


def test_config_bool_optional_pass_with_value():
    envvar_name = "TEST_BOOL_OPTIONAL"
    envvar_value = "true"

    with EnvironmentContextManager():
        os.environ[envvar_name] = str(envvar_value)
        assert config.parseBoolean(envvar_name, False) == bool(envvar_value)
