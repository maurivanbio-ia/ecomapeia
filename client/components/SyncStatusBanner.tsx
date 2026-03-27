import React, { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import type { SyncStatus } from "@/hooks/useAutoSync";

interface SyncStatusBannerProps {
  status: SyncStatus;
  isConnected: boolean;
  lastSyncAt: Date | null;
}

const CONFIG: Record<
  SyncStatus,
  { icon: string; color: string; bg: string; label: string } | null
> = {
  idle: null,
  syncing: {
    icon: "upload-cloud",
    color: "#fff",
    bg: "#2563EB",
    label: "Sincronizando automaticamente...",
  },
  success: {
    icon: "check-circle",
    color: "#fff",
    bg: "#16a34a",
    label: "Sincronização concluída",
  },
  error: {
    icon: "alert-circle",
    color: "#fff",
    bg: "#dc2626",
    label: "Erro na sincronização. Tente manualmente.",
  },
  offline: {
    icon: "wifi-off",
    color: "#fff",
    bg: "#6b7280",
    label: "Sem conexão — dados salvos localmente",
  },
};

export function SyncStatusBanner({ status, isConnected, lastSyncAt }: SyncStatusBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const config = CONFIG[status];
  const visible = config !== null;

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 220 });
    } else {
      translateY.value = withSpring(-100, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(0, { duration: 180 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!config) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: config.bg, top: insets.top + 8, pointerEvents: "none" as any },
        animatedStyle,
      ]}
    >
      <Feather name={config.icon as any} size={16} color={config.color} />
      <ThemedText
        style={styles.label}
        lightColor={config.color}
        darkColor={config.color}
      >
        {config.label}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
});
