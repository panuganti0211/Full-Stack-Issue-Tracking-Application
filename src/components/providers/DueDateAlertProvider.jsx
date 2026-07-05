import { useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { runDueDateAlerts } from "../../services/notifyService";
import { triggerDueDateCheck } from "../../services/emailService";

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

        await triggerDueDateCheck();
      } catch {
        // Edge function may not be deployed yet — in-app alerts still work
      }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user]);

  return children;
};

export default DueDateAlertProvider;
