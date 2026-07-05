import { supabase } from "./supabase";
import { enrichComments } from "../utils/enrich";

export const getComments = async (taskId) => {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) return { data, error };
  const enriched = await enrichComments(data);
  return { data: enriched, error: null };
};

export const createComment = async ({ taskId, userId, content }) => {
  const { data, error } = await supabase
    .from("comments")
    .insert({ task_id: taskId, user_id: userId, content })
    .select("*")
    .single();

  if (error) return { data, error };
  const [enriched] = await enrichComments([data]);
  return { data: enriched, error: null };
};

export const deleteComment = async (commentId) => {
  return await supabase.from("comments").delete().eq("id", commentId);
};

export const subscribeToComments = (taskId, callback) => {
  const channel = supabase
    .channel(`comments:${taskId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "comments",
        filter: `task_id=eq.${taskId}`,
      },
      () => callback()
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};
