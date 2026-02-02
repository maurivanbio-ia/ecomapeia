import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import VistoriasScreen from "@/screens/VistoriasScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type VistoriasStackParamList = {
  Vistorias: undefined;
};

const Stack = createNativeStackNavigator<VistoriasStackParamList>();

export default function VistoriasStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Vistorias"
        component={VistoriasScreen}
        options={{
          title: "Vistorias",
        }}
      />
    </Stack.Navigator>
  );
}
