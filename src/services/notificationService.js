import { supabase } from "./supabase";

export const getNotifications = async (userId) => {
  return await supabase
    .from("notifications")
    .select(
      `
      *,
      task:tasks(id, title, workspace_id)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
};

export const getUnreadCount = async (userId) => {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  return { count: count || 0, error };
};

export const createNotification = async ({ userId, message, taskId }) => {
  return await supabase
    .from("notifications")
    .insert({ user_id: userId, message, task_id: taskId, is_read: false });
};

export const markAsRead = async (notificationId) => {
  return await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
};

export const markAllAsRead = async (userId) => {
  return await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
};

export const subscribeToNotifications = (userId, callback) => {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

export const checkDueDateAlerts = async (userId) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, due_date")
    .eq("assigned_to", userId)
    .not("due_date", "is", null)
    .lte("due_date", tomorrow.toISOString())
    .neq("status", "done");

  return tasks || [];
};
