import React from "react";
import type { ApprovalStatus } from "../types/alertAdvisor";

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return <span className={`approval-badge ${status}`}>{status}</span>;
}
