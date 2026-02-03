import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFonts, Inter_600SemiBold, Inter_800ExtraBold } from "@expo-google-fonts/inter";

interface EcoMapeIALogoProps {
  size?: "small" | "medium" | "large";
  showIcon?: boolean;
  variant?: "light" | "dark";
}

const PALETTE = {
  light: {
    eco: "#1B5E20",   // verde floresta escuro
    mape: "#0D47A1",  // azul profundo cartográfico
    ia: "#263238",    // grafite tecnológico
    iconBg: "#1B5E20",
    iconFg: "#FFFFFF",
  },
  dark: {
    eco: "#7EE08A",   // verde claro para fundo escuro
    mape: "#7AA7FF",  // azul claro para fundo escuro
    ia: "#E6EDF1",    // quase branco
    iconBg: "#0E3D14",
    iconFg: "#FFFFFF",
  },
};

export function EcoMapeIALogo({
  size = "medium",
  showIcon = true,
  variant = "light",
}: EcoMapeIALogoProps) {
  const [fontsLoaded] = useFonts({
    Inter_600SemiBold,
    Inter_800ExtraBold,
  });

  const fontSize = size === "small" ? 18 : size === "medium" ? 24 : 32;
  const iconSize = size === "small" ? 18 : size === "medium" ? 22 : 26;
  const iconContainerSize = size === "small" ? 30 : size === "medium" ? 42 : 54;

  const colors = PALETTE[variant];

  if (!fontsLoaded) {
    return null;
  }

  const iconContainerStyle: ViewStyle = {
    width: iconContainerSize,
    height: iconContainerSize,
    borderRadius: iconContainerSize / 2,
    backgroundColor: colors.iconBg,
  };

  const textBase: TextStyle = {
    fontSize,
    letterSpacing: 0.3,
    lineHeight: Math.round(fontSize * 1.12),
  };

  return (
    <View style={styles.container}>
      {showIcon ? (
        <View style={[styles.iconContainer, iconContainerStyle]}>
          <Feather name="map" size={iconSize} color={colors.iconFg} />
        </View>
      ) : null}

      <View style={styles.textContainer}>
        <Text style={[styles.textSemi, textBase, { color: colors.eco }]}>Eco</Text>
        <Text style={[styles.textSemi, textBase, { color: colors.mape }]}>Mape</Text>
        <Text style={[styles.textBold, textBase, { color: colors.ia }]}>IA</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  textContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  textSemi: {
    fontFamily: "Inter_600SemiBold",
  },
  textBold: {
    fontFamily: "Inter_800ExtraBold",
  },
});

export default EcoMapeIALogo;
