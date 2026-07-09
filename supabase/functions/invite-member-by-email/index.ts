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

    const { email, workspaceId, role } = await req.json();

    if (!email || !workspaceId || !role) {
      return new Response(
        JSON.stringify({ error: "email, workspaceId, and role are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify caller is an admin of this workspace
    const { data: callerMember } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (callerMember?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:3000";
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") ?? "TrackFlow <onboarding@resend.dev>";

    // Invite link carries email + workspaceId so AcceptInvite page can
    // verify the session email and redirect to the correct workspace.
    const inviteLink = `${appUrl}/invite?email=${encodeURIComponent(normalizedEmail)}&workspaceId=${workspaceId}`;

    // Check if this email already has a Supabase auth account
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    const existingUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    // ── REGISTERED USER ───────────────────────────────────────────────────────
    if (existingUser) {
      const targetUserId = existingUser.id;

      // Check if already a member
      const { data: existingMember } = await supabaseAdmin
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: "User is already a workspace member" }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Add member immediately — they already have an account
      const { data: member, error: memberError } = await supabaseAdmin
        .from("workspace_members")
        .insert({ workspace_id: workspaceId, user_id: targetUserId, role })
        .select("id, role, joined_at, user_id")
        .single();

      if (memberError) {
        return new Response(JSON.stringify({ error: memberError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send notification email via Resend.
      // The link goes to /invite?email=&workspaceId= so AcceptInvite page
      // verifies the session email matches and redirects to the workspace.
      if (resendKey) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [normalizedEmail],
            subject: "You've been added to a workspace on TrackFlow",
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
                <h2 style="color:#4f46e5">TrackFlow Workspace Invite</h2>
                <p>You have been added to a workspace as <strong>${role}</strong>.</p>
                <p style="color:#64748b;font-size:14px">
                  Click the button below to open the workspace.
                  If you are signed in as a different account you will be signed out
                  and asked to log in with this email address.
                </p>
                <a href="${inviteLink}"
                   style="display:inline-block;margin-top:16px;padding:10px 20px;
                          background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px">
                  Open Workspace
                </a>
                <p style="color:#94a3b8;font-size:12px;margin-top:24px">
                  This link is for <strong>${normalizedEmail}</strong> only.
                </p>
              </div>
            `,
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error("Resend error (registered invite):", errText);
        }
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", targetUserId)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          invited: false,
          member: { ...member, profiles: profile },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── NON-REGISTERED USER ───────────────────────────────────────────────────
    // Store a pending invite so AcceptInvite can complete the membership
    // after the user authenticates via Google OAuth on the /invite page.
    const { error: inviteUpsertError } = await supabaseAdmin
      .from("workspace_invitations")
      .upsert(
        {
          workspace_id: workspaceId,
          email: normalizedEmail,
          role,
          invited_by: user.id,
        },
        { onConflict: "workspace_id,email" }
      );

    if (inviteUpsertError) {
      return new Response(
        JSON.stringify({ error: inviteUpsertError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use Supabase inviteUserByEmail — sends to ANY email natively.
    // No Resend, no domain restriction. After clicking, user lands on
    // /invite page which shows Google OAuth button to register and join.
    const redirectTo = `${appUrl}/invite?email=${encodeURIComponent(normalizedEmail)}&workspaceId=${workspaceId}`;
    const { error: supabaseInviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      { redirectTo }
    );

    if (supabaseInviteError) {
      return new Response(
        JSON.stringify({ error: supabaseInviteError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, invited: true, member: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
