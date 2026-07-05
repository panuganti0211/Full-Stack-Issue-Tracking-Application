import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import toast from "react-hot-toast";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Select from "../ui/Select";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  VISIBILITY_OPTIONS,
  RESTRICTED_ROLES,
  DEFAULT_PRIORITY,
} from "../../utils/constants";
import { decodeVisibility, formatRelativeTime } from "../../utils/format";
import {
  canEditTaskContent,
  canDeleteTask,
  canComment,
  canChangeTaskStatus,
} from "../../utils/rbac";
import { createTask, updateTask, deleteTask, updateTaskStatus } from "../../services/taskService";
import { getComments, createComment, subscribeToComments } from "../../services/commentService";
import { getLabels, setTaskLabels } from "../../services/labelService";
import { getSections, ensureDefaultSections } from "../../services/sectionService";
import { getMemberDisplayName } from "../../services/memberService";
import { notifyUser } from "../../services/notifyService";
import { createShareLink } from "../../services/shareLinkService";
import { extractMentions } from "../../utils/mentions";
import { Share2, Trash2, MessageSquare, Tag } from "lucide-react";

const TaskModal = ({
  isOpen,
  onClose,
  task,
  workspaceId,
  sections,
  members,
  userId,
  userRole,
  defaultSectionId,
  onSaved,
}) => {
  const isEdit = !!task;
  const [labels, setLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localSections, setLocalSections] = useState(sections || []);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      priority: DEFAULT_PRIORITY,
      due_date: "",
      assigned_to: "",
      section_id: sections?.[0]?.id || "",
      status: "todo",
      visibility: "public",
      restricted_role: "viewer",
    },
  });

  const visibility = watch("visibility");
  const canEdit = !isEdit || canEditTaskContent(task, userId, userRole);
  const canEditStatus =
    !isEdit || canChangeTaskStatus(task, userId, userRole);
  const canRemove = isEdit && canDeleteTask(task, userId, userRole);
  const allowComment = isEdit && canComment(task, userId, userRole);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      let sectionList = sections?.length ? sections : null;

      if (!sectionList?.length) {
        const { data } = await getSections(workspaceId);
        sectionList = data || [];
      }
      if (!sectionList?.length) {
        const { data: created } = await ensureDefaultSections(workspaceId);
        sectionList = created || [];
      }

      setLocalSections(sectionList);

      const { data: labelData } = await getLabels(workspaceId);
      setLabels(labelData || []);

      const defaultSection =
        defaultSectionId || sectionList[0]?.id || "";

      if (task) {
        const { visibility: vis } = decodeVisibility(task.visibility);
        reset({
          title: task.title || "",
          description: task.description || "",
          priority: task.priority || DEFAULT_PRIORITY,
          due_date: task.due_date ? task.due_date.split("T")[0] : "",
          assigned_to: task.assigned_to || "",
          section_id: task.section_id || defaultSection,
          status: task.status || "todo",
          visibility: vis,
          restricted_role: task.restricted_role || "viewer",
        });
        setSelectedLabels(
          task.task_labels?.map((tl) => tl.label_id || tl.labels?.id) || []
        );
        loadComments();
      } else {
        reset({
          title: "",
          description: "",
          priority: DEFAULT_PRIORITY,
          due_date: "",
          assigned_to: "",
          section_id: defaultSection,
          status: "todo",
          visibility: "public",
          restricted_role: "viewer",
        });
        setSelectedLabels([]);
        setComments([]);
      }
    };

    loadData();
  }, [isOpen, task, workspaceId, sections, defaultSectionId, reset]);

  const loadComments = async () => {
    if (!task?.id) return;
    const { data } = await getComments(task.id);
    setComments(data || []);
  };

  useEffect(() => {
    if (!task?.id || !isOpen) return;
    return subscribeToComments(task.id, loadComments);
  }, [task?.id, isOpen]);

  const onSubmit = async (formData) => {
    setSubmitting(true);
    const payload = {
      workspace_id: workspaceId,
      title: formData.title,
      description: formData.description || null,
      priority: formData.priority,
      due_date: formData.due_date || null,
      assigned_to: formData.assigned_to || null,
      section_id: formData.section_id,
      status: formData.status,
      visibility: formData.visibility,
      restricted_role: formData.restricted_role,
      created_by: userId,
    };

    let result;
    if (isEdit) {
      if (!canEdit && canEditStatus) {
        result = await updateTaskStatus(task.id, {
          status: formData.status,
          section_id: formData.section_id,
        });
      } else {
        const { created_by, workspace_id, ...updates } = payload;
        result = await updateTask(task.id, updates);
      }
    } else {
      result = await createTask(payload);
    }

    if (result.error) {
      toast.error(result.error.message);
      setSubmitting(false);
      return;
    }

    const savedTask = result.data;
    await setTaskLabels(savedTask.id, selectedLabels);

    if (!isEdit && formData.assigned_to && formData.assigned_to !== userId) {
      await notifyUser({
        userId: formData.assigned_to,
        message: `You were assigned to "${formData.title}"`,
        taskId: savedTask.id,
        type: "assignment",
        subject: `Assigned: ${formData.title}`,
      });
    }

    toast.success(isEdit ? "Task updated" : "Task created");
    onSaved?.(savedTask);
    onClose();
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this task?")) return;
    const { error } = await deleteTask(task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Task deleted");
    onSaved?.(null);
    onClose();
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    const { error } = await createComment({
      taskId: task.id,
      userId,
      content: commentText.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    const mentionedIds = extractMentions(commentText, members);
    for (const mentionedId of mentionedIds) {
      if (mentionedId !== userId) {
        await notifyUser({
          userId: mentionedId,
          message: `You were mentioned in a comment on "${task.title}"`,
          taskId: task.id,
          type: "mention",
          subject: `Mentioned: ${task.title}`,
        });
      }
    }

    setCommentText("");
    loadComments();
  };

  const handleShare = async () => {
    const { data, error } = await createShareLink({ taskId: task.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    const url = `${window.location.origin}/share/${data.token}`;
    setShareUrl(url);
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard");
  };

  const toggleLabel = (labelId) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const sectionOptions = localSections.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const memberOptions = [
    { value: "", label: "Unassigned" },
    ...members.map((m) => ({
      value: m.user_id,
      label: getMemberDisplayName(m, userId),
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Task" : "Create Task"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Title"
          placeholder="Task title"
          disabled={!canEdit}
          error={errors.title?.message}
          {...register("title", { required: "Title is required" })}
        />

        <Textarea
          label="Description"
          placeholder="Describe the task..."
          disabled={!canEdit}
          {...register("description")}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Priority"
            disabled={!canEdit}
            options={PRIORITIES.map((p) => ({
              value: p,
              label: PRIORITY_LABELS[p],
            }))}
            {...register("priority")}
          />
          <Input
            label="Due Date"
            type="date"
            disabled={!canEdit}
            {...register("due_date")}
          />
          <Controller
            name="assigned_to"
            control={control}
            render={({ field }) => (
              <Select
                label="Assigned To"
                disabled={!canEdit}
                options={memberOptions}
                {...field}
              />
            )}
          />
          <Controller
            name="section_id"
            control={control}
            rules={{ required: "Section is required" }}
            render={({ field }) => (
              <Select
                label="Section"
                disabled={!canEdit && !canEditStatus}
                options={
                  sectionOptions.length
                    ? sectionOptions
                    : [{ value: "", label: "No sections — reload page" }]
                }
                error={errors.section_id?.message}
                {...field}
              />
            )}
          />
          <Select
            label="Status"
            disabled={!canEditStatus}
            options={[
              { value: "todo", label: "Todo" },
              { value: "in_progress", label: "In Progress" },
              { value: "review", label: "Review" },
              { value: "done", label: "Done" },
            ]}
            {...register("status")}
          />
          <Select
            label="Visibility"
            disabled={!canEdit}
            options={VISIBILITY_OPTIONS}
            {...register("visibility")}
          />
          {visibility === "restricted" && (
            <Select
              label="Restricted Role"
              disabled={!canEdit}
              options={RESTRICTED_ROLES}
              {...register("restricted_role")}
            />
          )}
        </div>

        {labels.length > 0 && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Tag size={14} /> Labels
            </label>
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggleLabel(label.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition border ${
                    selectedLabels.includes(label.id)
                      ? "border-transparent text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                  style={
                    selectedLabels.includes(label.id)
                      ? { backgroundColor: label.color }
                      : {}
                  }
                >
                  {label.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {isEdit && (
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <MessageSquare size={14} /> Comments
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={handleShare}>
                <Share2 size={14} /> Share
              </Button>
            </div>

            {shareUrl && (
              <p className="text-xs text-slate-500 mb-3 break-all bg-slate-50 p-2 rounded-lg">
                {shareUrl}
              </p>
            )}

            <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-400">No comments yet</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar
                      name={c.author?.full_name}
                      src={c.author?.avatar_url}
                      size="sm"
                    />
                    <div className="flex-1 bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900">
                          {c.author?.full_name}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatRelativeTime(c.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {allowComment && (
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment... Use @Name to mention"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleComment();
                    }
                  }}
                />
                <Button type="button" size="sm" onClick={handleComment}>
                  Send
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {canRemove ? (
            <Button type="button" variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 size={14} /> Delete
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {canEdit && (
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            )}
            {!canEdit && canEditStatus && (
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Update Status"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default TaskModal;
