import React from "react";

export type MetricCardDetail = {
  label: string;
  value?: string;
  actionLabel?: string;
  onClick?: () => void;
};

interface MetricCardProps {
  label: string;
  value: string | number;
  helper: string;
  tone?: "neutral" | "critical" | "high" | "medium" | "low";
  detailTitle?: string;
  detailItems?: MetricCardDetail[];
}

export function MetricCard({ label, value, helper, tone = "neutral", detailTitle, detailItems = [] }: MetricCardProps) {
  const hasDetails = detailItems.length > 0;

  return (
    <article className={`metric-card ${tone}${hasDetails ? " has-hover" : ""}`} tabIndex={hasDetails ? 0 : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
      {hasDetails && (
        <div className="metric-hover" role="dialog" aria-label={detailTitle ?? label}>
          <div className="metric-hover-title">{detailTitle ?? label}</div>
          <div className="metric-hover-list">
            {detailItems.map((item) => (
              <button
                type="button"
                className="metric-hover-row"
                key={item.label}
                onClick={item.onClick}
                disabled={!item.onClick}
              >
                <div className="metric-hover-copy">
                  <strong>{item.label}</strong>
                  {item.value && <span>{item.value}</span>}
                </div>
                {item.onClick && <span className="metric-hover-link">{item.actionLabel ?? "Open"}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
