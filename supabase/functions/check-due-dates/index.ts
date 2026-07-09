import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const providedSecret = req.headers.get("x-cron-secret");

    if (cronSecret && providedSecret !== cronSecret) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:3000";

    const { data: overdueTasks, error } = await supabaseAdmin
      .from("tasks")
      .select("id, title, due_date, assigned_to, workspace_id")
      .not("assigned_to", "is", null)
      .not("due_date", "is", null)
      .lte("due_date", today)
      .neq("status", "done");

    if (error) throw error;

    let notificationsCreated = 0;
    let emailsSent = 0;

    for (const task of overdueTasks ?? []) {
      const message = `Task "${task.title}" is overdue (due ${task.due_date?.split("T")[0]})`;

      // Skip if we already sent a notification for this task in the last 24 hours
      const { data: existing } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("user_id", task.assigned_to)
        .eq("task_id", task.id)
        .ilike("message", "%overdue%")
        .gte(
          "created_at",
          new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
        )
        .maybeSingle();

      if (existing) continue;

      // Create in-app notification
      await supabaseAdmin.from("notifications").insert({
        user_id: task.assigned_to,
        message,
        task_id: task.id,
        is_read: false,
      });
      notificationsCreated++;

      // Send email via Supabase generateLink (magiclink).
      // Works for ANY registered email — no Resend, no domain restriction.
      // The magic link signs the user in and redirects to the workspace
      // so they can view the overdue task directly.
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
        task.assigned_to
      );
      const recipientEmail = authUser?.user?.email;

      if (recipientEmail) {
        const redirectTo = `${appUrl}/workspace/${task.workspace_id}`;

        const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: recipientEmail,
          options: { redirectTo },
        });

        if (linkError) {
          console.error("generateLink error for due date:", linkError.message);
        } else {
          emailsSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tasksChecked: overdueTasks?.length ?? 0,
        notificationsCreated,
        emailsSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
