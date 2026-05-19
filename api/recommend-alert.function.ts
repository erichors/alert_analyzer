type NoisyEventPayload = {
  application?: string;
  category?: string;
  entity?: string;
  eventType?: string;
  frequency?: number;
  hostGroup?: string;
  lastFired?: string;
  serviceName?: string;
  settingsObjectId?: string;
  sourceProvider?: string;
};

type RecommendationPayload = {
  event?: NoisyEventPayload;
};

function asNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function buildDraftRecommendation(event: NoisyEventPayload) {
  const frequency = asNumber(event.frequency);
  const serviceOrEntity = event.serviceName ? `service ${event.serviceName}` : `entity ${event.entity ?? "Unknown entity"}`;
  const hasKubernetesSetting = Boolean(event.settingsObjectId);
  const isService = Boolean(event.serviceName) || String(event.hostGroup ?? "").toUpperCase().includes("SERVICE");
  const isVeryNoisy = frequency >= 1000;

  return {
    confidence: "N/A",
    expectedReduction: "N/A",
    source: "server-draft",
    recommendation: hasKubernetesSetting
      ? `Create a draft tuning recommendation for the Kubernetes setting tied to ${serviceOrEntity}. Keep the change scoped and require approval before any setting update.`
      : `Investigate the recurring ${event.eventType ?? "event"} pattern on ${serviceOrEntity}. Do not suppress broadly until the source setting or entity ownership is confirmed.`,
    rationale: isVeryNoisy
      ? `${frequency.toLocaleString()} firings in the selected timeframe is a strong alert-fatigue signal. The pattern is noisy enough to justify tuning analysis, but the change should remain scoped to the service/entity and Kubernetes setting that produced it.`
      : `${frequency.toLocaleString()} firings in the selected timeframe indicates repeated noise. Validate that the event does not correlate with incidents before drafting suppression or threshold changes.`,
    rollbackPlan: "Expire or revert the tuning change automatically if incident conversion increases, a critical event appears, or the event starts impacting additional entities.",
    validation: [
      "Compare problem-to-incident conversion before and after the change.",
      "Check whether critical or high-severity events are hidden by the proposed scope.",
      isService ? "Validate service error rate, response time, and request volume after tuning." : "Validate host/entity health and ownership before suppressing.",
    ],
  };
}

export default async function (payload: RecommendationPayload = {}) {
  const event = payload.event ?? {};

  // TODO(Dynatrace Intelligence): Replace this draft with the supported AppEngine
  // Dynatrace Intelligence client/API when available. Keep this function as the
  // server-side boundary for prompt construction, redaction, and guardrails.
  return buildDraftRecommendation(event);
}
