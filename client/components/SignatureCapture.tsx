import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  PanResponder,
  Dimensions,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import Svg, { Path } from "react-native-svg";

interface SignatureCaptureProps {
  onSignatureCapture: (uri: string) => void;
  signatureUri: string | null;
}

export default function SignatureCapture({
  onSignatureCapture,
  signatureUri,
}: SignatureCaptureProps) {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const signatureRef = useRef<View>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M${locationX},${locationY}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L${locationX},${locationY}`);
      },
      onPanResponderRelease: () => {
        if (currentPath) {
          setPaths((prev) => [...prev, currentPath]);
          setCurrentPath("");
        }
      },
    })
  ).current;

  const clearSignature = () => {
    setPaths([]);
    setCurrentPath("");
  };

  const saveSignature = async () => {
    if (signatureRef.current && paths.length > 0) {
      try {
        const uri = await captureRef(signatureRef, {
          format: "png",
          quality: 1,
        });
        onSignatureCapture(uri);
        setModalVisible(false);
      } catch (error) {
        console.error("Error capturing signature:", error);
      }
    }
  };

  const { width } = Dimensions.get("window");
  const signatureWidth = Math.min(width - 48, 400);
  const signatureHeight = 200;

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>Assinatura do Responsável</ThemedText>

      {signatureUri ? (
        <View style={styles.signaturePreview}>
          <View
            style={[
              styles.signatureImage,
              { backgroundColor: "#FFFFFF", borderColor: theme.border },
            ]}
          >
            <Svg width="100%" height={120}>
              <Path d={paths.join(" ")} stroke="#000" strokeWidth={2} fill="none" />
            </Svg>
          </View>
          <Pressable
            onPress={() => {
              setPaths([]);
              onSignatureCapture("");
            }}
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
                style={[styles.modalBtn, { backgroundColor: Colors.light.accent }]}
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
