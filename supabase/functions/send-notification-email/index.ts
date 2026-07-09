import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { toUserId, toEmail, subject, message, taskId, type } =
      await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Resolve recipient email from userId if not provided directly
    let recipientEmail = toEmail;
    if (!recipientEmail && toUserId) {
      const { data: authUser } =
        await supabaseAdmin.auth.admin.getUserById(toUserId);
      recipientEmail = authUser?.user?.email ?? null;
    }

    // Always create in-app notification first
    if (toUserId) {
      await supabaseAdmin.from("notifications").insert({
        user_id: toUserId,
        message,
        task_id: taskId || null,
        is_read: false,
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") ?? "TrackFlow <onboarding@resend.dev>";
    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:3000";
    let emailSent = false;

    if (resendKey && recipientEmail) {
      const taskLink = taskId
        ? `${appUrl}/notifications`
        : `${appUrl}/notifications`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipientEmail],
          subject: subject || `TrackFlow: ${type || "Notification"}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#4f46e5">TrackFlow</h2>
              <p>${message}</p>
              <a href="${taskLink}"
                 style="display:inline-block;margin-top:16px;padding:10px 20px;
                        background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px">
                View in TrackFlow
              </a>
            </div>
          `,
        }),
      });

      emailSent = res.ok;
      if (!res.ok) {
        const errText = await res.text();
        console.error("Resend error (notification):", errText);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        inAppCreated: !!toUserId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
