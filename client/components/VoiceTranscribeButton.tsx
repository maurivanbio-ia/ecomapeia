import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
} from "react-native";
import {
  useAudioRecorder,
  setAudioModeAsync,
  RecordingPresets,
  AudioModule,
} from "expo-audio";
import * as FileSystem from "expo-file-system";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import * as Haptics from "expo-haptics";

interface VoiceTranscribeButtonProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

type RecordingState = "idle" | "recording" | "transcribing";

export default function VoiceTranscribeButton({
  onTranscription,
  disabled = false,
}: VoiceTranscribeButtonProps) {
  const { theme } = useTheme();
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  useEffect(() => {
    return () => {
      stopPulse();
    };
  }, [stopPulse]);

  const startRecording = async () => {
    try {
      setError(null);

      if (Platform.OS === "web") {
        setError("Gravação não disponível na web");
        return;
      }

      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError("Permissão de microfone negada");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      setState("recording");
      startPulse();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Erro ao iniciar gravação");
      setState("idle");
    }
  };

  const stopAndTranscribe = async () => {
    try {
      stopPulse();
      setState("transcribing");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });

      const uri = recorder.uri;

      if (!uri) {
        setError("Erro ao obter arquivo de áudio");
        setState("idle");
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64" as any,
      });

      const ext = uri.split(".").pop()?.toLowerCase() || "m4a";

      const response = await apiRequest("POST", "/api/ai/transcribe-audio", {
        audioBase64: base64,
        format: ext,
      });

      const data = await response.json();

      if (data.text) {
        onTranscription(data.text);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setError(null);
      } else {
        setError("Não foi possível transcrever o áudio");
      }
    } catch (err) {
      console.error("Error transcribing:", err);
      setError("Erro ao transcrever áudio");
    } finally {
      setState("idle");
    }
  };

  const handlePress = () => {
    if (disabled || state === "transcribing") return;
    if (state === "idle") {
      startRecording();
    } else if (state === "recording") {
      stopAndTranscribe();
    }
  };

  const isRecording = state === "recording";
  const isTranscribing = state === "transcribing";
  const isActive = isRecording || isTranscribing;

  const buttonColor = isRecording
    ? "#EF4444"
    : Colors.light.primary;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Pressable
          onPress={handlePress}
          disabled={disabled || isTranscribing}
          style={({ pressed }) => [
            styles.container,
            {
              backgroundColor: isRecording
                ? "#FEE2E2"
                : isTranscribing
                ? "#EFF6FF"
                : theme.backgroundDefault,
              borderColor: buttonColor,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          {isTranscribing ? (
            <ActivityIndicator size="small" color={Colors.light.primary} />
          ) : (
            <Animated.View
              style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}
            >
              <Feather
                name={isRecording ? "square" : "mic"}
                size={18}
                color={buttonColor}
              />
            </Animated.View>
          )}

          <ThemedText style={[styles.label, { color: buttonColor }]}>
            {isRecording
              ? "Parar e transcrever"
              : isTranscribing
              ? "Transcrevendo..."
              : "Gravar observação"}
          </ThemedText>

          {isRecording ? <View style={styles.recDot} /> : null}
        </Pressable>

        {isActive ? (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isRecording ? "#FEF2F2" : "#EFF6FF",
                borderColor: buttonColor,
              },
            ]}
          >
            <ThemedText style={[styles.statusText, { color: buttonColor }]}>
              {isRecording ? "REC" : "IA"}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={12} color="#EF4444" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}

      <ThemedText style={styles.hint}>
        {isRecording
          ? "Fale suas observacoes. Toque em parar para transcrever."
          : isTranscribing
          ? "A IA esta transcrevendo seu audio..."
          : "Grave um audio e a IA transcrevera automaticamente para o campo abaixo."}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
  },
  hint: {
    fontSize: 11,
    color: "#888",
    lineHeight: 15,
  },
});
