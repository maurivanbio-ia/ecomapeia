import React, { useState, useRef, useEffect } from "react";
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

// ── Detecção de suporte ────────────────────────────────────────────────────
const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

const SUPPORTS_SPEECH_RECOGNITION = !!SpeechRecognitionAPI;

const SUPPORTS_MEDIA_RECORDER =
  typeof window !== "undefined" &&
  !!window.MediaRecorder &&
  !!navigator.mediaDevices?.getUserMedia;

const SUPPORTED = SUPPORTS_SPEECH_RECOGNITION || SUPPORTS_MEDIA_RECORDER;

// ── MediaRecorder helpers (fallback Whisper) ───────────────────────────────
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
  const [liveText, setLiveText] = useState<string>("");

  // Web Speech API refs
  const recognitionRef = useRef<any>(null);

  // MediaRecorder refs (fallback)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const formatRef = useRef<string>("webm");

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    };
  }, []);

  // ── Web Speech API (melhor opção: sem chave, tempo real) ─────────────────
  const startSpeechRecognition = () => {
    setError(null);
    setLiveText("");

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    recognition.onstart = () => {
      setState("recording");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + " ";
        } else {
          interim = t;
        }
      }
      setLiveText(finalTranscript + interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setError("Permissão de microfone negada");
      } else if (event.error === "no-speech") {
        setError("Nenhuma fala detectada. Tente novamente.");
      } else {
        setError(`Erro: ${event.error}`);
      }
      setState("idle");
      setLiveText("");
    };

    recognition.onend = () => {
      // If we have a result, deliver it
      if (finalTranscript.trim()) {
        onTranscription(finalTranscript.trim());
        setError(null);
      } else if (state === "recording") {
        setError("Nenhuma fala detectada. Tente novamente.");
      }
      setState("idle");
      setLiveText("");
    };

    recognition.start();
  };

  const stopSpeechRecognition = () => {
    setState("transcribing");
    recognitionRef.current?.stop();
    // onend will fire and deliver the result
    setTimeout(() => setState("idle"), 1500);
  };

  // ── MediaRecorder + Whisper (fallback) ────────────────────────────────────
  const startMediaRecording = async () => {
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
    } catch {
      setError("Erro ao acessar microfone. Verifique as permissões.");
      setState("idle");
    }
  };

  const stopAndTranscribeWhisper = async () => {
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
    } catch {
      setError("Erro ao transcrever. Verifique a conexão com o servidor.");
    } finally {
      setState("idle");
    }
  };

  // ── Handler principal ─────────────────────────────────────────────────────
  const handlePress = () => {
    if (disabled || state === "transcribing") return;

    if (SUPPORTS_SPEECH_RECOGNITION) {
      // Modo preferencial: Web Speech API (Chrome/Edge)
      if (state === "idle") startSpeechRecognition();
      else if (state === "recording") stopSpeechRecognition();
    } else {
      // Fallback: MediaRecorder + Whisper
      if (state === "idle") startMediaRecording();
      else if (state === "recording") stopAndTranscribeWhisper();
    }
  };

  if (!SUPPORTED) {
    return (
      <View style={[styles.unsupported, { borderColor: theme.border }]}>
        <Feather name="mic-off" size={14} color={theme.tabIconDefault} />
        <ThemedText style={[styles.unsupportedText, { color: theme.tabIconDefault }]}>
          Gravação não disponível neste navegador. Use Chrome ou Edge.
        </ThemedText>
      </View>
    );
  }

  const isRecording = state === "recording";
  const isTranscribing = state === "transcribing";
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
              ? "Parar gravação"
              : isTranscribing
              ? "Processando..."
              : "Gravar observação"}
          </ThemedText>
          {isRecording ? <View style={styles.recDot} /> : null}
        </Pressable>

        {(isRecording || isTranscribing) ? (
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
              {isRecording ? "REC" : "···"}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {/* Transcrição em tempo real (Web Speech API) */}
      {isRecording && liveText ? (
        <View style={styles.livePreview}>
          <Feather name="type" size={11} color={Colors.light.primary} />
          <ThemedText style={styles.liveText} numberOfLines={3}>
            {liveText}
          </ThemedText>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={12} color="#EF4444" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}

      <ThemedText style={styles.hint}>
        {isRecording
          ? SUPPORTS_SPEECH_RECOGNITION
            ? "Fale normalmente. Toque em parar quando terminar."
            : "Fale suas observações. Toque em parar para transcrever via IA."
          : isTranscribing
          ? "Finalizando transcrição..."
          : SUPPORTS_SPEECH_RECOGNITION
          ? "Toque para gravar. Transcrição automática em tempo real."
          : "Grave um áudio e a IA transcreverá automaticamente."}
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
  livePreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.primary + "40",
  },
  liveText: {
    flex: 1,
    fontSize: 12,
    color: Colors.light.primary,
    fontStyle: "italic",
    lineHeight: 17,
  },
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
