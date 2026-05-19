import React from "react";
import { EmptyState } from "../components/EmptyState";
import { RiskBadge } from "../components/RiskBadge";
import type { DavisEvent } from "../types/alertAdvisor";

function shortText(value: string, maxLength = 34) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

export function NoiseExplorerPage({ events, onRecommend }: { events: DavisEvent[]; onRecommend: (event: DavisEvent) => void }) {
  return (
    <section className="panel table-panel">
      <div className="section-title">
        <h2>Noisy events</h2>
        <span>Live recurring event patterns</span>
      </div>
      {events.length === 0 ? (
        <EmptyState title="No noisy events loaded" message="Enable the Noisy events schedule in Settings, widen the timeframe, or turn on demo data." />
      ) : (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Service / entity</th>
              <th>Event</th>
              <th>Firings</th>
              <th>Category</th>
              <th>Risk</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td className="truncate-cell" title={event.application}>{shortText(event.application, 24)}</td>
                <td className="truncate-cell" title={event.serviceName ?? event.entity}>{shortText(event.serviceName ?? event.entity)}</td>
                <td className="truncate-cell" title={event.eventType}>{shortText(event.eventType, 38)}</td>
                <td>{event.frequency.toLocaleString()}</td>
                <td>{event.category ?? "Unknown"}</td>
                <td><RiskBadge risk={event.risk} /></td>
                <td><button className="inline-action-button" type="button" onClick={() => onRecommend(event)}>Recommend</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
}
