import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing } from "@/constants/theme";
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
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [`/api/team/historico-propriedade?proprietario=${encodeURIComponent(searchQuery)}`],
    enabled: searched && searchQuery.length > 2,
  });

  const history: VistoriaHistorico[] = data?.history || [];

  const handleSearch = () => {
    if (searchQuery.length > 2) {
      setSearched(true);
      refetch();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
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
      case "pendente":
        return Colors.light.warning;
      case "cancelada":
        return Colors.light.error;
      default:
        return Colors.light.textSecondary;
    }
  };

  const renderVistoriaItem = ({ item, index }: { item: VistoriaHistorico; index: number }) => (
    <Pressable
      style={styles.historyCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        (navigation as any).navigate("DetalhesVistoria", { vistoriaId: item.id });
      }}
    >
      <View style={styles.timelineContainer}>
        <View style={[styles.timelineDot, index === 0 && styles.timelineDotActive]} />
        {index < history.length - 1 && <View style={styles.timelineLine} />}
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.cardDate}>{formatDate(item.data_vistoria)}</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status_acao) + "20" }]}>
            <ThemedText style={[styles.statusText, { color: getStatusColor(item.status_acao) }]}>
              {item.status_acao || "Pendente"}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.cardTitle}>{item.tipo_inspecao || "Vistoria"}</ThemedText>
        
        <View style={styles.cardMeta}>
          <Feather name="map-pin" size={14} color={Colors.light.textSecondary} />
          <ThemedText style={styles.cardMetaText}>{item.municipio || "—"}</ThemedText>
        </View>

        {item.observacoes ? (
          <ThemedText style={styles.cardObservacoes} numberOfLines={2}>
            {item.observacoes}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Histórico</ThemedText>
        <ThemedText style={styles.subtitle}>Consulte vistorias anteriores por propriedade</ThemedText>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Nome do proprietário..."
            placeholderTextColor={Colors.light.textSecondary}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => {
              setSearchQuery("");
              setSearched(false);
            }}>
              <Feather name="x" size={20} color={Colors.light.textSecondary} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.searchButton, searchQuery.length < 3 && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={searchQuery.length < 3}
        >
          <Feather name="arrow-right" size={20} color="#fff" />
        </Pressable>
      </View>

      {!searched ? (
        <View style={styles.emptyContainer}>
          <Feather name="file-text" size={64} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>
            Pesquise por proprietário para ver o histórico
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Digite pelo menos 3 caracteres
          </ThemedText>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
          <ThemedText style={styles.loadingText}>Buscando histórico...</ThemedText>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={64} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>
            Nenhuma vistoria encontrada
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Não há registros para "{searchQuery}"
          </ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.resultsHeader}>
            <ThemedText style={styles.resultsCount}>
              {history.length} {history.length === 1 ? "registro" : "registros"} encontrado(s)
            </ThemedText>
            <ThemedText style={styles.resultsProprietario}>
              {history[0]?.proprietario}
            </ThemedText>
          </View>

          <FlatList
            data={history}
            renderItem={renderVistoriaItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.light.text,
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.light.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.md,
  },
  resultsHeader: {
    marginBottom: Spacing.md,
  },
  resultsCount: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  resultsProprietario: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  historyCard: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  timelineContainer: {
    width: 24,
    alignItems: "center",
    marginRight: Spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.textSecondary,
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  timelineDotActive: {
    backgroundColor: Colors.light.accent,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.light.border,
    marginTop: 4,
  },
  cardContent: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardMetaText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  cardObservacoes: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
    fontStyle: "italic",
    lineHeight: 18,
  },
});
