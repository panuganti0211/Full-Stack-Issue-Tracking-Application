import { supabase } from "../services/supabase";

export const getProfilesByIds = async (ids) => {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return {};

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", uniqueIds);

  return (data || []).reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {});
};

export const enrichTasks = async (tasks) => {
  if (!tasks?.length) return tasks || [];

  const profileIds = tasks.flatMap((t) => [t.assigned_to, t.created_by]);
  const profiles = await getProfilesByIds(profileIds);

  return tasks.map((task) => {
    const assigneeProfile = task.assigned_to ? profiles[task.assigned_to] : null;
    const creatorProfile = task.created_by ? profiles[task.created_by] : null;

    return {
      ...task,
      assignee: assigneeProfile
        ? assigneeProfile
        : task.assigned_to
          ? { id: task.assigned_to, full_name: null, avatar_url: null }
          : null,
      creator: creatorProfile
        ? creatorProfile
        : task.created_by
          ? { id: task.created_by, full_name: null, avatar_url: null }
          : null,
    };
  });
};

export const enrichMembers = async (members) => {
  if (!members?.length) return members || [];

  const profileIds = members.map((m) => m.user_id);
  const profiles = await getProfilesByIds(profileIds);

  return members.map((member) => ({
    ...member,
    profiles: profiles[member.user_id] || null,
  }));
};

export const enrichComments = async (comments) => {
  if (!comments?.length) return comments || [];

  const profileIds = comments.map((c) => c.user_id);
  const profiles = await getProfilesByIds(profileIds);

  return comments.map((comment) => ({
    ...comment,
    author: profiles[comment.user_id] || null,
  }));
};

export const enrichTasksWithCreatorRole = (tasks, members) => {
  const roleMap = members.reduce((acc, m) => {
    acc[m.user_id] = m.role;
    return acc;
  }, {});

  return tasks.map((task) => ({
    ...task,
    creator_role: roleMap[task.created_by] || null,
  }));
};
