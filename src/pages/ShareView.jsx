import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { getSharedTask } from "../services/shareLinkService";
import { getComments } from "../services/commentService";
import Badge from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import ErrorState from "../components/ui/ErrorState";
import { CardSkeleton } from "../components/ui/Skeleton";
import { PRIORITY_COLORS } from "../utils/constants";
import { formatDate, formatRelativeTime } from "../utils/format";

const ShareView = () => {
  const { token } = useParams();
  const [link, setLink] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data, error: err } = await getSharedTask(token);
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      setLink(data);
      const { data: commentData } = await getComments(data.task.id);
      setComments(commentData || []);
      setLoading(false);
    };

    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <ErrorState title="Link unavailable" message={error} />
      </div>
    );
  }

  const task = link.task;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExternalLink size={18} className="text-indigo-600" />
            <span className="font-semibold text-slate-900">Shared Task</span>
          </div>
          <Badge variant="primary">Read Only</Badge>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-900">{task.title}</h1>
            {task.priority && (
              <Badge className={PRIORITY_COLORS[task.priority]}>
                {task.priority}
              </Badge>
            )}
          </div>

          {task.section && (
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: task.section.color }}
              />
              <span className="text-sm text-slate-500">{task.section.name}</span>
            </div>
          )}

          {task.description && (
            <p className="text-slate-600 leading-relaxed">{task.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-slate-500 pt-2 border-t border-slate-100">
            <span>Status: <strong className="text-slate-700 capitalize">{task.status?.replace("_", " ")}</strong></span>
            {task.due_date && (
              <span>Due: <strong className="text-slate-700">{formatDate(task.due_date)}</strong></span>
            )}
          </div>
        </div>

        {comments.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Comments</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 px-6 py-4">
                  <Avatar
                    name={c.author?.full_name}
                    src={c.author?.avatar_url}
                    size="sm"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{c.author?.full_name}</span>
                      <span className="text-xs text-slate-400">
                        {formatRelativeTime(c.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ShareView;
