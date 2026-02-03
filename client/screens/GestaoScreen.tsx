import React from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import type { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

interface MenuItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  route: keyof ProfileStackParamList;
}

export default function GestaoScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const { data: tenantData } = useQuery({
    queryKey: ["/api/tenant/usuarios", user?.id, "tenant"],
    queryFn: async () => {
      const response = await fetch(
        new URL(`/api/tenant/usuarios/${user?.id}/tenant`, getApiUrl()).toString()
      );
      if (!response.ok) throw new Error("Failed to fetch tenant data");
      return response.json();
    },
    enabled: !!user?.id,
  });

  const menuItems: MenuItem[] = [
    {
      id: "projetos",
      title: "Gerenciar Projetos",
      description: "Criar, editar e arquivar projetos",
      icon: "folder",
      color: "#3b82f6",
      route: "GerenciarProjetos",
    },
    {
      id: "equipe",
      title: "Gerenciar Equipe",
      description: "Convidar usuários e definir permissões",
      icon: "users",
      color: "#8b5cf6",
      route: "GerenciarEquipe",
    },
    {
      id: "dashboard",
      title: "Dashboard da Empresa",
      description: "Visão consolidada e exportação de dados",
      icon: "bar-chart-2",
      color: "#22c55e",
      route: "DashboardEmpresa",
    },
  ];

  const handleMenuPress = (route: keyof ProfileStackParamList) => {
    Haptics.selectionAsync();
    navigation.navigate(route);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={[styles.empresaCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.empresaIcon, { backgroundColor: Colors.light.primary }]}>
              <Feather name="briefcase" size={24} color="#fff" />
            </View>
            <View style={styles.empresaInfo}>
              <ThemedText style={styles.empresaNome}>
                {tenantData?.empresa?.nome || "Carregando..."}
              </ThemedText>
              <ThemedText style={[styles.empresaCnpj, { color: theme.tabIconDefault }]}>
                {tenantData?.empresa?.cnpj || ""}
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        <ThemedText style={styles.sectionTitle}>Área Administrativa</ThemedText>

        {menuItems.map((item, index) => (
          <Animated.View
            key={item.id}
            entering={FadeInDown.duration(400).delay(100 + index * 100)}
          >
            <Pressable
              style={[styles.menuCard, { backgroundColor: theme.backgroundDefault }]}
              onPress={() => handleMenuPress(item.route)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + "15" }]}>
                <Feather name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <ThemedText style={styles.menuTitle}>{item.title}</ThemedText>
                <ThemedText style={[styles.menuDescription, { color: theme.tabIconDefault }]}>
                  {item.description}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.tabIconDefault} />
            </Pressable>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.statsContainer}>
          <ThemedText style={styles.sectionTitle}>Resumo Rápido</ThemedText>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={[styles.statValue, { color: "#3b82f6" }]}>
                {tenantData?.projetosDisponiveis?.length || 0}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.tabIconDefault }]}>
                Projetos
              </ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={[styles.statValue, { color: "#8b5cf6" }]}>
                -
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.tabIconDefault }]}>
                Usuários
              </ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={[styles.statValue, { color: "#22c55e" }]}>
                -
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.tabIconDefault }]}>
                Vistorias
              </ThemedText>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  empresaCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  empresaIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  empresaInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  empresaNome: {
    fontSize: 18,
    fontWeight: "700",
  },
  empresaCnpj: {
    fontSize: 14,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  menuContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  menuDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  statsContainer: {
    marginTop: Spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
});
