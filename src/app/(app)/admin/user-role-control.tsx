"use client";

import { useState } from "react";
import type { UserRole } from "@/domain/types";
import { updateUserRole } from "./actions";

const roleLabels: Record<UserRole, string> = {
  user: "User",
  question_reviewer: "Question reviewer",
  sys_admin: "System admin",
};

export function UserRoleControl({
  currentRole,
  displayName,
  userId,
}: {
  currentRole: UserRole;
  displayName: string;
  userId: string;
}) {
  const [role, setRole] = useState<UserRole>(currentRole);

  return (
    <form
      action={updateUserRole}
      className="flex items-center gap-2"
      onSubmit={(event) => {
        if (role === currentRole) return;
        if (
          !window.confirm(
            `Change ${displayName}'s global role from ${roleLabels[currentRole]} to ${roleLabels[role]}?`,
          )
        )
          event.preventDefault();
      }}
    >
      <input name="userId" type="hidden" value={userId} />
      <select
        aria-label={`Global role for ${displayName}`}
        className="min-h-9 rounded-lg border border-white/10 bg-slate-950 px-2 text-xs font-bold"
        name="role"
        onChange={(event) => setRole(event.target.value as UserRole)}
        value={role}
      >
        {(Object.keys(roleLabels) as UserRole[]).map((value) => (
          <option key={value} value={value}>
            {roleLabels[value]}
          </option>
        ))}
      </select>
      <button
        className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black disabled:opacity-40"
        disabled={role === currentRole}
        type="submit"
      >
        Save
      </button>
    </form>
  );
}
