import React, { useRef, useState, useCallback } from "react";
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

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

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
    if (paths.length > 0) {
      try {
        let uri: string | null = null;

        if (Platform.OS !== "web" && signatureRef.current) {
          try {
            uri = await captureRef(signatureRef, {
              format: "png",
              quality: 1,
            });
          } catch (_e) {
            // fallback to SVG data URI
          }
        }

        if (!uri) {
          const svgPaths = paths.map(
            (p) => `<path d="${p}" stroke="#000000" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
          ).join("");
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
    }
  };

  const handleRemoveSignature = () => {
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

      {savedImageUri ? (
        <View style={styles.signaturePreview}>
          <View
            style={[
              styles.signatureImage,
              { backgroundColor: "#FFFFFF", borderColor: theme.border },
            ]}
          >
            <Image
              source={{ uri: savedImageUri }}
              style={{ width: "100%", height: 120 }}
              resizeMode="contain"
            />
          </View>
          {showTimestamp && timestamp ? (
            <View style={styles.timestampContainer}>
              <Feather name="clock" size={12} color={Colors.light.textSecondary} />
              <ThemedText style={styles.timestampText}>
                Assinado em: {timestamp}
              </ThemedText>
            </View>
          ) : null}
          <Pressable
            onPress={handleRemoveSignature}
            style={styles.removeBtn}
          >
            <Feather name="trash-2" size={18} color="#FF4444" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setModalVisible(true)}
          style={[
            styles.signatureButton,
            { borderColor: Colors.light.primary, backgroundColor: theme.backgroundDefault },
          ]}
        >
          <Feather name="edit-2" size={24} color={Colors.light.primary} />
          <ThemedText style={{ color: Colors.light.primary, marginLeft: Spacing.sm }}>
            Toque para assinar
          </ThemedText>
        </Pressable>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
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
                {
                  width: signatureWidth,
                  height: signatureHeight,
                  backgroundColor: "#FFFFFF",
                  borderColor: theme.border,
                },
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
              <Pressable
                onPress={clearSignature}
                style={[styles.modalBtn, { backgroundColor: "#FF4444" }]}
              >
                <Feather name="trash" size={18} color="#FFFFFF" />
                <ThemedText style={styles.modalBtnText}>Limpar</ThemedText>
              </Pressable>
              <Pressable
                onPress={saveSignature}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: paths.length > 0 ? Colors.light.accent : "#CCC",
                  },
                ]}
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
  signatureButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: "dashed",
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
