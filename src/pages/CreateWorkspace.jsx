import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { createWorkspace } from "../services/workspaceService";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import Button from "../components/ui/Button";

const CreateWorkspace = () => {
  const { user } = useAuth();
  const { refreshWorkspaces } = useWorkspace();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (formData) => {
    const { data, error } = await createWorkspace({
      name: formData.name,
      description: formData.description,
      ownerId: user.id,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    await refreshWorkspaces();
    toast.success("Workspace created successfully");
    navigate(`/workspace/${data.id}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 w-full max-w-lg">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Create Workspace
        </h1>
        <p className="text-slate-500 mb-6">
          Set up a workspace for your team to track issues.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Workspace Name"
            placeholder="My Project"
            error={errors.name?.message}
            {...register("name", { required: "Name is required" })}
          />

          <Textarea
            label="Description"
            placeholder="What is this workspace for?"
            rows={3}
            {...register("description")}
          />

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating..." : "Create Workspace"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateWorkspace;
