import React from "react";
import { sendIntent } from "@dynatrace-sdk/navigation";
import { EmptyState } from "../components/EmptyState";
import { MetricCard } from "../components/MetricCard";
import type { ApprovalItem, DavisEvent, NoiseScore, Recommendation, TimeRange } from "../types/alertAdvisor";

const timeRangeLabels: Record<TimeRange, string> = {
  "2h": "Last 2 hours",
  "6h": "Last 6 hours",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

function dqlString(value: string) {
  return JSON.stringify(value);
}

function openProblemsForApplication(application: string, timeRange: TimeRange) {
  const appLiteral = dqlString(application);
  const dql = `fetch dt.davis.events, from: now() - ${timeRange}
| filter event.kind == "DAVIS_PROBLEM"
| filter contains(toString(event.provider), ${appLiteral}, caseSensitive: false)
    or contains(toString(affected_entity_ids), ${appLiteral}, caseSensitive: false)
    or contains(toString(root_cause_entity_id), ${appLiteral}, caseSensitive: false)
| sort timestamp desc
| summarize {
    StartTime = takeFirst(event.start),
    ProblemName = takeFirst(event.name),
    Severity = takeFirst(event.category),
    Status = takeFirst(event.status),
    EventId = takeFirst(event.id),
    LastSeen = max(timestamp)
  }, by: { display_id }
| fields Problem = concat("[", display_id, " - ", ProblemName, "](/ui/apps/dynatrace.davis.problems/problem/", EventId, ")"),
         Status,
         Severity,
         StartTime,
         LastSeen
| sort StartTime desc`;

  sendIntent(
    {
      "dt.query": dql,
    },
    {
      recommendedAppId: "dynatrace.notebooks",
      recommendedIntentId: "open-with-query",
    },
  );
}

export function OverviewPage({
  events,
  noiseScores,
  recommendations,
  approvals,
  timeRange,
  totalEventsOverride,
  totalEventsLoading,
}: {
  events: DavisEvent[];
  noiseScores: NoiseScore[];
  recommendations: Recommendation[];
  approvals: ApprovalItem[];
  timeRange: TimeRange;
  totalEventsOverride?: number;
  totalEventsLoading?: boolean;
}) {
  const totalEvents = totalEventsOverride ?? events.reduce((sum, event) => sum + event.frequency, 0);
  const noisyEvents = events.reduce((sum, event) => sum + event.frequency, 0);
  const noisyServices = new Set(
    events
      .filter((event) => event.eventType.startsWith("Service") || event.tags.some((tag) => tag.startsWith("service:")))
      .map((event) => event.entity),
  ).size;
  const impactedApps = new Set(events.map((event) => event.application)).size;
  const opportunity = totalEvents > 0 ? Math.min(100, Math.round((noisyEvents / totalEvents) * 100)) : 0;
  const overSuppressionRisk = recommendations.filter((rec) => rec.risk === "high" || rec.risk === "critical").length;
  const pendingApprovals = approvals.filter((item) => item.status === "pending").length;
  const impactedAppDetails = noiseScores.slice(0, 8).map((score) => ({
    label: score.application,
    value: `${score.noisyEvents.toLocaleString()} noisy events`,
    actionLabel: "Problems",
    onClick: () => openProblemsForApplication(score.application, timeRange),
  }));

  return (
    <div className="page-grid">
      <section className="metric-grid">
        <MetricCard label="Total events" value={totalEventsLoading ? "Loading" : totalEvents} helper={timeRangeLabels[timeRange]} tone="high" />
        <MetricCard label="Noisy events" value={noisyEvents} helper="Recurring alert-fatigue candidates" tone="medium" />
        <MetricCard label="Noisy services" value={noisyServices} helper="Service entities producing repeat noise" />
        <MetricCard
          label="Impacted apps"
          value={impactedApps}
          helper="Hover for app problem links"
          detailTitle={`Problems by app · ${timeRangeLabels[timeRange]}`}
          detailItems={impactedAppDetails}
        />
        <MetricCard label="Reduction opportunity" value={`${opportunity}%`} helper="Selected timeframe" tone="low" />
        <MetricCard label="Awaiting approval" value={pendingApprovals} helper="Recommendations needing action" tone="medium" />
      </section>

      {events.length === 0 && recommendations.length === 0 && (
        <EmptyState title="Live total events only" message="The Total events card is live. Connect the remaining DQL services to populate the detail tabs." />
      )}

      {noiseScores.length > 0 && <section className="panel">
        <div className="section-title">
          <h2>Impacted apps</h2>
          <span>Noise score</span>
        </div>
        <div className="rank-list">
          {noiseScores.map((score) => (
            <div key={score.application} className="rank-row">
              <strong>{score.application}</strong>
              <span>{score.noisyEvents} events</span>
              <div className="bar"><i style={{ width: `${score.score}%` }} /></div>
              <span>{score.opportunityPercent}% noisy</span>
            </div>
          ))}
        </div>
      </section>}

      {events.length > 0 && <section className="panel">
        <div className="section-title">
          <h2>Noisy event patterns</h2>
          <span>Recurring events by source</span>
        </div>
        <div className="event-type-grid">
          {events.map((event) => (
            <article key={event.id}>
              <strong>{event.eventType}</strong>
              <span>{event.frequency} events · {event.autoRecoveredRate}% auto recovered</span>
            </article>
          ))}
        </div>
      </section>}

      {recommendations.length > 0 && <section className="panel">
        <div className="section-title">
          <h2>Suppression safety</h2>
          <span>Recommendation risk</span>
        </div>
        <div className="event-type-grid">
          <article>
            <strong>{overSuppressionRisk} high-risk recommendations</strong>
            <span>Changes that could hide meaningful symptoms need explicit review.</span>
          </article>
          <article>
            <strong>{pendingApprovals} pending approvals</strong>
            <span>No setting changes are applied in this step.</span>
          </article>
          <article>
            <strong>{recommendations.length} AI candidates</strong>
            <span>Each recommendation should be validated against incident conversion before rollout.</span>
          </article>
        </div>
      </section>}
    </div>
  );
}
