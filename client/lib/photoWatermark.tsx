import React, { useRef, useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { Image } from "expo-image";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Location from "expo-location";

export interface WatermarkData {
  timestamp: string;
  coordinates: string;
  lat?: number;
  lng?: number;
}

function formatDateTime(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "W" : "E";
  return `${Math.abs(lat).toFixed(6)}°${latDir} ${Math.abs(lng).toFixed(6)}°${lngDir}`;
}

export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return null;
    }
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };
  } catch {
    return null;
  }
}

export function createWatermarkData(location: { lat: number; lng: number } | null): WatermarkData {
  const now = new Date();
  const timestamp = formatDateTime(now);
  const coordinates = location 
    ? formatCoordinates(location.lat, location.lng)
    : "GPS não disponível";

  return {
    timestamp,
    coordinates,
    lat: location?.lat,
    lng: location?.lng,
  };
}

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

    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const uri = await captureRef(viewRef, {
        format: "jpg",
        quality: 0.85,
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
    <View style={styles.hiddenContainer} pointerEvents="none">
      <View 
        ref={viewRef} 
        style={[styles.imageContainer, { width: imageWidth, height: imageHeight }]}
        collapsable={false}
      >
        <Image
          source={{ uri: pendingPhoto.uri }}
          style={[styles.image, { width: imageWidth, height: imageHeight }]}
          contentFit="cover"
          onLoad={() => setImageLoaded(true)}
        />
        
        <View style={styles.logoContainer}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandEco}>Eco</Text>
            <Text style={styles.brandMape}>Mape</Text>
            <Text style={styles.brandIA}>IA</Text>
          </View>
        </View>
        
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
  hiddenContainer: {
    position: "absolute",
    left: -9999,
    top: -9999,
    opacity: 0,
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
  logoContainer: {
    position: "absolute",
    top: 16,
    left: 16,
  },
  brandContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  brandEco: {
    color: "#4ADE80",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  brandMape: {
    color: "#60A5FA",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  brandIA: {
    color: "#FBBF24",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
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
    fontSize: 12,
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
