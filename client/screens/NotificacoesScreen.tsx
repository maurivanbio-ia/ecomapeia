import React from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import * as Haptics from "expo-haptics";

interface Notificacao {
  id: number;
  usuario_id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: number;
  vistoria_id: string | null;
  created_at: string;
}

const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
  info: "info",
  warning: "alert-triangle",
  success: "check-circle",
  error: "alert-circle",
};

const colorMap: Record<string, string> = {
  info: Colors.light.accent,
  warning: Colors.light.warning,
  success: Colors.light.success,
  error: Colors.light.error,
};

export default function NotificacoesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: [`/api/team/notificacoes/${user?.id}`],
    enabled: !!user?.id,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(
        new URL(`/api/team/notificacoes/${notificationId}/lida`, getApiUrl()).toString(),
        { method: "PUT" }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/team/notificacoes/${user?.id}`] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        new URL(`/api/team/notificacoes/usuario/${user?.id}/lidas`, getApiUrl()).toString(),
        { method: "PUT" }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/team/notificacoes/${user?.id}`] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const notifications: Notificacao[] = data?.notifications || [];
  const unreadCount = notifications.filter((n) => n.lida === 0).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  const handleNotificationPress = (notification: Notificacao) => {
    if (notification.lida === 0) {
      markReadMutation.mutate(notification.id);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderNotification = ({ item }: { item: Notificacao }) => {
    const iconName = iconMap[item.tipo] || "bell";
    const iconColor = colorMap[item.tipo] || Colors.light.accent;
    const isUnread = item.lida === 0;

    return (
      <Pressable
        style={[styles.notificationCard, isUnread && styles.notificationUnread]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + "20" }]}>
          <Feather name={iconName} size={20} color={iconColor} />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <ThemedText style={[styles.title, isUnread && styles.titleUnread]}>
              {item.titulo}
            </ThemedText>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <ThemedText style={styles.message} numberOfLines={2}>
            {item.mensagem}
          </ThemedText>
          <ThemedText style={styles.time}>{formatDate(item.created_at)}</ThemedText>
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.screenTitle}>Notificações</ThemedText>
          {unreadCount > 0 && (
            <ThemedText style={styles.unreadCount}>
              {unreadCount} {unreadCount === 1 ? "não lida" : "não lidas"}
            </ThemedText>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable
            style={styles.markAllButton}
            onPress={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <Feather name="check-circle" size={18} color={Colors.light.accent} />
            <ThemedText style={styles.markAllText}>Marcar todas</ThemedText>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="bell-off" size={64} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>Sem notificações</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Você receberá notificações sobre vistorias e tarefas aqui
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  unreadCount: {
    fontSize: 14,
    color: Colors.light.accent,
    marginTop: 4,
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.accent + "15",
  },
  markAllText: {
    fontSize: 13,
    color: Colors.light.accent,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.textSecondary,
    marginTop: Spacing.lg,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: Spacing.sm,
  },
  notificationCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.md,
  },
  notificationUnread: {
    backgroundColor: Colors.light.accent + "08",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.light.text,
  },
  titleUnread: {
    fontWeight: "700",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.accent,
  },
  message: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  time: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 6,
  },
});
