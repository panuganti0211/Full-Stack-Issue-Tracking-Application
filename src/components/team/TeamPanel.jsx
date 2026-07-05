import { useState } from "react";
import { UserPlus, Trash2, Shield, Mail, User } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Input from "../ui/Input";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import { ROLE_OPTIONS, ROLE_LABELS } from "../../utils/constants";
import {
  inviteMember,
  updateMemberRole,
  removeMember,
  searchProfiles,
  getMemberDisplayName,
} from "../../services/memberService";
import { inviteMemberByEmail } from "../../services/emailService";
import { canManageTeam } from "../../utils/rbac";

const TeamPanel = ({ workspaceId, members, onChange, userRole, currentUserId }) => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState("email");
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteRole, setInviteRole] = useState("developer");
  const [submitting, setSubmitting] = useState(false);
  const canManage = canManageTeam(userRole);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await searchProfiles(query);
    const existingIds = members.map((m) => m.user_id);
    setSearchResults((data || []).filter((p) => !existingIds.includes(p.id)));
  };

  const resetInviteForm = () => {
    setSelectedUser(null);
    setSearchQuery("");
    setInviteEmail("");
    setSearchResults([]);
    setInviteRole("developer");
    setInviteMode("email");
  };

  const handleInviteByName = async () => {
    if (!selectedUser) {
      toast.error("Select a user to invite");
      return;
    }

    setSubmitting(true);
    const { data, error } = await inviteMember({
      workspaceId,
      userId: selectedUser.id,
      role: inviteRole,
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    onChange([...members, data]);
    setInviteOpen(false);
    resetInviteForm();
    toast.success("Member added");
    setSubmitting(false);
  };

  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }

    setSubmitting(true);
    const { data, error } = await inviteMemberByEmail({
      email: inviteEmail.trim(),
      workspaceId,
      role: inviteRole,
    });

    if (error) {
      toast.error(error.message || "Invite failed — deploy the edge function first");
      setSubmitting(false);
      return;
    }

    if (data?.member) {
      onChange([...members, data.member]);
    }

    setInviteOpen(false);
    resetInviteForm();
    toast.success(
      data?.invited
        ? "Invite email sent to new user"
        : "Member added and notified by email"
    );
    setSubmitting(false);
  };

  const handleInvite = () => {
    if (inviteMode === "email") {
      handleInviteByEmail();
    } else {
      handleInviteByName();
    }
  };

  const handleRoleChange = async (memberId, role) => {
    const { data, error } = await updateMemberRole(memberId, role);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChange(members.map((m) => (m.id === data.id ? data : m)));
    toast.success("Role updated");
  };

  const handleRemove = async (member) => {
    if (member.user_id === currentUserId) {
      toast.error("You cannot remove yourself");
      return;
    }
    if (!window.confirm(`Remove ${getMemberDisplayName(member, currentUserId)}?`)) return;
    const { error } = await removeMember(member.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChange(members.filter((m) => m.id !== member.id));
    toast.success("Member removed");
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-900">Team Members</h3>
          <Badge variant="primary">{members.length}</Badge>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus size={14} /> Invite
          </Button>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-3">
              <Avatar
                name={getMemberDisplayName(member, currentUserId)}
                src={member.profiles?.avatar_url}
              />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {getMemberDisplayName(member, currentUserId)}
                  {member.user_id === currentUserId && (
                    <span className="text-xs text-slate-400 ml-1">(you)</span>
                  )}
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  {ROLE_LABELS[member.role] || member.role}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canManage && member.user_id !== currentUserId ? (
                <>
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-2 py-1"
                  >
                    {ROLE_OPTIONS.filter(
                      (r) => r.value !== "admin" || member.role === "admin"
                    ).map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemove(member)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              ) : (
                <Badge>{ROLE_LABELS[member.role] || member.role}</Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          resetInviteForm();
        }}
        title="Invite Team Member"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setInviteMode("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
                inviteMode === "email"
                  ? "bg-white shadow text-indigo-700"
                  : "text-slate-600"
              }`}
            >
              <Mail size={14} /> By Email
            </button>
            <button
              type="button"
              onClick={() => setInviteMode("name")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
                inviteMode === "name"
                  ? "bg-white shadow text-indigo-700"
                  : "text-slate-600"
              }`}
            >
              <User size={14} /> By Name
            </button>
          </div>

          {inviteMode === "email" ? (
            <Input
              label="Email address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
            />
          ) : (
            <>
              <Input
                label="Search by name"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Type a name..."
              />
              {searchResults.length > 0 && (
                <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                  {searchResults.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(profile);
                        setSearchQuery(profile.full_name);
                        setSearchResults([]);
                      }}
                      className={`flex items-center gap-3 w-full px-3 py-2 hover:bg-slate-50 text-left ${
                        selectedUser?.id === profile.id ? "bg-indigo-50" : ""
                      }`}
                    >
                      <Avatar
                        name={profile.full_name}
                        src={profile.avatar_url}
                        size="sm"
                      />
                      <span className="text-sm">{profile.full_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <Select
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={ROLE_OPTIONS.filter((r) => r.value !== "admin")}
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setInviteOpen(false);
                resetInviteForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={submitting}>
              {submitting ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeamPanel;
