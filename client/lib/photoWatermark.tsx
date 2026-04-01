import React, { useRef, useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { Image } from "expo-image";
import { captureRef } from "react-native-view-shot";
import * as Location from "expo-location";

export interface WatermarkData {
  timestamp: string;
  coordinates: string;
  lat?: number;
  lng?: number;
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "W" : "E";
  return `${Math.abs(lat).toFixed(6)}°${latDir} ${Math.abs(lng).toFixed(6)}°${lngDir}`;
}

export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return { lat: location.coords.latitude, lng: location.coords.longitude };
  } catch {
    return null;
  }
}

export function createWatermarkData(location: { lat: number; lng: number } | null): WatermarkData {
  const now = new Date();
  return {
    timestamp: formatDateTime(now),
    coordinates: location ? formatCoordinates(location.lat, location.lng) : "GPS não disponível",
    lat: location?.lat,
    lng: location?.lng,
  };
}

// EcoBrasil white logo PNG
const ECOBRASIL_LOGO = require("../assets/images/ecobrasil-logo-white.png");

interface PhotoWatermarkProcessorProps {
  pendingPhoto: {
    id: string;
    uri: string;
    watermarkData: WatermarkData;
  } | null;
  onProcessed: (id: string, newUri: string) => void;
  onError: (id: string) => void;
}

export function PhotoWatermarkProcessor({
  pendingPhoto,
  onProcessed,
  onError,
}: PhotoWatermarkProcessorProps) {
  const viewRef = useRef<View>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const processImage = useCallback(async () => {
    if (!pendingPhoto || !imageLoaded || !viewRef.current) return;

    // Give layout engine time to render the watermark overlay
    await new Promise(resolve => setTimeout(resolve, 250));

    try {
      const uri = await captureRef(viewRef, {
        format: "jpg",
        quality: 0.88,
      });
      onProcessed(pendingPhoto.id, uri);
    } catch (error) {
      console.error("Error capturing watermarked image:", error);
      onError(pendingPhoto.id);
    }
  }, [pendingPhoto, imageLoaded, onProcessed, onError]);

  useEffect(() => {
    if (imageLoaded && pendingPhoto) {
      processImage();
    }
  }, [imageLoaded, pendingPhoto, processImage]);

  useEffect(() => {
    setImageLoaded(false);
  }, [pendingPhoto?.id]);

  if (!pendingPhoto) return null;

  const screenWidth = Dimensions.get("window").width;
  const imageWidth = screenWidth;
  const imageHeight = (imageWidth * 4) / 3;

  return (
    // FIX: position off-screen (top: -99999) instead of 1×1px + overflow:hidden.
    // The tiny clipped container prevented captureRef from rendering the view.
    <View style={styles.hiddenContainer} pointerEvents="none">
      <View
        ref={viewRef}
        style={[styles.imageContainer, { width: imageWidth, height: imageHeight }]}
        collapsable={false}
      >
        {/* Base photo */}
        <Image
          source={{ uri: pendingPhoto.uri }}
          style={[styles.image, { width: imageWidth, height: imageHeight }]}
          contentFit="cover"
          onLoad={() => setImageLoaded(true)}
        />

        {/* TOP LEFT: EcoBrasil logo PNG com fundo escuro semitransparente */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBadge}>
            <Image
              source={ECOBRASIL_LOGO}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>
        </View>

        {/* BOTTOM RIGHT: data/hora e coordenadas */}
        <View style={styles.timestampContainer}>
          <View style={styles.timestampBackground}>
            <Text style={styles.timestampText}>{pendingPhoto.watermarkData.timestamp}</Text>
            <Text style={styles.coordinatesText}>{pendingPhoto.watermarkData.coordinates}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // FIX: use top:-99999 so the view is off-screen but still rendered correctly
  // (overflow:hidden in a 1×1 box clips the canvas, breaking captureRef)
  hiddenContainer: {
    position: "absolute",
    top: -99999,
    left: 0,
    zIndex: -1000,
  },
  imageContainer: {
    position: "relative",
    backgroundColor: "#000",
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  // ── Logo EcoBrasil ──────────────────────────────────────────────────
  logoContainer: {
    position: "absolute",
    top: 16,
    left: 16,
  },
  logoBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  logoImage: {
    width: 120,
    height: 36,
  },
  // ── Timestamp ────────────────────────────────────────────────────────
  timestampContainer: {
    position: "absolute",
    bottom: 16,
    right: 16,
  },
  timestampBackground: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  timestampText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  coordinatesText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "right",
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
