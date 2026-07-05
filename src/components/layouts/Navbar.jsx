import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Menu, ChevronDown, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import Avatar from "../ui/Avatar";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  subscribeToNotifications,
} from "../../services/notificationService";
import { formatRelativeTime } from "../../utils/format";

const Navbar = ({ onMenuClick, searchQuery, onSearchChange }) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const workspaceRef = useRef(null);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const loadNotifications = async () => {
    if (!user) return;
    const [{ data }, { count }] = await Promise.all([
      getNotifications(user.id),
      getUnreadCount(user.id),
    ]);
    setNotifications(data || []);
    setUnreadCount(count);
  };

  useEffect(() => {
    loadNotifications();
    if (!user) return;
    return subscribeToNotifications(user.id, () => loadNotifications());
  }, [user]);

  useEffect(() => {
    const handleClick = (e) => {
      if (workspaceRef.current && !workspaceRef.current.contains(e.target)) {
        setShowWorkspaceMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
      loadNotifications();
    }
    if (notification.task?.workspace_id) {
      navigate(`/workspace/${notification.task.workspace_id}`);
    }
    setShowNotifications(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
      <div className="flex items-center gap-4 px-4 lg:px-6 h-16">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
        >
          <Menu size={20} />
        </button>

        <div className="relative" ref={workspaceRef}>
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 border border-slate-200 transition"
          >
            <span className="text-sm font-medium text-slate-900 max-w-[140px] truncate">
              {activeWorkspace?.name || "Select Workspace"}
            </span>
            <ChevronDown size={16} className="text-slate-400" />
          </button>

          {showWorkspaceMenu && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
              {workspaces.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-500">No workspaces</p>
              ) : (
                workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace(ws, ws.role);
                      setShowWorkspaceMenu(false);
                      navigate(`/workspace/${ws.id}`);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-slate-50 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{ws.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{ws.role?.replace("_", " ")}</p>
                    </div>
                    {activeWorkspace?.id === ws.id && (
                      <Check size={16} className="text-indigo-600" />
                    )}
                  </button>
                ))
              )}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    navigate("/create-workspace");
                    setShowWorkspaceMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 text-left"
                >
                  + Create Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery || ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="font-semibold text-sm text-slate-900">Notifications</h3>
                  <button
                    onClick={() => {
                      navigate("/notifications");
                      setShowNotifications(false);
                    }}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    View all
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-500 text-center">
                    No notifications yet
                  </p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 ${
                        !n.is_read ? "bg-indigo-50/50" : ""
                      }`}
                    >
                      <p className="text-sm text-slate-800">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatRelativeTime(n.created_at)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition"
            >
              <Avatar
                name={profile?.full_name}
                src={profile?.avatar_url}
                size="sm"
              />
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {profile?.full_name || "User"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    navigate("/settings");
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-slate-50"
                >
                  Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
