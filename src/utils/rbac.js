import { ROLES } from "./constants";
import { decodeVisibility } from "./format";
import { parseTaskMeta } from "./taskMeta";

const ROLE_RANK = {
  [ROLES.VIEWER]: 1,
  [ROLES.TESTER]: 2,
  [ROLES.DEVELOPER]: 3,
  [ROLES.PROJECT_MANAGER]: 4,
  [ROLES.ADMIN]: 5,
};

export const canViewTask = (task, userId, userRole) => {
  if (!task || !userRole) return false;
  if (userRole === ROLES.ADMIN) return true;
  if (task.created_by === userId) return true;
  if (task.assigned_to === userId) return true;

  const { visibility } = decodeVisibility(task.visibility);
  const { restrictedRole } = parseTaskMeta(task.description);
  const effectiveRole = task.restricted_role || restrictedRole;

  if (visibility === "public" || task.visibility === "workspace") return true;

  const requiredRank = ROLE_RANK[effectiveRole] || ROLE_RANK[ROLES.VIEWER];
  const userRank = ROLE_RANK[userRole] || 0;
  return userRank >= requiredRank;
};

export const canEditTaskContent = (task, userId, userRole) => {
  if (!task || !userRole) return false;
  if (userRole === ROLES.VIEWER || userRole === ROLES.TESTER) return false;
  if (userRole === ROLES.ADMIN) return true;

  if (userRole === ROLES.PROJECT_MANAGER) {
    const creatorRole = task.creator_role;
    if (creatorRole === ROLES.ADMIN) return false;
    return true;
  }

  if (userRole === ROLES.DEVELOPER) {
    return task.assigned_to === userId || task.created_by === userId;
  }

  return false;
};

export const canChangeTaskStatus = (task, userId, userRole) => {
  if (!task || !userRole) return false;
  if (userRole === ROLES.VIEWER) return false;
  if (userRole === ROLES.ADMIN) return true;
  if (userRole === ROLES.PROJECT_MANAGER) return true;
  if (userRole === ROLES.DEVELOPER) {
    return task.assigned_to === userId || task.created_by === userId;
  }
  if (userRole === ROLES.TESTER) return canViewTask(task, userId, userRole);
  return false;
};

export const canComment = (task, userId, userRole) => {
  if (!task || !userRole) return false;
  if (userRole === ROLES.VIEWER) return false;
  return canViewTask(task, userId, userRole);
};

export const canDeleteTask = (task, userId, userRole) => {
  if (!task || !userRole) return false;
  if (userRole === ROLES.ADMIN) return true;
  if (userRole === ROLES.PROJECT_MANAGER && task.created_by === userId) return true;
  return task.created_by === userId && userRole !== ROLES.VIEWER;
};

export const canManageSections = (userRole) => {
  return [ROLES.ADMIN, ROLES.PROJECT_MANAGER].includes(userRole);
};

export const canManageLabels = (userRole) => {
  return [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.DEVELOPER].includes(userRole);
};

export const canManageTeam = (userRole) => {
  return userRole === ROLES.ADMIN;
};

export const canCreateTask = (userRole) => {
  return userRole !== ROLES.VIEWER && userRole !== ROLES.TESTER;
};

export const filterVisibleTasks = (tasks, userId, userRole) => {
  return tasks.filter((task) => canViewTask(task, userId, userRole));
};
