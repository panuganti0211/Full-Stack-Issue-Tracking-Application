export const ROLES = {
  ADMIN: "admin",
  PROJECT_MANAGER: "project_manager",
  DEVELOPER: "developer",
  TESTER: "tester",
  VIEWER: "viewer",
};

export const ROLE_LABELS = {
  admin: "Admin",
  project_manager: "Project Manager",
  developer: "Developer",
  tester: "Tester",
  viewer: "Viewer",
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const PRIORITIES = ["P1", "P2", "P3", "P4"];

export const PRIORITY_LABELS = {
  P1: "P1 — Critical",
  P2: "P2 — High",
  P3: "P3 — Medium",
  P4: "P4 — Low",
};

export const PRIORITY_COLORS = {
  P1: "bg-red-100 text-red-700",
  P2: "bg-amber-100 text-amber-700",
  P3: "bg-blue-100 text-blue-700",
  P4: "bg-slate-100 text-slate-700",
};

export const DEFAULT_PRIORITY = "P3";

export const DEFAULT_SECTIONS = [
  { name: "Todo", color: "#3B82F6" },
  { name: "In Progress", color: "#F59E0B" },
  { name: "Review", color: "#8B5CF6" },
  { name: "Done", color: "#10B981" },
];

export const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public (all members)" },
  { value: "restricted", label: "Restricted" },
];

export const RESTRICTED_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "project_manager", label: "Project Manager" },
  { value: "developer", label: "Developer" },
  { value: "tester", label: "Tester" },
  { value: "viewer", label: "Viewer" },
];

export const PAGE_SIZE = 10;
