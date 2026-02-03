import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { VistoriasStackParamList } from "@/navigation/VistoriasStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type NavigationProp = NativeStackNavigationProp<VistoriasStackParamList>;

interface Vistoria {
  id: string;
  proprietario: string;
  municipio: string;
  data_vistoria: string;
  tipo_intervencao: string;
  status_upload: string;
}

export default function VistoriasScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: vistorias = [], isLoading, refetch, isRefetching } = useQuery<Vistoria[]>({
    queryKey: [`/api/vistorias?usuario_id=${user?.id}`],
    enabled: !!user?.id,
  });

  const filteredVistorias = vistorias.filter((v) =>
    v.proprietario?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.municipio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewVistoria = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("NovaVistoria");
  };

  const renderEmptyState = () => (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}
    >
      <Feather name="clipboard" size={56} color={theme.tabIconDefault} />
      <ThemedText style={styles.emptyTitle}>
        Nenhuma vistoria encontrada
      </ThemedText>
      <ThemedText
        style={styles.emptySubtitle}
        lightColor={Colors.light.textSecondary}
        darkColor={Colors.dark.textSecondary}
      >
        Toque no botão + para criar sua primeira vistoria
      </ThemedText>
    </Animated.View>
  );

  const renderVistoriaItem = ({ item }: { item: Vistoria }) => (
    <Animated.View entering={FadeIn.duration(300)}>
      <Pressable
        style={[
          styles.vistoriaCard,
          { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        ]}
        onPress={() => {
          Haptics.selectionAsync();
          navigation.navigate("DetalhesVistoria", { vistoriaId: item.id });
        }}
        testID={`vistoria-card-${item.id}`}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardInfo}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardTitle} numberOfLines={1}>
                {item.proprietario}
              </ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item.status_upload === "synced"
                        ? Colors.light.accent
                        : "#FFA500",
                  },
                ]}
              >
                <ThemedText style={styles.statusText}>
                  {item.status_upload === "synced" ? "Sincronizado" : "Pendentes"}
                </ThemedText>
              </View>
            </View>

            <ThemedText style={[styles.cardDate, { color: theme.tabIconDefault }]}>
              {new Date(item.data_vistoria).toLocaleDateString("pt-BR")}
            </ThemedText>
          </View>

          <View style={styles.chevronContainer}>
            <Feather name="chevron-right" size={20} color={theme.tabIconDefault} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.quickActions, { marginTop: headerHeight + Spacing.md }]}>
        <Pressable
          style={[styles.quickActionButton, { backgroundColor: Colors.light.accent + "15" }]}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Feather name="bar-chart-2" size={18} color={Colors.light.accent} />
          <ThemedText style={[styles.quickActionText, { color: Colors.light.accent }]}>Dashboard</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.quickActionButton, { backgroundColor: Colors.light.success + "15" }]}
          onPress={() => navigation.navigate("Equipes")}
        >
          <Feather name="users" size={18} color={Colors.light.success} />
          <ThemedText style={[styles.quickActionText, { color: Colors.light.success }]}>Equipes</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.quickActionButton, { backgroundColor: Colors.light.warning + "15" }]}
          onPress={() => navigation.navigate("HistoricoPropriedade")}
        >
          <Feather name="clock" size={18} color={Colors.light.warning} />
          <ThemedText style={[styles.quickActionText, { color: Colors.light.warning }]}>Histórico</ThemedText>
        </Pressable>
      </View>

      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <Feather name="search" size={20} color={theme.tabIconDefault} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar vistorias..."
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

      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: tabBarHeight + Spacing["5xl"],
          },
          filteredVistorias.length === 0 && { flex: 1 },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        data={filteredVistorias}
        keyExtractor={(item) => item.id}
        renderItem={renderVistoriaItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.link}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      />

      <FAB onPress={handleNewVistoria} tabBarHeight={tabBarHeight} />
    </ThemedView>
  );
}

interface FABProps {
  onPress: () => void;
  tabBarHeight: number;
}

function FAB({ onPress, tabBarHeight }: FABProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.fab,
        { bottom: tabBarHeight + Spacing.lg },
        animatedStyle,
      ]}
    >
      <Feather name="plus" size={28} color="#FFFFFF" />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: Spacing.sm,
    height: "100%",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  emptyState: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing["4xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: Spacing.xl,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  vistoriaCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  cardDate: {
    fontSize: 14,
  },
  chevronContainer: {
    marginLeft: Spacing.md,
    padding: Spacing.xs,
  },
  fab: {
    position: "absolute",
    right: Spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
