import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";

import logoImage from "../../assets/images/ecomapeia-logo.png";

interface HeaderTitleProps {
  title?: string;
}

export function HeaderTitle({ title }: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      <Image
        source={logoImage}
        style={styles.logo}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 1300,
    height: 275,
  },
});
