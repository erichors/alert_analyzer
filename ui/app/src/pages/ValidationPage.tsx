import React from "react";
import { EmptyState } from "../components/EmptyState";
import type { ValidationMetric } from "../types/alertAdvisor";

export function ValidationPage({ metrics }: { metrics: ValidationMetric[] }) {
  if (metrics.length === 0) {
    return <EmptyState title="No validation metrics loaded" message="Validation needs live before/after alert volume and incident conversion data." />;
  }

  return (
    <section className="validation-grid">
      {metrics.map((metric) => (
        <article key={metric.id} className={`validation-card ${metric.trend}`}>
          <span>{metric.label}</span>
          <div>
            <strong>{metric.before}</strong>
            <i>to</i>
            <strong>{metric.after}</strong>
          </div>
          <small>{metric.unit}</small>
        </article>
      ))}
    </section>
  );
}
