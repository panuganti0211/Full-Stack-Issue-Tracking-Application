import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import WorkspaceCard from "../components/dashboard/WorkspaceCard";
import { CardSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import { useWorkspace } from "../context/WorkspaceContext";

const Workspaces = () => {
  const navigate = useNavigate();
  const { workspaces, loading } = useWorkspace();

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Workspaces</h1>
            <p className="text-slate-500 mt-1">Manage all your workspaces</p>
          </div>
          <Button onClick={() => navigate("/create-workspace")}>
            <Plus size={16} /> New Workspace
          </Button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <EmptyState
            title="No workspaces"
            description="Create a workspace to collaborate with your team"
            action={() => navigate("/create-workspace")}
            actionLabel="Create Workspace"
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                workspace={ws}
                onClick={() => navigate(`/workspace/${ws.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Workspaces;
