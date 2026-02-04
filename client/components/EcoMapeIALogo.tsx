import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  useFonts,
  Inter_600SemiBold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";

/* =========================================================
   TIPAGEM
========================================================= */

export interface EcoMapeIALogoProps {
  size?: "small" | "medium" | "large";
  showIcon?: boolean;
  variant?: "light" | "dark";
  iconName?: keyof typeof Feather.glyphMap;
  iconBackground?: string;
  iconColor?: string;
}

/* =========================================================
   PALETA DE CORES — CIENTÍFICA / INSTITUCIONAL
========================================================= */

const PALETTE = {
  light: {
    eco: "#1B5E20",   // verde floresta escuro
    mape: "#0D47A1",  // azul cartográfico profundo
    ia: "#263238",    // grafite tecnológico
    iconBg: "#1B5E20",
    iconFg: "#FFFFFF",
  },
  dark: {
    eco: "#7EE08A",   // verde claro (dark mode)
    mape: "#7AA7FF",  // azul claro
    ia: "#E6EDF1",    // quase branco
    iconBg: "#0E3D14",
    iconFg: "#FFFFFF",
  },
} as const;

/* =========================================================
   ESCALAS
========================================================= */

function getSizes(size: "small" | "medium" | "large") {
  switch (size) {
    case "small":
      return {
        fontSize: 18,
        iconSize: 18,
        iconContainer: 30,
        gap: 8,
        letterSpacing: 0.3,
        shadowOpacity: 0.14,
        shadowRadius: 6,
        shadowOffsetY: 3,
        elevation: 4,
      };
    case "large":
      return {
        fontSize: 32,
        iconSize: 26,
        iconContainer: 54,
        gap: 12,
        letterSpacing: 0.35,
        shadowOpacity: 0.16,
        shadowRadius: 7,
        shadowOffsetY: 4,
        elevation: 5,
      };
    default:
      return {
        fontSize: 24,
        iconSize: 22,
        iconContainer: 42,
        gap: 10,
        letterSpacing: 0.32,
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffsetY: 3,
        elevation: 4,
      };
  }
}

/* =========================================================
   COMPONENTE
========================================================= */

export function EcoMapeIALogo({
  size = "medium",
  showIcon = true,
  variant = "light",
  iconName = "map",
  iconBackground,
  iconColor,
}: EcoMapeIALogoProps) {
  const [fontsLoaded] = useFonts({
    Inter_600SemiBold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  const s = getSizes(size);
  const colors = PALETTE[variant];

  const iconStyle: ViewStyle = {
    width: s.iconContainer,
    height: s.iconContainer,
    borderRadius: s.iconContainer / 2,
    backgroundColor: iconBackground ?? colors.iconBg,
  };

  const textBase: TextStyle = {
    fontSize: s.fontSize,
    letterSpacing: s.letterSpacing,
    lineHeight: Math.round(s.fontSize * 1.12),
  };

  return (
    <View style={styles.container}>
      {showIcon && (
        <View
          style={[
            styles.iconContainer,
            iconStyle,
            {
              marginRight: s.gap,
              shadowOpacity: s.shadowOpacity,
              shadowRadius: s.shadowRadius,
              shadowOffset: { width: 0, height: s.shadowOffsetY },
              elevation: s.elevation,
            },
          ]}
          accessibilityRole="image"
          accessibilityLabel="EcoMapeIA logo"
        >
          <Feather
            name={iconName}
            size={s.iconSize}
            color={iconColor ?? colors.iconFg}
          />
        </View>
      )}

      <View style={styles.textContainer}>
        <Text style={[styles.textSemi, textBase, { color: colors.eco }]}>
          Eco
        </Text>
        <Text style={[styles.textSemi, textBase, { color: colors.mape }]}>
          Mape
        </Text>
        <Text style={[styles.textBold, textBase, { color: colors.ia }]}>
          IA
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   ESTILOS
========================================================= */

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
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
