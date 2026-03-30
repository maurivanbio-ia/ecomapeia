import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

export interface ExportResult {
  success: boolean;
  message: string;
  filePath?: string;
}

export async function exportToJSON(data: any, filename: string): Promise<ExportResult> {
  if (Platform.OS === "web") {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true, message: "Arquivo baixado com sucesso" };
    } catch (error) {
      return { success: false, message: "Erro ao exportar dados" };
    }
  }

  try {
    const jsonString = JSON.stringify(data, null, 2);
    const filePath = `${FileSystem.documentDirectory}${filename}.json`;
    
    await FileSystem.writeAsStringAsync(filePath, jsonString, {
      encoding: "utf8" as any,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: "application/json",
        dialogTitle: "Exportar Dados",
      });
    }

    return { success: true, message: "Dados exportados com sucesso", filePath };
  } catch (error) {
    console.error("Export error:", error);
    return { success: false, message: "Erro ao exportar dados" };
  }
}

export async function exportToCSV(data: any[], filename: string, headers: string[]): Promise<ExportResult> {
  if (!data.length) {
    return { success: false, message: "Sem dados para exportar" };
  }

  const csvRows = [headers.join(",")];
  
  data.forEach((item) => {
    const row = headers.map((header) => {
      const value = item[header];
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(row.join(","));
  });

  const csvContent = csvRows.join("\n");

  if (Platform.OS === "web") {
    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true, message: "Arquivo CSV baixado com sucesso" };
    } catch (error) {
      return { success: false, message: "Erro ao exportar CSV" };
    }
  }

  try {
    const filePath = `${FileSystem.documentDirectory}${filename}.csv`;
    
    await FileSystem.writeAsStringAsync(filePath, csvContent, {
      encoding: "utf8" as any,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: "text/csv",
        dialogTitle: "Exportar CSV",
      });
    }

    return { success: true, message: "CSV exportado com sucesso", filePath };
  } catch (error) {
    console.error("CSV export error:", error);
    return { success: false, message: "Erro ao exportar CSV" };
  }
}
