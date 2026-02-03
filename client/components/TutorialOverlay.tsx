import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

const TUTORIAL_COMPLETED_KEY = "@mapeia_tutorial_completed";

interface TutorialStep {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    icon: "home",
    title: "Bem-vindo ao MapeIA!",
    description: "Sua plataforma completa para vistorias ambientais. Vamos fazer um tour rápido pelas funcionalidades.",
  },
  {
    icon: "plus-circle",
    title: "Criar Vistorias",
    description: "Registre novas vistorias com fotos, coordenadas UTM e todos os dados necessários para seu relatório.",
  },
  {
    icon: "map",
    title: "Mapeamento GPS",
    description: "Capture coordenadas automaticamente do seu GPS e visualize polígonos no mapa satélite.",
  },
  {
    icon: "wifi-off",
    title: "Modo Offline",
    description: "Trabalhe sem internet! Suas vistorias são salvas localmente e sincronizadas quando houver conexão.",
  },
  {
    icon: "file-text",
    title: "Relatórios PDF e Word",
    description: "Gere relatórios profissionais automaticamente no padrão RO-NOT-ITU, prontos para envio.",
  },
  {
    icon: "check-circle",
    title: "Pronto para começar!",
    description: "Agora você pode criar suas vistorias. Boa sorte no campo!",
  },
];

interface TutorialOverlayProps {
  onComplete?: () => void;
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(TUTORIAL_COMPLETED_KEY);
      if (!completed) {
        setVisible(true);
      }
    } catch (error) {
      console.error("Error checking tutorial status:", error);
    }
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeTutorial();
  };

  const completeTutorial = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, "true");
      setVisible(false);
      onComplete?.();
    } catch (error) {
      console.error("Error saving tutorial status:", error);
      setVisible(false);
    }
  };

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <Animated.View
          key={currentStep}
          entering={SlideInRight.duration(300)}
          exiting={SlideOutLeft.duration(200)}
          style={styles.card}
        >
          <View style={styles.iconContainer}>
            <Feather name={step.icon} size={48} color={Colors.light.accent} />
          </View>
          
          <ThemedText style={styles.title} lightColor="#1E3A5F" darkColor="#1E3A5F">
            {step.title}
          </ThemedText>
          
          <ThemedText style={styles.description} lightColor="#666" darkColor="#666">
            {step.description}
          </ThemedText>

          <View style={styles.progressContainer}>
            {tutorialSteps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.progressDotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles.buttonContainer}>
            {currentStep > 0 ? (
              <Pressable onPress={handlePrevious} style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>Anterior</ThemedText>
              </Pressable>
            ) : (
              <Pressable onPress={handleSkip} style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>Pular</ThemedText>
              </Pressable>
            )}
            
            <Pressable onPress={handleNext} style={styles.primaryButton}>
              <ThemedText style={styles.primaryButtonText}>
                {isLastStep ? "Começar" : "Próximo"}
              </ThemedText>
              <Feather name={isLastStep ? "check" : "arrow-right"} size={18} color="#FFF" />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export async function resetTutorial(): Promise<void> {
  await AsyncStorage.removeItem(TUTORIAL_COMPLETED_KEY);
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    width: Math.min(width - 48, 360),
    alignItems: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.light.accent + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  progressContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DDD",
  },
  progressDotActive: {
    backgroundColor: Colors.light.accent,
    width: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.light.textSecondary,
  },
  secondaryButtonText: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.accent,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
