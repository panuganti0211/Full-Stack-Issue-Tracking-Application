import { supabase } from "./supabase";

export const getLabels = async (workspaceId) => {
  return await supabase
    .from("labels")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name");
};

export const createLabel = async ({ workspaceId, name, color }) => {
  return await supabase
    .from("labels")
    .insert({ workspace_id: workspaceId, name, color })
    .select()
    .single();
};

export const updateLabel = async (labelId, updates) => {
  return await supabase
    .from("labels")
    .update(updates)
    .eq("id", labelId)
    .select()
    .single();
};

export const deleteLabel = async (labelId) => {
  return await supabase.from("labels").delete().eq("id", labelId);
};

export const assignLabelToTask = async (taskId, labelId) => {
  return await supabase
    .from("task_labels")
    .insert({ task_id: taskId, label_id: labelId });
};

export const removeLabelFromTask = async (taskId, labelId) => {
  return await supabase
    .from("task_labels")
    .delete()
    .eq("task_id", taskId)
    .eq("label_id", labelId);
};

export const setTaskLabels = async (taskId, labelIds) => {
  await supabase.from("task_labels").delete().eq("task_id", taskId);

  if (!labelIds?.length) return { data: [] };

  const rows = labelIds.map((labelId) => ({
    task_id: taskId,
    label_id: labelId,
  }));

  return await supabase.from("task_labels").insert(rows);
};
