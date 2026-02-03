import React from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
}

export default function DatePickerField({ label, value, onChange }: DatePickerFieldProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder="AAAA-MM-DD"
        placeholderTextColor={theme.tabIconDefault}
      />
      <ThemedText style={[styles.hint, { color: theme.tabIconDefault }]}>
        Formato: AAAA-MM-DD (ex: 2026-02-03)
      </ThemedText>
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
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  hint: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
});
