import React from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { theme } from "../theme";

export default function ProductsScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [products, setProducts] = React.useState([]);

  const loadProducts = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.products(token);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Products</Text>
        <Text style={styles.count}>Total: {products.length}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={products}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadProducts} />}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No products found.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.name}>{item.description || item.product_id || "Unnamed product"}</Text>
            <Text style={styles.meta}>
              {(item.product_id || "-")} - {(item.Category?.name || item.category || "-")}
            </Text>
            <Text style={[styles.stock, Number(item.count || 0) < 5 && styles.lowStock]}>
              Stock: {Number(item.count || 0)}
            </Text>
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
  stock: {
    marginTop: 8,
    color: theme.colors.accent,
    fontWeight: "700",
  },
  lowStock: {
    color: theme.colors.danger,
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
