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

    const { data: overdueTasks, error } = await supabaseAdmin
      .from("tasks")
      .select("id, title, due_date, assigned_to, workspace_id")
      .not("assigned_to", "is", null)
      .not("due_date", "is", null)
      .lte("due_date", today)
      .neq("status", "done");

    if (error) {
      throw error;
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") ?? "TrackFlow <onboarding@resend.dev>";
    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:3000";

    let notificationsCreated = 0;
    let emailsSent = 0;

    for (const task of overdueTasks ?? []) {
      const message = `Task "${task.title}" is overdue (due ${task.due_date?.split("T")[0]})`;

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

      await supabaseAdmin.from("notifications").insert({
        user_id: task.assigned_to,
        message,
        task_id: task.id,
        is_read: false,
      });
      notificationsCreated++;

      if (resendKey) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(
          task.assigned_to
        );
        const email = authUser?.user?.email;

        if (email) {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [email],
              subject: `Overdue: ${task.title}`,
              html: `
                <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
                  <h2 style="color:#dc2626">Task Overdue</h2>
                  <p>${message}</p>
                  <a href="${appUrl}/workspace/${task.workspace_id}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px">
                    View Task
                  </a>
                </div>
              `,
            }),
          });
          if (res.ok) emailsSent++;
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
