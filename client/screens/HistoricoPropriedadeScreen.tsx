import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";
import * as Haptics from "expo-haptics";

interface VistoriaHistorico {
  id: string;
  proprietario: string;
  municipio: string;
  data_vistoria: string;
  tipo_inspecao: string;
  status_acao: string;
  observacoes: string;
}

export default function HistoricoPropriedadeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (searchQuery.length === 0) {
      setDebouncedQuery("");
      return;
    }
    timer.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [searchQuery]);

  const isReady = debouncedQuery.length >= 3;

  const { data, isLoading, isFetching } = useQuery<{ success: boolean; history: VistoriaHistorico[] }>({
    queryKey: ["/api/team/historico-propriedade", debouncedQuery],
    queryFn: async () => {
      const url = new URL(
        `/api/team/historico-propriedade?proprietario=${encodeURIComponent(debouncedQuery)}`,
        getApiUrl()
      );
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao buscar histórico");
      return res.json();
    },
    enabled: isReady,
    staleTime: 30_000,
  });

  const history: VistoriaHistorico[] = data?.history ?? [];
  const loading = (isLoading || isFetching) && isReady;

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "concluída":
      case "concluida":
        return Colors.light.success;
      case "em andamento":
        return Colors.light.primary;
      case "pendente":
        return Colors.light.warning;
      case "cancelada":
        return Colors.light.error;
      default:
        return theme.tabIconDefault;
    }
  };

  const renderItem = ({ item, index }: { item: VistoriaHistorico; index: number }) => (
    <Pressable
      testID={`card-historico-${item.id}`}
      style={styles.row}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        (navigation as any).navigate("DetalhesVistoria", { vistoriaId: item.id });
      }}
    >
      <View style={styles.timeline}>
        <View style={[styles.dot, { backgroundColor: index === 0 ? Colors.light.primary : theme.tabIconDefault }]} />
        {index < history.length - 1 ? (
          <View style={[styles.line, { backgroundColor: theme.tabIconDefault + "40" }]} />
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
        <View style={styles.cardTop}>
          <ThemedText style={[styles.dateText, { color: theme.tabIconDefault }]}>
            {formatDate(item.data_vistoria)}
          </ThemedText>
          <View style={[styles.badge, { backgroundColor: getStatusColor(item.status_acao) + "20" }]}>
            <ThemedText style={[styles.badgeText, { color: getStatusColor(item.status_acao) }]}>
              {item.status_acao || "Pendente"}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={[styles.tipo, { color: theme.text }]}>
          {item.tipo_inspecao || "Vistoria de Campo"}
        </ThemedText>

        {item.municipio ? (
          <View style={styles.metaRow}>
            <Feather name="map-pin" size={13} color={theme.tabIconDefault} />
            <ThemedText style={[styles.metaText, { color: theme.tabIconDefault }]}>
              {item.municipio}
            </ThemedText>
          </View>
        ) : null}

        {item.observacoes ? (
          <ThemedText style={[styles.obs, { color: theme.tabIconDefault }]} numberOfLines={2}>
            {item.observacoes}
          </ThemedText>
        ) : null}

        <View style={styles.linkRow}>
          <ThemedText style={[styles.linkText, { color: Colors.light.primary }]}>Ver detalhes</ThemedText>
          <Feather name="chevron-right" size={13} color={Colors.light.primary} />
        </View>
      </View>
    </Pressable>
  );

  const renderContent = () => {
    if (!isReady) {
      return (
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.light.primary + "15" }]}>
            <Feather name="clock" size={36} color={Colors.light.primary} />
          </View>
          <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
            Histórico de Propriedade
          </ThemedText>
          <ThemedText style={[styles.emptyBody, { color: theme.tabIconDefault }]}>
            Digite o nome do proprietário para ver todas as vistorias realizadas naquela propriedade ao longo do tempo.
          </ThemedText>
          {searchQuery.length > 0 && searchQuery.length < 3 ? (
            <ThemedText style={[styles.hint, { color: theme.tabIconDefault }]}>
              Continue digitando — mínimo 3 caracteres
            </ThemedText>
          ) : null}
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <ThemedText style={[styles.emptyBody, { color: theme.tabIconDefault, marginTop: Spacing.md }]}>
            Buscando vistorias para "{debouncedQuery}"...
          </ThemedText>
        </View>
      );
    }

    if (history.length === 0) {
      return (
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="search" size={36} color={theme.tabIconDefault} />
          </View>
          <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
            Nenhum resultado
          </ThemedText>
          <ThemedText style={[styles.emptyBody, { color: theme.tabIconDefault }]}>
            Nenhuma vistoria encontrada para "{debouncedQuery}".{"\n"}Verifique a grafia ou tente com parte do nome.
          </ThemedText>
        </View>
      );
    }

    return (
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={[styles.resultBanner, { backgroundColor: Colors.light.primary + "12", borderColor: Colors.light.primary + "30" }]}>
            <Feather name="user" size={15} color={Colors.light.primary} />
            <ThemedText style={[styles.resultBannerText, { color: Colors.light.primary }]}>
              {history.length} vistoria{history.length !== 1 ? "s" : ""} para{" "}
              <ThemedText style={{ fontWeight: "700" }}>{history[0]?.proprietario}</ThemedText>
            </ThemedText>
          </View>
        }
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.searchBar, { paddingTop: headerHeight + Spacing.sm, backgroundColor: theme.backgroundDefault, borderBottomColor: theme.border }]}>
        <View style={[styles.inputWrap, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Feather name="search" size={18} color={theme.tabIconDefault} />
          <TextInput
            testID="input-search-proprietario"
            style={[styles.input, { color: theme.text }]}
            placeholder="Digite o nome do proprietário..."
            placeholderTextColor={theme.tabIconDefault}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
            returnKeyType="search"
            onSubmitEditing={() => setDebouncedQuery(searchQuery)}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => { setSearchQuery(""); setDebouncedQuery(""); }} hitSlop={8}>
              <Feather name="x" size={16} color={theme.tabIconDefault} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {renderContent()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  resultBannerText: {
    fontSize: 13,
    flex: 1,
  },
  list: {
    padding: Spacing.md,
  },
  row: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  timeline: {
    alignItems: "center",
    width: 20,
    marginRight: Spacing.sm,
    paddingTop: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  line: {
    flex: 1,
    width: 2,
    marginTop: 4,
    marginBottom: -Spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  tipo: {
    fontSize: 15,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 13,
  },
  obs: {
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    marginTop: Spacing.xs,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
