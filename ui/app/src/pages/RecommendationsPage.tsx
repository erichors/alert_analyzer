import React from "react";
import { EmptyState } from "../components/EmptyState";
import { RecommendationCard } from "../components/RecommendationCard";
import type { Recommendation } from "../types/alertAdvisor";

export function RecommendationsPage({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return <EmptyState title="No recommendations loaded" message="Demo data is off. Live Dynatrace Intelligence recommendations will appear here when the service is connected." />;
  }

  return (
    <section className="card-grid">
      {recommendations.map((recommendation) => (
        <RecommendationCard key={recommendation.id} recommendation={recommendation} />
      ))}
    </section>
  );
}
