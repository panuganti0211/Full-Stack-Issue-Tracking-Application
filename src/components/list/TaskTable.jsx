import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import { PRIORITY_COLORS, PAGE_SIZE } from "../../utils/constants";
import { formatDate } from "../../utils/format";

const TaskTable = ({
  tasks,
  onTaskClick,
  sortField,
  sortDir,
  onSort,
  page,
  totalCount,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const headers = [
    { key: "title", label: "Title" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
    { key: "assigned_to", label: "Assignee" },
    { key: "due_date", label: "Due Date" },
    { key: "created_at", label: "Created" },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {headers.map((h) => (
                <th
                  key={h.key}
                  onClick={() => onSort(h.key)}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition"
                >
                  <span className="flex items-center gap-1">
                    {h.label}
                    <SortIcon field={h.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                  No tasks found
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="hover:bg-slate-50 cursor-pointer transition"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    {task.section && (
                      <p className="text-xs text-slate-400">{task.section.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.priority && (
                      <Badge className={PRIORITY_COLORS[task.priority]}>
                        {task.priority}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600 capitalize">
                      {task.status?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={task.assignee.full_name || "?"}
                          src={task.assignee.avatar_url}
                          size="sm"
                        />
                        <span className="text-sm text-slate-600">
                          {task.assignee.full_name || "Assigned member"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatDate(task.due_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatDate(task.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskTable;
