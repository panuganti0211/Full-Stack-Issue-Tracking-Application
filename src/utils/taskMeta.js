const TASK_META_REGEX = /\n?<!--task-meta:(.*?)-->\s*$/s;

export const embedTaskMeta = (description, { restrictedRole } = {}) => {
  const clean = stripTaskMeta(description);
  if (!restrictedRole) return clean || null;

  const meta = JSON.stringify({ restricted_role: restrictedRole });
  const metaBlock = `<!--task-meta:${meta}-->`;
  return clean ? `${clean}\n${metaBlock}` : metaBlock;
};

export const parseTaskMeta = (description) => {
  if (!description) {
    return { description: null, restrictedRole: null };
  }

  const match = description.match(TASK_META_REGEX);
  if (!match) {
    return { description, restrictedRole: null };
  }

  try {
    const meta = JSON.parse(match[1]);
    const cleanDescription = description.replace(TASK_META_REGEX, "").trim();
    return {
      description: cleanDescription || null,
      restrictedRole: meta.restricted_role || null,
    };
  } catch {
    return { description, restrictedRole: null };
  }
};

export const stripTaskMeta = (description) => {
  if (!description) return null;
  return description.replace(TASK_META_REGEX, "").trim() || null;
};

export const normalizeTaskForDb = (fields) => {
  const { description, priority, visibility, restricted_role, ...rest } = fields;
  const result = { ...rest };

  if (priority !== undefined) {
    result.priority = ["P1", "P2", "P3", "P4"].includes(priority)
      ? priority
      : "P3";
  }

  if (visibility !== undefined) {
    result.visibility = visibility === "restricted" ? "restricted" : "workspace";
  }

  const shouldUpdateDescription =
    description !== undefined ||
    restricted_role !== undefined ||
    visibility !== undefined;

  if (shouldUpdateDescription) {
    const isRestricted =
      visibility === "restricted" || result.visibility === "restricted";

    result.description = embedTaskMeta(description ?? null, {
      restrictedRole: isRestricted ? restricted_role || "viewer" : null,
    });
  }

  return result;
};

export const enrichTaskWithMeta = (task) => {
  if (!task) return task;
  const { description, restrictedRole } = parseTaskMeta(task.description);
  return {
    ...task,
    description,
    restricted_role: restrictedRole,
  };
};
