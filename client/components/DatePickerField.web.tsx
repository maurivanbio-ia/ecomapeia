import React from "react";
import { View, StyleSheet } from "react-native";
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
      {/* Using native HTML date input for web — returns YYYY-MM-DD in LOCAL timezone */}
      <input
        type="date"
        value={value}
        onChange={(e) => {
          // e.target.value is always YYYY-MM-DD in local time — no UTC offset issue
          onChange(e.target.value);
        }}
        style={{
          width: "100%",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.border,
          borderRadius: BorderRadius.md,
          backgroundColor: theme.backgroundDefault,
          color: theme.text,
          fontSize: 15,
          paddingTop: Spacing.sm,
          paddingBottom: Spacing.sm,
          paddingLeft: Spacing.md,
          paddingRight: Spacing.md,
          boxSizing: "border-box",
          fontFamily: "inherit",
          outline: "none",
        } as React.CSSProperties}
      />
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
});
