import React, { useMemo } from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

let MapView: any;
let Polygon: any;
let Marker: any;
let Callout: any;
let PROVIDER_DEFAULT: any;

if (Platform.OS !== "web") {
  const RNMaps = require("react-native-maps");
  MapView = RNMaps.default;
  Polygon = RNMaps.Polygon;
  Marker = RNMaps.Marker;
  Callout = RNMaps.Callout;
  PROVIDER_DEFAULT = RNMaps.PROVIDER_DEFAULT;
}

interface LatLng {
  latitude: number;
  longitude: number;
}

interface VistoriaPolygon {
  id: string;
  proprietario: string;
  municipio: string;
  coordinates: LatLng[];
  center: LatLng;
}

function utmToLatLng(easting: number, northing: number, zone: number, isNorth: boolean): LatLng {
  const k0 = 0.9996;
  const a = 6378137;
  const e = 0.081819191;
  const e1sq = 0.006739497;
  const falseEasting = 500000;
  const falseNorthing = isNorth ? 0 : 10000000;

  const x = easting - falseEasting;
  const y = northing - falseNorthing;

  const M = y / k0;
  const mu = M / (a * (1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256));

  const e1 = (1 - Math.sqrt(1 - Math.pow(e, 2))) / (1 + Math.sqrt(1 - Math.pow(e, 2)));
  const J1 = (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32);
  const J2 = (21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32);
  const J3 = (151 * Math.pow(e1, 3) / 96);
  const J4 = (1097 * Math.pow(e1, 4) / 512);

  const fp = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu) + J4 * Math.sin(8 * mu);

  const C1 = e1sq * Math.pow(Math.cos(fp), 2);
  const T1 = Math.pow(Math.tan(fp), 2);
  const R1 = a * (1 - Math.pow(e, 2)) / Math.pow(1 - Math.pow(e, 2) * Math.pow(Math.sin(fp), 2), 1.5);
  const N1 = a / Math.sqrt(1 - Math.pow(e, 2) * Math.pow(Math.sin(fp), 2));
  const D = x / (N1 * k0);

  const Q1 = N1 * Math.tan(fp) / R1;
  const Q2 = Math.pow(D, 2) / 2;
  const Q3 = (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e1sq) * Math.pow(D, 4) / 24;
  const Q4 = (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 252 * e1sq - 3 * Math.pow(C1, 2)) * Math.pow(D, 6) / 720;

  const lat = fp - Q1 * (Q2 - Q3 + Q4);

  const Q5 = D;
  const Q6 = (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6;
  const Q7 = (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * e1sq + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120;

  const lng0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const lng = lng0 + (Q5 - Q6 + Q7) / Math.cos(fp);

  return {
    latitude: lat * 180 / Math.PI,
    longitude: lng * 180 / Math.PI,
  };
}

export default function MapaGeralScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const { data: vistorias = [] } = useQuery({
    queryKey: [`/api/vistorias?usuario_id=${user?.id}`],
    enabled: !!user?.id,
  });

  const polygons: VistoriaPolygon[] = useMemo(() => {
    const result: VistoriaPolygon[] = [];

    for (const vistoria of vistorias) {
      if (!vistoria.coordenadas_utm || vistoria.coordenadas_utm.length < 3) continue;

      const zoneMatch = (vistoria.zona_utm || "23K").match(/(\d+)([A-Za-z])/);
      if (!zoneMatch) continue;

      const zone = parseInt(zoneMatch[1], 10);
      const zoneLetter = zoneMatch[2].toUpperCase();
      const isNorth = zoneLetter >= "N";

      const coords: LatLng[] = [];
      for (const point of vistoria.coordenadas_utm) {
        const e = parseFloat(point.e);
        const n = parseFloat(point.n);
        if (!isNaN(e) && !isNaN(n) && e > 0 && n > 0) {
          try {
            coords.push(utmToLatLng(e, n, zone, isNorth));
          } catch (err) {
            console.warn("Error converting UTM:", err);
          }
        }
      }

      if (coords.length >= 3) {
        const centerLat = coords.reduce((sum, c) => sum + c.latitude, 0) / coords.length;
        const centerLng = coords.reduce((sum, c) => sum + c.longitude, 0) / coords.length;

        result.push({
          id: vistoria.id,
          proprietario: vistoria.proprietario,
          municipio: vistoria.municipio || "",
          coordinates: coords,
          center: { latitude: centerLat, longitude: centerLng },
        });
      }
    }

    return result;
  }, [vistorias]);

  const mapRegion = useMemo(() => {
    if (polygons.length === 0) {
      return {
        latitude: -23.5,
        longitude: -47.4,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
    }

    const allCoords = polygons.flatMap((p) => p.coordinates);
    const lats = allCoords.map((c) => c.latitude);
    const lngs = allCoords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01),
      longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.01),
    };
  }, [polygons]);

  if (Platform.OS === "web") {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.webFallback,
            { paddingTop: headerHeight + Spacing.xl },
          ]}
        >
          <Feather name="map" size={60} color={Colors.light.primary} />
          <ThemedText style={styles.webTitle}>
            {polygons.length} propriedades mapeadas
          </ThemedText>
          <ThemedText style={[styles.webHint, { color: theme.tabIconDefault }]}>
            Use o Expo Go para visualizar o mapa com todos os polígonos
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <MapView
        style={[styles.map, { marginTop: headerHeight }]}
        provider={PROVIDER_DEFAULT}
        region={mapRegion}
        mapType="satellite"
      >
        {polygons.map((polygon, index) => (
          <React.Fragment key={polygon.id}>
            <Polygon
              coordinates={polygon.coordinates}
              strokeColor={Colors.light.accent}
              fillColor="rgba(141, 198, 63, 0.3)"
              strokeWidth={2}
            />
            <Marker
              coordinate={polygon.center}
              pinColor={Colors.light.primary}
              onPress={() => {
                navigation.navigate("DetalhesVistoria", { vistoriaId: polygon.id });
              }}
            >
              <Callout>
                <View style={styles.callout}>
                  <ThemedText style={styles.calloutTitle}>{polygon.proprietario}</ThemedText>
                  <ThemedText style={styles.calloutSubtitle}>{polygon.municipio}</ThemedText>
                </View>
              </Callout>
            </Marker>
          </React.Fragment>
        ))}
      </MapView>

      <View style={[styles.legend, { bottom: insets.bottom + Spacing.lg }]}>
        <View style={[styles.legendCard, { backgroundColor: theme.backgroundDefault }]}>
          <Feather name="map-pin" size={16} color={Colors.light.primary} />
          <ThemedText style={styles.legendText}>
            {polygons.length} propriedade{polygons.length !== 1 ? "s" : ""} no mapa
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  webFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  webTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  webHint: {
    fontSize: 14,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  legend: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: "center",
  },
  legendCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendText: {
    fontWeight: "600",
  },
  callout: {
    padding: Spacing.sm,
    minWidth: 120,
  },
  calloutTitle: {
    fontWeight: "700",
    fontSize: 14,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: "#666",
  },
});
