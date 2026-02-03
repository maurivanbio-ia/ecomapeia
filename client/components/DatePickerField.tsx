import React, { useState } from "react";
import { View, StyleSheet, Pressable, Platform, Modal } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
}

export default function DatePickerField({
  label,
  value,
  onChange,
}: DatePickerFieldProps) {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const dateValue = value ? new Date(value) : new Date();

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateISO = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChange(formatDateISO(selectedDate));
    }
  };

  const handleConfirm = () => {
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[
          styles.dateButton,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <Feather name="calendar" size={20} color={Colors.light.primary} />
        <ThemedText style={[styles.dateText, { color: theme.text }]}>
          {value ? formatDate(dateValue) : "Selecione a data"}
        </ThemedText>
      </Pressable>

      {Platform.OS === "ios" ? (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.backgroundDefault },
              ]}
            >
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Selecione a Data</ThemedText>
                <Pressable onPress={handleConfirm}>
                  <ThemedText style={{ color: Colors.light.primary, fontWeight: "600" }}>
                    OK
                  </ThemedText>
                </Pressable>
              </View>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={handleChange}
                locale="pt-BR"
              />
            </View>
          </View>
        </Modal>
      ) : showPicker ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  dateText: {
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"],
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
});
