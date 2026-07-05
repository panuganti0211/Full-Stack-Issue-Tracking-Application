import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import { PRIORITY_COLORS } from "../../utils/constants";
import { formatDate } from "../../utils/format";

const RecentTasks = ({ tasks, onTaskClick }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
    <div className="px-5 py-4 border-b border-slate-100">
      <h3 className="font-semibold text-slate-900">Recent Tasks</h3>
    </div>
    {tasks.length === 0 ? (
      <p className="px-5 py-8 text-sm text-slate-500 text-center">No recent tasks</p>
    ) : (
      <div className="divide-y divide-slate-100">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => onTaskClick(task)}
            className="flex items-center justify-between w-full px-5 py-3 hover:bg-slate-50 transition text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              {task.assignee && (
                <Avatar
                  name={task.assignee.full_name}
                  src={task.assignee.avatar_url}
                  size="sm"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {task.title}
                </p>
                <p className="text-xs text-slate-400">
                  {task.workspace?.name} · {task.section?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {task.priority && (
                <Badge className={PRIORITY_COLORS[task.priority]}>
                  {task.priority}
                </Badge>
              )}
              <span className="text-xs text-slate-400 hidden sm:block">
                {formatDate(task.updated_at || task.created_at)}
              </span>
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
);

export default RecentTasks;
