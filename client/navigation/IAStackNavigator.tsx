import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import AssistenteIAScreen from "@/screens/AssistenteIAScreen";

export type IAStackParamList = {
  AssistenteIA: undefined;
};

const Stack = createNativeStackNavigator<IAStackParamList>();

export default function IAStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AssistenteIA"
        component={AssistenteIAScreen}
        options={{
          headerTitle: "Assistente IA",
        }}
      />
    </Stack.Navigator>
  );
}
