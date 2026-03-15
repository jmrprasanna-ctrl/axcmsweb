import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, Text } from "react-native";
import { useAuth } from "../context/AuthContext";
import { canAccessFeature } from "../lib/permissions";
import { theme } from "../theme";
import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ProductsScreen from "../screens/ProductsScreen";
import CustomersScreen from "../screens/CustomersScreen";
import InvoicesScreen from "../screens/InvoicesScreen";
import MoreScreen from "../screens/MoreScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DotIcon({ color, label }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 10, color }}>{label}</Text>
    </View>
  );
}

function MainTabs({ role }) {
  const tabs = [
    { name: "Dashboard", feature: "dashboard", component: DashboardScreen, icon: "HOME" },
    { name: "Products", feature: "products", component: ProductsScreen, icon: "ITEMS" },
    { name: "Customers", feature: "customers", component: CustomersScreen, icon: "CLIENT" },
    { name: "Invoices", feature: "invoices", component: InvoicesScreen, icon: "BILL" },
    { name: "More", feature: "more", component: MoreScreen, icon: "MORE" },
  ].filter((tab) => canAccessFeature(role, tab.feature));

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: "#fff",
        tabBarStyle: { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border, height: 64 },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ tabBarIcon: ({ color }) => <DotIcon color={color} label={tab.icon} /> }}
        />
      ))}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoggedIn, bootstrapping, user } = useAuth();

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 12, color: theme.colors.textMuted }}>Loading session...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="Main">
          {() => <MainTabs role={user?.role} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
