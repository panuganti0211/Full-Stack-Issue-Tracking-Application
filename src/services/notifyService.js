import { sendNotificationEmail } from "./emailService";
import { checkDueDateAlerts } from "./notificationService";

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

  for (const task of dueTasks) {
    await notifyUser({
      userId,
      message: `Task "${task.title}" is due soon`,
      taskId: task.id,
      type: "due_date",
      subject: `Due soon: ${task.title}`,
    });
  }

  return dueTasks;
};
