import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";

import logoImage from "../../assets/images/ecomapeia-logo-clean.png";

export interface EcoMapeIALogoProps {
  size?: "small" | "medium" | "large";
  showIcon?: boolean;
  variant?: "light" | "dark";
  iconName?: string;
  iconBackground?: string;
  iconColor?: string;
}

const SIZE_MAP = {
  small: { width: 120, height: 32 },
  medium: { width: 200, height: 54 },
  large: { width: 280, height: 74 },
};

export function EcoMapeIALogo({ size = "medium" }: EcoMapeIALogoProps) {
  const dimensions = SIZE_MAP[size];
  return (
    <View style={styles.container}>
      <Image
        source={logoImage}
        style={[styles.logo, dimensions]}
        contentFit="contain"
        accessibilityLabel="EcoMapeIA logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 54,
  },
});

export default EcoMapeIALogo;
