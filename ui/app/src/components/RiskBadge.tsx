import React from "react";
import type { RiskLevel } from "../types/alertAdvisor";

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <span className={`risk-badge ${risk}`}>{risk}</span>;
}
