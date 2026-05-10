import type { ChangeStatus } from "../types/index.js";

export const VALID_TRANSITIONS: Record<ChangeStatus, ChangeStatus[]> = {
  draft: ["proposed"],
  proposed: ["approved", "draft"],
  approved: ["applying"],
  applying: ["reviewing"],
  reviewing: ["verifying", "applying"],
  verifying: ["archived", "reviewing"],
  archived: [],
};

export function isValidTransition(from: ChangeStatus, to: ChangeStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function getValidNextStatuses(current: ChangeStatus): ChangeStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}
