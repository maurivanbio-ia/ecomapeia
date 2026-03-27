import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface VoiceTranscribeButtonProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

type RecordingState = "idle" | "recording" | "transcribing";

const SUPPORTED = typeof window !== "undefined" &&
  !!window.MediaRecorder &&
  !!navigator.mediaDevices?.getUserMedia;

function getMimeTypeAndFormat(): { mimeType: string; format: string } {
  const types = [
    { mimeType: "audio/webm;codecs=opus", format: "webm" },
    { mimeType: "audio/webm", format: "webm" },
    { mimeType: "audio/ogg;codecs=opus", format: "ogg" },
    { mimeType: "audio/mp4", format: "mp4" },
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t.mimeType)) return t;
  }
  return { mimeType: "", format: "webm" };
}

export default function VoiceTranscribeButton({
  onTranscription,
  disabled = false,
}: VoiceTranscribeButtonProps) {
  const { theme } = useTheme();
  const [state, setState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const formatRef = useRef<string>("webm");

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const { mimeType, format } = getMimeTypeAndFormat();
      formatRef.current = format;

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.start(250);
      setState("recording");
    } catch (err) {
      setError("Erro ao acessar microfone");
      setState("idle");
    }
  };

  const stopAndTranscribe = async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    setState("transcribing");

    await new Promise<void>((resolve) => {
      mr.onstop = () => resolve();
      mr.stop();
    });

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    try {
      const blob = new Blob(chunksRef.current, { type: `audio/${formatRef.current}` });

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const response = await apiRequest("POST", "/api/ai/transcribe-audio", {
        audioBase64: base64,
        format: formatRef.current,
      });

      const data = await response.json();

      if (data.text) {
        onTranscription(data.text);
        setError(null);
      } else {
        setError("Não foi possível transcrever o áudio");
      }
    } catch (err) {
      setError("Erro ao transcrever áudio");
    } finally {
      setState("idle");
    }
  };

  const handlePress = () => {
    if (disabled || state === "transcribing") return;
    if (state === "idle") startRecording();
    else if (state === "recording") stopAndTranscribe();
  };

  if (!SUPPORTED) {
    return (
      <View style={[styles.unsupported, { borderColor: theme.border }]}>
        <Feather name="mic-off" size={14} color={theme.tabIconDefault} />
        <ThemedText style={[styles.unsupportedText, { color: theme.tabIconDefault }]}>
          Gravação não disponível neste navegador
        </ThemedText>
      </View>
    );
  }

  const isRecording = state === "recording";
  const isTranscribing = state === "transcribing";
  const isActive = isRecording || isTranscribing;
  const buttonColor = isRecording ? "#EF4444" : Colors.light.primary;

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
            <Feather
              name={isRecording ? "square" : "mic"}
              size={18}
              color={buttonColor}
            />
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
  wrapper: { marginBottom: Spacing.sm, gap: Spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
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
  label: { fontSize: 14, fontWeight: "600", flex: 1 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  errorText: { fontSize: 12, color: "#EF4444" },
  hint: { fontSize: 11, color: "#888", lineHeight: 15 },
  unsupported: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: Spacing.sm,
  },
  unsupportedText: { fontSize: 12 },
});
