import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  PanResponder,
  Dimensions,
  Image,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import Svg, { Path } from "react-native-svg";

export const SIGNATURE_REFUSED = "__recusou_assinar__";
export const SIGNATURE_ABSENT = "__ninguem_no_local__";

interface SignatureCaptureProps {
  onSignatureCapture: (uri: string, timestamp?: string) => void;
  signatureUri: string | null;
  signatureTimestamp?: string | null;
  showTimestamp?: boolean;
}

export default function SignatureCapture({
  onSignatureCapture,
  signatureUri,
  signatureTimestamp,
  showTimestamp = true,
}: SignatureCaptureProps) {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>(signatureTimestamp || "");
  const [savedImageUri, setSavedImageUri] = useState<string | null>(signatureUri);
  const signatureRef = useRef<View>(null);
  const currentPathRef = useRef<string>("");

  const isRefused = savedImageUri === SIGNATURE_REFUSED;
  const isAbsent = savedImageUri === SIGNATURE_ABSENT;
  const isSpecialState = isRefused || isAbsent;
  const hasSignature = !!savedImageUri && !isSpecialState;

  const formatTimestamp = (date: Date): string =>
    date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newPath = `M${locationX},${locationY}`;
        currentPathRef.current = newPath;
        setCurrentPath(newPath);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const updated = `${currentPathRef.current} L${locationX},${locationY}`;
        currentPathRef.current = updated;
        setCurrentPath(updated);
      },
      onPanResponderRelease: () => {
        const pathToSave = currentPathRef.current;
        if (pathToSave) {
          setPaths((prev) => [...prev, pathToSave]);
          currentPathRef.current = "";
          setCurrentPath("");
        }
      },
    })
  ).current;

  const clearSignature = () => {
    setPaths([]);
    setCurrentPath("");
    currentPathRef.current = "";
  };

  const saveSignature = async () => {
    if (paths.length === 0) return;
    try {
      let uri: string | null = null;
      if (Platform.OS !== "web" && signatureRef.current) {
        try {
          uri = await captureRef(signatureRef, { format: "png", quality: 1 });
        } catch (_e) {}
      }
      if (!uri) {
        const svgPaths = paths
          .map(
            (p) =>
              `<path d="${p}" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
          )
          .join("");
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${signatureWidth}" height="${signatureHeight}" viewBox="0 0 ${signatureWidth} ${signatureHeight}"><rect width="100%" height="100%" fill="white"/>${svgPaths}</svg>`;
        uri = `data:image/svg+xml;base64,${btoa(svgContent)}`;
      }
      const newTimestamp = formatTimestamp(new Date());
      setTimestamp(newTimestamp);
      setSavedImageUri(uri);
      onSignatureCapture(uri, newTimestamp);
      setModalVisible(false);
    } catch (error) {
      console.error("Error capturing signature:", error);
    }
  };

  const handleSpecialState = (value: string) => {
    const newTimestamp = formatTimestamp(new Date());
    setTimestamp(newTimestamp);
    setSavedImageUri(value);
    onSignatureCapture(value, newTimestamp);
  };

  const handleRemove = () => {
    setPaths([]);
    setCurrentPath("");
    currentPathRef.current = "";
    setTimestamp("");
    setSavedImageUri(null);
    onSignatureCapture("", "");
  };

  const { width } = Dimensions.get("window");
  const signatureWidth = Math.min(width - 48, 400);
  const signatureHeight = 200;

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>Assinatura do Responsável</ThemedText>

      {hasSignature ? (
        <View style={styles.signaturePreview}>
          <View style={[styles.signatureImage, { backgroundColor: "#FFFFFF", borderColor: theme.border }]}>
            <Image
              source={{ uri: savedImageUri! }}
              style={{ width: "100%", height: 120 }}
              resizeMode="contain"
            />
          </View>
          {showTimestamp && timestamp ? (
            <View style={styles.timestampContainer}>
              <Feather name="clock" size={12} color={Colors.light.textSecondary} />
              <ThemedText style={styles.timestampText}>Assinado em: {timestamp}</ThemedText>
            </View>
          ) : null}
          <Pressable onPress={handleRemove} style={styles.removeBtn}>
            <Feather name="trash-2" size={18} color="#FF4444" />
          </Pressable>
        </View>
      ) : isSpecialState ? (
        <View style={styles.signaturePreview}>
          <View
            style={[
              styles.specialStateCard,
              {
                backgroundColor: isRefused ? "#FFF3CD" : "#E8F4FD",
                borderColor: isRefused ? "#F59E0B" : "#3B82F6",
              },
            ]}
          >
            <Feather
              name={isRefused ? "x-circle" : "user-x"}
              size={28}
              color={isRefused ? "#F59E0B" : "#3B82F6"}
            />
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText
                style={[
                  styles.specialStateTitle,
                  { color: isRefused ? "#B45309" : "#1D4ED8" },
                ]}
              >
                {isRefused ? "Recusou assinar" : "Ninguém no local"}
              </ThemedText>
              <ThemedText style={[styles.specialStateDesc, { color: isRefused ? "#92400E" : "#1E40AF" }]}>
                {isRefused
                  ? "O responsável se recusou a assinar o documento"
                  : "Não havia nenhum responsável presente no local"}
              </ThemedText>
              {showTimestamp && timestamp ? (
                <ThemedText style={[styles.specialStateTime, { color: isRefused ? "#92400E" : "#1E40AF" }]}>
                  Registrado em: {timestamp}
                </ThemedText>
              ) : null}
            </View>
          </View>
          <Pressable onPress={handleRemove} style={styles.removeBtn}>
            <Feather name="trash-2" size={18} color="#FF4444" />
          </Pressable>
        </View>
      ) : (
        <View style={styles.optionsContainer}>
          <Pressable
            onPress={() => {
              clearSignature();
              setModalVisible(true);
            }}
            style={[styles.signatureButton, { borderColor: Colors.light.primary, backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="edit-2" size={22} color={Colors.light.primary} />
            <ThemedText style={[styles.signatureButtonText, { color: Colors.light.primary }]}>
              Toque para assinar
            </ThemedText>
          </Pressable>

          <View style={styles.alternativeRow}>
            <Pressable
              onPress={() => handleSpecialState(SIGNATURE_REFUSED)}
              style={[styles.altButton, { borderColor: "#F59E0B", backgroundColor: "#FFF9ED" }]}
            >
              <Feather name="x-circle" size={16} color="#F59E0B" />
              <ThemedText style={[styles.altButtonText, { color: "#B45309" }]}>
                Recusou assinar
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => handleSpecialState(SIGNATURE_ABSENT)}
              style={[styles.altButton, { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" }]}
            >
              <Feather name="user-x" size={16} color="#3B82F6" />
              <ThemedText style={[styles.altButtonText, { color: "#1D4ED8" }]}>
                Ninguém no local
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Assine aqui</ThemedText>
              <Pressable onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View
              ref={signatureRef}
              collapsable={false}
              style={[
                styles.signaturePad,
                { width: signatureWidth, height: signatureHeight, backgroundColor: "#FFFFFF", borderColor: theme.border },
              ]}
              {...panResponder.panHandlers}
            >
              <Svg width={signatureWidth} height={signatureHeight}>
                {paths.map((path, index) => (
                  <Path
                    key={index}
                    d={path}
                    stroke="#000000"
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {currentPath ? (
                  <Path
                    d={currentPath}
                    stroke="#000000"
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </Svg>
              {paths.length === 0 && !currentPath ? (
                <View style={styles.placeholder}>
                  <ThemedText style={{ color: "#999", fontSize: 14 }}>
                    Desenhe sua assinatura aqui
                  </ThemedText>
                </View>
              ) : null}
            </View>

            <View style={styles.modalButtons}>
              <Pressable onPress={clearSignature} style={[styles.modalBtn, { backgroundColor: "#FF4444" }]}>
                <Feather name="trash" size={18} color="#FFFFFF" />
                <ThemedText style={styles.modalBtnText}>Limpar</ThemedText>
              </Pressable>
              <Pressable
                onPress={saveSignature}
                style={[styles.modalBtn, { backgroundColor: paths.length > 0 ? Colors.light.accent : "#CCC" }]}
                disabled={paths.length === 0}
              >
                <Feather name="check" size={18} color="#FFFFFF" />
                <ThemedText style={styles.modalBtnText}>Confirmar</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  optionsContainer: {
    gap: Spacing.sm,
  },
  signatureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: Spacing.sm,
  },
  signatureButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
  alternativeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  altButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  altButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  signaturePreview: {
    position: "relative",
  },
  signatureImage: {
    height: 120,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  specialStateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    minHeight: 90,
  },
  specialStateTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  specialStateDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  specialStateTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.8,
  },
  timestampContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  timestampText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  removeBtn: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.md,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: "90%",
    maxWidth: 450,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  signaturePad: {
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignSelf: "center",
  },
  placeholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  modalBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
