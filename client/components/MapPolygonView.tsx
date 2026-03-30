import React, { useRef } from "react";
import { View, StyleSheet, Pressable, Image, Platform } from "react-native";
import { captureRef } from "react-native-view-shot";
import MapView, { Polygon, Polyline, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";

interface LatLng {
  latitude: number;
  longitude: number;
}

interface SavedTrack {
  id: string;
  legenda: string;
  points: LatLng[];
  color: string;
}

interface MapPolygonViewProps {
  polygonCoordinates: LatLng[];
  trackPoints?: LatLng[];
  savedTracks?: SavedTrack[];
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
  trackPoints = [],
  savedTracks = [],
  mapRegion,
  onMapImageCaptured,
  mapImageUri,
}: MapPolygonViewProps) {
  const { theme } = useTheme();
  const mapRef = useRef<MapView>(null);
  const mapContainerRef = useRef<View>(null);

  const captureMapImage = async () => {
    const hasContent =
      polygonCoordinates.length >= 3 ||
      trackPoints.length > 1 ||
      savedTracks.length > 0;

    if (!hasContent) {
      return;
    }

    try {
      if (mapContainerRef.current) {
        const uri = await captureRef(mapContainerRef, {
          format: "png",
          quality: 1,
        });
        onMapImageCaptured(uri);
      }
    } catch (error) {
      console.error("Error capturing map:", error);
    }
  };

  if (Platform.OS === "web") {
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

  return (
    <View style={styles.mapSection}>
      <View ref={mapContainerRef} collapsable={false} style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          region={mapRegion}
          scrollEnabled={true}
          zoomEnabled={true}
          mapType="satellite"
        >
          <Polygon
            coordinates={polygonCoordinates}
            strokeColor={Colors.light.accent}
            fillColor="rgba(141, 198, 63, 0.3)"
            strokeWidth={3}
          />
          {savedTracks.map((track) => (
            <React.Fragment key={track.id}>
              <Polyline
                coordinates={track.points}
                strokeColor={track.color}
                strokeWidth={4}
              />
              {track.points.length > 0 ? (
                <Marker
                  coordinate={track.points[0]}
                  title={`${track.legenda} - Início`}
                  pinColor={track.color}
                />
              ) : null}
              {track.points.length > 1 ? (
                <Marker
                  coordinate={track.points[track.points.length - 1]}
                  title={`${track.legenda} - Fim`}
                  pinColor={track.color}
                />
              ) : null}
            </React.Fragment>
          ))}
          {trackPoints.length > 1 ? (
            <Polyline
              coordinates={trackPoints}
              strokeColor="#FF6B00"
              strokeWidth={4}
              lineDashPattern={[1]}
            />
          ) : null}
          {polygonCoordinates.map((coord, idx) => (
            <Marker
              key={idx}
              coordinate={coord}
              title={`Ponto ${idx + 1}`}
              pinColor={Colors.light.primary}
            />
          ))}
          {trackPoints.length > 0 ? (
            <Marker
              coordinate={trackPoints[0]}
              title="Gravação atual - Início"
              pinColor="#FF6B00"
            />
          ) : null}
          {trackPoints.length > 1 ? (
            <Marker
              coordinate={trackPoints[trackPoints.length - 1]}
              title="Posição atual"
              pinColor="#22C55E"
            />
          ) : null}
        </MapView>
      </View>

      <Pressable
        onPress={captureMapImage}
        style={[styles.captureMapBtn, { backgroundColor: Colors.light.primary }]}
      >
        <Feather name="camera" size={18} color="#FFFFFF" />
        <ThemedText style={styles.captureMapText}>Gerar Imagem do Mapa</ThemedText>
      </Pressable>

      {mapImageUri ? (
        <View style={styles.mapPreview}>
          <ThemedText style={[styles.subLabel, { color: Colors.light.primary }]}>
            Imagem Capturada
          </ThemedText>
          <Image source={{ uri: mapImageUri }} style={styles.mapImage} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapSection: {
    marginTop: Spacing.lg,
  },
  mapContainer: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    height: 250,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  captureMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  captureMapText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  mapPreview: {
    marginTop: Spacing.lg,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  mapImage: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.lg,
    resizeMode: "cover",
  },
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
