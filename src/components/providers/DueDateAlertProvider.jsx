import { useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { runDueDateAlerts } from "../../services/notifyService";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

const DueDateAlertProvider = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const checkAlerts = async () => {
      try {
        const dueSoon = await runDueDateAlerts(user.id);
        if (dueSoon.length > 0) {
          toast(
            `${dueSoon.length} task${dueSoon.length > 1 ? "s" : ""} due soon`,
            { icon: "⏰" }
          );
        }
      } catch {
        // Non-blocking — due-date emails are handled by the daily cron job
      }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user]);

  return children;
};

export default DueDateAlertProvider;
