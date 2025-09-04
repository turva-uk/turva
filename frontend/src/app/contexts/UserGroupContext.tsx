import React, { createContext, useEffect, useMemo, useState } from 'react';
import type Configuration from '../../types/Configuration';
import type { PropsWithChildren } from 'react';

export interface ConfigurationInterface {
  configuration?: Configuration;
  updateConfigurationEntry: (key: string, value: string | boolean) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ConfigurationContext = createContext<ConfigurationInterface>({
  updateConfigurationEntry: () => ({}),
});

export const ConfigurationProvider = ({ children }: PropsWithChildren): React.JSX.Element => {
  const [configuration, setConfiguration] = useState<Configuration | undefined>();

  // Default configuration
  useEffect(() => {
    setConfiguration({
      darkMode: true,
      collapseNav: false
    });
    const fromLocalStorage = localStorage.getItem('configuration');
    if (fromLocalStorage) {
      setConfiguration(JSON.parse(fromLocalStorage));
    }
  }, []);

  const updateConfigurationEntry = (key: string, value: string | boolean | null) => {
    const newConfiguration = { ...configuration, [key]: value };
    setConfiguration(newConfiguration as Configuration);
    localStorage.setItem('configuration', JSON.stringify(newConfiguration));
    if (newConfiguration) {
      localStorage.setItem('configuration', JSON.stringify(newConfiguration));
    } else {
      localStorage.removeItem('configuration');
    }
  };

  return (
    // eslint-disable-next-line react-hooks/exhaustive-deps
    <ConfigurationContext.Provider value={useMemo(() => ({ configuration, updateConfigurationEntry }), [configuration])}>
      {children}
    </ConfigurationContext.Provider>
  );
};