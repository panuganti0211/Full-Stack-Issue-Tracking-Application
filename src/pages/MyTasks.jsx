import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layouts/DashboardLayout";
import TaskCard from "../components/tasks/TaskCard";
import { CardSkeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { useAuth } from "../context/AuthContext";
import { getMyTasks } from "../services/taskService";
import { CheckSquare } from "lucide-react";

const MyTasks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await getMyTasks(user.id);
      setTasks(data || []);
      setLoading(false);
    };
    load();
  }, [user.id]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">My Tasks</h1>
        <p className="text-slate-500 mb-6">Tasks assigned to you</p>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No assigned tasks"
            description="Tasks assigned to you will appear here"
          />
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() =>
                  navigate(`/workspace/${task.workspace?.id || task.workspace_id}`)
                }
              >
                <TaskCard task={task} />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyTasks;
