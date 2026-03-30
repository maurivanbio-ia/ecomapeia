import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
  Modal,
} from "react-native";
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
let Marker: any;
let Callout: any;
let PROVIDER_DEFAULT: any;

if (Platform.OS !== "web") {
  const RNMaps = require("react-native-maps");
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
  Callout = RNMaps.Callout;
  PROVIDER_DEFAULT = RNMaps.PROVIDER_DEFAULT;
}

interface LatLng {
  latitude: number;
  longitude: number;
}

interface VistoriaMarker {
  id: string;
  proprietario: string;
  municipio: string;
  status: string;
  data_vistoria: string;
  projeto_nome: string;
  center: LatLng;
}

function utmToLatLng(
  easting: number,
  northing: number,
  zone: number,
  isNorth: boolean
): LatLng {
  const k0 = 0.9996;
  const a = 6378137;
  const e = 0.081819191;
  const e1sq = 0.006739497;
  const falseEasting = 500000;
  const falseNorthing = isNorth ? 0 : 10000000;

  const x = easting - falseEasting;
  const y = northing - falseNorthing;

  const M = y / k0;
  const mu =
    M /
    (a *
      (1 -
        Math.pow(e, 2) / 4 -
        3 * Math.pow(e, 4) / 64 -
        5 * Math.pow(e, 6) / 256));

  const e1 =
    (1 - Math.sqrt(1 - Math.pow(e, 2))) / (1 + Math.sqrt(1 - Math.pow(e, 2)));
  const J1 = (3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32;
  const J2 = (21 * Math.pow(e1, 2)) / 16 - (55 * Math.pow(e1, 4)) / 32;
  const J3 = (151 * Math.pow(e1, 3)) / 96;
  const J4 = (1097 * Math.pow(e1, 4)) / 512;

  const fp =
    mu +
    J1 * Math.sin(2 * mu) +
    J2 * Math.sin(4 * mu) +
    J3 * Math.sin(6 * mu) +
    J4 * Math.sin(8 * mu);

  const C1 = e1sq * Math.pow(Math.cos(fp), 2);
  const T1 = Math.pow(Math.tan(fp), 2);
  const R1 =
    (a * (1 - Math.pow(e, 2))) /
    Math.pow(1 - Math.pow(e, 2) * Math.pow(Math.sin(fp), 2), 1.5);
  const N1 = a / Math.sqrt(1 - Math.pow(e, 2) * Math.pow(Math.sin(fp), 2));
  const D = x / (N1 * k0);

  const Q1 = (N1 * Math.tan(fp)) / R1;
  const Q2 = Math.pow(D, 2) / 2;
  const Q3 =
    ((5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e1sq) *
      Math.pow(D, 4)) /
    24;
  const Q4 =
    ((61 +
      90 * T1 +
      298 * C1 +
      45 * Math.pow(T1, 2) -
      252 * e1sq -
      3 * Math.pow(C1, 2)) *
      Math.pow(D, 6)) /
    720;

  const lat = fp - Q1 * (Q2 - Q3 + Q4);

  const Q5 = D;
  const Q6 = ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6;
  const Q7 =
    ((5 -
      2 * C1 +
      28 * T1 -
      3 * Math.pow(C1, 2) +
      8 * e1sq +
      24 * Math.pow(T1, 2)) *
      Math.pow(D, 5)) /
    120;

  const lng0 = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180;
  const lng = lng0 + (Q5 - Q6 + Q7) / Math.cos(fp);

  return {
    latitude: (lat * 180) / Math.PI,
    longitude: (lng * 180) / Math.PI,
  };
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case "concluída":
    case "concluida":
      return Colors.light.success;
    case "em andamento":
      return Colors.light.warning;
    case "pendente":
      return "#6366F1";
    default:
      return Colors.light.primary;
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

export default function MapaVistoriasScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [selectedVistoria, setSelectedVistoria] =
    useState<VistoriaMarker | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const queryKey = user?.is_admin
    ? "/api/vistorias?all=true"
    : `/api/vistorias?usuario_id=${user?.id}`;

  const { data: vistorias = [] } = useQuery<any[]>({
    queryKey: [queryKey],
    enabled: !!user?.id,
  });

  const markers: VistoriaMarker[] = useMemo(() => {
    const result: VistoriaMarker[] = [];

    for (const vistoria of vistorias) {
      let center: LatLng | null = null;

      if (vistoria.coordenadas_utm && vistoria.coordenadas_utm.length > 0) {
        const zoneMatch = (vistoria.zona_utm || "23K").match(/(\d+)([A-Za-z])/);
        if (!zoneMatch) continue;

        const zone = parseInt(zoneMatch[1], 10);
        const zoneLetter = zoneMatch[2].toUpperCase();
        const isNorth = zoneLetter >= "N";

        const coords: LatLng[] = [];
        for (const c of vistoria.coordenadas_utm) {
          const e = parseFloat(String(c.e));
          const n = parseFloat(String(c.n));
          if (!isNaN(e) && !isNaN(n)) {
            coords.push(utmToLatLng(e, n, zone, isNorth));
          }
        }

        if (coords.length > 0) {
          const avgLat =
            coords.reduce((sum, c) => sum + c.latitude, 0) / coords.length;
          const avgLng =
            coords.reduce((sum, c) => sum + c.longitude, 0) / coords.length;
          center = { latitude: avgLat, longitude: avgLng };
        }
      }

      if (!center) continue;

      result.push({
        id: String(vistoria.id),
        proprietario: vistoria.proprietario_nome || "Sem proprietário",
        municipio: vistoria.municipio || "-",
        status: vistoria.status || "Pendente",
        data_vistoria: vistoria.data_vistoria || "",
        projeto_nome: vistoria.projeto_nome || "",
        center,
      });
    }

    return result;
  }, [vistorias]);

  const filtered = filterStatus
    ? markers.filter(
        (m) => m.status.toLowerCase() === filterStatus.toLowerCase()
      )
    : markers;

  const region = useMemo(() => {
    if (filtered.length === 0) {
      return {
        latitude: -22.9,
        longitude: -47.1,
        latitudeDelta: 2,
        longitudeDelta: 2,
      };
    }
    const lats = filtered.map((m) => m.center.latitude);
    const lngs = filtered.map((m) => m.center.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const deltaLat = Math.max((maxLat - minLat) * 1.3, 0.05);
    const deltaLng = Math.max((maxLng - minLng) * 1.3, 0.05);
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLng,
    };
  }, [filtered]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of markers) {
      const s = m.status;
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [markers]);

  const openDetail = (marker: VistoriaMarker) => {
    setSelectedVistoria(marker);
    setDetailModalVisible(true);
  };

  const navigateToDetails = () => {
    if (!selectedVistoria) return;
    setDetailModalVisible(false);
    navigation.navigate("DetalhesVistoria", {
      vistoriaId: selectedVistoria.id,
    });
  };

  if (Platform.OS === "web") {
    return (
      <ThemedView style={styles.webContainer}>
        <Feather name="map" size={64} color={theme.tabIconDefault} />
        <ThemedText style={styles.webTitle}>Mapa de Vistorias</ThemedText>
        <ThemedText
          style={[styles.webHint, { color: theme.tabIconDefault }]}
        >
          Use o Expo Go no seu dispositivo para visualizar o mapa interativo
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        region={region}
        mapType="hybrid"
      >
        {filtered.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.center}
            pinColor={getStatusColor(marker.status)}
            onPress={() => openDetail(marker)}
          >
            <View style={[styles.customMarker, { backgroundColor: getStatusColor(marker.status) }]}>
              <Feather name="clipboard" size={14} color="#fff" />
            </View>
            <Callout tooltip onPress={() => openDetail(marker)}>
              <View style={[styles.callout, { backgroundColor: theme.backgroundDefault }]}>
                <ThemedText style={styles.calloutTitle} numberOfLines={1}>
                  {marker.proprietario}
                </ThemedText>
                <ThemedText style={[styles.calloutSub, { color: theme.tabIconDefault }]}>
                  {marker.municipio}
                </ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(marker.status) + "20" }]}>
                  <ThemedText style={[styles.statusText, { color: getStatusColor(marker.status) }]}>
                    {marker.status}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.calloutTap, { color: Colors.light.primary }]}>
                  Toque para detalhes
                </ThemedText>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View
        style={[
          styles.topBar,
          { paddingTop: headerHeight + Spacing.sm },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            onPress={() => setFilterStatus(null)}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filterStatus === null
                    ? Colors.light.primary
                    : "rgba(0,0,0,0.5)",
              },
            ]}
          >
            <ThemedText style={styles.filterChipText}>
              Todas ({markers.length})
            </ThemedText>
          </Pressable>
          {Object.entries(statusCounts).map(([status, count]) => (
            <Pressable
              key={status}
              onPress={() =>
                setFilterStatus(filterStatus === status ? null : status)
              }
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    filterStatus === status
                      ? getStatusColor(status)
                      : "rgba(0,0,0,0.5)",
                },
              ]}
            >
              <View
                style={[
                  styles.filterDot,
                  { backgroundColor: getStatusColor(status) },
                ]}
              />
              <ThemedText style={styles.filterChipText}>
                {status} ({count})
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View
        style={[
          styles.bottomLegend,
          {
            bottom: insets.bottom + Spacing.lg,
            backgroundColor: "rgba(0,0,0,0.65)",
          },
        ]}
      >
        <Feather name="info" size={12} color="#fff" />
        <ThemedText style={styles.legendText}>
          {filtered.length} vistoria{filtered.length !== 1 ? "s" : ""} no mapa
        </ThemedText>
      </View>

      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle} numberOfLines={2}>
                {selectedVistoria?.proprietario}
              </ThemedText>
              <Pressable onPress={() => setDetailModalVisible(false)}>
                <Feather name="x" size={22} color={theme.tabIconDefault} />
              </Pressable>
            </View>

            {selectedVistoria ? (
              <View style={styles.modalBody}>
                <View style={styles.infoRow}>
                  <Feather name="map-pin" size={16} color={theme.tabIconDefault} />
                  <ThemedText style={[styles.infoText, { color: theme.tabIconDefault }]}>
                    {selectedVistoria.municipio}
                  </ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="calendar" size={16} color={theme.tabIconDefault} />
                  <ThemedText style={[styles.infoText, { color: theme.tabIconDefault }]}>
                    {formatDate(selectedVistoria.data_vistoria)}
                  </ThemedText>
                </View>
                {selectedVistoria.projeto_nome ? (
                  <View style={styles.infoRow}>
                    <Feather name="layers" size={16} color={theme.tabIconDefault} />
                    <ThemedText style={[styles.infoText, { color: theme.tabIconDefault }]}>
                      {selectedVistoria.projeto_nome}
                    </ThemedText>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.statusCard,
                    {
                      backgroundColor:
                        getStatusColor(selectedVistoria.status) + "20",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: getStatusColor(
                          selectedVistoria.status
                        ),
                      },
                    ]}
                  />
                  <ThemedText
                    style={[
                      styles.statusLabel,
                      {
                        color: getStatusColor(selectedVistoria.status),
                      },
                    ]}
                  >
                    {selectedVistoria.status}
                  </ThemedText>
                </View>

                <Pressable
                  onPress={navigateToDetails}
                  style={[
                    styles.openBtn,
                    { backgroundColor: Colors.light.primary },
                  ]}
                  testID={`button-open-vistoria-${selectedVistoria.id}`}
                >
                  <Feather name="external-link" size={18} color="#fff" />
                  <ThemedText style={styles.openBtnText}>
                    Abrir Vistoria
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
  },
  filterRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  callout: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    minWidth: 180,
    maxWidth: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutTitle: {
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 4,
  },
  calloutSub: {
    fontSize: 12,
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  calloutTap: {
    fontSize: 11,
    fontWeight: "500",
  },
  bottomLegend: {
    position: "absolute",
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  legendText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  webContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  webTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  webHint: {
    fontSize: 14,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    marginRight: Spacing.md,
  },
  modalBody: {
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  infoText: {
    fontSize: 14,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  openBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
