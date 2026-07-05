import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Columns3,
  List,
  Bell,
  Settings,
  LogOut,
  Plus,
  X,
  Layers,
} from "lucide-react";
import { signOut } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import toast from "react-hot-toast";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/workspaces", icon: Layers, label: "Workspaces" },
  { to: "/my-tasks", icon: CheckSquare, label: "My Tasks" },
  { to: "/kanban", icon: Columns3, label: "Kanban", workspace: true },
  { to: "/list", icon: List, label: "List View", workspace: true },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const getPath = (item) => {
    if (item.workspace && activeWorkspace) {
      if (item.to === "/kanban") return `/workspace/${activeWorkspace.id}/kanban`;
      if (item.to === "/list") return `/workspace/${activeWorkspace.id}/list`;
    }
    return item.to;
  };

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200/80">
        <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
          <FolderKanban className="text-white" size={20} />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 text-lg leading-tight">TrackFlow</h1>
          <p className="text-xs text-slate-500">Issue Tracker</p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto lg:hidden p-1.5 rounded-lg hover:bg-slate-100"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={getPath(item)}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200/80 space-y-1">
        <button
          onClick={() => {
            navigate("/create-workspace");
            onClose();
          }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          <Plus size={18} />
          New Workspace
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {content}
      </aside>
    </>
  );
};

export default Sidebar;
