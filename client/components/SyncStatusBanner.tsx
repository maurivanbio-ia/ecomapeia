import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import type { SyncStatus, ConnectionType } from "@/hooks/useAutoSync";

interface SyncStatusBannerProps {
  status: SyncStatus;
  isConnected: boolean;
  connectionType?: ConnectionType;
  lastSyncAt: Date | null;
}

function connectionLabel(type: ConnectionType | undefined): string {
  switch (type) {
    case "wifi":     return "Wi-Fi";
    case "cellular_5g": return "5G";
    case "cellular_4g": return "4G/LTE";
    case "cellular":    return "dados móveis";
    default:            return "";
  }
}

type BannerConfig = { icon: string; color: string; bg: string; label: string } | null;

function getConfig(
  status: SyncStatus,
  connectionType?: ConnectionType
): BannerConfig {
  const network = connectionLabel(connectionType);
  const networkSuffix = network ? ` via ${network}` : "";

  const map: Record<SyncStatus, BannerConfig> = {
    idle: null,
    syncing: {
      icon: "upload-cloud",
      color: "#fff",
      bg: "#2563EB",
      label: `Sincronizando automaticamente${networkSuffix}...`,
    },
    success: {
      icon: "check-circle",
      color: "#fff",
      bg: "#16a34a",
      label: `Sincronização concluída${networkSuffix}`,
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

  return map[status];
}

export function SyncStatusBanner({
  status,
  isConnected,
  connectionType,
  lastSyncAt,
}: SyncStatusBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const config = getConfig(status, connectionType);
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
      <ThemedText style={styles.label} lightColor={config.color} darkColor={config.color}>
        {config.label}
      </ThemedText>
      {/* Connection type badge */}
      {connectionType && connectionType !== "none" && connectionType !== "unknown" && (
        <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
          <Feather
            name={connectionType === "wifi" ? "wifi" : "radio"}
            size={11}
            color="#fff"
          />
          <ThemedText style={styles.badgeText} lightColor="#fff" darkColor="#fff">
            {connectionLabel(connectionType)}
          </ThemedText>
        </View>
      )}
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
