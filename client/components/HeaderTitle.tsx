import React from "react";
import { View, StyleSheet } from "react-native";
import { EcoMapeIALogo } from "@/components/EcoMapeIALogo";

interface HeaderTitleProps {
  title?: string;
}

export function HeaderTitle({ title }: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      <EcoMapeIALogo size="medium" showIcon={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
