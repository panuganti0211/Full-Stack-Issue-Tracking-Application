import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { supabase } from "../services/supabase";
import { signIn, signInWithGoogle, signOut } from "../services/authService";
import { ensureProfile } from "../services/profileService";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Look up a pending invite in workspace_invitations for this email+workspace.
 * Returns { data, error }.
 */
const getPendingInvite = async (email, workspaceId) => {
  const { data, error } = await supabase
    .from("workspace_invitations")
    .select("id, role, workspace_id, email")
    .eq("workspace_id", workspaceId)
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  return { data, error };
};

/**
 * Add the authenticated user to workspace_members and delete the pending invite.
 * Returns { error }.
 */
const acceptPendingInvite = async (userId, invite) => {
  // Check they're not already a member (e.g. re-click after refresh)
  const { data: existing } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", invite.workspace_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await supabase
      .from("workspace_members")
      .insert({ workspace_id: invite.workspace_id, user_id: userId, role: invite.role });

    if (insertError) return { error: insertError };
  }

  // Clean up the pending invite row
  await supabase
    .from("workspace_invitations")
    .delete()
    .eq("id", invite.id);

  return { error: null };
};

// ─── states the page can be in ───────────────────────────────────────────────
//  checking        → running session / invite checks (spinner)
//  show-login      → registered user, show email+password login form
//  show-register   → non-registered user, show "not registered" + Google button
//  accepting       → user just authenticated, now adding them to workspace
//  done            → redirect imminent

// ─── component ───────────────────────────────────────────────────────────────

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const invitedEmail = searchParams.get("email") ?? "";
  const workspaceId = searchParams.get("workspaceId") ?? "";

  const [status, setStatus] = useState("checking");
  const [contextMessage, setContextMessage] = useState("");
  const [pendingInvite, setPendingInvite] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm();

  // ── pre-fill email field whenever invitedEmail is known ──────────────────
  useEffect(() => {
    if (invitedEmail) setValue("email", invitedEmail);
  }, [invitedEmail, setValue]);

  // ── main effect: runs on mount and whenever the URL params change ─────────
  useEffect(() => {
    if (!invitedEmail || !workspaceId) {
      // Malformed link — send to login
      navigate("/login", { replace: true });
      return;
    }

    const run = async () => {
      setStatus("checking");

      const { data: { session } } = await supabase.auth.getSession();

      // ── CASE: nobody is logged in ─────────────────────────────────────────
      if (!session) {
        await determineLoginOrRegister();
        return;
      }

      const loggedInEmail = session.user.email?.toLowerCase().trim();
      const targetEmail   = invitedEmail.toLowerCase().trim();

      // ── CASE: correct user is already logged in ───────────────────────────
      if (loggedInEmail === targetEmail) {
        await handleAlreadyAuthenticated(session.user);
        return;
      }

      // ── CASE: wrong user is logged in — sign them out ─────────────────────
      await signOut();
      setContextMessage(
        `You were signed in as ${session.user.email}. Please log in as ${invitedEmail} to accept this invitation.`
      );
      await determineLoginOrRegister();
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitedEmail, workspaceId]);

  /**
   * Check whether the invited email has a pending workspace_invitations row
   * (non-registered path) or is a registered user.
   * Sets status to "show-register" or "show-login".
   */
  const determineLoginOrRegister = async () => {
    const { data: invite } = await getPendingInvite(invitedEmail, workspaceId);
    if (invite) {
      setPendingInvite(invite);
      setStatus("show-register");
    } else {
      // Registered user invite — they just need to log in
      setStatus("show-login");
    }
  };

  /**
   * The correct user is already authenticated.
   * If there's a pending invite, accept it now and redirect.
   * If they're already a member (registered user flow), redirect directly.
   */
  const handleAlreadyAuthenticated = async (authUser) => {
    setStatus("accepting");

    await ensureProfile(authUser);

    const { data: invite } = await getPendingInvite(invitedEmail, workspaceId);

    if (invite) {
      const { error } = await acceptPendingInvite(authUser.id, invite);
      if (error) {
        toast.error("Could not add you to the workspace: " + error.message);
        setStatus("show-register");
        return;
      }
      toast.success("You've joined the workspace!");
    }

    // Whether they just accepted a new invite or were already a member,
    // send them straight to the workspace
    navigate(`/workspace/${workspaceId}`, { replace: true });
  };

  // ── email + password login (registered users) ─────────────────────────────
  const onLoginSubmit = async (formData) => {
    const { error } = await signIn({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    // onAuthStateChange in AuthContext will update the user state,
    // but we drive the post-login flow ourselves here
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // CRITICAL: verify the logged-in email matches the invited email
      const loggedInEmail = session.user.email?.toLowerCase().trim();
      const targetEmail = invitedEmail.toLowerCase().trim();

      if (loggedInEmail !== targetEmail) {
        toast.error(`You logged in as ${session.user.email}, but the invitation is for ${invitedEmail}.`);
        await signOut();
        setContextMessage(`Please log in with the invited email address: ${invitedEmail}`);
        return;
      }

      await handleAlreadyAuthenticated(session.user);
    }
  };

  // ── Google OAuth (non-registered users) ──────────────────────────────────
  const handleGoogleSignIn = async () => {
    // Redirect back to THIS page after OAuth so we can accept the invite
    const redirectPath = `/invite?email=${encodeURIComponent(invitedEmail)}&workspaceId=${workspaceId}`;
    const { error } = await signInWithGoogle(redirectPath);
    if (error) toast.error(error.message);
    // Browser navigates away to Google — execution stops here
  };

  // ── render ─────────────────────────────────────────────────────────────────

  if (status === "checking" || status === "accepting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-slate-500 text-sm">
            {status === "accepting" ? "Joining workspace…" : "Verifying invitation…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 mb-3">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Workspace Invitation</h1>
          <p className="text-slate-500 text-sm mt-1">
            You were invited as <span className="font-medium text-slate-700">{invitedEmail}</span>
          </p>
        </div>

        {/* Context message (e.g. "signed out previous session") */}
        {contextMessage && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {contextMessage}
          </div>
        )}

        {/* ── REGISTERED USER: show login form ── */}
        {status === "show-login" && (
          <>
            <p className="text-sm text-slate-600 mb-4 text-center">
              Please sign in to accept the invitation.
            </p>

            <form onSubmit={handleSubmit(onLoginSubmit)} className="space-y-4">
              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register("email", { required: "Email is required" })}
              />
              <Input
                type="password"
                label="Password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register("password", { required: "Password is required" })}
              />
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Signing in…" : "Sign In & Join Workspace"}
              </Button>
            </form>
          </>
        )}

        {/* ── NON-REGISTERED USER: show Google OAuth only ── */}
        {status === "show-register" && (
          <>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5 text-sm text-slate-700 text-center">
              <p className="font-medium text-slate-800 mb-1">You don't have an account yet</p>
              <p className="text-slate-500">
                Sign in with Google to create your account and join the workspace automatically.
              </p>
            </div>

            <Button
              variant="secondary"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleGoogleSignIn}
            >
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>

            <p className="text-xs text-slate-400 text-center mt-4">
              After signing in, you'll be added to the workspace automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
