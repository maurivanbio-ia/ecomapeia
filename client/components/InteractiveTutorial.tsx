import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";

const TUTORIAL_COMPLETED_KEY = "@mapeia_tutorial_completed";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type SpotlightPosition = "top" | "bottom" | "center" | "tab-home" | "tab-inspections" | "tab-ai" | "tab-profile";

interface InteractiveTutorialStep {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  spotlight?: SpotlightPosition;
  tooltipPosition?: "top" | "bottom";
  pulseElement?: boolean;
}

const tutorialSteps: InteractiveTutorialStep[] = [
  {
    icon: "home",
    title: "Bem-vindo ao MapeIA!",
    description: "Sua plataforma completa para vistorias ambientais. Vamos fazer um tour interativo!",
    spotlight: "center",
    tooltipPosition: "bottom",
  },
  {
    icon: "home",
    title: "Aba Início",
    description: "Aqui você vê o dashboard com estatísticas, vistorias recentes e acesso rápido às funcionalidades.",
    spotlight: "tab-home",
    tooltipPosition: "top",
    pulseElement: true,
  },
  {
    icon: "clipboard",
    title: "Aba Vistorias",
    description: "Crie e gerencie suas vistorias. Toque aqui para criar novas inspeções de campo.",
    spotlight: "tab-inspections",
    tooltipPosition: "top",
    pulseElement: true,
  },
  {
    icon: "navigation",
    title: "GPS Automático",
    description: "Ao criar uma vistoria, capture coordenadas UTM automaticamente do GPS do seu dispositivo.",
    spotlight: "center",
    tooltipPosition: "bottom",
  },
  {
    icon: "map-pin",
    title: "Código CAR",
    description: "O app busca automaticamente o código CAR (Cadastro Ambiental Rural) com base nas coordenadas GPS.",
    spotlight: "center",
    tooltipPosition: "bottom",
  },
  {
    icon: "map",
    title: "Polígonos no Mapa",
    description: "Adicione 3+ pontos UTM para visualizar a propriedade em mapa satélite.",
    spotlight: "center",
    tooltipPosition: "bottom",
  },
  {
    icon: "cpu",
    title: "Assistente IA",
    description: "Toque aqui para acessar o EcoIA - seu assistente para dúvidas sobre APP, Reserva Legal e legislação.",
    spotlight: "tab-ai",
    tooltipPosition: "top",
    pulseElement: true,
  },
  {
    icon: "alert-triangle",
    title: "MapBiomas Alerta",
    description: "Consulte alertas de desmatamento por município ou código diretamente no app.",
    spotlight: "center",
    tooltipPosition: "bottom",
  },
  {
    icon: "database",
    title: "Dados Ambientais",
    description: "Acesse INPE, ANA, IBGE e SiBBr para dados oficiais de meio ambiente.",
    spotlight: "center",
    tooltipPosition: "bottom",
  },
  {
    icon: "user",
    title: "Aba Perfil",
    description: "Configurações, idioma, tema e sincronização. Toque aqui para personalizar o app.",
    spotlight: "tab-profile",
    tooltipPosition: "top",
    pulseElement: true,
  },
  {
    icon: "wifi-off",
    title: "Modo Offline",
    description: "Trabalhe sem internet! Dados são salvos localmente e sincronizados quando houver conexão.",
    spotlight: "center",
    tooltipPosition: "bottom",
  },
  {
    icon: "file-text",
    title: "Relatórios PDF",
    description: "Gere relatórios profissionais no padrão RO-NOT-ITU com fotos, mapas e assinatura.",
    spotlight: "center",
    tooltipPosition: "bottom",
  },
  {
    icon: "check-circle",
    title: "Pronto!",
    description: "Você conhece todas as funcionalidades. Toque em 'Começar' para explorar o MapeIA!",
    spotlight: "center",
    tooltipPosition: "bottom",
  },
];

interface InteractiveTutorialProps {
  onComplete?: () => void;
  forceShow?: boolean;
  onClose?: () => void;
}

