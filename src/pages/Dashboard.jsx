import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare, Clock, AlertTriangle, Layers } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import StatsCard from "../components/dashboard/StatsCard";
import WorkspaceCard from "../components/dashboard/WorkspaceCard";
import RecentTasks from "../components/dashboard/RecentTasks";
import { CardSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { getRecentTasks } from "../services/taskService";
import { getWorkspaceStats } from "../services/workspaceService";

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { workspaces, loading } = useWorkspace();
  const [recentTasks, setRecentTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, overdue: 0 });
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!workspaces.length) {
        setTasksLoading(false);
        return;
      }

      const ids = workspaces.map((w) => w.id);
      const [{ data: tasks }, ...statsResults] = await Promise.all([
        getRecentTasks(ids, 8),
        ...ids.slice(0, 3).map((id) => getWorkspaceStats(id)),
      ]);

      setRecentTasks(tasks || []);

      const aggregated = statsResults.reduce(
        (acc, { data }) => ({
          total: acc.total + (data?.total || 0),
          completed: acc.completed + (data?.completed || 0),
          inProgress: acc.inProgress + (data?.inProgress || 0),
          overdue: acc.overdue + (data?.overdue || 0),
        }),
        { total: 0, completed: 0, inProgress: 0, overdue: 0 }
      );
      setStats(aggregated);
      setTasksLoading(false);
    };

    if (!loading) load();
  }, [workspaces, loading]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-slate-500 mt-1">
            Here&apos;s what&apos;s happening across your workspaces
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tasksLoading ? (
            [...Array(4)].map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              <StatsCard icon={CheckSquare} label="Total Tasks" value={stats.total} />
              <StatsCard icon={Clock} label="In Progress" value={stats.inProgress} color="amber" />
              <StatsCard icon={Layers} label="Completed" value={stats.completed} color="emerald" />
              <StatsCard icon={AlertTriangle} label="Overdue" value={stats.overdue} color="red" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Workspaces</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/workspaces")}
              >
                View all
              </Button>
            </div>

            {loading ? (
              <div className="grid gap-4">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : workspaces.length === 0 ? (
              <EmptyState
                title="No workspaces yet"
                description="Create your first workspace to start tracking issues"
                action={() => navigate("/create-workspace")}
                actionLabel="Create Workspace"
              />
            ) : (
              <div className="grid gap-4">
                {workspaces.slice(0, 4).map((ws) => (
                  <WorkspaceCard
                    key={ws.id}
                    workspace={ws}
                    onClick={() => navigate(`/workspace/${ws.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          <RecentTasks
            tasks={recentTasks}
            onTaskClick={(task) =>
              navigate(`/workspace/${task.workspace?.id || task.workspace_id}`)
            }
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
