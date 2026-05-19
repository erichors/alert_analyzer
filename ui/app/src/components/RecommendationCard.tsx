import React from "react";
import type { Recommendation } from "../types/alertAdvisor";
import { RiskBadge } from "./RiskBadge";

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <article className="recommendation-card">
      <div className="card-heading">
        <div>
          <h3>{recommendation.title}</h3>
          <p>{recommendation.recommendation}</p>
        </div>
        <RiskBadge risk={recommendation.risk} />
      </div>
      <p className="rationale">{recommendation.rationale}</p>
      <div className="mini-metrics">
        <span>Confidence <strong>{recommendation.confidence}%</strong></span>
        <span>Reduction <strong>{recommendation.expectedReduction}%</strong></span>
        <span>Approval <strong>{recommendation.requiredApproval ? "Required" : "Not required"}</strong></span>
      </div>
    </article>
  );
}
