import { supabase } from "./supabase";

const profileNameFromUser = (user) =>
  user?.user_metadata?.full_name ||
  user?.user_metadata?.name ||
  user?.email?.split("@")[0] ||
  "User";

export const ensureProfile = async (user) => {
  if (!user?.id) return { data: null, error: null };

  const fullName = profileNameFromUser(user);

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.full_name) {
    return { data: existing, error: null };
  }

  return await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        full_name: existing?.full_name || fullName,
        avatar_url: existing?.avatar_url || user.user_metadata?.avatar_url || null,
      },
      { onConflict: "id" }
    )
    .select("id, full_name, avatar_url")
    .single();
};

export const updateProfile = async (userId, updates) => {
  return await supabase
    .from("profiles")
    .upsert({ id: userId, ...updates }, { onConflict: "id" })
    .select()
    .single();
};

export const getProfile = async (userId) => {
  return await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
};
