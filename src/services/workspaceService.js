import { supabase } from "./supabase";

export const createWorkspace = async ({ name, description, ownerId }) => {
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({
      name,
      description,
      owner_id: ownerId,
    })
    .select()
    .single();

  if (error) return { error };

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: ownerId,
      role: "admin",
    });

  if (memberError) return { error: memberError };

  const { error: sectionError } = await supabase.from("sections").insert([
    { workspace_id: workspace.id, name: "Todo", color: "#3B82F6" },
    { workspace_id: workspace.id, name: "In Progress", color: "#F59E0B" },
    { workspace_id: workspace.id, name: "Review", color: "#8B5CF6" },
    { workspace_id: workspace.id, name: "Done", color: "#10B981" },
  ]);

  if (sectionError) return { error: sectionError };

  return { data: workspace };
};

export const getUserWorkspaces = async (userId) => {
  return await supabase
    .from("workspace_members")
    .select(
      `
      role,
      workspaces(
        id,
        name,
        description,
        created_at,
        owner_id
      )
    `
    )
    .eq("user_id", userId);
};

export const getWorkspaceById = async (workspaceId, userId) => {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      role,
      workspaces(
        id,
        name,
        description,
        created_at,
        owner_id
      )
    `
    )
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { error };
  if (!data) return { error: { message: "Workspace not found or access denied" } };

  return { data: { workspace: data.workspaces, role: data.role } };
};

export const updateWorkspace = async (workspaceId, updates) => {
  return await supabase
    .from("workspaces")
    .update(updates)
    .eq("id", workspaceId)
    .select()
    .single();
};

export const getWorkspaceStats = async (workspaceId) => {
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, status, priority, due_date, section_id")
    .eq("workspace_id", workspaceId);

  if (error) return { error };

  const now = new Date();
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "done").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    overdue: tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== "done"
    ).length,
  };

  return { data: stats };
};
