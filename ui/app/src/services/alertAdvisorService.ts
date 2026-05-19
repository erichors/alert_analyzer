import { approvalItems, davisEvents, noiseScores, recommendations, validationMetrics, whatIfScenarios } from "../mocks/alertAdvisorMocks";
import type { AdvisorFilters } from "../types/alertAdvisor";

// TODO(DQL): Replace demo records with a Grail query service.
// Base event placeholder:
// fetch dt.davis.events
// | summarize events = count()
//
// TODO(DQL): events by application.
// TODO(DQL): events by event type.
// TODO(DQL): auto recovered rate.
// TODO(DQL): average event duration.
// TODO(DQL): top noisy host groups.
// TODO(DQL): problem to incident conversion.
// TODO(Settings API): read and draft alerting profile/anomaly detection setting changes.
// TODO(Workflows): create approval and validation workflow executions.
// TODO(AI): call Dynatrace Intelligence or selected provider after prompt builder and redaction are implemented.

export function getDemoAdvisorData(_filters: AdvisorFilters) {
  return {
    approvalItems,
    davisEvents,
    noiseScores,
    recommendations,
    validationMetrics,
    whatIfScenarios,
  };
}
