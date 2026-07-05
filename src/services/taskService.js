import { supabase } from "./supabase";
import { enrichTasks } from "../utils/enrich";
import {
  normalizeTaskForDb,
  enrichTaskWithMeta,
} from "../utils/taskMeta";

const TASK_SELECT = `
  *,
  section:sections(id, name, color),
  task_labels(label_id, labels(id, name, color))
`;

const mapTasks = async (data) => {
  if (!data) return data;
  const list = Array.isArray(data) ? data : [data];
  const withMeta = list.map(enrichTaskWithMeta);
  const enriched = await enrichTasks(withMeta);
  return Array.isArray(data) ? enriched : enriched[0];
};

export const getTasks = async (workspaceId) => {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) return { data, error };
  return { data: await mapTasks(data), error: null };
};

export const getTaskById = async (taskId) => {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", taskId)
    .maybeSingle();

  if (error || !data) return { data, error };
  return { data: await mapTasks(data), error: null };
};

export const getMyTasks = async (userId) => {
  const { data, error } = await supabase
    .from("tasks")
    .select(`*, workspace:workspaces(id, name), section:sections(id, name, color)`)
    .eq("assigned_to", userId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) return { data, error };
  return { data: await mapTasks(data), error: null };
};

export const getRecentTasks = async (workspaceIds, limit = 5) => {
  if (!workspaceIds?.length) return { data: [] };

  const { data, error } = await supabase
    .from("tasks")
    .select(`*, workspace:workspaces(id, name), section:sections(id, name, color)`)
    .in("workspace_id", workspaceIds)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return { data, error };
  return { data: await mapTasks(data), error: null };
};

export const createTask = async (task) => {
  const payload = normalizeTaskForDb(task);

  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select(TASK_SELECT)
    .single();

  if (error) return { data, error };
  return { data: await mapTasks(data), error: null };
};

export const updateTask = async (taskId, updates) => {
  const payload = normalizeTaskForDb({
    ...updates,
    updated_at: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", taskId)
    .select(TASK_SELECT)
    .single();

  if (error) return { data, error };
  return { data: await mapTasks(data), error: null };
};

export const deleteTask = async (taskId) => {
  return await supabase.from("tasks").delete().eq("id", taskId);
};

export const updateTaskStatus = async (taskId, { status, section_id }) => {
  const { data, error } = await supabase
    .from("tasks")
    .update({
      status,
      section_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select(TASK_SELECT)
    .single();

  if (error) return { data, error };
  return { data: await mapTasks(data), error: null };
};

export const moveTask = async (taskId, sectionId, status) => {
  const { data, error } = await supabase
    .from("tasks")
    .update({
      section_id: sectionId,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select(TASK_SELECT)
    .single();

  if (error) return { data, error };
  return { data: await mapTasks(data), error: null };
};

export const searchTasks = async (
  workspaceId,
  { search, priority, status, page = 1, pageSize = 10 }
) => {
  let query = supabase
    .from("tasks")
    .select(TASK_SELECT, { count: "exact" })
    .eq("workspace_id", workspaceId);

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (priority) query = query.eq("priority", priority);
  if (status) query = query.eq("status", status);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return { data, error, count };
  return { data: await mapTasks(data), error: null, count };
};
