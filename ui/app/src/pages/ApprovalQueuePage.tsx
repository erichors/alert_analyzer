import React from "react";
import { ApprovalStatusBadge } from "../components/ApprovalStatusBadge";
import { EmptyState } from "../components/EmptyState";
import { RiskBadge } from "../components/RiskBadge";
import type { ApprovalItem } from "../types/alertAdvisor";

export function ApprovalQueuePage({ approvals }: { approvals: ApprovalItem[] }) {
  return (
    <section className="panel">
      <div className="section-title">
        <h2>Pending recommendations</h2>
        <span>Workflow actions pending</span>
      </div>
      {approvals.length === 0 ? (
        <EmptyState title="No approval items loaded" message="Demo data is off. Future workflow-backed approvals will appear here." />
      ) : (
      <div className="approval-list">
        {approvals.map((item) => (
          <article key={item.id} className="approval-row">
            <div>
              <h3>{item.title}</h3>
              <p>{item.ownerTeam} · requested by {item.requester} · expires in {item.expiresIn}</p>
            </div>
            <RiskBadge risk={item.risk} />
            <ApprovalStatusBadge status={item.status} />
            <div className="button-row">
              <button type="button" disabled>Approve</button>
              <button type="button" disabled>Reject</button>
              <button type="button" disabled>Expire</button>
            </div>
          </article>
        ))}
      </div>
      )}
    </section>
  );
}
