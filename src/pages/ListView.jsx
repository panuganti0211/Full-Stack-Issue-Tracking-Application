import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import DashboardLayout from "../components/layouts/DashboardLayout";
import TaskTable from "../components/list/TaskTable";
import TaskModal from "../components/tasks/TaskModal";
import { TableRowSkeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { searchTasks } from "../services/taskService";
import { getSections, ensureDefaultSections } from "../services/sectionService";
import { getMembers } from "../services/memberService";
import { filterVisibleTasks, canCreateTask } from "../utils/rbac";
import { enrichTasksWithCreatorRole } from "../utils/enrich";
import { PRIORITIES, PRIORITY_LABELS, PAGE_SIZE } from "../utils/constants";

const ListView = () => {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { selectWorkspaceById, activeWorkspace } = useWorkspace();

  const wsId = workspaceId || activeWorkspace?.id;
  const [role, setRole] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [sections, setSections] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
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

    const [tasksRes, sectionsRes, membersRes] = await Promise.all([
      searchTasks(wsId, { search, priority, status, page, pageSize: PAGE_SIZE }),
      getSections(wsId),
      getMembers(wsId),
    ]);

    let data = enrichTasksWithCreatorRole(
      filterVisibleTasks(tasksRes.data || [], user.id, wsResult.role),
      membersRes.data || []
    );

    data = [...data].sort((a, b) => {
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    let sectionList = sectionsRes.data || [];
    if (!sectionList.length) {
      const { data: created } = await ensureDefaultSections(wsId);
      sectionList = created || [];
    }

    setTasks(data);
    setTotalCount(tasksRes.count || data.length);
    setSections(sectionList);
    setMembers(membersRes.data || []);
    setLoading(false);
  }, [wsId, search, priority, status, page, sortField, sortDir, user.id, selectWorkspaceById]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState message={error} onRetry={load} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">List View</h1>
          {canCreateTask(role) && (
            <Button size="sm" onClick={() => setTaskModal({ open: true, task: null })}>
              <Plus size={14} /> New Task
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <TaskTable
            tasks={tasks}
            onTaskClick={(task) => setTaskModal({ open: true, task })}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            page={page}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        )}
      </div>

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

export default ListView;
