import { supabase } from "./supabase";

export const sendNotificationEmail = async ({
  toUserId,
  toEmail,
  subject,
  message,
  taskId,
  type,
}) => {
  return await supabase.functions.invoke("send-notification-email", {
    body: { toUserId, toEmail, subject, message, taskId, type },
  });
};

export const inviteMemberByEmail = async ({ email, workspaceId, role }) => {
  return await supabase.functions.invoke("invite-member-by-email", {
    body: { email, workspaceId, role },
  });
};

export const triggerDueDateCheck = async () => {
  return await supabase.functions.invoke("check-due-dates", {
    headers: {
      "x-cron-secret": import.meta.env.VITE_CRON_SECRET || "",
    },
  });
};
