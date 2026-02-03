import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import SelecionarProjetoScreen from "@/screens/SelecionarProjetoScreen";
import GestaoScreen from "@/screens/GestaoScreen";
import GerenciarProjetosScreen from "@/screens/GerenciarProjetosScreen";
import GerenciarEquipeScreen from "@/screens/GerenciarEquipeScreen";
import DashboardEmpresaScreen from "@/screens/DashboardEmpresaScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  SelecionarProjeto: undefined;
  Gestao: undefined;
  GerenciarProjetos: undefined;
  GerenciarEquipe: undefined;
  DashboardEmpresa: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
        }}
      />
      <Stack.Screen
        name="SelecionarProjeto"
        component={SelecionarProjetoScreen}
        options={{
          title: "Selecionar Projeto",
        }}
      />
      <Stack.Screen
        name="Gestao"
        component={GestaoScreen}
        options={{
          title: "Gestão",
        }}
      />
      <Stack.Screen
        name="GerenciarProjetos"
        component={GerenciarProjetosScreen}
        options={{
          title: "Gerenciar Projetos",
        }}
      />
      <Stack.Screen
        name="GerenciarEquipe"
        component={GerenciarEquipeScreen}
        options={{
          title: "Gerenciar Equipe",
        }}
      />
      <Stack.Screen
        name="DashboardEmpresa"
        component={DashboardEmpresaScreen}
        options={{
          title: "Dashboard",
        }}
      />
    </Stack.Navigator>
  );
}
