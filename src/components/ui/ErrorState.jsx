import { AlertCircle } from "lucide-react";
import Button from "./Button";

const ErrorState = ({ title = "Something went wrong", message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
      <AlertCircle className="text-red-500" size={28} />
    </div>
    <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
    <p className="text-sm text-slate-500 max-w-sm mb-6">{message}</p>
    {onRetry && (
      <Button variant="secondary" onClick={onRetry}>
        Try Again
      </Button>
    )}
  </div>
);

export default ErrorState;