export function InteractiveTutorial({ onComplete, forceShow = false, onClose }: InteractiveTutorialProps) {
  const [visible, setVisible] = useState(forceShow);
  const [currentStep, setCurrentStep] = useState(0);
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading } = useAuth();
  
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    // Only show tutorial if user is logged in
    if (authLoading) return;
    
    if (!user) {
      setVisible(false);
      return;
    }
    
    if (forceShow) {
      setVisible(true);
      setCurrentStep(0);
    } else {
      checkTutorialStatus();
    }
  }, [forceShow, user, authLoading]);

  useEffect(() => {
    const step = tutorialSteps[currentStep];
    if (step?.pulseElement) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = 1;
      pulseOpacity.value = 1;
    }
  }, [currentStep]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

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
      setCurrentStep(0);
      onComplete?.();
      onClose?.();
    } catch (error) {
      console.error("Error saving tutorial status:", error);
      setVisible(false);
      onClose?.();
    }
  };

  const getSpotlightPosition = (spotlight: SpotlightPosition) => {
    const tabBarHeight = 80;
    const tabBarBottom = insets.bottom;
    const tabBarY = SCREEN_HEIGHT - tabBarHeight - tabBarBottom;
    const tabWidth = SCREEN_WIDTH / 4;
    
    switch (spotlight) {
      case "tab-home":
        return { x: tabWidth * 0.5, y: tabBarY + tabBarHeight / 2, size: 70 };
      case "tab-inspections":
        return { x: tabWidth * 1.5, y: tabBarY + tabBarHeight / 2, size: 70 };
      case "tab-ai":
        return { x: tabWidth * 2.5, y: tabBarY + tabBarHeight / 2, size: 70 };
      case "tab-profile":
        return { x: tabWidth * 3.5, y: tabBarY + tabBarHeight / 2, size: 70 };
      case "top":
        return { x: SCREEN_WIDTH / 2, y: 120, size: 100 };
      case "bottom":
        return { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT - 200, size: 100 };
      case "center":
      default:
        return { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2, size: 120 };
    }
  };

  const getTooltipStyle = (step: InteractiveTutorialStep) => {
    const spotlight = step.spotlight || "center";
    const position = getSpotlightPosition(spotlight);
    
    if (spotlight.startsWith("tab-")) {
      return {
        bottom: 140 + insets.bottom,
        left: Spacing.lg,
        right: Spacing.lg,
      };
    }
    
    if (step.tooltipPosition === "top") {
      return {
        top: Math.max(insets.top + 60, position.y - position.size - 220),
        left: Spacing.lg,
        right: Spacing.lg,
      };
    }
    
    return {
      top: Math.min(SCREEN_HEIGHT - 300, position.y + position.size + 40),
      left: Spacing.lg,
      right: Spacing.lg,
    };
  };

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const spotlightPos = getSpotlightPosition(step.spotlight || "center");
  const isTabSpotlight = step.spotlight?.startsWith("tab-");

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        {isTabSpotlight ? (
          <Animated.View
            style={[
              styles.spotlight,
              pulseStyle,
              {
                left: spotlightPos.x - spotlightPos.size / 2,
                top: spotlightPos.y - spotlightPos.size / 2,
                width: spotlightPos.size,
                height: spotlightPos.size,
                borderRadius: spotlightPos.size / 2,
              },
            ]}
          />
        ) : null}

        {isTabSpotlight ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[
              styles.pointerArrow,
              {
                left: spotlightPos.x - 15,
                top: spotlightPos.y - spotlightPos.size / 2 - 30,
              },
            ]}
          >
            <Feather name="chevron-down" size={30} color={Colors.light.accent} />
          </Animated.View>
        ) : null}

        <Animated.View
          key={currentStep}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={[styles.tooltipCard, getTooltipStyle(step)]}
        >
          <View style={styles.skipButtonContainer}>
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <ThemedText style={styles.skipText}>Pular Tutorial</ThemedText>
              <Feather name="x" size={16} color="#888" />
            </Pressable>
          </View>

          <View style={styles.iconContainer}>
            <Feather name={step.icon} size={36} color={Colors.light.accent} />
          </View>
          
          <ThemedText style={styles.title} lightColor="#1E3A5F" darkColor="#1E3A5F">
            {step.title}
          </ThemedText>
          
          <ThemedText style={styles.description} lightColor="#555" darkColor="#555">
            {step.description}
          </ThemedText>

          <View style={styles.progressContainer}>
            <ThemedText style={styles.progressText} lightColor="#888" darkColor="#888">
              {currentStep + 1} de {tutorialSteps.length}
            </ThemedText>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }
                ]} 
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            {currentStep > 0 ? (
              <Pressable onPress={handlePrevious} style={styles.secondaryButton}>
                <Feather name="arrow-left" size={18} color={Colors.light.textSecondary} />
                <ThemedText style={styles.secondaryButtonText}>Anterior</ThemedText>
              </Pressable>
            ) : (
              <View style={styles.spacer} />
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  spotlight: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 3,
    borderColor: Colors.light.accent,
  },
  pointerArrow: {
    position: "absolute",
  },
  tooltipCard: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  skipButtonContainer: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: Spacing.xs,
  },
  skipText: {
    fontSize: 13,
    color: "#888",
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.light.accent + "15",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  progressText: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  progressBarBg: {
    width: "100%",
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.light.accent,
    borderRadius: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  spacer: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  secondaryButtonText: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.accent,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
