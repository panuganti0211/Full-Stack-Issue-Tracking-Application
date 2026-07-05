import { Inbox } from "lucide-react";
import Button from "./Button";

const EmptyState = ({ icon: Icon = Inbox, title, description, action, actionLabel }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
      <Icon className="text-slate-400" size={28} />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
    )}
    {action && actionLabel && (
      <Button onClick={action}>{actionLabel}</Button>
    )}
  </div>
);

export default EmptyState;
