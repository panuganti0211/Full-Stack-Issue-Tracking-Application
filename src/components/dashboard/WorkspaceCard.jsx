import { ArrowRight } from "lucide-react";
import Badge from "../ui/Badge";
import { ROLE_LABELS } from "../../utils/constants";

const WorkspaceCard = ({ workspace, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-lg hover:border-indigo-200 transition-all duration-200 group"
  >
    <div className="flex items-start justify-between mb-3">
      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition">
        {workspace.name}
      </h3>
      <ArrowRight
        size={18}
        className="text-slate-300 group-hover:text-indigo-500 transition"
      />
    </div>
    <p className="text-sm text-slate-500 line-clamp-2 mb-4">
      {workspace.description || "No description"}
    </p>
    <Badge variant="primary">
      {ROLE_LABELS[workspace.role] || workspace.role}
    </Badge>
  </div>
);

export default WorkspaceCard;
