import { supabase } from "./supabase";
import { enrichMembers } from "../utils/enrich";
import { ROLE_LABELS } from "../utils/constants";

export const getMemberDisplayName = (member, currentUserId) => {
  if (member.profiles?.full_name) return member.profiles.full_name;
  if (member.user_id === currentUserId) return "You";
  return `Member (${ROLE_LABELS[member.role] || member.role || "member"})`;
};

export const getMembers = async (workspaceId) => {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("id, role, joined_at, user_id")
    .eq("workspace_id", workspaceId)
    .order("joined_at");

  if (error) return { data, error };
  const enriched = await enrichMembers(data);
  return { data: enriched, error: null };
};

export const inviteMember = async ({ workspaceId, userId, role }) => {
  const { data, error } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspaceId, user_id: userId, role })
    .select("id, role, joined_at, user_id")
    .single();

  if (error) return { data, error };
  const [enriched] = await enrichMembers([data]);
  return { data: enriched, error: null };
};

export const updateMemberRole = async (memberId, role) => {
  const { data, error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("id", memberId)
    .select("id, role, joined_at, user_id")
    .single();

  if (error) return { data, error };
  const [enriched] = await enrichMembers([data]);
  return { data: enriched, error: null };
};

export const removeMember = async (memberId) => {
  return await supabase.from("workspace_members").delete().eq("id", memberId);
};

export const searchProfiles = async (query) => {
  if (!query) return { data: [] };

  return await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .ilike("full_name", `%${query}%`)
    .limit(10);
};
