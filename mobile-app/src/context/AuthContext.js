import React, { createContext, useContext, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../lib/api";

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = "pulmo_mobile_auth_v1";

export function AuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw || !mounted) return;
        const parsed = JSON.parse(raw);
        if (parsed?.token) setToken(parsed.token);
        if (parsed?.user) setUser(parsed.user);
      } catch {
        // Ignore invalid storage payloads and continue with signed-out state.
      } finally {
        if (mounted) setBootstrapping(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    loading,
    bootstrapping,
    isLoggedIn: Boolean(token),
    async signIn(email, password) {
      setLoading(true);
      try {
        const result = await api.login(email, password);
        const nextToken = result.token || "";
        const nextUser = result.user || null;
        setToken(nextToken);
        setUser(nextUser);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
          token: nextToken,
          user: nextUser,
        }));
        return result;
      } finally {
        setLoading(false);
      }
    },
    async signOut() {
      setToken("");
      setUser(null);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    },
  }), [token, user, loading, bootstrapping]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
