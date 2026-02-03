import React from "react";
import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";
import AssistenteIAScreen from "@/screens/AssistenteIAScreen";
import MapBiomasScreen from "@/screens/MapBiomasScreen";

export type IAStackParamList = {
  AssistenteIA: undefined;
  MapBiomas: undefined;
};

const Stack = createNativeStackNavigator<IAStackParamList>();

export default function IAStackNavigator() {
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AssistenteIA"
        component={AssistenteIAScreen}
        options={({ navigation }) => ({
          headerTitle: "Assistente IA",
          headerRight: () => (
            <HeaderButton
              onPress={() => navigation.navigate("MapBiomas")}
              pressColor="rgba(0,0,0,0.1)"
              accessibilityLabel="Consultar MapBiomas"
            >
              <Feather name="map" size={22} color={theme.text} />
            </HeaderButton>
          ),
        })}
      />
      <Stack.Screen
        name="MapBiomas"
        component={MapBiomasScreen}
        options={{
          headerTitle: "MapBiomas Alerta",
        }}
      />
    </Stack.Navigator>
  );
}
