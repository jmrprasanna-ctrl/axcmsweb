import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

export default function StatCard({ label, value, tone = "primary" }) {
  const chipColor = tone === "accent" ? theme.colors.accent : tone === "warning" ? theme.colors.warning : theme.colors.primary;

  return (
    <View style={styles.card}>
      <View style={[styles.chip, { backgroundColor: chipColor }]} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    minWidth: "48%",
    marginBottom: theme.spacing.sm,
    ...theme.shadow.card,
  },
  chip: {
    width: 32,
    height: 6,
    borderRadius: 999,
    marginBottom: theme.spacing.sm,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
  },
  label: {
    fontSize: 13,
    marginTop: 4,
    color: theme.colors.textMuted,
  },
});
