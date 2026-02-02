import React from "react";
import { View, StyleSheet, Pressable, Alert, Platform } from "react-native";
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

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (Platform.OS === "web") {
      logout();
    } else {
      Alert.alert(
        "Sair da conta",
        "Tem certeza que deseja sair?",
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Sair", 
            style: "destructive",
            onPress: logout,
          },
        ]
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing["3xl"],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {/* Profile Header */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(100)}
          style={styles.profileHeader}
        >
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: Colors.light.primary },
            ]}
          >
            <ThemedText style={styles.avatarText} lightColor="#FFFFFF" darkColor="#FFFFFF">
              {user?.nome?.charAt(0).toUpperCase() || "U"}
            </ThemedText>
          </View>
          <ThemedText style={styles.userName}>{user?.nome || "Usuário"}</ThemedText>
          <ThemedText
            style={styles.userEmail}
            lightColor={Colors.light.textSecondary}
            darkColor={Colors.dark.textSecondary}
          >
            {user?.email || "email@exemplo.com"}
          </ThemedText>
          <View style={[styles.userTypeBadge, { backgroundColor: Colors.light.accent }]}>
            <ThemedText style={styles.userTypeText} lightColor="#FFFFFF" darkColor="#FFFFFF">
              {user?.tipo_usuario || "Fiscal"}
            </ThemedText>
          </View>
        </Animated.View>

        {/* Settings Section */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <ThemedText style={styles.sectionTitle}>Configurações</ThemedText>
          <View style={[styles.settingsCard, { backgroundColor: theme.backgroundDefault }]}>
            <SettingsItem
              icon="bell"
              label="Notificações"
              onPress={() => {}}
              theme={theme}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="globe"
              label="Idioma"
              value="Português"
              onPress={() => {}}
              theme={theme}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="info"
              label="Sobre o App"
              onPress={() => {}}
              theme={theme}
            />
          </View>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <LogoutButton onPress={handleLogout} />
        </Animated.View>

        {/* App Version */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(400)}
          style={styles.versionContainer}
        >
          <ThemedText
            style={styles.versionText}
            lightColor={Colors.light.textSecondary}
            darkColor={Colors.dark.textSecondary}
          >
            MapeIA v1.0.0
          </ThemedText>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  theme: any;
}

function SettingsItem({ icon, label, value, onPress, theme }: SettingsItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsItem,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.settingsItemLeft}>
        <Feather name={icon} size={22} color={theme.text} />
        <ThemedText style={styles.settingsItemLabel}>{label}</ThemedText>
      </View>
      <View style={styles.settingsItemRight}>
        {value ? (
          <ThemedText
            style={styles.settingsItemValue}
            lightColor={Colors.light.textSecondary}
            darkColor={Colors.dark.textSecondary}
          >
            {value}
          </ThemedText>
        ) : null}
        <Feather name="chevron-right" size={20} color={theme.tabIconDefault} />
      </View>
    </Pressable>
  );
}

interface LogoutButtonProps {
  onPress: () => void;
}

function LogoutButton({ onPress }: LogoutButtonProps) {
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
      style={[styles.logoutButton, animatedStyle]}
    >
      <Feather name="log-out" size={20} color={Colors.light.error} />
      <ThemedText
        style={styles.logoutText}
        lightColor={Colors.light.error}
        darkColor={Colors.dark.error}
      >
        Sair da conta
      </ThemedText>
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
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "700",
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  userTypeBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  settingsCard: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing["2xl"],
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsItemLabel: {
    fontSize: 16,
    marginLeft: Spacing.md,
  },
  settingsItemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsItemValue: {
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg + 22 + Spacing.md,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.error,
    gap: Spacing.sm,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  versionContainer: {
    alignItems: "center",
    marginTop: Spacing["3xl"],
  },
  versionText: {
    fontSize: 12,
  },
});
