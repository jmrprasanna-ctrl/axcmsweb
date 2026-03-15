import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../lib/api";
import { canAccessFeature, getRoleFeatureList } from "../lib/permissions";
import { theme } from "../theme";

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const role = user?.role || "user";
  const enabledFeatures = getRoleFeatureList(role);
  const canSeeFinance = canAccessFeature(role, "finance");
  const canSeeSupport = canAccessFeature(role, "support");
  const canSeeStock = canAccessFeature(role, "stock");
  const canSeeUsers = canAccessFeature(role, "users");

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.row}>Name: {user?.username || "-"}</Text>
        <Text style={styles.row}>Role: {user?.role || "-"}</Text>
        <Text style={styles.row}>Email: {user?.email || "-"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Role Access</Text>
        <Text style={styles.row}>API Base: {API_BASE_URL}</Text>
        <Text style={styles.row}>Enabled: {enabledFeatures.join(", ")}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Admin Modules</Text>
        <Text style={styles.row}>Finance: {canSeeFinance ? "Allowed" : "Blocked"}</Text>
        <Text style={styles.row}>Support: {canSeeSupport ? "Allowed" : "Blocked"}</Text>
        <Text style={styles.row}>Stock: {canSeeStock ? "Allowed" : "Blocked"}</Text>
        <Text style={styles.row}>Users: {canSeeUsers ? "Allowed" : "Blocked"}</Text>
      </View>

      <Pressable
        style={styles.signOutButton}
        onPress={() => {
          Alert.alert("Sign out", "Do you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign out", style: "destructive", onPress: signOut },
          ]);
        }}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadow.card,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  row: {
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  signOutButton: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.danger,
    paddingVertical: 12,
  },
  signOutText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "800",
  },
});
