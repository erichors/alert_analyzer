import React from "react";
import type { WhatIfScenario } from "../types/alertAdvisor";
import { RiskBadge } from "./RiskBadge";

export function WhatIfScenarioCard({ scenario }: { scenario: WhatIfScenario }) {
  return (
    <article className="scenario-card">
      <div className="card-heading">
        <div>
          <h3>{scenario.title}</h3>
          <p>{scenario.change}</p>
        </div>
        <RiskBadge risk={scenario.risk} />
      </div>
      <div className="impact-ring">{scenario.expectedAlertReduction}%</div>
      <p><strong>Affected:</strong> {scenario.affectedEntities.join(", ")}</p>
      <p><strong>Rollback:</strong> {scenario.rollbackPlan}</p>
    </article>
  );
}
