import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, Platform, Modal, Linking, ScrollView, Switch, Image, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import { getApiUrl } from "@/lib/query-client";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagsContext";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Language } from "@/lib/translations";
import { isBiometricAvailable, getBiometricType, authenticateWithBiometrics } from "@/lib/biometricAuth";
import { exportToJSON, exportToCSV } from "@/lib/exportData";
import { shareViaWhatsApp, shareViaEmail } from "@/lib/shareUtils";
import { resetTutorial } from "@/components/TutorialOverlay";
import { InteractiveTutorial } from "@/components/InteractiveTutorial";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BIOMETRIC_ENABLED_KEY = "@mapeia_biometric_enabled";

type ProfileNavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

interface TenantData {
  empresa: { id: number; nome: string; cnpj: string | null } | null;
  projetoAtual: { id: number; nome: string; codigo: string | null } | null;
  projetosDisponiveis: any[];
  isAdmin: boolean;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { themeMode, setThemeMode } = useThemeContext();
  const { user, logout, updateUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigation = useNavigation<ProfileNavigationProp>();

  const [avatarUploading, setAvatarUploading] = useState(false);

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão necessária", "Permita o acesso à galeria para escolher uma foto de perfil.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      setAvatarUploading(true);
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const base64 = `data:image/jpeg;base64,${compressed.base64}`;
      const res = await fetch(new URL("/api/auth/update-avatar", getApiUrl()).toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, avatarBase64: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await updateUser({ avatar_url: base64 });
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Não foi possível atualizar a foto de perfil.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    Alert.alert("Remover foto", "Deseja remover sua foto de perfil?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover", style: "destructive", onPress: async () => {
          setAvatarUploading(true);
          try {
            await fetch(new URL("/api/auth/update-avatar", getApiUrl()).toString(), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user?.id, avatarBase64: null }),
            });
            await updateUser({ avatar_url: undefined });
          } catch (e) {
            Alert.alert("Erro", "Não foi possível remover a foto.");
          } finally {
            setAvatarUploading(false);
          }
        }
      },
    ]);
  };

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [biometricModalVisible, setBiometricModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState("Biometria");
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const { flags, setFlag } = useFeatureFlags();

  const { data: vistorias = [] } = useQuery<any[]>({
    queryKey: [`/api/vistorias?usuario_id=${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: tenantData } = useQuery<TenantData>({
    queryKey: ["/api/tenant/usuarios", user?.id, "tenant"],
    queryFn: async () => {
      const response = await fetch(
        new URL(`/api/tenant/usuarios/${user?.id}/tenant`, getApiUrl()).toString()
      );
      if (!response.ok) throw new Error("Failed to fetch tenant data");
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    const available = await isBiometricAvailable();
    setBiometricAvailable(available);
    
    if (available) {
      const type = await getBiometricType();
      setBiometricType(type);
      
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(enabled === "true");
    }
  };

  const handleLanguageSelect = (lang: Language) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguage(lang);
    setLanguageModalVisible(false);
  };

  const handleThemeSelect = (mode: "light" | "dark" | "system") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeMode(mode);
    setThemeModalVisible(false);
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case "light": return t.lightMode;
      case "dark": return t.darkModeOption;
      case "system": return t.systemMode;
    }
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

  const handleBiometricToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!biometricAvailable) {
      Alert.alert(t.biometricTitle, t.biometricNotAvailable);
      return;
    }

    const prompt = biometricEnabled ? t.biometricDisablePrompt : t.biometricEnablePrompt;
    const result = await authenticateWithBiometrics(prompt);
    
    if (result.success) {
      const newValue = !biometricEnabled;
      setBiometricEnabled(newValue);
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, newValue.toString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    setBiometricModalVisible(false);
  };

  const handleExportJSON = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await exportToJSON(vistorias, `mapeia_backup_${Date.now()}`);
    
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t.success, t.backupSuccess);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t.error, t.backupError);
    }
    setBackupModalVisible(false);
  };

  const handleExportCSV = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const headers = ["id", "proprietario", "municipio", "data_vistoria", "status_upload"];
    const result = await exportToCSV(vistorias, `mapeia_backup_${Date.now()}`, headers);
    
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t.success, t.backupSuccess);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t.error, t.backupError);
    }
    setBackupModalVisible(false);
  };

  const handleShareWhatsApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await shareViaWhatsApp(t.shareMessage + " https://mapeia.replit.app");
    setShareModalVisible(false);
  };

  const handleShareEmail = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await shareViaEmail("", "MapeIA - Plataforma de Vistorias", t.shareMessage + " https://mapeia.replit.app");
    setShareModalVisible(false);
  };

  const handleResetTutorial = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await resetTutorial();
    setShowTutorial(true);
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
          <Pressable
            onPress={handlePickAvatar}
            onLongPress={user?.avatar_url ? handleRemoveAvatar : undefined}
            style={styles.avatarWrapper}
          >
            <View
              style={[
                styles.avatarContainer,
                { backgroundColor: Colors.light.primary },
              ]}
            >
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <ThemedText style={styles.avatarText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                  {user?.nome?.charAt(0).toUpperCase() || "U"}
                </ThemedText>
              )}
              {avatarUploading && (
                <View style={styles.avatarOverlayLoading}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              )}
            </View>
            <View style={[styles.avatarEditBadge, { backgroundColor: Colors.light.accent }]}>
              <Feather name="camera" size={13} color="#fff" />
            </View>
          </Pressable>
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

        {/* Empresa & Projeto Card */}
        <Animated.View entering={FadeInDown.duration(500).delay(150)}>
          <Pressable
            style={[styles.tenantCard, { backgroundColor: theme.backgroundDefault, borderColor: Colors.light.primary }]}
            onPress={() => {
              Haptics.selectionAsync();
              navigation.navigate("SelecionarProjeto");
            }}
          >
            <View style={styles.tenantCardContent}>
              <View style={[styles.tenantIcon, { backgroundColor: Colors.light.primary }]}>
                <Feather name="briefcase" size={20} color="#fff" />
              </View>
              <View style={styles.tenantInfo}>
                {tenantData?.projetoAtual ? (
                  <>
                    <ThemedText style={styles.tenantEmpresaNome} numberOfLines={1}>
                      {tenantData.projetoAtual.nome}
                    </ThemedText>
                    {tenantData?.empresa ? (
                      <ThemedText style={[styles.tenantProjetoNome, { color: theme.tabIconDefault }]} numberOfLines={1}>
                        {tenantData.empresa.nome}
                      </ThemedText>
                    ) : (
                      <ThemedText style={[styles.tenantProjetoNome, { color: Colors.light.primary }]} numberOfLines={1}>
                        UHE/PCH selecionada
                      </ThemedText>
                    )}
                  </>
                ) : tenantData?.empresa ? (
                  <>
                    <ThemedText style={styles.tenantEmpresaNome}>
                      {tenantData.empresa.nome}
                    </ThemedText>
                    <ThemedText style={[styles.tenantProjetoNome, { color: theme.tabIconDefault }]}>
                      Nenhum projeto selecionado
                    </ThemedText>
                  </>
                ) : (
                  <ThemedText style={styles.tenantEmpresaNome}>
                    Selecionar Empresa/Projeto
                  </ThemedText>
                )}
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={theme.tabIconDefault} />
          </Pressable>
        </Animated.View>

        {/* Admin Management Button - only for admins */}
        {tenantData?.isAdmin ? (
          <Animated.View entering={FadeInDown.duration(500).delay(175)}>
            <Pressable
              style={[styles.gestaoCard, { backgroundColor: "#8b5cf615", borderColor: "#8b5cf6" }]}
              onPress={() => {
                Haptics.selectionAsync();
                navigation.navigate("Gestao");
              }}
            >
              <View style={styles.tenantCardContent}>
                <View style={[styles.tenantIcon, { backgroundColor: "#8b5cf6" }]}>
                  <Feather name="settings" size={20} color="#fff" />
                </View>
                <View style={styles.tenantInfo}>
                  <ThemedText style={styles.tenantEmpresaNome}>
                    Gestão da Empresa
                  </ThemedText>
                  <ThemedText style={[styles.tenantProjetoNome, { color: theme.tabIconDefault }]}>
                    Projetos, equipe e dashboard
                  </ThemedText>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={theme.tabIconDefault} />
            </Pressable>
          </Animated.View>
        ) : null}

        {/* Appearance Settings */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <ThemedText style={styles.sectionTitle}>{t.settings}</ThemedText>
          <View style={[styles.settingsCard, { backgroundColor: theme.backgroundDefault }]}>
            <SettingsItem
              icon="sun"
              label={t.darkMode}
              value={getThemeLabel()}
              onPress={() => setThemeModalVisible(true)}
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
              icon="bell"
              label={t.notifications}
              onPress={handleNotifications}
              theme={theme}
            />
          </View>
        </Animated.View>

        {/* Security & Data */}
        <Animated.View entering={FadeInDown.duration(500).delay(250)}>
          <View style={[styles.settingsCard, { backgroundColor: theme.backgroundDefault }]}>
            {Platform.OS !== "web" ? (
              <>
                <SettingsItem
                  icon="smartphone"
                  label={t.biometricLogin}
                  value={biometricEnabled ? biometricType : ""}
                  onPress={() => setBiometricModalVisible(true)}
                  theme={theme}
                  showSwitch
                  switchValue={biometricEnabled}
                  onSwitchChange={handleBiometricToggle}
                />
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              </>
            ) : null}
            <SettingsItem
              icon="download-cloud"
              label={t.backupData}
              onPress={() => setBackupModalVisible(true)}
              theme={theme}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="share-2"
              label={t.shareApp}
              onPress={() => setShareModalVisible(true)}
              theme={theme}
            />
          </View>
        </Animated.View>

        {/* Data Collection Features */}
        <Animated.View entering={FadeInDown.duration(500).delay(280)}>
          <ThemedText style={styles.sectionTitle}>Coleta de Dados</ThemedText>
          <View style={[styles.settingsCard, { backgroundColor: theme.backgroundDefault }]}>
            <SettingsItem
              icon="shield"
              label="Unidades de Conservação"
              theme={theme}
              showSwitch
              switchValue={flags.uc}
              onSwitchChange={() => { Haptics.selectionAsync(); setFlag("uc", !flags.uc); }}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="alert-triangle"
              label="Risco de Embargo"
              theme={theme}
              showSwitch
              switchValue={flags.embargo}
              onSwitchChange={() => { Haptics.selectionAsync(); setFlag("embargo", !flags.embargo); }}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="cloud"
              label="Condicoes Climaticas"
              theme={theme}
              showSwitch
              switchValue={flags.weather}
              onSwitchChange={() => { Haptics.selectionAsync(); setFlag("weather", !flags.weather); }}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="map"
              label="MapBiomas (CAR)"
              theme={theme}
              showSwitch
              switchValue={flags.mapbiomas}
              onSwitchChange={() => { Haptics.selectionAsync(); setFlag("mapbiomas", !flags.mapbiomas); }}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="wind"
              label="Focos de Incendio (INPE)"
              theme={theme}
              showSwitch
              switchValue={flags.fireHotspots}
              onSwitchChange={() => { Haptics.selectionAsync(); setFlag("fireHotspots", !flags.fireHotspots); }}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsItem
              icon="check-circle"
              label="Analise de Conformidade (IA)"
              theme={theme}
              showSwitch
              switchValue={flags.compliance}
              onSwitchChange={() => { Haptics.selectionAsync(); setFlag("compliance", !flags.compliance); }}
            />
          </View>
        </Animated.View>

        {/* Help & About */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <View style={[styles.settingsCard, { backgroundColor: theme.backgroundDefault }]}>
            <SettingsItem
              icon="help-circle"
              label={t.resetTutorial}
              onPress={handleResetTutorial}
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
        <Animated.View entering={FadeInDown.duration(500).delay(350)}>
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

      {/* Theme Selection Modal */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setThemeModalVisible(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={styles.modalTitle}>{t.selectTheme}</ThemedText>
            
            {([
              { mode: "light" as const, label: t.lightMode, icon: "sun" as const },
              { mode: "dark" as const, label: t.darkModeOption, icon: "moon" as const },
              { mode: "system" as const, label: t.systemMode, icon: "smartphone" as const },
            ]).map((item) => (
              <Pressable
                key={item.mode}
                style={[
                  styles.languageOption,
                  themeMode === item.mode && { backgroundColor: Colors.light.accent + "20" },
                ]}
                onPress={() => handleThemeSelect(item.mode)}
              >
                <View style={styles.themeOptionRow}>
                  <Feather name={item.icon} size={20} color={theme.text} />
                  <ThemedText style={styles.themeOptionText}>{item.label}</ThemedText>
                </View>
                {themeMode === item.mode ? (
                  <Feather name="check" size={20} color={Colors.light.accent} />
                ) : null}
              </Pressable>
            ))}

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setThemeModalVisible(false)}
            >
              <ThemedText style={styles.modalCloseText}>{t.close}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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

      {/* Biometric Modal */}
      <Modal
        visible={biometricModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBiometricModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setBiometricModalVisible(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.notificationIconContainer}>
              <Feather name="smartphone" size={48} color={Colors.light.accent} />
            </View>
            <ThemedText style={styles.modalTitle}>{t.biometricTitle}</ThemedText>
            
            <ThemedText style={styles.notificationDescription}>
              {!biometricAvailable 
                ? t.biometricNotAvailable
                : biometricEnabled 
                  ? t.biometricEnabled 
                  : t.biometricDisabled
              }
            </ThemedText>

            {biometricAvailable ? (
              <Pressable
                style={[styles.settingsButton, { backgroundColor: biometricEnabled ? Colors.light.error : Colors.light.accent }]}
                onPress={handleBiometricToggle}
              >
                <Feather name={biometricEnabled ? "x" : "check"} size={18} color="#FFFFFF" />
                <ThemedText style={styles.settingsButtonText}>
                  {biometricEnabled ? t.disableBiometric : t.enableBiometric}
                </ThemedText>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setBiometricModalVisible(false)}
            >
              <ThemedText style={styles.modalCloseText}>{t.close}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Backup Modal */}
      <Modal
        visible={backupModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBackupModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setBackupModalVisible(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.notificationIconContainer}>
              <Feather name="download-cloud" size={48} color={Colors.light.accent} />
            </View>
            <ThemedText style={styles.modalTitle}>{t.backupTitle}</ThemedText>
            
            <ThemedText style={styles.notificationDescription}>
              {t.backupDescription}
            </ThemedText>

            <View style={styles.backupButtonsContainer}>
              <Pressable
                style={[styles.backupButton, { backgroundColor: Colors.light.accent }]}
                onPress={handleExportJSON}
              >
                <Feather name="file" size={18} color="#FFFFFF" />
                <ThemedText style={styles.settingsButtonText}>{t.exportJSON}</ThemedText>
              </Pressable>
              
              <Pressable
                style={[styles.backupButton, { backgroundColor: Colors.light.primary }]}
                onPress={handleExportCSV}
              >
                <Feather name="file-text" size={18} color="#FFFFFF" />
                <ThemedText style={styles.settingsButtonText}>{t.exportCSV}</ThemedText>
              </Pressable>
            </View>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setBackupModalVisible(false)}
            >
              <ThemedText style={styles.modalCloseText}>{t.close}</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Share Modal */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShareModalVisible(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.notificationIconContainer}>
              <Feather name="share-2" size={48} color={Colors.light.accent} />
            </View>
            <ThemedText style={styles.modalTitle}>{t.shareTitle}</ThemedText>

            <View style={styles.shareButtonsContainer}>
              <Pressable
                style={[styles.shareButton, { backgroundColor: "#25D366" }]}
                onPress={handleShareWhatsApp}
              >
                <Feather name="message-circle" size={24} color="#FFFFFF" />
                <ThemedText style={styles.shareButtonText}>{t.shareViaWhatsApp}</ThemedText>
              </Pressable>
              
              <Pressable
                style={[styles.shareButton, { backgroundColor: Colors.light.primary }]}
                onPress={handleShareEmail}
              >
                <Feather name="mail" size={24} color="#FFFFFF" />
                <ThemedText style={styles.shareButtonText}>{t.shareViaEmail}</ThemedText>
              </Pressable>
            </View>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setShareModalVisible(false)}
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
                <ThemedText style={styles.aboutAppName}>EcoMapeIA</ThemedText>
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
                    EcoIA - Inteligência Ambiental
                  </ThemedText>
                  <ThemedText style={styles.developerName}>
                    {t.by} Maurivan Vaz Ribeiro
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

      {showTutorial ? (
        <InteractiveTutorial
          forceShow={true}
          onClose={() => setShowTutorial(false)}
        />
      ) : null}
    </ThemedView>
  );
}

interface SettingsItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  theme: any;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: () => void;
}

function SettingsItem({ icon, label, value, onPress, theme, showSwitch, switchValue, onSwitchChange }: SettingsItemProps) {
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
        {showSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: "#767577", true: Colors.light.accent + "80" }}
            thumbColor={switchValue ? Colors.light.accent : "#f4f3f4"}
          />
        ) : (
          <Feather name="chevron-right" size={20} color={theme.tabIconDefault} />
        )}
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
  avatarWrapper: {
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarOverlayLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
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
    marginBottom: Spacing.xl,
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
  themeOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  themeOptionText: {
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
  backupButtonsContainer: {
    gap: Spacing.md,
  },
  backupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  shareButtonsContainer: {
    gap: Spacing.md,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  shareButtonText: {
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
  tenantCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    borderLeftWidth: 4,
  },
  tenantCardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  tenantIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tenantInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  tenantEmpresaNome: {
    fontSize: 15,
    fontWeight: "600",
  },
  tenantProjetoNome: {
    fontSize: 13,
    marginTop: 2,
  },
  gestaoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    borderLeftWidth: 4,
  },
});
