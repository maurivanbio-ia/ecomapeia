import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";

interface LatLng {
  latitude: number;
  longitude: number;
}

interface MapPolygonViewProps {
  polygonCoordinates: LatLng[];
  mapRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMapImageCaptured: (uri: string) => void;
  mapImageUri: string | null;
}

export default function MapPolygonView({
  polygonCoordinates,
}: MapPolygonViewProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.mapPlaceholder, { backgroundColor: theme.backgroundDefault }]}>
      <Feather name="map" size={40} color={Colors.light.primary} />
      <ThemedText style={[styles.pointsText, { color: theme.text }]}>
        {polygonCoordinates.length} pontos registrados
      </ThemedText>
      <ThemedText style={[styles.hintText, { color: theme.tabIconDefault }]}>
        Use o Expo Go para visualizar o mapa com o polígono
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  mapPlaceholder: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  pointsText: {
    marginTop: Spacing.sm,
    textAlign: "center",
    fontWeight: "600",
  },
  hintText: {
    marginTop: Spacing.xs,
    textAlign: "center",
    fontSize: 13,
  },
});
