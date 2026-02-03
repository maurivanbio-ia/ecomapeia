import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { Colors } from "@/constants/theme";

interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  cloudCover: number;
  description: string;
  icon: string;
}

interface WeatherDisplayProps {
  weather: WeatherData | null;
  loading?: boolean;
  compact?: boolean;
}

const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
  sun: "sun",
  cloud: "cloud",
  "cloud-rain": "cloud-rain",
  "cloud-lightning": "cloud-lightning",
};

export function WeatherDisplay({ weather, loading, compact }: WeatherDisplayProps) {
  if (loading) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <ActivityIndicator size="small" color={Colors.light.accent} />
        <ThemedText style={styles.loadingText}>Carregando clima...</ThemedText>
      </View>
    );
  }

  if (!weather) {
    return null;
  }

  const iconName = iconMap[weather.icon] || "cloud";

  if (compact) {
    return (
      <View style={[styles.container, styles.compactContainer]}>
        <Feather name={iconName} size={20} color={Colors.light.accent} />
        <ThemedText style={styles.compactTemp}>{weather.temperature.toFixed(1)}°C</ThemedText>
        <ThemedText style={styles.compactDesc}>{weather.description}</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name={iconName} size={32} color={Colors.light.accent} />
        <View style={styles.mainInfo}>
          <ThemedText style={styles.temperature}>{weather.temperature.toFixed(1)}°C</ThemedText>
          <ThemedText style={styles.description}>{weather.description}</ThemedText>
        </View>
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Feather name="droplet" size={16} color={Colors.light.textSecondary} />
          <ThemedText style={styles.detailText}>Umidade: {weather.humidity}%</ThemedText>
        </View>
        
        <View style={styles.detailItem}>
          <Feather name="wind" size={16} color={Colors.light.textSecondary} />
          <ThemedText style={styles.detailText}>Vento: {weather.windSpeed.toFixed(1)} km/h</ThemedText>
        </View>
        
        {weather.precipitation > 0 && (
          <View style={styles.detailItem}>
            <Feather name="cloud-rain" size={16} color={Colors.light.textSecondary} />
            <ThemedText style={styles.detailText}>Precipitação: {weather.precipitation} mm</ThemedText>
          </View>
        )}
        
        <View style={styles.detailItem}>
          <Feather name="cloud" size={16} color={Colors.light.textSecondary} />
          <ThemedText style={styles.detailText}>Nuvens: {weather.cloudCover}%</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  mainInfo: {
    flex: 1,
  },
  temperature: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.light.text,
  },
  description: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  details: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: "45%",
  },
  detailText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginLeft: 8,
  },
  compactTemp: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  compactDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
});
