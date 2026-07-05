import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { getUserWorkspaces, getWorkspaceById } from "../services/workspaceService";

const WorkspaceContext = createContext();

const STORAGE_KEY = "active_workspace_id";

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const setActiveWorkspace = useCallback((workspace, role) => {
    setActiveWorkspaceState(workspace);
    setActiveRole(role);
    if (workspace?.id) {
      localStorage.setItem(STORAGE_KEY, workspace.id);
    }
  }, []);

  const loadWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setActiveRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await getUserWorkspaces(user.id);

    if (error || !data) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    const mapped = data.map((item) => ({
      ...item.workspaces,
      role: item.role,
    }));

    setWorkspaces(mapped);

    const storedId = localStorage.getItem(STORAGE_KEY);
    const stored = mapped.find((w) => w.id === storedId);
    const active = stored || mapped[0] || null;

    if (active) {
      setActiveWorkspaceState(active);
      setActiveRole(active.role);
    } else {
      setActiveWorkspaceState(null);
      setActiveRole(null);
    }

    setLoading(false);
  }, [user]);

  const selectWorkspaceById = useCallback(
    async (workspaceId) => {
      const existing = workspaces.find((w) => w.id === workspaceId);
      if (existing) {
        setActiveWorkspace(existing, existing.role);
        return { data: existing, role: existing.role };
      }

      if (!user) return { error: { message: "Not authenticated" } };

      const { data, error } = await getWorkspaceById(workspaceId, user.id);
      if (error || !data) return { error };

      setActiveWorkspace(data.workspace, data.role);
      return { data: data.workspace, role: data.role };
    },
    [workspaces, user, setActiveWorkspace]
  );

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        activeRole,
        loading,
        setActiveWorkspace,
        selectWorkspaceById,
        refreshWorkspaces: loadWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);
