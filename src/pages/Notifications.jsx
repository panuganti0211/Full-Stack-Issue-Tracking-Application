import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layouts/DashboardLayout";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import { CardSkeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
} from "../services/notificationService";
import { runDueDateAlerts } from "../services/notifyService";
import { formatRelativeTime } from "../utils/format";

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await getNotifications(user.id);
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      await runDueDateAlerts(user.id);
      await load();
    };

    init();
    return subscribeToNotifications(user.id, () => load());
  }, [user.id]);

  const handleClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
      load();
    }
    if (notification.task?.workspace_id) {
      navigate(`/workspace/${notification.task.workspace_id}`);
    }
  };

  const handleMarkAll = async () => {
    await markAllAsRead(user.id);
    toast.success("All notifications marked as read");
    load();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-slate-500 mt-1">
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleMarkAll}>
              <CheckCheck size={14} /> Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You're all caught up!"
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-sm">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full px-5 py-4 text-left hover:bg-slate-50 transition flex items-start gap-3 ${
                  !n.is_read ? "bg-indigo-50/30" : ""
                }`}
              >
                <div
                  className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                    n.is_read ? "bg-transparent" : "bg-indigo-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatRelativeTime(n.created_at)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
