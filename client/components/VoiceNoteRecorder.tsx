import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Platform, Alert } from "react-native";
import { Audio } from "expo-av";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming 
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface VoiceNoteRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onDelete?: () => void;
  existingUri?: string;
  existingDuration?: number;
  theme: any;
}

export function VoiceNoteRecorder({
  onRecordingComplete,
  onDelete,
  existingUri,
  existingDuration = 0,
  theme,
}: VoiceNoteRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasRecording, setHasRecording] = useState(!!existingUri);
  const [currentUri, setCurrentUri] = useState(existingUri || "");
  const [duration, setDuration] = useState(existingDuration);

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withTiming(1.2, { duration: 500 }),
        -1,
        true
      );
    } else {
      pulseScale.value = 1;
    }
  }, [isRecording]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Aviso", "Gravação de áudio não disponível na web. Use o Expo Go no seu dispositivo.");
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permissão Necessária", "Permita o acesso ao microfone para gravar notas de voz.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Erro", "Falha ao iniciar gravação");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      setRecording(null);
      setIsRecording(false);
      
      if (uri) {
        setCurrentUri(uri);
        setDuration(recordingDuration);
        setHasRecording(true);
        onRecordingComplete(uri, recordingDuration);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Erro", "Falha ao parar gravação");
    }
  };

  const playRecording = async () => {
    if (!currentUri) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error("Failed to play recording:", error);
      Alert.alert("Erro", "Falha ao reproduzir gravação");
    }
  };

  const stopPlaying = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };

  const deleteRecording = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      "Excluir Gravação",
      "Tem certeza que deseja excluir esta nota de voz?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            setCurrentUri("");
            setDuration(0);
            setHasRecording(false);
            onDelete?.();
          },
        },
      ]
    );
  };

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.webMessage}>
          <Feather name="mic-off" size={24} color={theme.tabIconDefault} />
          <ThemedText style={styles.webMessageText}>
            Gravação de áudio disponível apenas no Expo Go
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      {!hasRecording ? (
        <View style={styles.recordingControls}>
          {isRecording ? (
            <>
              <Animated.View style={[styles.recordingIndicator, pulseStyle]}>
                <View style={styles.recordingDot} />
              </Animated.View>
              <ThemedText style={styles.durationText}>
                {formatDuration(recordingDuration)}
              </ThemedText>
              <Pressable
                onPress={stopRecording}
                style={[styles.stopButton, { backgroundColor: Colors.light.error }]}
              >
                <Feather name="square" size={24} color="#FFFFFF" />
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={startRecording}
              style={[styles.recordButton, { backgroundColor: Colors.light.accent }]}
            >
              <Feather name="mic" size={28} color="#FFFFFF" />
              <ThemedText style={styles.recordButtonText}>Gravar Nota de Voz</ThemedText>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.playbackControls}>
          <View style={styles.playbackInfo}>
            <Feather name="mic" size={20} color={Colors.light.accent} />
            <ThemedText style={styles.playbackDuration}>
              {formatDuration(duration)}
            </ThemedText>
          </View>
          
          <View style={styles.playbackButtons}>
            <Pressable
              onPress={isPlaying ? stopPlaying : playRecording}
              style={[styles.playButton, { backgroundColor: Colors.light.accent }]}
            >
              <Feather name={isPlaying ? "pause" : "play"} size={20} color="#FFFFFF" />
            </Pressable>
            
            <Pressable
              onPress={deleteRecording}
              style={[styles.deleteButton, { borderColor: Colors.light.error }]}
            >
              <Feather name="trash-2" size={20} color={Colors.light.error} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  recordingControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
  },
  recordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  recordButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  recordingIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.error + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.light.error,
  },
  durationText: {
    fontSize: 24,
    fontWeight: "700",
    minWidth: 80,
    textAlign: "center",
  },
  stopButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  playbackControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playbackInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  playbackDuration: {
    fontSize: 16,
    fontWeight: "600",
  },
  playbackButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  webMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  webMessageText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});
