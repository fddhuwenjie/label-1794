import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

const defaultSettings = {
  theme: 'dark',
  fontSize: 'medium',
  sendOnEnter: true,
  showTimestamps: true,
  autoScroll: true,
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('timelinegpt_settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('timelinegpt_settings', JSON.stringify(settings));
    // Apply theme
    document.documentElement.classList.toggle('light-theme', settings.theme === 'light');
    // Apply font size
    document.documentElement.setAttribute('data-font-size', settings.fontSize);
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
