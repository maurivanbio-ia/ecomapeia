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
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Feather name="user" size={16} color={Colors.light.primary} />
            <ThemedText style={styles.cardTitle} numberOfLines={1}>
              {item.proprietario}
            </ThemedText>
          </View>
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
            <Feather
              name={item.status_upload === "synced" ? "check-circle" : "clock"}
              size={12}
              color="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.cardBody}>
          {item.municipio ? (
            <View style={styles.cardRow}>
              <Feather name="map-pin" size={14} color={theme.tabIconDefault} />
              <ThemedText style={styles.cardText}>{item.municipio}</ThemedText>
            </View>
          ) : null}

          <View style={styles.cardRow}>
            <Feather name="calendar" size={14} color={theme.tabIconDefault} />
            <ThemedText style={styles.cardText}>
              {new Date(item.data_vistoria).toLocaleDateString("pt-BR")}
            </ThemedText>
          </View>

          {item.tipo_intervencao && item.tipo_intervencao !== "NA" ? (
            <View style={styles.cardRow}>
              <Feather name="alert-triangle" size={14} color="#FFA500" />
              <ThemedText style={[styles.cardText, { color: "#FFA500" }]}>
                {item.tipo_intervencao}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.searchContainer,
          {
            marginTop: headerHeight + Spacing.md,
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    gap: Spacing.xs,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardText: {
    fontSize: 14,
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
