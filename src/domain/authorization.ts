import type { UserRole } from "./types";

export function canReviewQuestions(role: UserRole) {
  return role === "question_reviewer" || role === "sys_admin";
}
