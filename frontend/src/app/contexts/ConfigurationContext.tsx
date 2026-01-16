import React, { createContext, useEffect, useMemo, useState } from "react";
import type Configuration from "../../types/Configuration";
import type { PropsWithChildren } from "react";
import { useMantineColorScheme } from "@mantine/core";

export interface ConfigurationInterface {
  configuration?: Configuration;
  updateConfigurationEntry: (key: string, value: string | boolean) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ConfigurationContext = createContext<ConfigurationInterface>({
  updateConfigurationEntry: () => ({}),
});

export const ConfigurationProvider = ({
  children,
}: PropsWithChildren): React.JSX.Element => {
  const [configuration, setConfiguration] = useState<
    Configuration | undefined
  >();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  // Sync dark mode with configuration
  useEffect(() => {
    if (configuration?.darkMode && colorScheme !== "dark") {
      setColorScheme("dark");
    } else if (!configuration?.darkMode && colorScheme !== "light") {
      setColorScheme("light");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuration, colorScheme]);

  // Default configuration
  useEffect(() => {
    setConfiguration({
      darkMode: false,
      collapseNav: false,
    });
    const fromLocalStorage = localStorage.getItem("configuration");
    if (fromLocalStorage) {
      setConfiguration(JSON.parse(fromLocalStorage));
    }
  }, []);

  const updateConfigurationEntry = (
    key: string,
    value: string | boolean | null,
  ) => {
    const newConfiguration = { ...configuration, [key]: value };
    setConfiguration(newConfiguration as Configuration);
    localStorage.setItem("configuration", JSON.stringify(newConfiguration));
    if (newConfiguration) {
      localStorage.setItem("configuration", JSON.stringify(newConfiguration));
    } else {
      localStorage.removeItem("configuration");
    }
  };

  return (
    <ConfigurationContext.Provider
      value={useMemo(
        () => ({ configuration, updateConfigurationEntry }),
        [configuration, updateConfigurationEntry],
      )}
    >
      {children}
    </ConfigurationContext.Provider>
  );
};
