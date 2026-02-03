import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

interface EcoMapeIALogoProps {
  size?: "small" | "medium" | "large";
  showIcon?: boolean;
}

const COLORS = {
  eco: "#22c55e",
  mape: "#3b82f6",
  ia: "#8b5cf6",
};

export function EcoMapeIALogo({ size = "medium", showIcon = true }: EcoMapeIALogoProps) {
  const fontSize = size === "small" ? 18 : size === "medium" ? 24 : 32;
  const iconSize = size === "small" ? 20 : size === "medium" ? 28 : 36;
  const iconContainerSize = size === "small" ? 28 : size === "medium" ? 40 : 52;

  return (
    <View style={styles.container}>
      {showIcon ? (
        <View
          style={[
            styles.iconContainer,
            {
              width: iconContainerSize,
              height: iconContainerSize,
              borderRadius: iconContainerSize / 2,
            },
          ]}
        >
          <Feather name="map" size={iconSize * 0.6} color="#fff" />
        </View>
      ) : null}
      <View style={styles.textContainer}>
        <Text style={[styles.text, { fontSize, color: COLORS.eco }]}>Eco</Text>
        <Text style={[styles.text, { fontSize, color: COLORS.mape }]}>Mape</Text>
        <Text style={[styles.textBold, { fontSize, color: COLORS.ia }]}>IA</Text>
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
    marginRight: 8,
    backgroundColor: "#22c55e",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  textContainer: {
    flexDirection: "row",
  },
  text: {
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  textBold: {
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

export default EcoMapeIALogo;
