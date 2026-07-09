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

    // Send email via Supabase generateLink (magiclink).
    // Works for ANY registered email — no Resend, no domain restriction.
    // The magic link signs them in and redirects to the notifications page
    // so they can view the task directly.
    let emailSent = false;

    if (recipientEmail) {
      const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:3000";
      const redirectTo = taskId
        ? `${appUrl}/notifications`
        : `${appUrl}/notifications`;

      const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: recipientEmail,
        options: { redirectTo },
      });

      if (linkError) {
        console.error("generateLink error for notification:", linkError.message);
      } else {
        emailSent = true;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        inAppCreated: !!toUserId,
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
