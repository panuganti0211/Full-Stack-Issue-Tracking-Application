import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { ensureProfile } from "../services/profileService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    await ensureProfile(currentUser);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    setProfile(data);
  };

  const refreshUser = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const currentUser = session?.user ?? null;
    setUser(currentUser);
    await loadProfile(currentUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      await loadProfile(currentUser);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        refreshUser,
        refreshProfile: () => loadProfile(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
