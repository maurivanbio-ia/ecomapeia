import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface StatsChartProps {
  title: string;
  data: ChartData[];
  type: "bar" | "pie";
  theme: any;
}

export function StatsChart({ title, data, type, theme }: StatsChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (type === "bar") {
    return (
      <Animated.View
        entering={FadeIn.duration(500)}
        style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      >
        <ThemedText style={styles.title}>{title}</ThemedText>
        <View style={styles.barChart}>
          {data.map((item, index) => (
            <View key={index} style={styles.barItem}>
              <View style={styles.barWrapper}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      height: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
              <ThemedText style={styles.barValue}>{item.value}</ThemedText>
              <ThemedText style={styles.barLabel} numberOfLines={1}>
                {item.label}
              </ThemedText>
            </View>
          ))}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
    >
      <ThemedText style={styles.title}>{title}</ThemedText>
      <View style={styles.pieContainer}>
        <View style={styles.pieChart}>
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            const startAngle = data
              .slice(0, index)
              .reduce((sum, d) => sum + (d.value / total) * 360, 0);
            
            return (
              <View
                key={index}
                style={[
                  styles.pieSlice,
                  {
                    backgroundColor: item.color,
                    transform: [
                      { rotate: `${startAngle}deg` },
                      { skewY: `${Math.min(percentage * 3.6 - 90, 90)}deg` },
                    ],
                  },
                ]}
              />
            );
          })}
          <View style={[styles.pieCenter, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText style={styles.pieCenterText}>{total}</ThemedText>
            <ThemedText style={styles.pieCenterLabel}>Total</ThemedText>
          </View>
        </View>
        <View style={styles.legend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <ThemedText style={styles.legendLabel}>{item.label}</ThemedText>
              <ThemedText style={styles.legendValue}>{item.value}</ThemedText>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

interface SimpleStatsProps {
  stats: {
    label: string;
    value: number;
    icon: string;
    color: string;
  }[];
  theme: any;
}

export function SimpleStats({ stats, theme }: SimpleStatsProps) {
  return (
    <View style={styles.simpleStatsContainer}>
      {stats.map((stat, index) => (
        <Animated.View
          key={index}
          entering={FadeIn.duration(400).delay(index * 100)}
          style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}
        >
          <View style={[styles.statIconContainer, { backgroundColor: stat.color + "20" }]}>
            <ThemedText style={[styles.statIconText, { color: stat.color }]}>
              {stat.value}
            </ThemedText>
          </View>
          <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  barChart: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 150,
  },
  barItem: {
    alignItems: "center",
    flex: 1,
  },
  barWrapper: {
    height: 100,
    width: 32,
    backgroundColor: Colors.light.border,
    borderRadius: BorderRadius.sm,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderRadius: BorderRadius.sm,
  },
  barValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: Spacing.xs,
  },
  barLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  pieContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
  },
  pieChart: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.light.border,
    overflow: "hidden",
    position: "relative",
  },
  pieSlice: {
    position: "absolute",
    width: "50%",
    height: "50%",
    top: "25%",
    left: "25%",
  },
  pieCenter: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    top: 20,
    left: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pieCenterText: {
    fontSize: 24,
    fontWeight: "700",
  },
  pieCenterLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  legend: {
    flex: 1,
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  simpleStatsContainer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: "center",
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  statIconText: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
});
