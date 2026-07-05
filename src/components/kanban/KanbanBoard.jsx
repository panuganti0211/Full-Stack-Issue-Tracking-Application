import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import TaskCard from "../tasks/TaskCard";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import {
  createSection,
  updateSection,
  deleteSection,
} from "../../services/sectionService";
import { moveTask } from "../../services/taskService";
import { canManageSections, canChangeTaskStatus } from "../../utils/rbac";

const STATUS_MAP = {
  Todo: "todo",
  "In Progress": "in_progress",
  Review: "review",
  Done: "done",
};

const SortableTask = ({ task, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} isDragging={isDragging} />
    </div>
  );
};

const Column = ({
  section,
  tasks,
  onTaskClick,
  onAddTask,
  onEditSection,
  onDeleteSection,
  canManage,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: section.id });
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`flex flex-col min-w-[280px] w-[280px] bg-slate-100/80 rounded-xl transition-colors ${
        isOver ? "ring-2 ring-indigo-300 bg-indigo-50/50" : ""
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: section.color }}
          />
          <h3 className="font-semibold text-sm text-slate-800">{section.name}</h3>
          <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        {canManage && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-white/80 text-slate-400"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 w-36">
                <button
                  onClick={() => {
                    onEditSection(section);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <Pencil size={14} /> Rename
                </button>
                <button
                  onClick={() => {
                    onDeleteSection(section);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 px-3 pb-3 space-y-2 min-h-[200px] overflow-y-auto"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={() => onAddTask(section)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition"
        >
          <Plus size={16} /> Add Task
        </button>
      </div>
    </div>
  );
};

const KanbanBoard = ({
  workspaceId,
  sections,
  tasks,
  userId,
  userRole,
  onSectionsChange,
  onTasksChange,
  onTaskClick,
  onAddTask,
}) => {
  const [activeTask, setActiveTask] = useState(null);
  const [sectionModal, setSectionModal] = useState(null);
  const [sectionName, setSectionName] = useState("");
  const canManage = canManageSections(userRole);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const getTasksForSection = (sectionId) =>
    tasks.filter((t) => t.section_id === sectionId);

  const handleDragStart = (event) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task);
  };

  const handleDragEnd = async (event) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let targetSectionId = over.id;
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask) {
      targetSectionId = overTask.section_id;
    }

    if (task.section_id === targetSectionId) return;

    if (!canChangeTaskStatus(task, userId, userRole)) {
      toast.error("You don't have permission to move this task");
      return;
    }

    const targetSection = sections.find((s) => s.id === targetSectionId);
    const status = STATUS_MAP[targetSection?.name] || task.status;

    const { data, error } = await moveTask(taskId, targetSectionId, status);
    if (error) {
      toast.error(error.message);
      return;
    }

    onTasksChange(tasks.map((t) => (t.id === taskId ? data : t)));
  };

  const handleCreateSection = async () => {
    if (!sectionName.trim()) return;
    const colors = ["#3B82F6", "#F59E0B", "#8B5CF6", "#10B981", "#EF4444"];
    const { data, error } = await createSection({
      workspaceId,
      name: sectionName.trim(),
      color: colors[sections.length % colors.length],
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    onSectionsChange([...sections, data]);
    setSectionModal(null);
    setSectionName("");
    toast.success("Section created");
  };

  const handleUpdateSection = async () => {
    if (!sectionModal || !sectionName.trim()) return;
    const { data, error } = await updateSection(sectionModal.id, {
      name: sectionName.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    onSectionsChange(sections.map((s) => (s.id === data.id ? data : s)));
    setSectionModal(null);
    setSectionName("");
    toast.success("Section renamed");
  };

  const handleDeleteSection = async (section) => {
    const sectionTasks = getTasksForSection(section.id);
    if (sectionTasks.length > 0) {
      toast.error("Move or delete tasks before removing this section");
      return;
    }
    if (!window.confirm(`Delete section "${section.name}"?`)) return;
    const { error } = await deleteSection(section.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onSectionsChange(sections.filter((s) => s.id !== section.id));
    toast.success("Section deleted");
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {sections.map((section) => (
            <Column
              key={section.id}
              section={section}
              tasks={getTasksForSection(section.id)}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
              canManage={canManage}
              onEditSection={(s) => {
                setSectionModal(s);
                setSectionName(s.name);
              }}
              onDeleteSection={handleDeleteSection}
            />
          ))}

          {canManage && (
            <button
              onClick={() => {
                setSectionModal("new");
                setSectionName("");
              }}
              className="min-w-[280px] h-fit flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition"
            >
              <Plus size={18} /> Add Section
            </button>
          )}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <Modal
        isOpen={!!sectionModal}
        onClose={() => setSectionModal(null)}
        title={sectionModal === "new" ? "Create Section" : "Rename Section"}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Section Name"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            placeholder="Section name"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSectionModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={
                sectionModal === "new" ? handleCreateSection : handleUpdateSection
              }
            >
              {sectionModal === "new" ? "Create" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default KanbanBoard;
