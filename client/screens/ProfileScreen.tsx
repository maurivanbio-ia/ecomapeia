import React, { useState } from "react";
import { View, StyleSheet, Pressable, Alert, Platform, Modal, Linking, ScrollView } from "react-native";
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
import { useLanguage } from "@/contexts/LanguageContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Language } from "@/lib/translations";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);

  const handleLanguageSelect = (lang: Language) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguage(lang);
    setLanguageModalVisible(false);
  };

  const handleNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNotificationModalVisible(true);
  };

  const openDeviceSettings = async () => {
    if (Platform.OS === "web") {
      Alert.alert(t.notificationsTitle, t.notificationsWebMessage);
    } else {
      try {
        await Linking.openSettings();
      } catch (error) {
        Alert.alert(t.error, t.errorOpenSettings);
      }
    }
    setNotificationModalVisible(false);
  };

  const handleAbout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAboutModalVisible(true);
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (Platform.OS === "web") {
      logout();
    } else {
      Alert.alert(
        t.logoutConfirmTitle,
        t.logoutConfirmMessage,
        [
          { text: t.cancel, style: "cancel" },
          { 
            text: t.exit, 
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
          <ThemedText style={styles.sectionTitle}>{t.settings}</ThemedText>
          <View style={[styles.settingsCard, { backgroundColor: theme.backgroundDefault }]}>
            <SettingsItem
              icon="bell"
              label={t.notifications}
              onPress={handleNotifications}
              theme={theme}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="globe"
              label={t.language}
              value={language}
              onPress={() => setLanguageModalVisible(true)}
              theme={theme}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="info"
              label={t.aboutApp}
              onPress={handleAbout}
              theme={theme}
            />
          </View>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <LogoutButton onPress={handleLogout} label={t.logout} />
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

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setLanguageModalVisible(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={styles.modalTitle}>{t.selectLanguage}</ThemedText>
            
            {(["Português", "English", "Español"] as Language[]).map((lang) => (
              <Pressable
                key={lang}
                style={[
                  styles.languageOption,
                  language === lang && { backgroundColor: Colors.light.accent + "20" },
                ]}
                onPress={() => handleLanguageSelect(lang)}
              >
                <ThemedText style={styles.languageText}>{lang}</ThemedText>
                {language === lang ? (
                  <Feather name="check" size={20} color={Colors.light.accent} />
                ) : null}
              </Pressable>
            ))}

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setLanguageModalVisible(false)}
            >
              <ThemedText style={styles.modalCloseText}>{t.close}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={notificationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setNotificationModalVisible(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.notificationIconContainer}>
              <Feather name="bell" size={48} color={Colors.light.accent} />
            </View>
            <ThemedText style={styles.modalTitle}>{t.notificationsSettings}</ThemedText>
            
            <ThemedText style={styles.notificationDescription}>
              {Platform.OS === "web" 
                ? t.notificationsWebMessage
                : t.notificationsEnabled
              }
            </ThemedText>

            {Platform.OS !== "web" ? (
              <Pressable
                style={[styles.settingsButton, { backgroundColor: Colors.light.accent }]}
                onPress={openDeviceSettings}
              >
                <Feather name="settings" size={18} color="#FFFFFF" />
                <ThemedText style={styles.settingsButtonText}>{t.openSettings}</ThemedText>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setNotificationModalVisible(false)}
            >
              <ThemedText style={styles.modalCloseText}>{t.close}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* About App Modal */}
      <Modal
        visible={aboutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setAboutModalVisible(false)}
        >
          <Pressable style={[styles.aboutModalContent, { backgroundColor: theme.backgroundDefault }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.aboutHeader}>
                <View style={[styles.aboutLogoContainer, { backgroundColor: Colors.light.primary }]}>
                  <Feather name="map-pin" size={40} color="#FFFFFF" />
                </View>
                <ThemedText style={styles.aboutAppName}>MapeIA</ThemedText>
                <ThemedText style={styles.aboutVersion}>{t.version} 1.0.0</ThemedText>
              </View>

              <View style={styles.aboutSection}>
                <ThemedText style={styles.aboutSectionTitle}>{t.aboutTheApp}</ThemedText>
                <ThemedText style={styles.aboutText}>{t.appDescription1}</ThemedText>
                <ThemedText style={styles.aboutText}>{t.appDescription2}</ThemedText>
              </View>

              <View style={styles.aboutSection}>
                <ThemedText style={styles.aboutSectionTitle}>{t.features}</ThemedText>
                <View style={styles.featureItem}>
                  <Feather name="wifi-off" size={16} color={Colors.light.accent} />
                  <ThemedText style={styles.featureText}>{t.featureOffline}</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <Feather name="camera" size={16} color={Colors.light.accent} />
                  <ThemedText style={styles.featureText}>{t.featurePhotos}</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <Feather name="map" size={16} color={Colors.light.accent} />
                  <ThemedText style={styles.featureText}>{t.featurePolygon}</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <Feather name="navigation" size={16} color={Colors.light.accent} />
                  <ThemedText style={styles.featureText}>{t.featureGPS}</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <Feather name="file-text" size={16} color={Colors.light.accent} />
                  <ThemedText style={styles.featureText}>{t.featureReports}</ThemedText>
                </View>
              </View>

              <View style={styles.aboutSection}>
                <ThemedText style={styles.aboutSectionTitle}>{t.developedBy}</ThemedText>
                <View style={styles.developerInfo}>
                  <ThemedText style={styles.companyName}>
                    EcoBrasil Consultoria Ambiental
                  </ThemedText>
                  <ThemedText style={styles.developerName}>
                    {t.by} Maurivan Vaz Ribeiro
                  </ThemedText>
                  <ThemedText 
                    style={styles.cnpjText}
                    lightColor={Colors.light.textSecondary}
                    darkColor={Colors.dark.textSecondary}
                  >
                    CNPJ: 11.253.635/0001-17
                  </ThemedText>
                </View>
              </View>
            </ScrollView>

            <Pressable
              style={[styles.aboutCloseButton, { backgroundColor: Colors.light.accent }]}
              onPress={() => setAboutModalVisible(false)}
            >
              <ThemedText style={styles.aboutCloseText}>{t.close}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  label: string;
}

function LogoutButton({ onPress, label }: LogoutButtonProps) {
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
        {label}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  languageText: {
    fontSize: 16,
  },
  modalCloseButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  notificationIconContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  notificationDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  aboutModalContent: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "85%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  aboutHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  aboutLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  aboutAppName: {
    fontSize: 28,
    fontWeight: "800",
  },
  aboutVersion: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  aboutSection: {
    marginBottom: Spacing.xl,
  },
  aboutSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  featureText: {
    fontSize: 14,
  },
  developerInfo: {
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: Colors.light.accent + "10",
    borderRadius: BorderRadius.md,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  developerName: {
    fontSize: 14,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  cnpjText: {
    fontSize: 12,
    marginTop: Spacing.sm,
  },
  aboutCloseButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  aboutCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
