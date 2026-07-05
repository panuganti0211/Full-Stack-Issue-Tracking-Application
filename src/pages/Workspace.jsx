import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Columns3, List, Settings, Plus, Users } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layouts/DashboardLayout";
import KanbanBoard from "../components/kanban/KanbanBoard";
import TaskModal from "../components/tasks/TaskModal";
import LabelManager from "../components/labels/LabelManager";
import TeamPanel from "../components/team/TeamPanel";
import StatsCard from "../components/dashboard/StatsCard";
import { CardSkeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { getSections, ensureDefaultSections } from "../services/sectionService";
import { getTasks } from "../services/taskService";
import { getMembers } from "../services/memberService";
import { getLabels } from "../services/labelService";
import { getWorkspaceStats } from "../services/workspaceService";
import { filterVisibleTasks, canCreateTask } from "../utils/rbac";
import { enrichTasksWithCreatorRole } from "../utils/enrich";
import { ROLE_LABELS } from "../utils/constants";
import { CheckSquare, Clock, AlertTriangle } from "lucide-react";

const Workspace = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectWorkspaceById } = useWorkspace();

  const [workspace, setWorkspace] = useState(null);
  const [role, setRole] = useState(null);
  const [sections, setSections] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [labels, setLabels] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [taskModal, setTaskModal] = useState({ open: false, task: null, section: null });

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);

    const wsResult = await selectWorkspaceById(workspaceId);
    if (wsResult.error) {
      setError(wsResult.error.message);
      setLoading(false);
      return;
    }

    setWorkspace(wsResult.data);
    setRole(wsResult.role);

    const [sectionsRes, tasksRes, membersRes, labelsRes, statsRes] =
      await Promise.all([
        getSections(workspaceId),
        getTasks(workspaceId),
        getMembers(workspaceId),
        getLabels(workspaceId),
        getWorkspaceStats(workspaceId),
      ]);

    if (sectionsRes.error) {
      setError(sectionsRes.error.message);
      setLoading(false);
      return;
    }

    let sectionList = sectionsRes.data || [];
    if (!sectionList.length) {
      const { data: created, error: sectionErr } =
        await ensureDefaultSections(workspaceId);
      if (sectionErr) {
        setError(sectionErr.message);
        setLoading(false);
        return;
      }
      sectionList = created || [];
    }

    setSections(sectionList);
    const membersList = membersRes.data || [];
    setMembers(membersList);
    const visibleTasks = enrichTasksWithCreatorRole(
      filterVisibleTasks(tasksRes.data || [], user.id, wsResult.role),
      membersList
    );
    setTasks(visibleTasks);
    setLabels(labelsRes.data || []);
    setStats(statsRes.data);
    setLoading(false);
  }, [workspaceId, user.id, selectWorkspaceById]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleAddTask = (section) => {
    if (!canCreateTask(role)) {
      toast.error("You don't have permission to create tasks");
      return;
    }
    setTaskModal({ open: true, task: null, section });
  };

  const handleTaskClick = (task) => {
    setTaskModal({ open: true, task, section: null });
  };

  const handleTaskSaved = () => {
    loadWorkspace();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto space-y-4">
          <CardSkeleton />
          <div className="grid grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState message={error} onRetry={loadWorkspace} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-full mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{workspace?.name}</h1>
            <p className="text-slate-500 mt-1">{workspace?.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="primary">{ROLE_LABELS[role]}</Badge>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Users size={12} /> {members.length} members
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to={`/workspace/${workspaceId}/kanban`}>
              <Button variant="secondary" size="sm">
                <Columns3 size={14} /> Kanban
              </Button>
            </Link>
            <Link to={`/workspace/${workspaceId}/list`}>
              <Button variant="secondary" size="sm">
                <List size={14} /> List
              </Button>
            </Link>
            <Link to={`/workspace/${workspaceId}/settings`}>
              <Button variant="secondary" size="sm">
                <Settings size={14} /> Settings
              </Button>
            </Link>
            {canCreateTask(role) && (
              <Button size="sm" onClick={() => handleAddTask(sections[0])}>
                <Plus size={14} /> New Task
              </Button>
            )}
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatsCard icon={CheckSquare} label="Total Tasks" value={stats.total} />
            <StatsCard icon={Clock} label="In Progress" value={stats.inProgress} color="amber" />
            <StatsCard icon={AlertTriangle} label="Overdue" value={stats.overdue} color="red" />
          </div>
        )}

        <KanbanBoard
          workspaceId={workspaceId}
          sections={sections}
          tasks={tasks}
          userId={user.id}
          userRole={role}
          onSectionsChange={setSections}
          onTasksChange={setTasks}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LabelManager
            workspaceId={workspaceId}
            labels={labels}
            onChange={setLabels}
            userRole={role}
          />
          <TeamPanel
            workspaceId={workspaceId}
            members={members}
            onChange={setMembers}
            userRole={role}
            currentUserId={user.id}
          />
        </div>
      </div>

      <TaskModal
        isOpen={taskModal.open}
        onClose={() => setTaskModal({ open: false, task: null, section: null })}
        task={taskModal.task}
        workspaceId={workspaceId}
        sections={sections}
        members={members}
        userId={user.id}
        userRole={role}
        defaultSectionId={taskModal.section?.id}
        onSaved={handleTaskSaved}
      />
    </DashboardLayout>
  );
};

export default Workspace;
