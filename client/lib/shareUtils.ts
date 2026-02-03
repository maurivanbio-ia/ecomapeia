import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";
import { Platform, Alert } from "react-native";

export interface ShareResult {
  success: boolean;
  message: string;
}

export async function shareFile(
  filePath: string,
  mimeType: string = "application/pdf"
): Promise<ShareResult> {
  if (Platform.OS === "web") {
    return { success: false, message: "Compartilhamento de arquivos não disponível na web" };
  }

  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return { success: false, message: "Compartilhamento não disponível neste dispositivo" };
    }

    await Sharing.shareAsync(filePath, {
      mimeType,
      dialogTitle: "Compartilhar Documento",
    });

    return { success: true, message: "Documento compartilhado" };
  } catch (error) {
    console.error("Share error:", error);
    return { success: false, message: "Erro ao compartilhar documento" };
  }
}

export async function shareViaWhatsApp(
  message: string,
  phone?: string
): Promise<ShareResult> {
  try {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = phone
      ? `whatsapp://send?phone=${phone}&text=${encodedMessage}`
      : `whatsapp://send?text=${encodedMessage}`;

    const canOpen = await Linking.canOpenURL(whatsappUrl);
    
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
      return { success: true, message: "WhatsApp aberto" };
    } else {
      const webUrl = phone
        ? `https://wa.me/${phone}?text=${encodedMessage}`
        : `https://wa.me/?text=${encodedMessage}`;
      await Linking.openURL(webUrl);
      return { success: true, message: "WhatsApp Web aberto" };
    }
  } catch (error) {
    return { success: false, message: "Erro ao abrir WhatsApp" };
  }
}

export async function shareViaEmail(
  to: string,
  subject: string,
  body: string
): Promise<ShareResult> {
  try {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const mailUrl = `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;

    await Linking.openURL(mailUrl);
    return { success: true, message: "E-mail aberto" };
  } catch (error) {
    return { success: false, message: "Erro ao abrir e-mail" };
  }
}

export function showShareOptions(
  title: string,
  onWhatsApp: () => void,
  onEmail: () => void,
  onOther: () => void
) {
  if (Platform.OS === "web") {
    Alert.alert(
      title,
      "Escolha uma opção",
      [
        { text: "E-mail", onPress: onEmail },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  } else {
    Alert.alert(
      title,
      "Escolha como compartilhar",
      [
        { text: "WhatsApp", onPress: onWhatsApp },
        { text: "E-mail", onPress: onEmail },
        { text: "Outros", onPress: onOther },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  }
}
