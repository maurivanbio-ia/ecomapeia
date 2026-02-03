import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { MapBiomasPanel } from "@/components/MapBiomasPanel";
import { FireHotspotsPanel } from "@/components/FireHotspotsPanel";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";

type MapBiomasRouteParams = {
  MapBiomas: {
    latitude?: number;
    longitude?: number;
  };
};

export default function MapBiomasScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<MapBiomasRouteParams, "MapBiomas">>();
  
  const latitude = route.params?.latitude;
  const longitude = route.params?.longitude;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Coordenadas Info */}
        {latitude && longitude ? (
          <View style={[styles.coordsCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.coordsIcon, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="map-pin" size={16} color={theme.primary} />
            </View>
            <View style={styles.coordsInfo}>
              <ThemedText style={styles.coordsLabel}>Coordenadas da Vistoria</ThemedText>
              <ThemedText style={[styles.coordsValue, { color: theme.tabIconDefault }]}>
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </ThemedText>
            </View>
          </View>
        ) : null}
        
        {/* Painel MapBiomas Alerta - Desmatamento */}
        <MapBiomasPanel 
          theme={theme} 
          latitude={latitude} 
          longitude={longitude} 
        />
        
        {/* Painel MapBiomas Fogo - Queimadas */}
        <FireHotspotsPanel 
          theme={theme} 
          latitude={latitude} 
          longitude={longitude} 
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  coordsCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  coordsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  coordsInfo: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  coordsLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  coordsValue: {
    fontSize: 11,
  },
});
