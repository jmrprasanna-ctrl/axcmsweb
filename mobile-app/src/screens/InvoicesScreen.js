import React from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { theme } from "../theme";

export default function InvoicesScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [invoices, setInvoices] = React.useState([]);

  const loadInvoices = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.invoices(token);
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Invoices</Text>
        <Text style={styles.count}>Total: {invoices.length}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={invoices}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadInvoices} />}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No invoices found.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.rowTop}>
              <Text style={styles.name}>{item.invoice_no || `INV-${item.id}`}</Text>
              <Text style={[styles.status, styles.pending]}>Saved</Text>
            </View>
            <Text style={styles.meta}>{item.customer_name || "-"}</Text>
            <Text style={styles.amount}>{formatMoney(item.total)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  count: {
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  itemCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadow.card,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  status: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  pending: {
    backgroundColor: "#FFF2DF",
    color: "#A35B00",
  },
  meta: {
    marginTop: 6,
    color: theme.colors.textMuted,
  },
  amount: {
    marginTop: 8,
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  error: {
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
    fontWeight: "600",
  },
  empty: {
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: theme.spacing.lg,
  },
});
