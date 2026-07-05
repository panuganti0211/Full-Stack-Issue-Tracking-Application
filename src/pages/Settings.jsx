import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import DashboardLayout from "../components/layouts/DashboardLayout";
import TeamPanel from "../components/team/TeamPanel";
import LabelManager from "../components/labels/LabelManager";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import Button from "../components/ui/Button";
import { CardSkeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { updateWorkspace } from "../services/workspaceService";
import { getMembers } from "../services/memberService";
import { getLabels } from "../services/labelService";
import { updateProfile } from "../services/profileService";
import { canManageTeam } from "../utils/rbac";

const WorkspaceSettings = () => {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { selectWorkspaceById } = useWorkspace();

  const [workspace, setWorkspace] = useState(null);
  const [role, setRole] = useState(null);
  const [members, setMembers] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const load = async () => {
    setLoading(true);
    const wsResult = await selectWorkspaceById(workspaceId);
    if (wsResult.error) {
      setError(wsResult.error.message);
      setLoading(false);
      return;
    }

    setWorkspace(wsResult.data);
    setRole(wsResult.role);
    reset({
      name: wsResult.data.name,
      description: wsResult.data.description || "",
    });

    const [membersRes, labelsRes] = await Promise.all([
      getMembers(workspaceId),
      getLabels(workspaceId),
    ]);

    setMembers(membersRes.data || []);
    setLabels(labelsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [workspaceId]);

  const onWorkspaceSubmit = async (data) => {
    const { error } = await updateWorkspace(workspaceId, {
      name: data.name,
      description: data.description,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Workspace updated");
    load();
  };


  if (loading) {
    return (
      <DashboardLayout>
        <CardSkeleton />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState message={error} onRetry={load} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-slate-900">Workspace Settings</h1>

        {canManageTeam(role) && (
          <form
            onSubmit={handleSubmit(onWorkspaceSubmit)}
            className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm"
          >
            <h2 className="font-semibold text-slate-900">General</h2>
            <Input label="Workspace Name" {...register("name", { required: true })} />
            <Textarea label="Description" {...register("description")} />
            <Button type="submit">Save Changes</Button>
          </form>
        )}

        <TeamPanel
          workspaceId={workspaceId}
          members={members}
          onChange={setMembers}
          userRole={role}
          currentUserId={user.id}
        />

        <LabelManager
          workspaceId={workspaceId}
          labels={labels}
          onChange={setLabels}
          userRole={role}
        />
      </div>
    </DashboardLayout>
  );
};

const Settings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { register, handleSubmit } = useForm({
    defaultValues: { full_name: profile?.full_name || "" },
  });

  const onSubmit = async (data) => {
    const { error } = await updateProfile(user.id, {
      full_name: data.full_name,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    toast.success("Profile updated");
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm"
        >
          <Input label="Full Name" {...register("full_name", { required: true })} />
          <Input label="Email" value={user?.email || ""} disabled />
          <Button type="submit">Save Profile</Button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export { WorkspaceSettings };
export default Settings;
