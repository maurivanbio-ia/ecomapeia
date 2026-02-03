import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, TextInput, Modal, ActivityIndicator, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { useAuth } from "@/hooks/useAuth";
import * as Haptics from "expo-haptics";

interface Equipe {
  id: number;
  nome: string;
  descricao: string | null;
  responsavel_id: string | null;
  created_at: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: string;
}

const TEAM_COLORS = [
  { id: "green", color: "#2E7D32", label: "Verde" },
  { id: "blue", color: "#1565C0", label: "Azul" },
  { id: "orange", color: "#EF6C00", label: "Laranja" },
  { id: "purple", color: "#7B1FA2", label: "Roxo" },
  { id: "red", color: "#C62828", label: "Vermelho" },
  { id: "teal", color: "#00838F", label: "Azul-petróleo" },
];

const AREAS_ATUACAO = [
  "Margem Esquerda",
  "Margem Direita",
  "Setor Norte",
  "Setor Sul",
  "Setor Central",
  "Área de Preservação",
  "Reservatório Principal",
];

export default function EquipesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Equipe | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0].id);
  const [newTeamArea, setNewTeamArea] = useState("");
  const [selectedResponsavel, setSelectedResponsavel] = useState<string | null>(null);

  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: ["/api/team/equipes"],
  });

  const { data: usersData } = useQuery({
    queryKey: ["/api/team/usuarios"],
  });

  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: [`/api/team/equipes/${selectedTeam?.id}/membros`],
    enabled: !!selectedTeam,
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: { nome: string; descricao: string; cor?: string; area_atuacao?: string }) => {
      const response = await apiRequest("POST", "/api/team/equipes", {
        ...data,
        responsavel_id: selectedResponsavel || user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/equipes"] });
      setShowCreateModal(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const resetForm = () => {
    setNewTeamName("");
    setNewTeamDescription("");
    setNewTeamColor(TEAM_COLORS[0].id);
    setNewTeamArea("");
    setSelectedResponsavel(null);
  };

  const addMemberMutation = useMutation({
    mutationFn: async (data: { equipe_id: number; usuario_id: string }) => {
      const response = await apiRequest("POST", `/api/team/equipes/${data.equipe_id}/membros`, {
        usuario_id: data.usuario_id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/team/equipes/${selectedTeam?.id}/membros`] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (data: { equipe_id: number; membro_id: number }) => {
      const response = await fetch(
        new URL(`/api/team/equipes/${data.equipe_id}/membros/${data.membro_id}`, getApiUrl()).toString(),
        { method: "DELETE" }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/team/equipes/${selectedTeam?.id}/membros`] });
    },
  });

  const teams: Equipe[] = (teamsData as any)?.teams || [];
  const users: Usuario[] = (usersData as any)?.users || [];
  const members = (membersData as any)?.members || [];

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) {
      Alert.alert("Erro", "Nome da equipe é obrigatório");
      return;
    }
    
    const teamColor = TEAM_COLORS.find(c => c.id === newTeamColor)?.color || TEAM_COLORS[0].color;
    const descricaoCompleta = [
      newTeamDescription,
      newTeamArea ? `Área: ${newTeamArea}` : null,
    ].filter(Boolean).join("\n");

    createTeamMutation.mutate({
      nome: newTeamName,
      descricao: descricaoCompleta,
      cor: teamColor,
      area_atuacao: newTeamArea,
    });
  };

  const handleAddMember = (usuario: Usuario) => {
    if (!selectedTeam) return;
    
    const isAlreadyMember = members.some((m: any) => m.usuario.id === usuario.id);
    if (isAlreadyMember) {
      Alert.alert("Aviso", "Este usuário já é membro da equipe");
      return;
    }

    addMemberMutation.mutate({
      equipe_id: selectedTeam.id,
      usuario_id: usuario.id,
    });
  };

  const handleRemoveMember = (membroId: number) => {
    if (!selectedTeam) return;
    
    Alert.alert(
      "Remover membro",
      "Tem certeza que deseja remover este membro da equipe?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => removeMemberMutation.mutate({
            equipe_id: selectedTeam.id,
            membro_id: membroId,
          }),
        },
      ]
    );
  };

  const renderTeamItem = ({ item }: { item: Equipe }) => (
    <Pressable
      style={styles.teamCard}
      onPress={() => {
        setSelectedTeam(item);
        setShowMembersModal(true);
      }}
    >
      <View style={styles.teamIcon}>
        <Feather name="users" size={24} color={Colors.light.accent} />
      </View>
      <View style={styles.teamInfo}>
        <ThemedText style={styles.teamName}>{item.nome}</ThemedText>
        {item.descricao ? (
          <ThemedText style={styles.teamDescription}>{item.descricao}</ThemedText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={20} color={Colors.light.textSecondary} />
    </Pressable>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: Spacing.lg }]}>
      {loadingTeams ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
        </View>
      ) : teams.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="users" size={64} color={Colors.light.textSecondary} />
          <ThemedText style={styles.emptyText}>Nenhuma equipe criada</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Crie uma equipe para organizar os técnicos
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={teams}
          renderItem={renderTeamItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Nova Equipe</ThemedText>
            <Pressable onPress={() => { setShowCreateModal(false); resetForm(); }}>
              <Feather name="x" size={24} color={Colors.light.text} />
            </Pressable>
          </View>

          <FlatList
            data={[1]}
            keyExtractor={() => "form"}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContent}
            renderItem={() => (
              <>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Nome da Equipe *</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={newTeamName}
                    onChangeText={setNewTeamName}
                    placeholder="Ex: Equipe Campo Sul"
                    placeholderTextColor={Colors.light.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Descrição</ThemedText>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={newTeamDescription}
                    onChangeText={setNewTeamDescription}
                    placeholder="Descreva as responsabilidades da equipe"
                    placeholderTextColor={Colors.light.textSecondary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Cor de Identificação</ThemedText>
                  <View style={styles.colorGrid}>
                    {TEAM_COLORS.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          setNewTeamColor(c.id);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[
                          styles.colorOption,
                          { backgroundColor: c.color },
                          newTeamColor === c.id && styles.colorSelected,
                        ]}
                      >
                        {newTeamColor === c.id ? (
                          <Feather name="check" size={18} color="#fff" />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Área de Atuação</ThemedText>
                  <View style={styles.areaGrid}>
                    {AREAS_ATUACAO.map((area) => (
                      <Pressable
                        key={area}
                        onPress={() => {
                          setNewTeamArea(newTeamArea === area ? "" : area);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[
                          styles.areaOption,
                          newTeamArea === area && styles.areaSelected,
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.areaOptionText,
                            newTeamArea === area && styles.areaSelectedText,
                          ]}
                        >
                          {area}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Responsável</ThemedText>
                  <View style={styles.responsavelList}>
                    {users.length > 0 ? (
                      users.slice(0, 5).map((u) => (
                        <Pressable
                          key={u.id}
                          onPress={() => {
                            setSelectedResponsavel(selectedResponsavel === u.id ? null : u.id);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={[
                            styles.responsavelOption,
                            selectedResponsavel === u.id && styles.responsavelSelected,
                          ]}
                        >
                          <View style={[styles.responsavelAvatar, { backgroundColor: TEAM_COLORS.find(c => c.id === newTeamColor)?.color || Colors.light.accent }]}>
                            <ThemedText style={styles.responsavelInitial}>
                              {u.nome.charAt(0).toUpperCase()}
                            </ThemedText>
                          </View>
                          <View style={styles.responsavelInfo}>
                            <ThemedText style={styles.responsavelName}>{u.nome}</ThemedText>
                            <ThemedText style={styles.responsavelRole}>{u.tipo_usuario}</ThemedText>
                          </View>
                          {selectedResponsavel === u.id ? (
                            <Feather name="check-circle" size={20} color={Colors.light.success} />
                          ) : (
                            <Feather name="circle" size={20} color={Colors.light.border} />
                          )}
                        </Pressable>
                      ))
                    ) : (
                      <ThemedText style={styles.noUsersText}>Nenhum usuário disponível</ThemedText>
                    )}
                  </View>
                </View>

                <Pressable
                  style={[
                    styles.createButton,
                    { backgroundColor: TEAM_COLORS.find(c => c.id === newTeamColor)?.color || Colors.light.accent },
                    createTeamMutation.isPending && styles.buttonDisabled
                  ]}
                  onPress={handleCreateTeam}
                  disabled={createTeamMutation.isPending}
                >
                  {createTeamMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name="users" size={18} color="#fff" />
                      <ThemedText style={styles.createButtonText}>Criar Equipe</ThemedText>
                    </>
                  )}
                </Pressable>
              </>
            )}
          />
        </View>
      </Modal>

      <Modal visible={showMembersModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>{selectedTeam?.nome}</ThemedText>
            <Pressable onPress={() => {
              setShowMembersModal(false);
              setSelectedTeam(null);
            }}>
              <Feather name="x" size={24} color={Colors.light.text} />
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <ThemedText style={styles.sectionTitle}>Membros da Equipe</ThemedText>
            
            {loadingMembers ? (
              <ActivityIndicator size="small" color={Colors.light.accent} />
            ) : members.length === 0 ? (
              <ThemedText style={styles.emptyMembers}>Nenhum membro ainda</ThemedText>
            ) : (
              <View style={styles.membersList}>
                {members.map((member: any) => (
                  <View key={member.id} style={styles.memberItem}>
                    <View style={styles.memberAvatar}>
                      <ThemedText style={styles.memberInitial}>
                        {member.usuario.nome.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.memberInfo}>
                      <ThemedText style={styles.memberName}>{member.usuario.nome}</ThemedText>
                      <ThemedText style={styles.memberEmail}>{member.usuario.email}</ThemedText>
                    </View>
                    <Pressable onPress={() => handleRemoveMember(member.id)}>
                      <Feather name="x" size={20} color={Colors.light.error} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <ThemedText style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
              Adicionar Membros
            </ThemedText>
            
            <View style={styles.usersList}>
              {users
                .filter((u) => !members.some((m: any) => m.usuario.id === u.id))
                .map((usuario) => (
                  <Pressable
                    key={usuario.id}
                    style={styles.userItem}
                    onPress={() => handleAddMember(usuario)}
                  >
                    <View style={styles.memberAvatar}>
                      <ThemedText style={styles.memberInitial}>
                        {usuario.nome.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.memberInfo}>
                      <ThemedText style={styles.memberName}>{usuario.nome}</ThemedText>
                      <ThemedText style={styles.memberEmail}>{usuario.tipo_usuario}</ThemedText>
                    </View>
                    <Feather name="plus-circle" size={24} color={Colors.light.accent} />
                  </Pressable>
                ))}
            </View>
          </View>
        </View>
      </Modal>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowCreateModal(true);
        }}
      >
        <Feather name="plus" size={24} color="#fff" />
        <ThemedText style={styles.fabText}>Nova Equipe</ThemedText>
      </Pressable>
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
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
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
    gap: Spacing.md,
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    padding: Spacing.lg,
    borderRadius: 12,
    gap: Spacing.md,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.accent + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "600",
  },
  teamDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.inputBorder,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  createButton: {
    flexDirection: "row",
    backgroundColor: Colors.light.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  emptyMembers: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontStyle: "italic",
  },
  membersList: {
    gap: Spacing.sm,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: 10,
    gap: Spacing.md,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  memberInitial: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "600",
  },
  memberEmail: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  usersList: {
    gap: Spacing.sm,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: 10,
    gap: Spacing.md,
  },
  formContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSelected: {
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  areaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  areaOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  areaSelected: {
    borderColor: Colors.light.success,
    backgroundColor: Colors.light.success + "15",
  },
  areaOptionText: {
    fontSize: 13,
    color: Colors.light.text,
  },
  areaSelectedText: {
    color: Colors.light.success,
    fontWeight: "600",
  },
  responsavelList: {
    gap: Spacing.sm,
  },
  responsavelOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundSecondary,
    gap: Spacing.md,
  },
  responsavelSelected: {
    borderColor: Colors.light.success,
    backgroundColor: Colors.light.success + "10",
  },
  responsavelAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  responsavelInitial: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  responsavelInfo: {
    flex: 1,
  },
  responsavelName: {
    fontSize: 14,
    fontWeight: "600",
  },
  responsavelRole: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  noUsersText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    padding: Spacing.md,
  },
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.light.accent,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
