import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, Modal, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAudioPermission } from "expo-camera";
import { Video, ResizeMode } from "expo-av";
import { ThemedText } from "./ThemedText";
import { Colors, Spacing } from "@/constants/theme";

interface VideoRecorderProps {
  visible: boolean;
  onClose: () => void;
  onVideoRecorded?: (uri: string, duration: number) => void;
  maxDuration?: number;
}

export function VideoRecorder({ 
  visible, 
  onClose, 
  onVideoRecorded, 
  maxDuration = 60 
}: VideoRecorderProps) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        setRecordingDuration(0);
        
        timerRef.current = setInterval(() => {
          setRecordingDuration((prev) => {
            if (prev >= maxDuration - 1) {
              stopRecording();
              return prev;
            }
            return prev + 1;
          });
        }, 1000);

        const video = await cameraRef.current.recordAsync({
          maxDuration,
        });
        
        if (video?.uri) {
          setRecordedVideo(video.uri);
        }
      } catch (error) {
        console.error("Error recording video:", error);
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current && isRecording) {
      setProcessing(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      await cameraRef.current.stopRecording();
      setIsRecording(false);
      setProcessing(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleConfirm = () => {
    if (recordedVideo && onVideoRecorded) {
      onVideoRecorded(recordedVideo, recordingDuration);
    }
    reset();
    onClose();
  };

  const reset = () => {
    setRecordedVideo(null);
    setRecordingDuration(0);
  };

  if (!cameraPermission) {
    return null;
  }

  if (!cameraPermission.granted) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Gravar Vídeo</ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          <View style={styles.permissionContainer}>
            <Feather name="video-off" size={48} color={Colors.light.textSecondary} />
            <ThemedText style={styles.permissionText}>
              Permissão de câmera e microfone necessária para gravar vídeos
            </ThemedText>
            <Pressable style={styles.permissionButton} onPress={requestCameraPermission}>
              <ThemedText style={styles.permissionButtonText}>Permitir acesso</ThemedText>
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
          <ThemedText style={styles.title}>Gravar Vídeo</ThemedText>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={Colors.light.text} />
          </Pressable>
        </View>

        {!recordedVideo ? (
          <View style={styles.cameraContainer}>
            <CameraView 
              ref={cameraRef} 
              style={styles.camera} 
              facing="back"
              mode="video"
            >
              <View style={styles.cameraOverlay}>
                {isRecording && (
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <ThemedText style={styles.recordingTime}>
                      {formatDuration(recordingDuration)}
                    </ThemedText>
                  </View>
                )}
                
                <View style={styles.durationLimit}>
                  <ThemedText style={styles.durationLimitText}>
                    Máximo: {formatDuration(maxDuration)}
                  </ThemedText>
                </View>
              </View>
            </CameraView>

            <View style={styles.cameraControls}>
              {processing ? (
                <ActivityIndicator size="large" color={Colors.light.accent} />
              ) : (
                <Pressable 
                  style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? (
                    <View style={styles.stopButtonInner} />
                  ) : (
                    <View style={styles.recordButtonInner} />
                  )}
                </Pressable>
              )}
              
              <ThemedText style={styles.controlHint}>
                {isRecording ? "Toque para parar" : "Toque para gravar"}
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Video
              source={{ uri: recordedVideo }}
              style={styles.videoPreview}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping
            />

            <View style={styles.previewInfo}>
              <Feather name="clock" size={16} color={Colors.light.textSecondary} />
              <ThemedText style={styles.previewDuration}>
                Duração: {formatDuration(recordingDuration)}
              </ThemedText>
            </View>

            <View style={styles.actionButtons}>
              <Pressable style={styles.resetButton} onPress={reset}>
                <Feather name="refresh-cw" size={18} color={Colors.light.accent} />
                <ThemedText style={styles.resetButtonText}>Gravar outro</ThemedText>
              </Pressable>

              <Pressable style={styles.confirmButton} onPress={handleConfirm}>
                <Feather name="check" size={18} color="#fff" />
                <ThemedText style={styles.confirmButtonText}>Usar vídeo</ThemedText>
              </Pressable>
            </View>
          </View>
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
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff0000",
  },
  recordingTime: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  durationLimit: {
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  durationLimitText: {
    color: "#fff",
    fontSize: 12,
  },
  cameraControls: {
    alignItems: "center",
    padding: Spacing.xl,
    backgroundColor: Colors.light.background,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#ff0000",
  },
  recordButtonActive: {
    borderColor: Colors.light.text,
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ff0000",
  },
  stopButtonInner: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: "#ff0000",
  },
  controlHint: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.md,
  },
  previewContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  videoPreview: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#000",
  },
  previewInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: Spacing.md,
  },
  previewDuration: {
    fontSize: 14,
    color: Colors.light.textSecondary,
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
