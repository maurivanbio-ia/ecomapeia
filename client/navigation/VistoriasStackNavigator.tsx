import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import VistoriasScreen from "@/screens/VistoriasScreen";
import NovaVistoriaScreen from "@/screens/NovaVistoriaScreen";
import DetalhesVistoriaScreen from "@/screens/DetalhesVistoriaScreen";
import MapaGeralScreen from "@/screens/MapaGeralScreen";
import DashboardScreen from "@/screens/DashboardScreen";
import EquipesScreen from "@/screens/EquipesScreen";
import NotificacoesScreen from "@/screens/NotificacoesScreen";
import HistoricoPropriedadeScreen from "@/screens/HistoricoPropriedadeScreen";
import MapBiomasScreen from "@/screens/MapBiomasScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type VistoriasStackParamList = {
  VistoriasList: undefined;
  NovaVistoria: { editVistoriaId?: string } | undefined;
  DetalhesVistoria: { vistoriaId: string };
  MapaGeral: undefined;
  Dashboard: undefined;
  Equipes: undefined;
  Notificacoes: undefined;
  HistoricoPropriedade: undefined;
  MapBiomas: { latitude?: number; longitude?: number } | undefined;
};

const Stack = createNativeStackNavigator<VistoriasStackParamList>();

export default function VistoriasStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="VistoriasList"
        component={VistoriasScreen}
        options={{
          title: "Vistorias",
        }}
      />
      <Stack.Screen
        name="NovaVistoria"
        component={NovaVistoriaScreen}
        options={{
          title: "Nova Vistoria",
        }}
      />
      <Stack.Screen
        name="DetalhesVistoria"
        component={DetalhesVistoriaScreen}
        options={{
          title: "Detalhes da Vistoria",
        }}
      />
      <Stack.Screen
        name="MapaGeral"
        component={MapaGeralScreen}
        options={{
          title: "Mapa das Propriedades",
        }}
      />
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: "Dashboard",
        }}
      />
      <Stack.Screen
        name="Equipes"
        component={EquipesScreen}
        options={{
          title: "Equipes",
        }}
      />
      <Stack.Screen
        name="Notificacoes"
        component={NotificacoesScreen}
        options={{
          title: "Notificações",
        }}
      />
      <Stack.Screen
        name="HistoricoPropriedade"
        component={HistoricoPropriedadeScreen}
        options={{
          title: "Histórico",
        }}
      />
      <Stack.Screen
        name="MapBiomas"
        component={MapBiomasScreen}
        options={{
          title: "MapBiomas Alerta",
        }}
      />
    </Stack.Navigator>
  );
}
