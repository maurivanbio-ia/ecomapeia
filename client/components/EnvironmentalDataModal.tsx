import React from "react";
import { Modal, View, StyleSheet, SafeAreaView, StatusBar } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";
import EnvironmentalDataPanel from "./EnvironmentalDataPanel";
import type { PolygonData } from "./EnvironmentalDataPanel";

interface EnvironmentalDataModalProps {
  visible: boolean;
  onClose: () => void;
  polygon?: PolygonData;
  stateAcronym?: string;
  latitude?: number;
  longitude?: number;
}

export function EnvironmentalDataModal({
  visible,
  onClose,
  polygon,
  stateAcronym,
  latitude,
  longitude,
}: EnvironmentalDataModalProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDefault }]}>
        <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
        <EnvironmentalDataPanel
          polygon={polygon}
          stateAcronym={stateAcronym}
          latitude={latitude}
          longitude={longitude}
          onClose={onClose}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default EnvironmentalDataModal;
