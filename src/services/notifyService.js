import { sendNotificationEmail } from "./emailService";
import {
  checkDueDateAlerts,
  createNotification,
} from "./notificationService";
import { supabase } from "./supabase";

export const notifyUser = async ({
  userId,
  email,
  message,
  taskId,
  type = "notification",
  subject,
}) => {
  const { data, error } = await sendNotificationEmail({
    toUserId: userId,
    toEmail: email,
    subject: subject || `TrackFlow: ${type}`,
    message,
    taskId,
    type,
  });

  return { data, error, emailSent: data?.emailSent ?? false };
};

export const runDueDateAlerts = async (userId) => {
  const dueTasks = await checkDueDateAlerts(userId);
  const alerted = [];

  for (const task of dueTasks) {
    const alreadyNotified = await hasRecentDueDateAlert(userId, task.id);
    if (alreadyNotified) continue;

    const { error } = await createNotification({
      userId,
      message: `Task "${task.title}" is due soon`,
      taskId: task.id,
    });

    if (!error) alerted.push(task);
  }

  return alerted;
};

const hasRecentDueDateAlert = async (userId, taskId) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .ilike("message", "%due soon%")
    .gte("created_at", since)
    .maybeSingle();

  return !!data;
};
