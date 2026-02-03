import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useNavigation, CompositeNavigationProp } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { VistoriasStackParamList } from "@/navigation/VistoriasStackNavigator";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import { getPendingCount, syncPendingVistorias } from "@/lib/offlineStorage";
import { apiRequest } from "@/lib/query-client";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<VistoriasStackParamList>
>;

interface Vistoria {
  id: string;
  proprietario: string;
  data_vistoria: string;
  status_upload: string;
  tipo_intervencao?: string;
  municipio?: string;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = React.useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "synced" | "pending">("all");

  const { data: vistorias = [], refetch } = useQuery<Vistoria[]>({
    queryKey: [`/api/vistorias?usuario_id=${user?.id}`],
    enabled: !!user?.id,
  });

  useEffect(() => {
    getPendingCount().then(setPendingCount);
  }, []);

  const filteredVistorias = useMemo(() => {
    let filtered = vistorias;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.proprietario?.toLowerCase().includes(query) ||
          v.municipio?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter((v) => 
        statusFilter === "synced" 
          ? v.status_upload === "synced" 
          : v.status_upload !== "synced"
      );
    }
    
    return filtered;
  }, [vistorias, searchQuery, statusFilter]);

  const syncedCount = vistorias.filter((v) => v.status_upload === "synced").length;
  const totalCount = vistorias.length + pendingCount;

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([refetch(), getPendingCount().then(setPendingCount)]).finally(
      () => setRefreshing(false)
    );
  }, [refetch]);

  const handleNewVistoria = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("VistoriasTab");
  };

  const handleSyncPending = async () => {
    if (pendingCount === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t.syncNow, t.noInspections);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSyncing(true);

    try {
      const result = await syncPendingVistorias(async (data) => {
        await apiRequest("POST", "/api/vistorias", data);
      });
      
      await refetch();
      const newPending = await getPendingCount();
      setPendingCount(newPending);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t.success,
        `${result.synced} vistoria(s) sincronizada(s).${result.errors > 0 ? ` ${result.errors} erro(s).` : ""}`
      );
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t.error, "Falha na sincronização. Tente novamente.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing["3xl"],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.link}
          />
        }
      >
        {/* Welcome Card */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <View
            style={[
              styles.welcomeCard,
              {
                backgroundColor: Colors.light.primary,
              },
            ]}
          >
            <View style={styles.welcomeContent}>
              <ThemedText style={styles.welcomeLabel} lightColor="#FFFFFF" darkColor="#FFFFFF">
                {t.welcome},
              </ThemedText>
              <ThemedText style={styles.welcomeName} lightColor="#FFFFFF" darkColor="#FFFFFF">
                {user?.nome || "Usuário"}
              </ThemedText>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <ThemedText style={styles.statNumber} lightColor="#FFFFFF" darkColor="#FFFFFF">
                    {totalCount}
                  </ThemedText>
                  <ThemedText style={styles.statLabel} lightColor="rgba(255,255,255,0.8)" darkColor="rgba(255,255,255,0.8)">
                    {t.totalInspections}
                  </ThemedText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <ThemedText style={styles.statNumber} lightColor="#FFFFFF" darkColor="#FFFFFF">
                    {pendingCount}
                  </ThemedText>
                  <ThemedText style={styles.statLabel} lightColor="rgba(255,255,255,0.8)" darkColor="rgba(255,255,255,0.8)">
                    {t.pending}
                  </ThemedText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <ThemedText style={styles.statNumber} lightColor="#FFFFFF" darkColor="#FFFFFF">
                    {syncedCount}
                  </ThemedText>
                  <ThemedText style={styles.statLabel} lightColor="rgba(255,255,255,0.8)" darkColor="rgba(255,255,255,0.8)">
                    {t.synced}
                  </ThemedText>
                </View>
              </View>
            </View>
            <View style={styles.welcomeIconContainer}>
              <Feather name="map-pin" size={48} color="rgba(255,255,255,0.3)" />
            </View>
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <ThemedText style={styles.sectionTitle}>{t.home}</ThemedText>
          <View style={styles.actionsGrid}>
            <QuickActionCard
              icon="plus-circle"
              label={t.newInspection}
              color={Colors.light.accent}
              onPress={handleNewVistoria}
              theme={theme}
            />
            <QuickActionCard
              icon="upload-cloud"
              label={t.syncNow}
              color={Colors.light.primary}
              onPress={handleSyncPending}
              theme={theme}
              loading={syncing}
            />
          </View>
        </Animated.View>

        {/* Search and Filter */}
        <Animated.View entering={FadeInDown.duration(500).delay(250)}>
          <View style={[styles.searchContainer, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="search" size={20} color={theme.tabIconDefault} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={theme.tabIconDefault}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery("")}>
                <Feather name="x" size={20} color={theme.tabIconDefault} />
              </Pressable>
            ) : null}
          </View>
          
          <View style={styles.filterRow}>
            <FilterChip
              label={t.all}
              active={statusFilter === "all"}
              onPress={() => setStatusFilter("all")}
              theme={theme}
            />
            <FilterChip
              label={t.synced}
              active={statusFilter === "synced"}
              onPress={() => setStatusFilter("synced")}
              theme={theme}
            />
            <FilterChip
              label={t.pending}
              active={statusFilter === "pending"}
              onPress={() => setStatusFilter("pending")}
              theme={theme}
            />
          </View>
        </Animated.View>

        {/* Recent Inspections */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <ThemedText style={styles.sectionTitle}>{t.recentInspections}</ThemedText>
          {filteredVistorias.length > 0 ? (
            <View style={styles.recentList}>
              {filteredVistorias.slice(0, 5).map((vistoria) => (
                <Pressable
                  key={vistoria.id}
                  style={[
                    styles.recentCard,
                    { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    navigation.navigate("VistoriasTab", {
                      screen: "DetalhesVistoria",
                      params: { vistoriaId: vistoria.id },
                    });
                  }}
                >
                  <View style={styles.recentCardContent}>
                    <View style={styles.recentCardHeader}>
                      <ThemedText style={styles.recentCardTitle} numberOfLines={1}>
                        {vistoria.proprietario}
                      </ThemedText>
                      <View
                        style={[
                          styles.syncBadge,
                          {
                            backgroundColor:
                              vistoria.status_upload === "synced"
                                ? Colors.light.accent
                                : Colors.light.warning,
                          },
                        ]}
                      >
                        <ThemedText style={styles.syncBadgeText}>
                          {vistoria.status_upload === "synced" ? t.synced : t.pending}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.recentCardDate}>
                      {new Date(vistoria.data_vistoria).toLocaleDateString("pt-BR")}
                    </ThemedText>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.tabIconDefault} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="clipboard" size={48} color={theme.tabIconDefault} />
              <ThemedText style={styles.emptyTitle}>
                {searchQuery ? t.noResults : t.noInspections}
              </ThemedText>
              <ThemedText
                style={styles.emptySubtitle}
                lightColor={Colors.light.textSecondary}
                darkColor={Colors.dark.textSecondary}
              >
                {searchQuery ? t.searchPlaceholder : t.newInspection}
              </ThemedText>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

interface QuickActionCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  theme: any;
  loading?: boolean;
}

function QuickActionCard({ icon, label, color, onPress, theme, loading }: QuickActionCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={loading}
      style={[
        styles.actionCard,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
        loading && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.actionIconContainer, { backgroundColor: color }]}>
        <Feather name={loading ? "loader" : icon} size={24} color="#FFFFFF" />
      </View>
      <ThemedText style={styles.actionLabel}>{label}</ThemedText>
    </AnimatedPressable>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: any;
}

function FilterChip({ label, active, onPress, theme }: FilterChipProps) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? Colors.light.accent : theme.backgroundDefault,
          borderColor: active ? Colors.light.accent : theme.border,
        },
      ]}
    >
      <ThemedText
        style={[styles.filterChipText, active && { color: "#FFFFFF" }]}
        lightColor={active ? "#FFFFFF" : Colors.light.textSecondary}
        darkColor={active ? "#FFFFFF" : Colors.dark.textSecondary}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
  },
  welcomeCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: Spacing["2xl"],
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeLabel: {
    fontSize: 14,
    opacity: 0.9,
  },
  welcomeName: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: Spacing.lg,
  },
  welcomeIconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  actionsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  actionCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyState: {
    borderRadius: BorderRadius.xl,
    padding: Spacing["4xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  recentList: {
    gap: Spacing.md,
  },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  recentCardContent: {
    flex: 1,
  },
  recentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  recentCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  recentCardDate: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  syncBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  syncBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
});
