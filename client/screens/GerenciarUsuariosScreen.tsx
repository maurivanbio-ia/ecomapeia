import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";

interface UsuarioAdmin {
  id: number;
  nome: string;
  email: string;
  tipo_usuario: string;
  is_admin: boolean;
  complexo_id: number | null;
  projeto_atual_id: number | null;
  empresa_id: number;
  complexo_nome: string | null;
  projeto_nome: string | null;
}

interface Complexo {
  id: number;
  nome: string;
}

interface Projeto {
  id: number;
  nome: string;
  complexo_id: number;
}

const TIPOS_USUARIO = ["Fiscal", "Técnico", "Coordenador", "Gerente"];

const ROLE_COLORS: Record<string, string> = {
  Fiscal: "#6366F1",
  Técnico: "#0EA5E9",
  Coordenador: "#F59E0B",
  Gerente: "#10B981",
};

export default function GerenciarUsuariosScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<UsuarioAdmin | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTipo, setEditTipo] = useState("");
  const [editComplexoId, setEditComplexoId] = useState<number | null>(null);
  const [editProjetoId, setEditProjetoId] = useState<number | null>(null);
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [filterComplexo, setFilterComplexo] = useState<number | null>(null);

  const empresaId = user?.empresa_id || 4;

  const { data: usuarios = [], isLoading } = useQuery<UsuarioAdmin[]>({
    queryKey: [`/api/tenant/admin/usuarios?empresa_id=${empresaId}`],
    enabled: !!user?.is_admin || user?.tipo_usuario === "Coordenador",
  });

  const { data: complexos = [] } = useQuery<Complexo[]>({
    queryKey: ["/api/complexos"],
  });

  const { data: projetos = [] } = useQuery<Projeto[]>({
    queryKey: ["/api/complexos/all-uhes"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      userId: number;
      tipo_usuario: string;
      complexo_id: number | null;
      projeto_atual_id: number | null;
      is_admin: boolean;
    }) => {
      return apiRequest("PUT", `/api/tenant/admin/usuarios/${data.userId}`, {
        tipo_usuario: data.tipo_usuario,
        complexo_id: data.complexo_id,
        projeto_atual_id: data.projeto_atual_id,
        is_admin: data.is_admin,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenant/admin/usuarios?empresa_id=${empresaId}`],
      });
      setEditModalVisible(false);
      setSelectedUser(null);
    },
    onError: () => {
      Alert.alert("Erro", "Não foi possível atualizar o usuário.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("DELETE", `/api/tenant/admin/usuarios/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tenant/admin/usuarios?empresa_id=${empresaId}`],
      });
    },
    onError: () => {
      Alert.alert("Erro", "Não foi possível remover o usuário.");
    },
  });

  const openEdit = (u: UsuarioAdmin) => {
    setSelectedUser(u);
    setEditTipo(u.tipo_usuario);
    setEditComplexoId(u.complexo_id);
    setEditProjetoId(u.projeto_atual_id);
    setEditIsAdmin(u.is_admin);
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!selectedUser) return;
    updateMutation.mutate({
      userId: selectedUser.id,
      tipo_usuario: editTipo,
      complexo_id: editComplexoId,
      projeto_atual_id: editProjetoId,
      is_admin: editIsAdmin,
    });
  };

  const handleDelete = (u: UsuarioAdmin) => {
    Alert.alert(
      "Remover Usuário",
      `Deseja remover ${u.nome} permanentemente?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => deleteMutation.mutate(u.id),
        },
      ]
    );
  };

  const filteredProjects = editComplexoId
    ? projetos.filter((p) => p.complexo_id === editComplexoId)
    : projetos;

  const filtered = usuarios.filter((u) => {
    const matchText =
      !filterText ||
      u.nome.toLowerCase().includes(filterText.toLowerCase()) ||
      u.email.toLowerCase().includes(filterText.toLowerCase());
    const matchComplexo =
      filterComplexo === null || u.complexo_id === filterComplexo;
    return matchText && matchComplexo;
  });

  const grouped: Record<string, UsuarioAdmin[]> = {};
  for (const u of filtered) {
    const key = u.complexo_nome || "Sem Complexo";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(u);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="search" size={16} color={theme.tabIconDefault} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar usuário..."
            placeholderTextColor={theme.tabIconDefault}
            value={filterText}
            onChangeText={setFilterText}
          />
          {filterText.length > 0 ? (
            <Pressable onPress={() => setFilterText("")}>
              <Feather name="x" size={16} color={theme.tabIconDefault} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={{ gap: Spacing.sm }}
        >
          <Pressable
            onPress={() => setFilterComplexo(null)}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filterComplexo === null
                    ? Colors.light.primary
                    : theme.backgroundSecondary,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.filterChipText,
                { color: filterComplexo === null ? "#fff" : theme.text },
              ]}
            >
              Todos
            </ThemedText>
          </Pressable>
          {complexos.map((c) => (
            <Pressable
              key={c.id}
              onPress={() =>
                setFilterComplexo(filterComplexo === c.id ? null : c.id)
              }
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    filterComplexo === c.id
                      ? Colors.light.primary
                      : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.filterChipText,
                  { color: filterComplexo === c.id ? "#fff" : theme.text },
                ]}
              >
                {c.nome}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <ThemedText style={[styles.loadingText, { color: theme.tabIconDefault }]}>
              Carregando usuários...
            </ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText style={styles.statValue}>
                  {usuarios.length}
                </ThemedText>
                <ThemedText
                  style={[styles.statLabel, { color: theme.tabIconDefault }]}
                >
                  Total
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText style={styles.statValue}>
                  {usuarios.filter((u) => u.is_admin).length}
                </ThemedText>
                <ThemedText
                  style={[styles.statLabel, { color: theme.tabIconDefault }]}
                >
                  Admins
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText style={styles.statValue}>
                  {filtered.length}
                </ThemedText>
                <ThemedText
                  style={[styles.statLabel, { color: theme.tabIconDefault }]}
                >
                  Filtrados
                </ThemedText>
              </View>
            </View>

            {Object.entries(grouped).map(([complexoNome, users]) => (
              <View key={complexoNome} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Feather
                    name="layers"
                    size={14}
                    color={Colors.light.primary}
                  />
                  <ThemedText style={styles.groupTitle}>
                    {complexoNome}
                  </ThemedText>
                  <View
                    style={[
                      styles.groupBadge,
                      { backgroundColor: Colors.light.primary + "20" },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.groupBadgeText,
                        { color: Colors.light.primary },
                      ]}
                    >
                      {users.length}
                    </ThemedText>
                  </View>
                </View>

                {users.map((u) => (
                  <View
                    key={u.id}
                    style={[
                      styles.userCard,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <View
                      style={[
                        styles.userAvatar,
                        {
                          backgroundColor:
                            ROLE_COLORS[u.tipo_usuario] ||
                            Colors.light.primary + "30",
                        },
                      ]}
                    >
                      <ThemedText style={styles.userAvatarText}>
                        {u.nome.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>

                    <View style={styles.userInfo}>
                      <View style={styles.userNameRow}>
                        <ThemedText style={styles.userName} numberOfLines={1}>
                          {u.nome}
                        </ThemedText>
                        {u.is_admin ? (
                          <View
                            style={[
                              styles.adminBadge,
                              { backgroundColor: "#F59E0B20" },
                            ]}
                          >
                            <Feather
                              name="shield"
                              size={10}
                              color="#F59E0B"
                            />
                            <ThemedText
                              style={[
                                styles.adminBadgeText,
                                { color: "#F59E0B" },
                              ]}
                            >
                              Admin
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                      <ThemedText
                        style={[
                          styles.userEmail,
                          { color: theme.tabIconDefault },
                        ]}
                        numberOfLines={1}
                      >
                        {u.email}
                      </ThemedText>
                      <View style={styles.userMeta}>
                        <View
                          style={[
                            styles.roleBadge,
                            {
                              backgroundColor:
                                (ROLE_COLORS[u.tipo_usuario] || Colors.light.primary) + "20",
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.roleBadgeText,
                              {
                                color:
                                  ROLE_COLORS[u.tipo_usuario] ||
                                  Colors.light.primary,
                              },
                            ]}
                          >
                            {u.tipo_usuario}
                          </ThemedText>
                        </View>
                        {u.projeto_nome ? (
                          <ThemedText
                            style={[
                              styles.projetoText,
                              { color: theme.tabIconDefault },
                            ]}
                            numberOfLines={1}
                          >
                            {u.projeto_nome}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.userActions}>
                      <Pressable
                        onPress={() => openEdit(u)}
                        style={[
                          styles.actionBtn,
                          { backgroundColor: Colors.light.primary + "15" },
                        ]}
                        testID={`button-edit-user-${u.id}`}
                      >
                        <Feather
                          name="edit-2"
                          size={14}
                          color={Colors.light.primary}
                        />
                      </Pressable>
                      {u.id !== Number(user?.id) ? (
                        <Pressable
                          onPress={() => handleDelete(u)}
                          style={[
                            styles.actionBtn,
                            { backgroundColor: Colors.light.error + "15" },
                          ]}
                          testID={`button-delete-user-${u.id}`}
                        >
                          <Feather
                            name="trash-2"
                            size={14}
                            color={Colors.light.error}
                          />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ))}

            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="users" size={48} color={theme.tabIconDefault} />
                <ThemedText
                  style={[styles.emptyText, { color: theme.tabIconDefault }]}
                >
                  Nenhum usuário encontrado
                </ThemedText>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Editar Usuário</ThemedText>
              <Pressable onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={22} color={theme.tabIconDefault} />
              </Pressable>
            </View>

            {selectedUser ? (
              <>
                <ThemedText
                  style={[styles.modalSubtitle, { color: theme.tabIconDefault }]}
                >
                  {selectedUser.nome}
                </ThemedText>

                <ThemedText style={styles.fieldLabel}>Tipo de Usuário</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.typeRow}>
                    {TIPOS_USUARIO.map((tipo) => (
                      <Pressable
                        key={tipo}
                        onPress={() => setEditTipo(tipo)}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor:
                              editTipo === tipo
                                ? ROLE_COLORS[tipo] || Colors.light.primary
                                : theme.backgroundSecondary,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.typeChipText,
                            {
                              color: editTipo === tipo ? "#fff" : theme.text,
                            },
                          ]}
                        >
                          {tipo}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                <ThemedText style={styles.fieldLabel}>Complexo</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.typeRow}>
                    <Pressable
                      onPress={() => {
                        setEditComplexoId(null);
                        setEditProjetoId(null);
                      }}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor:
                            editComplexoId === null
                              ? theme.tabIconDefault
                              : theme.backgroundSecondary,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.typeChipText,
                          { color: editComplexoId === null ? "#fff" : theme.text },
                        ]}
                      >
                        Nenhum
                      </ThemedText>
                    </Pressable>
                    {complexos.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          setEditComplexoId(c.id);
                          setEditProjetoId(null);
                        }}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor:
                              editComplexoId === c.id
                                ? Colors.light.primary
                                : theme.backgroundSecondary,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.typeChipText,
                            {
                              color:
                                editComplexoId === c.id ? "#fff" : theme.text,
                            },
                          ]}
                        >
                          {c.nome}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                <ThemedText style={styles.fieldLabel}>Projeto/UHE</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.typeRow}>
                    <Pressable
                      onPress={() => setEditProjetoId(null)}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor:
                            editProjetoId === null
                              ? theme.tabIconDefault
                              : theme.backgroundSecondary,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.typeChipText,
                          { color: editProjetoId === null ? "#fff" : theme.text },
                        ]}
                      >
                        Nenhum
                      </ThemedText>
                    </Pressable>
                    {filteredProjects.map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => setEditProjetoId(p.id)}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor:
                              editProjetoId === p.id
                                ? Colors.light.success
                                : theme.backgroundSecondary,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.typeChipText,
                            {
                              color:
                                editProjetoId === p.id ? "#fff" : theme.text,
                            },
                          ]}
                        >
                          {p.nome}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                <Pressable
                  onPress={() => setEditIsAdmin(!editIsAdmin)}
                  style={[
                    styles.adminToggle,
                    {
                      backgroundColor: editIsAdmin
                        ? "#F59E0B20"
                        : theme.backgroundSecondary,
                      borderColor: editIsAdmin ? "#F59E0B" : theme.border,
                    },
                  ]}
                >
                  <Feather
                    name={editIsAdmin ? "shield" : "shield-off"}
                    size={18}
                    color={editIsAdmin ? "#F59E0B" : theme.tabIconDefault}
                  />
                  <ThemedText
                    style={[
                      styles.adminToggleText,
                      {
                        color: editIsAdmin ? "#F59E0B" : theme.tabIconDefault,
                      },
                    ]}
                  >
                    {editIsAdmin ? "Administrador" : "Usuário Padrão"}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={handleSaveEdit}
                  disabled={updateMutation.isPending}
                  style={[
                    styles.saveBtn,
                    { backgroundColor: Colors.light.primary },
                    updateMutation.isPending && { opacity: 0.6 },
                  ]}
                  testID="button-save-user-edit"
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name="check" size={18} color="#fff" />
                      <ThemedText style={styles.saveBtnText}>
                        Salvar Alterações
                      </ThemedText>
                    </>
                  )}
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 2,
  },
  filterRow: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  group: {
    gap: Spacing.sm,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  groupBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 12,
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  projetoText: {
    fontSize: 11,
    flex: 1,
  },
  userActions: {
    gap: Spacing.xs,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: -Spacing.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: -Spacing.xs,
  },
  typeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  adminToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  adminToggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
