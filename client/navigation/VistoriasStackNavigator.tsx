import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import VistoriasScreen from "@/screens/VistoriasScreen";
import NovaVistoriaScreen from "@/screens/NovaVistoriaScreen";
import DetalhesVistoriaScreen from "@/screens/DetalhesVistoriaScreen";
import MapaGeralScreen from "@/screens/MapaGeralScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type VistoriasStackParamList = {
  VistoriasList: undefined;
  NovaVistoria: undefined;
  DetalhesVistoria: { vistoriaId: string };
  MapaGeral: undefined;
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
    </Stack.Navigator>
  );
}
