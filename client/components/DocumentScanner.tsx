import React, { useState, useRef } from "react";
import { View, StyleSheet, Pressable, Modal, ActivityIndicator, Image, ScrollView, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "./ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface OCRResult {
  extractedText: string;
  fields: Record<string, string>;
}

interface DocumentScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanComplete?: (result: OCRResult) => void;
}

export function DocumentScanner({ visible, onClose, onScanComplete }: DocumentScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true });
        if (photo?.uri) {
          setCapturedImage(photo.uri);
          if (photo.base64) {
            processOCR(`data:image/jpeg;base64,${photo.base64}`);
          }
        }
      } catch (error) {
        console.error("Error taking picture:", error);
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      if (result.assets[0].base64) {
        processOCR(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    }
  };

  const processOCR = async (imageBase64: string) => {
    setProcessing(true);
    try {
      const response = await fetch(new URL("/api/features/ocr-scan", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await response.json();
      if (data.success) {
        setResult({
          extractedText: data.extractedText,
          fields: data.fields,
        });
      }
    } catch (error) {
      console.error("OCR error:", error);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setResult(null);
  };

  const handleConfirm = () => {
    if (result && onScanComplete) {
      onScanComplete(result);
    }
    onClose();
    reset();
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Scanner de Documentos</ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          <View style={styles.permissionContainer}>
            <Feather name="camera-off" size={48} color={Colors.light.textSecondary} />
            <ThemedText style={styles.permissionText}>
              Permissão de câmera necessária para escanear documentos
            </ThemedText>
            <Pressable style={styles.permissionButton} onPress={requestPermission}>
              <ThemedText style={styles.permissionButtonText}>Permitir câmera</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Scanner de Documentos</ThemedText>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={Colors.light.text} />
          </Pressable>
        </View>

        {!capturedImage ? (
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back">
              <View style={styles.cameraOverlay}>
                <View style={styles.documentFrame} />
                <ThemedText style={styles.cameraHint}>
                  Posicione o documento dentro da moldura
                </ThemedText>
              </View>
            </CameraView>

            <View style={styles.cameraControls}>
              <Pressable style={styles.galleryButton} onPress={pickImage}>
                <Feather name="image" size={24} color={Colors.light.text} />
              </Pressable>
              
              <Pressable style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </Pressable>
              
              <View style={styles.galleryButton} />
            </View>
          </View>
        ) : (
          <ScrollView style={styles.resultContainer} contentContainerStyle={styles.resultContent}>
            <Image source={{ uri: capturedImage }} style={styles.capturedImage} />

            {processing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={Colors.light.accent} />
                <ThemedText style={styles.processingText}>
                  Processando documento com IA...
                </ThemedText>
              </View>
            )}

            {result && (
              <>
                {Object.keys(result.fields).length > 0 && (
                  <View style={styles.fieldsCard}>
                    <ThemedText style={styles.fieldsTitle}>Campos identificados</ThemedText>
                    {Object.entries(result.fields).map(([key, value]) => (
                      <View key={key} style={styles.fieldRow}>
                        <ThemedText style={styles.fieldLabel}>
                          {key.toUpperCase()}:
                        </ThemedText>
                        <ThemedText style={styles.fieldValue}>{value}</ThemedText>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.textCard}>
                  <ThemedText style={styles.textTitle}>Texto extraído</ThemedText>
                  <TextInput
                    style={styles.textInput}
                    value={result.extractedText}
                    multiline
                    editable={false}
                  />
                </View>

                <View style={styles.actionButtons}>
                  <Pressable style={styles.resetButton} onPress={reset}>
                    <Feather name="refresh-cw" size={18} color={Colors.light.accent} />
                    <ThemedText style={styles.resetButtonText}>Escanear outro</ThemedText>
                  </Pressable>

                  <Pressable style={styles.confirmButton} onPress={handleConfirm}>
                    <Feather name="check" size={18} color="#fff" />
                    <ThemedText style={styles.confirmButtonText}>Usar dados</ThemedText>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.text,
  },
  closeButton: {
    padding: 8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  permissionText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    backgroundColor: Colors.light.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  documentFrame: {
    width: "85%",
    aspectRatio: 1.4,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  cameraHint: {
    color: "#fff",
    fontSize: 14,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: Spacing.xl,
    backgroundColor: Colors.light.background,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.light.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: Colors.light.accent,
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.light.accent,
  },
  resultContainer: {
    flex: 1,
  },
  resultContent: {
    padding: Spacing.lg,
  },
  capturedImage: {
    width: "100%",
    aspectRatio: 1.4,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  processingContainer: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  processingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.md,
  },
  fieldsCard: {
    backgroundColor: Colors.light.success + "15",
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.success + "30",
  },
  fieldsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.success + "20",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.textSecondary,
  },
  fieldValue: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: "500",
  },
  textCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  textTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  textInput: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    maxHeight: 200,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  resetButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.accent,
  },
  resetButtonText: {
    color: Colors.light.accent,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.accent,
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
