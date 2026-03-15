import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { theme } from "../theme";

export default function DashboardScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [summary, setSummary] = React.useState(null);

  const loadSummary = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.dashboardSummary(token, "day");
      setSummary(data);
    } catch (err) {
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSummary} />}
    >
      <Text style={styles.title}>Field Dashboard</Text>
      <Text style={styles.subtitle}>Mobile view for stock, sales, and service operations</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid}>
        <StatCard label="Products" value={String(summary?.totalProducts ?? "-")} />
        <StatCard label="Low Stock" value={String(summary?.lowStock?.length ?? "-")} tone="warning" />
        <StatCard label="Customers" value={String(summary?.totalCustomers ?? "-")} tone="accent" />
        <StatCard label="Users" value={String(summary?.totalUsers ?? "-")} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Today Snapshot</Text>
        <Text style={styles.row}>Sales: {formatMoney(summary?.totalSalesPeriod)}</Text>
        <Text style={styles.row}>Expenses: {formatMoney(summary?.totalExpensesPeriod)}</Text>
        <Text style={styles.row}>Profit: {formatMoney(summary?.netProfitPeriod)}</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>All Time</Text>
        <Text style={styles.row}>Sales: {formatMoney(summary?.totalSalesAllTime)}</Text>
        <Text style={styles.row}>Expenses: {formatMoney(summary?.totalExpensesAllTime)}</Text>
        <Text style={styles.row}>Profit: {formatMoney(summary?.netProfitAllTime)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: theme.spacing.md,
    color: theme.colors.textMuted,
  },
  error: {
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  panel: {
    backgroundColor: theme.colors.card,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    ...theme.shadow.card,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  row: {
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
});
