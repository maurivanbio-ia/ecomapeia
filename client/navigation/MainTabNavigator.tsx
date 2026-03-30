import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import { NavigatorScreenParams } from "@react-navigation/native";
import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import VistoriasStackNavigator, { VistoriasStackParamList } from "@/navigation/VistoriasStackNavigator";
import IAStackNavigator from "@/navigation/IAStackNavigator";
import AdminStackNavigator from "@/navigation/AdminStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

export type MainTabParamList = {
  HomeTab: undefined;
  VistoriasTab: NavigatorScreenParams<VistoriasStackParamList> | undefined;
  IATab: undefined;
  AdminTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="VistoriasTab"
        component={VistoriasStackNavigator}
        options={{
          title: "Vistorias",
          tabBarIcon: ({ color, size }) => (
            <Feather name="clipboard" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("VistoriasTab", { screen: "VistoriasList" });
          },
        })}
      />
      <Tab.Screen
        name="IATab"
        component={IAStackNavigator}
        options={{
          title: "IA",
          tabBarIcon: ({ color, size }) => (
            <Feather name="cpu" size={size} color={color} />
          ),
        }}
      />
      {user?.is_admin || user?.tipo_usuario === "Coordenador" || user?.tipo_usuario === "Gerente" ? (
        <Tab.Screen
          name="AdminTab"
          component={AdminStackNavigator}
          options={{
            headerShown: false,
            title: user?.is_admin ? "Admin" : "Painel",
            tabBarIcon: ({ color, size }) => (
              <Feather name={user?.is_admin ? "shield" : "bar-chart-2"} size={size} color={color} />
            ),
          }}
        />
      ) : null}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
