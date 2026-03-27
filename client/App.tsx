import React from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider, useThemeContext } from "@/contexts/ThemeContext";
import { InteractiveTutorial } from "@/components/InteractiveTutorial";
import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import { AutoSyncProvider, useAutoSyncContext } from "@/contexts/AutoSyncContext";
import { FeatureFlagsProvider } from "@/contexts/FeatureFlagsContext";

function AppContent() {
  const { isDark } = useThemeContext();
  const { syncStatus, isConnected, lastSyncAt } = useAutoSyncContext();

  return (
    <>
      <NavigationContainer>
        <RootStackNavigator />
      </NavigationContainer>
      <SyncStatusBanner
        status={syncStatus}
        isConnected={isConnected}
        lastSyncAt={lastSyncAt}
      />
      <StatusBar style={isDark ? "light" : "dark"} />
      <InteractiveTutorial />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <SafeAreaProvider>
                <GestureHandlerRootView style={styles.root}>
                  <KeyboardProvider>
                    <FeatureFlagsProvider>
                      <AutoSyncProvider>
                        <AppContent />
                      </AutoSyncProvider>
                    </FeatureFlagsProvider>
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </SafeAreaProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
