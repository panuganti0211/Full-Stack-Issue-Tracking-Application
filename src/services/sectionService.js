import { supabase } from "./supabase";
import { DEFAULT_SECTIONS } from "../utils/constants";

export const getSections = async (workspaceId) => {
  return await supabase
    .from("sections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at");
};

export const ensureDefaultSections = async (workspaceId) => {
  const existing = await getSections(workspaceId);
  if (existing.error) return existing;
  if (existing.data?.length) return { data: existing.data, error: null };

  const rows = DEFAULT_SECTIONS.map((section) => ({
    workspace_id: workspaceId,
    name: section.name,
    color: section.color,
  }));

  return await supabase.from("sections").insert(rows).select();
};

export const createSection = async ({ workspaceId, name, color }) => {
  return await supabase
    .from("sections")
    .insert({ workspace_id: workspaceId, name, color })
    .select()
    .single();
};

export const updateSection = async (sectionId, updates) => {
  return await supabase
    .from("sections")
    .update(updates)
    .eq("id", sectionId)
    .select()
    .single();
};

export const deleteSection = async (sectionId) => {
  return await supabase.from("sections").delete().eq("id", sectionId);
};
