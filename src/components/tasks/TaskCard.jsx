import { Calendar } from "lucide-react";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import { PRIORITY_COLORS } from "../../utils/constants";
import { formatDate } from "../../utils/format";

const TaskCard = ({ task, onClick, isDragging }) => {
  const labels = task.task_labels?.map((tl) => tl.labels).filter(Boolean) || [];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all duration-200 ${
        isDragging ? "shadow-lg rotate-2 opacity-90" : "shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-slate-900 leading-snug">
          {task.title}
        </h4>
        {task.priority && (
          <Badge className={PRIORITY_COLORS[task.priority]}>
            {task.priority}
          </Badge>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {labels.map((label) => (
            <span
              key={label.id}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <Avatar
              name={task.assignee.full_name || "Assigned"}
              src={task.assignee.avatar_url}
              size="sm"
            />
          )}
          {task.due_date && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar size={12} />
              {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
