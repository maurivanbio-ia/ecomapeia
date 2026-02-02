import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
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
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type NavigationProp = BottomTabNavigationProp<MainTabParamList>;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleNewVistoria = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("VistoriasTab");
  };

  const handleSyncPending = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                Bem-vindo de volta,
              </ThemedText>
              <ThemedText style={styles.welcomeName} lightColor="#FFFFFF" darkColor="#FFFFFF">
                {user?.nome || "Usuário"}
              </ThemedText>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <ThemedText style={styles.statNumber} lightColor="#FFFFFF" darkColor="#FFFFFF">
                    0
                  </ThemedText>
                  <ThemedText style={styles.statLabel} lightColor="rgba(255,255,255,0.8)" darkColor="rgba(255,255,255,0.8)">
                    Vistorias
                  </ThemedText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <ThemedText style={styles.statNumber} lightColor="#FFFFFF" darkColor="#FFFFFF">
                    0
                  </ThemedText>
                  <ThemedText style={styles.statLabel} lightColor="rgba(255,255,255,0.8)" darkColor="rgba(255,255,255,0.8)">
                    Pendentes
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
          <ThemedText style={styles.sectionTitle}>Ações Rápidas</ThemedText>
          <View style={styles.actionsGrid}>
            <QuickActionCard
              icon="plus-circle"
              label="Nova Vistoria"
              color={Colors.light.accent}
              onPress={handleNewVistoria}
              theme={theme}
            />
            <QuickActionCard
              icon="upload-cloud"
              label="Sincronizar"
              color={Colors.light.primary}
              onPress={handleSyncPending}
              theme={theme}
            />
          </View>
        </Animated.View>

        {/* Recent Inspections */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <ThemedText style={styles.sectionTitle}>Vistorias Recentes</ThemedText>
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="clipboard" size={48} color={theme.tabIconDefault} />
            <ThemedText style={styles.emptyTitle}>
              Nenhuma vistoria cadastrada
            </ThemedText>
            <ThemedText
              style={styles.emptySubtitle}
              lightColor={Colors.light.textSecondary}
              darkColor={Colors.dark.textSecondary}
            >
              Comece criando uma nova vistoria
            </ThemedText>
          </View>
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
}

function QuickActionCard({ icon, label, color, onPress, theme }: QuickActionCardProps) {
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
      style={[
        styles.actionCard,
        { backgroundColor: theme.backgroundDefault },
        animatedStyle,
      ]}
    >
      <View style={[styles.actionIconContainer, { backgroundColor: color }]}>
        <Feather name={icon} size={24} color="#FFFFFF" />
      </View>
      <ThemedText style={styles.actionLabel}>{label}</ThemedText>
    </AnimatedPressable>
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
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: Spacing["2xl"],
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
});
