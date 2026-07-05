import { useState } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import {
  createLabel,
  updateLabel,
  deleteLabel,
} from "../../services/labelService";
import { canManageLabels } from "../../utils/rbac";

const LABEL_COLORS = [
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6",
  "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6",
];

const LabelManager = ({ workspaceId, labels, onChange, userRole }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[0]);
  const canManage = canManageLabels(userRole);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setColor(LABEL_COLORS[0]);
    setModalOpen(true);
  };

  const openEdit = (label) => {
    setEditing(label);
    setName(label.name);
    setColor(label.color);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    if (editing) {
      const { data, error } = await updateLabel(editing.id, {
        name: name.trim(),
        color,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      onChange(labels.map((l) => (l.id === data.id ? data : l)));
      toast.success("Label updated");
    } else {
      const { data, error } = await createLabel({
        workspaceId,
        name: name.trim(),
        color,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      onChange([...labels, data]);
      toast.success("Label created");
    }

    setModalOpen(false);
  };

  const handleDelete = async (label) => {
    if (!window.confirm(`Delete label "${label.name}"?`)) return;
    const { error } = await deleteLabel(label.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChange(labels.filter((l) => l.id !== label.id));
    toast.success("Label deleted");
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Tag size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-900">Labels</h3>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} /> Add Label
          </Button>
        )}
      </div>

      {labels.length === 0 ? (
        <p className="text-sm text-slate-500">No labels yet</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-white group"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
              {canManage && (
                <div className="flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => openEdit(label)}
                    className="p-0.5 rounded hover:bg-white/20"
                  >
                    <Pencil size={10} />
                  </button>
                  <button
                    onClick={() => handleDelete(label)}
                    className="p-0.5 rounded hover:bg-white/20"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Label" : "Create Label"}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Label name"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition ${
                    color === c ? "ring-2 ring-offset-2 ring-indigo-500" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LabelManager;
