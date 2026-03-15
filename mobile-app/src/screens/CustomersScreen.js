import React from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { theme } from "../theme";

export default function CustomersScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [customers, setCustomers] = React.useState([]);

  const loadCustomers = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.customers(token);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Customers</Text>
        <Text style={styles.count}>Total: {customers.length}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={customers}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCustomers} />}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No customers found.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{String(item.id)} - {item.customer_type || "Customer"}</Text>
            <Text style={styles.phone}>{item.tel || item.email || "-"}</Text>
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
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  meta: {
    marginTop: 2,
    color: theme.colors.textMuted,
  },
  phone: {
    marginTop: 8,
    color: theme.colors.primarySoft,
    fontWeight: "600",
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
