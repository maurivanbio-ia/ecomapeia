import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FeatureFlags {
  uc: boolean;
  embargo: boolean;
  weather: boolean;
  mapbiomas: boolean;
  fireHotspots: boolean;
  compliance: boolean;
}

const STORAGE_KEY = "@mapeia_feature_flags";

const DEFAULT_FLAGS: FeatureFlags = {
  uc: true,
  embargo: true,
  weather: true,
  mapbiomas: true,
  fireHotspots: true,
  compliance: true,
};

interface FeatureFlagsContextValue {
  flags: FeatureFlags;
  setFlag: (key: keyof FeatureFlags, value: boolean) => Promise<void>;
  loaded: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: DEFAULT_FLAGS,
  setFlag: async () => {},
  loaded: false,
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored);
          setFlags({ ...DEFAULT_FLAGS, ...parsed });
        }
      })
      .catch(console.error)
      .finally(() => setLoaded(true));
  }, []);

  const setFlag = useCallback(async (key: keyof FeatureFlags, value: boolean) => {
    const updated = { ...flags, [key]: value };
    setFlags(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [flags]);

  return (
    <FeatureFlagsContext.Provider value={{ flags, setFlag, loaded }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}
