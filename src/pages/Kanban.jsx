import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import KanbanBoard from "../components/kanban/KanbanBoard";
import TaskModal from "../components/tasks/TaskModal";
import { CardSkeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { getSections, ensureDefaultSections } from "../services/sectionService";
import { getTasks } from "../services/taskService";
import { getMembers } from "../services/memberService";
import { filterVisibleTasks, canCreateTask } from "../utils/rbac";
import { enrichTasksWithCreatorRole } from "../utils/enrich";

const Kanban = () => {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { selectWorkspaceById, activeWorkspace } = useWorkspace();

  const wsId = workspaceId || activeWorkspace?.id;
  const [role, setRole] = useState(null);
  const [sections, setSections] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [taskModal, setTaskModal] = useState({ open: false, task: null });

  const load = useCallback(async () => {
    if (!wsId) {
      setError("No workspace selected");
      setLoading(false);
      return;
    }

    setLoading(true);
    const wsResult = await selectWorkspaceById(wsId);
    if (wsResult.error) {
      setError(wsResult.error.message);
      setLoading(false);
      return;
    }

    setRole(wsResult.role);

    const [sectionsRes, tasksRes, membersRes] = await Promise.all([
      getSections(wsId),
      getTasks(wsId),
      getMembers(wsId),
    ]);

    let sectionList = sectionsRes.data || [];
    if (!sectionList.length) {
      const { data: created } = await ensureDefaultSections(wsId);
      sectionList = created || [];
    }

    setSections(sectionList);
    const membersList = membersRes.data || [];
    setMembers(membersList);
    setTasks(
      enrichTasksWithCreatorRole(
        filterVisibleTasks(tasksRes.data || [], user.id, wsResult.role),
        membersList
      )
    );
    setLoading(false);
  }, [wsId, user.id, selectWorkspaceById]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <DashboardLayout>
        <CardSkeleton />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState message={error} onRetry={load} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Kanban Board</h1>
        {canCreateTask(role) && (
          <Button size="sm" onClick={() => setTaskModal({ open: true, task: null })}>
            <Plus size={14} /> New Task
          </Button>
        )}
      </div>

      <KanbanBoard
        workspaceId={wsId}
        sections={sections}
        tasks={tasks}
        userId={user.id}
        userRole={role}
        onSectionsChange={setSections}
        onTasksChange={setTasks}
        onTaskClick={(task) => setTaskModal({ open: true, task })}
        onAddTask={() => setTaskModal({ open: true, task: null })}
      />

      <TaskModal
        isOpen={taskModal.open}
        onClose={() => setTaskModal({ open: false, task: null })}
        task={taskModal.task}
        workspaceId={wsId}
        sections={sections}
        members={members}
        userId={user.id}
        userRole={role}
        onSaved={load}
      />
    </DashboardLayout>
  );
};

export default Kanban;
