import { supabase } from "./supabase";

const generateToken = () => {
  return crypto.randomUUID().replace(/-/g, "") + Date.now().toString(36);
};

export const createShareLink = async ({ taskId, expiresAt }) => {
  const token = generateToken();
  return await supabase
    .from("share_links")
    .insert({
      task_id: taskId,
      token,
      expires_at: expiresAt || null,
    })
    .select()
    .single();
};

export const getShareLinksForTask = async (taskId) => {
  return await supabase
    .from("share_links")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
};

export const getSharedTask = async (token) => {
  const { data: link, error } = await supabase
    .from("share_links")
    .select("*, task:tasks(*, section:sections(name, color))")
    .eq("token", token)
    .maybeSingle();

  if (error) return { error };
  if (!link) return { error: { message: "Share link not found" } };

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return { error: { message: "This share link has expired" } };
  }

  return { data: link };
};

export const deleteShareLink = async (linkId) => {
  return await supabase.from("share_links").delete().eq("id", linkId);
};
