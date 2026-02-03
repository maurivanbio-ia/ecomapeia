import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch {
    return false;
  }
}

export async function getBiometricType(): Promise<string> {
  if (Platform.OS === "web") return "none";
  
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === "ios" ? "Face ID" : "Reconhecimento Facial";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === "ios" ? "Touch ID" : "Impressão Digital";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return "Íris";
    }
    return "Biometria";
  } catch {
    return "Biometria";
  }
}

export async function authenticateWithBiometrics(
  promptMessage: string = "Autentique-se para continuar"
): Promise<BiometricAuthResult> {
  if (Platform.OS === "web") {
    return { success: false, error: "Biometria não disponível na web" };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: "Usar senha",
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: result.error === "user_cancel" ? "Cancelado" : "Falha na autenticação"
      };
    }
  } catch (error) {
    return { success: false, error: "Erro na autenticação biométrica" };
  }
}
