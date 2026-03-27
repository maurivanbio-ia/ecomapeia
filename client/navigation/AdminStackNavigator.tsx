import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AdminDashboardScreen from "@/screens/AdminDashboardScreen";
import GerenciarProjetosScreen from "@/screens/GerenciarProjetosScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type AdminStackParamList = {
  AdminDashboard: undefined;
  GerenciarProjetos: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ headerTitle: "Painel Admin" }}
      />
      <Stack.Screen
        name="GerenciarProjetos"
        component={GerenciarProjetosScreen}
        options={{ headerTitle: "Projetos / UHEs" }}
      />
    </Stack.Navigator>
  );
}
