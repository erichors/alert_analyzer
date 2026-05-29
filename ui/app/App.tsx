import React, { useEffect, useState } from "react";
import { queryExecutionClient } from "@dynatrace-sdk/client-query";
import { sendIntent } from "@dynatrace-sdk/navigation";
import { AppShell } from "./src/components/AppShell";
import { RiskBadge } from "./src/components/RiskBadge";
import type { AdvisorTab } from "./src/components/TabNav";
import { defaultAiProviderSettings, defaultNoiseTuningSettings, defaultQuerySchedules } from "./src/config/advisorConfig";
import type { AdvisorFilters, AdvisorQuerySchedule, ApprovalItem, DavisEvent, NoiseScore, NoiseTuningSettings, Recommendation, ValidationMetric, WhatIfScenario } from "./src/types/alertAdvisor";
import { ApprovalQueuePage } from "./src/pages/ApprovalQueuePage";
import { NoiseExplorerPage } from "./src/pages/NoiseExplorerPage";
import { OverviewPage } from "./src/pages/OverviewPage";
import { RecommendationsPage } from "./src/pages/RecommendationsPage";
import { ValidationPage } from "./src/pages/ValidationPage";
import { WhatIfPage } from "./src/pages/WhatIfPage";
import "./App.css";

const MINUTES_PER_MONTH = 30 * 24 * 60;
const STANDARD_QUERY_RATE = 0.0035;
const RESULT_LIMIT = 25;
const THEME_STORAGE_KEY = "alert-advisor-theme";
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

type QueryRunState = {
  error?: string;
  loading: boolean;
  records: Record<string, unknown>[];
  state?: string;
};

type LiveEventCountState = {
  error?: string;
  loading: boolean;
  value?: number;
};

type ScheduleRunState = {
  error?: string;
  lastRun?: string;
  loading: boolean;
  recordCount?: number;
  state?: string;
};

type EventRecommendation = {
  confidence: string;
  expectedReduction: string;
  rationale: string;
  recommendation: string;
  rollbackPlan: string;
  source: string;
  validation: string[];
};

type RecommendationRunState = {
  error?: string;
  loading: boolean;
  recommendation?: EventRecommendation;
};

type AdvisorData = {
  approvalItems: ApprovalItem[];
  davisEvents: DavisEvent[];
  noiseScores: NoiseScore[];
  recommendations: Recommendation[];
  validationMetrics: ValidationMetric[];
  whatIfScenarios: WhatIfScenario[];
};

type ThemeMode = "dark" | "light";

const emptyAdvisorData: AdvisorData = {
  approvalItems: [],
  davisEvents: [],
  noiseScores: [],
  recommendations: [],
  validationMetrics: [],
  whatIfScenarios: [],
};

const demoOnlyTabs: AdvisorTab[] = ["recommendations", "what-if", "approval", "validation"];

function getInitialTheme(): ThemeMode {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme === "dark" || storedTheme === "light" ? storedTheme : "light";
  } catch {
    return "light";
  }
}

function applyTimeRangeToDql(dql: string, timeRange: string): string {
  return dql.replace(/from:now\(\)-[0-9]+[mhd]/g, `from:now()-${timeRange}`);
}

function getField(record: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) {
    if (record[name] != null) {
      return record[name];
    }
  }

  return undefined;
}

function riskFromFireCount(fireCount: number, thresholds: NoiseTuningSettings["thresholds"]) {
  if (fireCount >= thresholds.criticalFirings) {
    return "critical" as const;
  }

  if (fireCount >= thresholds.highFirings) {
    return "high" as const;
  }

  if (fireCount >= thresholds.mediumFirings) {
    return "medium" as const;
  }

  return "low" as const;
}

function tierFromEntityType(entityType: string): DavisEvent["tier"] {
  const normalized = entityType.toUpperCase();
  if (normalized.includes("SERVICE") || normalized.includes("PROCESS") || normalized.includes("APPLICATION")) {
    return "App tier";
  }

  if (normalized.includes("HOST") || normalized.includes("KUBERNETES")) {
    return "Infra tier";
  }

  return "Virtualization";
}

function buildNoisyEvents(records: Record<string, unknown>[], noiseTuning: NoiseTuningSettings): DavisEvent[] {
  return records.map((record, index) => {
    const fireCount = Number(getField(record, "fire_count") ?? 0);
    const entityType = String(getField(record, "dt.source_entity.type") ?? "UNKNOWN");
    const entityName = String(getField(record, "entity_name", "dt.source_entity") ?? "Unknown entity");
    const eventName = String(getField(record, "event.name") ?? "Unknown event");
    const category = String(getField(record, "event.category") ?? "Unknown");
    const provider = String(getField(record, "event.provider") ?? "Unmapped app");
    const settingsObjectId = String(getField(record, "dt.settings.object_id") ?? "");
    const lastFired = String(getField(record, "last_fired") ?? "");
    const risk = riskFromFireCount(fireCount, noiseTuning.thresholds);
    const isServiceEntity = entityType.toUpperCase().includes("SERVICE");

    return {
      id: `live-noise-${settingsObjectId || entityName}-${eventName}-${index}`,
      application: provider,
      category,
      tier: tierFromEntityType(entityType),
      hostGroup: entityType,
      entity: entityName,
      eventType: eventName,
      serviceName: isServiceEntity ? entityName : undefined,
      frequency: Number.isFinite(fireCount) ? fireCount : 0,
      autoRecoveredRate: 0,
      avgDurationMinutes: 0,
      suggestedAction: settingsObjectId ? "Review Kubernetes setting" : "Review recurring event pattern",
      risk,
      settingsObjectId,
      lastFired,
      sourceProvider: provider,
      tags: [`entity_type:${entityType}`, `provider:${provider}`, settingsObjectId ? `settings:${settingsObjectId}` : "settings:unknown"],
    };
  });
}

function buildNoiseScores(events: DavisEvent[]): NoiseScore[] {
  const grouped = new Map<string, number>();
  for (const event of events) {
    grouped.set(event.application, (grouped.get(event.application) ?? 0) + event.frequency);
  }

  const maxEvents = Math.max(...grouped.values(), 1);
  const totalNoisyEvents = Math.max(events.reduce((sum, event) => sum + event.frequency, 0), 1);
  return [...grouped.entries()]
    .map(([application, noisyEvents]) => ({
      application,
      noisyEvents,
      opportunityPercent: Math.min(100, Math.round((noisyEvents / totalNoisyEvents) * 100)),
      score: Math.min(100, Math.max(1, Math.round((noisyEvents / maxEvents) * 100))),
    }))
    .sort((a, b) => b.noisyEvents - a.noisyEvents)
    .slice(0, 5);
}

function createRecommendation(event: DavisEvent, noiseTuning: NoiseTuningSettings): EventRecommendation {
  const isVeryNoisy = event.frequency >= noiseTuning.thresholds.criticalFirings;
  const isService = event.hostGroup.toUpperCase().includes("SERVICE") || event.eventType.startsWith("Service");

  const servicePhrase = event.serviceName ? `service ${event.serviceName}` : `entity ${event.entity}`;
  const recommendation = event.settingsObjectId
    ? `Create a draft tuning recommendation for the Kubernetes setting tied to ${servicePhrase}. Keep the change scoped and require approval before any setting update.`
    : `Investigate the recurring ${event.eventType} pattern on ${event.entity}. Do not suppress broadly until the source setting or entity ownership is confirmed.`;

  const rationale = isVeryNoisy
    ? `${event.frequency.toLocaleString()} firings in the selected timeframe is a strong alert-fatigue signal. The pattern is noisy enough to justify tuning analysis, but the change should remain scoped to the service/entity and Kubernetes setting that produced it.`
    : `${event.frequency.toLocaleString()} firings in the selected timeframe indicates repeated noise. Validate that the event does not correlate with incidents before drafting suppression or threshold changes.`;

  return {
    confidence: "N/A",
    expectedReduction: "N/A",
    recommendation,
    rationale,
    rollbackPlan: "Expire or revert the tuning change automatically if incident conversion increases, a critical event appears, or the event starts impacting additional entities.",
    source: "local-draft",
    validation: [
      "Compare problem-to-incident conversion before and after the change.",
      "Check whether critical or high-severity events are hidden by the proposed scope.",
      isService ? "Validate service error rate, response time, and request volume after tuning." : "Validate host/entity health and ownership before suppressing.",
    ],
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatValue(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export const App = () => {
  const [activeTab, setActiveTab] = useState<AdvisorTab>("overview");
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [demoDataEnabled, setDemoDataEnabled] = useState(false);
  const [selectedDqlSchedule, setSelectedDqlSchedule] = useState<AdvisorQuerySchedule | null>(null);
  const [selectedRecommendationEvent, setSelectedRecommendationEvent] = useState<DavisEvent | null>(null);
  const [recommendationRun, setRecommendationRun] = useState<RecommendationRunState>({ loading: false });
  const [queryRun, setQueryRun] = useState<QueryRunState>({ loading: false, records: [] });
  const [liveEventCount, setLiveEventCount] = useState<LiveEventCountState>({ loading: false });
  const [filters, setFilters] = useState<AdvisorFilters>({ domain: "all", risk: "all", timeRange: "24h" });
  const [data, setData] = useState<AdvisorData>(emptyAdvisorData);
  const [querySchedules, setQuerySchedules] = useState<AdvisorQuerySchedule[]>(defaultQuerySchedules);
  const [noiseTuning, setNoiseTuning] = useState<NoiseTuningSettings>(defaultNoiseTuningSettings);
  const [scheduleRuns, setScheduleRuns] = useState<Record<string, ScheduleRunState>>({});
  const [queryRate, setQueryRate] = useState(STANDARD_QUERY_RATE);
  const enabledSchedules = querySchedules.filter((schedule) => schedule.enabled);
  const monthlyRuns = enabledSchedules.reduce((sum, schedule) => sum + Math.floor(MINUTES_PER_MONTH / schedule.cadenceMinutes), 0);
  const monthlyGib = enabledSchedules.reduce((sum, schedule) => sum + Math.floor(MINUTES_PER_MONTH / schedule.cadenceMinutes) * schedule.estimatedGibPerRun, 0);
  const monthlyCost = monthlyGib * queryRate;
  const filteredEvents = data.davisEvents.filter((event) => {
    const riskMatch = filters.risk === "all" || event.risk === filters.risk;
    const domainMatch =
      filters.domain === "all" ||
      (filters.domain === "applications" && event.tier === "App tier") ||
      (filters.domain === "services" && event.eventType.startsWith("Service")) ||
      (filters.domain === "hosts" && event.hostGroup.length > 0) ||
      (filters.domain === "virtualization" && event.tier === "Virtualization") ||
      (filters.domain === "database" && event.tier === "DB tier");
    return riskMatch && domainMatch;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures; the in-session theme still works.
    }
  }, [theme]);

  useEffect(() => {
    if (!demoDataEnabled && demoOnlyTabs.includes(activeTab)) {
      setActiveTab("overview");
    }
  }, [activeTab, demoDataEnabled]);

  useEffect(() => {
    let cancelled = false;

    if (!demoDataEnabled) {
      setData(emptyAdvisorData);
      return () => {
        cancelled = true;
      };
    }

    void import("./src/services/alertAdvisorService").then(({ getDemoAdvisorData }) => {
      if (!cancelled) {
        setData(getDemoAdvisorData(filters));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [demoDataEnabled, filters]);

  useEffect(() => {
    let cancelled = false;

    async function getServerRecommendation(event: DavisEvent) {
      setRecommendationRun({ loading: true });
      const fallback = createRecommendation(event, noiseTuning);

      try {
        const response = await fetch("/api/recommend-alert", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ event }),
        });

        if (!response.ok) {
          throw new Error(`Recommendation function returned ${response.status}`);
        }

        const recommendation = (await response.json()) as EventRecommendation;
        if (!cancelled) {
          setRecommendationRun({ loading: false, recommendation });
        }
      } catch (error) {
        if (!cancelled) {
          setRecommendationRun({
            error: error instanceof Error ? error.message : "Server recommendation unavailable",
            loading: false,
            recommendation: fallback,
          });
        }
      }
    }

    if (selectedRecommendationEvent) {
      void getServerRecommendation(selectedRecommendationEvent);
    } else {
      setRecommendationRun({ loading: false });
    }

    return () => {
      cancelled = true;
    };
  }, [noiseTuning, selectedRecommendationEvent]);

  function renderPage() {
    switch (activeTab) {
      case "noise":
        return <NoiseExplorerPage events={filteredEvents} onRecommend={setSelectedRecommendationEvent} />;
      case "recommendations":
        return <RecommendationsPage recommendations={data.recommendations} />;
      case "what-if":
        return <WhatIfPage scenarios={data.whatIfScenarios} />;
      case "approval":
        return <ApprovalQueuePage approvals={data.approvalItems} />;
      case "validation":
        return <ValidationPage metrics={data.validationMetrics} />;
      case "overview":
      default:
        return (
          <OverviewPage
            approvals={data.approvalItems}
            events={filteredEvents}
            noiseScores={data.noiseScores}
            recommendations={data.recommendations}
            timeRange={filters.timeRange}
            totalEventsLoading={liveEventCount.loading}
            totalEventsOverride={liveEventCount.value}
          />
        );
    }
  }

  useEffect(() => {
    if (demoDataEnabled) {
      return;
    }

    let cancelled = false;
    const intervalIds: number[] = [];

    async function executeSchedule(schedule: AdvisorQuerySchedule) {
      setScheduleRuns((current) => ({ ...current, [schedule.id]: { ...current[schedule.id], loading: true } }));
      if (schedule.id === "total-events") {
        setLiveEventCount((current) => ({ ...current, loading: true }));
      }

      try {
        const executeResponse = await queryExecutionClient.queryExecute({
          body: {
            query: applyTimeRangeToDql(schedule.dql, filters.timeRange),
            defaultScanLimitGbytes: Math.max(1, Math.ceil(schedule.estimatedGibPerRun * 4)),
            fetchTimeoutSeconds: 30,
            maxResultRecords: schedule.id === "total-events" ? 1 : 100,
            requestTimeoutMilliseconds: 5000,
          },
          dtClientContext: `alert-advisor-schedule-${schedule.id}`,
        });

        let response = executeResponse;
        while (response.requestToken && (response.state === "RUNNING" || response.state === "NOT_STARTED")) {
          await delay(1000);
          response = await queryExecutionClient.queryPoll({
            requestToken: response.requestToken,
            requestTimeoutMilliseconds: 5000,
            dtClientContext: `alert-advisor-schedule-${schedule.id}`,
          });
        }

        const records = (response.result?.records ?? []).filter(Boolean) as Record<string, unknown>[];
        if (cancelled) {
          return;
        }

        if (schedule.id === "total-events") {
          const events = Number(records[0]?.events ?? 0);
          setLiveEventCount({ loading: false, value: Number.isFinite(events) ? events : 0 });
        }

        if (schedule.id === "noisy-events") {
          const noisyEvents = buildNoisyEvents(records, noiseTuning);
          setData((current) => ({
            ...current,
            davisEvents: noisyEvents,
            noiseScores: buildNoiseScores(noisyEvents),
          }));
        }

        setScheduleRuns((current) => ({
          ...current,
          [schedule.id]: {
            lastRun: new Date().toLocaleTimeString(),
            loading: false,
            recordCount: records.length,
            state: response.state,
          },
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "Query failed";
        if (schedule.id === "total-events") {
          setLiveEventCount({ error: message, loading: false });
        }
        setScheduleRuns((current) => ({ ...current, [schedule.id]: { error: message, loading: false } }));
      }
    }

    for (const schedule of querySchedules.filter((item) => item.enabled)) {
      void executeSchedule(schedule);
      intervalIds.push(window.setInterval(() => void executeSchedule(schedule), schedule.cadenceMinutes * 60 * 1000));
    }

    return () => {
      cancelled = true;
      intervalIds.forEach((intervalId) => window.clearInterval(intervalId));
    };
  }, [demoDataEnabled, filters.timeRange, noiseTuning, querySchedules]);

  function updateSchedule(id: string, patch: Partial<AdvisorQuerySchedule>) {
    setQuerySchedules((current) => current.map((schedule) => (schedule.id === id ? { ...schedule, ...patch } : schedule)));
  }

  function updateNoiseThreshold(key: keyof NoiseTuningSettings["thresholds"], value: number) {
    setNoiseTuning((current) => ({
      ...current,
      thresholds: {
        ...current.thresholds,
        [key]: Math.max(1, value || 1),
      },
    }));
  }

  function updateNoiseGrouping(key: keyof NoiseTuningSettings["grouping"], value: boolean) {
    setNoiseTuning((current) => ({
      ...current,
      grouping: {
        ...current.grouping,
        [key]: value,
      },
    }));
  }

  function updateFlapping(key: keyof NoiseTuningSettings["flapping"], value: number | boolean) {
    setNoiseTuning((current) => ({
      ...current,
      flapping: {
        ...current.flapping,
        [key]: typeof value === "number" ? Math.max(1, value || 1) : value,
      },
    }));
  }

  async function runScheduleDql(schedule: AdvisorQuerySchedule) {
    setQueryRun({ loading: true, records: [] });

    try {
      const executeResponse = await queryExecutionClient.queryExecute({
        body: {
          query: applyTimeRangeToDql(schedule.dql, filters.timeRange),
          defaultScanLimitGbytes: Math.max(1, Math.ceil(schedule.estimatedGibPerRun * 4)),
          fetchTimeoutSeconds: 30,
          maxResultRecords: RESULT_LIMIT,
          requestTimeoutMilliseconds: 5000,
        },
        dtClientContext: "alert-advisor-dql-preview",
      });

      let response = executeResponse;
      while (response.requestToken && (response.state === "RUNNING" || response.state === "NOT_STARTED")) {
        await delay(1000);
        response = await queryExecutionClient.queryPoll({
          requestToken: response.requestToken,
          requestTimeoutMilliseconds: 5000,
          dtClientContext: "alert-advisor-dql-preview",
        });
      }

      const records = (response.result?.records ?? []).filter(Boolean) as Record<string, unknown>[];
      setQueryRun({ loading: false, records, state: response.state });
    } catch (error) {
      setQueryRun({
        error: error instanceof Error ? error.message : "Query failed",
        loading: false,
        records: [],
      });
    }
  }

  function openScheduleDql(schedule: AdvisorQuerySchedule) {
    setSelectedDqlSchedule(schedule);
    setQueryRun({ loading: false, records: [] });
  }

  function openDqlInDynatrace(schedule: AdvisorQuerySchedule) {
    sendIntent(
      {
        "dt.query": applyTimeRangeToDql(schedule.dql, filters.timeRange),
      },
      {
        recommendedAppId: "dynatrace.notebooks",
        recommendedIntentId: "open-with-query",
      },
    );
  }

  return (
    <div className="app" data-theme={theme}>
      <AppShell
        activeTab={activeTab}
        disabledTabs={demoDataEnabled ? [] : demoOnlyTabs}
        filters={filters}
        onFilterChange={setFilters}
        onOpenSettings={() => setSettingsOpen(true)}
        onTabChange={setActiveTab}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        theme={theme}
      >
        {renderPage()}
      </AppShell>
      {settingsOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="section-title">
              <div>
                <p className="eyebrow">Settings</p>
                <h2 id="settings-title">Data Mode</h2>
              </div>
              <div className="settings-header-actions">
                <label className="settings-demo-toggle">
                  <span>Demo data</span>
                  <input type="checkbox" checked={demoDataEnabled} onChange={(event) => setDemoDataEnabled(event.target.checked)} />
                  <span className="toggle-track" aria-hidden="true">
                    <span className="toggle-knob" />
                  </span>
                </label>
                <button className="close-button" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                  x
                </button>
              </div>
            </div>
            <div className="settings-section-header">
              <div>
                <h3>Noise & Flapping</h3>
                <p>Control recurring alert thresholds, grouping, and recovery-loop detection.</p>
              </div>
            </div>
            <section className="noise-settings-grid" aria-label="Noise and flapping settings">
              <article className="settings-option-card">
                <h3>Noise thresholds</h3>
                <label>Medium firings
                  <input type="number" min="1" step="1" value={noiseTuning.thresholds.mediumFirings} onChange={(event) => updateNoiseThreshold("mediumFirings", Number(event.target.value))} />
                </label>
                <label>High firings
                  <input type="number" min="1" step="1" value={noiseTuning.thresholds.highFirings} onChange={(event) => updateNoiseThreshold("highFirings", Number(event.target.value))} />
                </label>
                <label>Critical firings
                  <input type="number" min="1" step="1" value={noiseTuning.thresholds.criticalFirings} onChange={(event) => updateNoiseThreshold("criticalFirings", Number(event.target.value))} />
                </label>
              </article>
              <article className="settings-option-card">
                <h3>Grouping rules</h3>
                <label className="settings-checkbox"><input type="checkbox" checked={noiseTuning.grouping.sourceEntity} onChange={(event) => updateNoiseGrouping("sourceEntity", event.target.checked)} /> Source entity</label>
                <label className="settings-checkbox"><input type="checkbox" checked={noiseTuning.grouping.eventName} onChange={(event) => updateNoiseGrouping("eventName", event.target.checked)} /> Event name</label>
                <label className="settings-checkbox"><input type="checkbox" checked={noiseTuning.grouping.eventCategory} onChange={(event) => updateNoiseGrouping("eventCategory", event.target.checked)} /> Event category</label>
                <label className="settings-checkbox"><input type="checkbox" checked={noiseTuning.grouping.settingsObject} onChange={(event) => updateNoiseGrouping("settingsObject", event.target.checked)} /> Settings object</label>
                <label className="settings-checkbox"><input type="checkbox" checked={noiseTuning.grouping.provider} onChange={(event) => updateNoiseGrouping("provider", event.target.checked)} /> Provider</label>
              </article>
              <article className="settings-option-card">
                <h3>Flapping detection</h3>
                <label className="settings-checkbox"><input type="checkbox" checked={noiseTuning.flapping.enabled} onChange={(event) => updateFlapping("enabled", event.target.checked)} /> Enabled</label>
                <label>State changes
                  <input type="number" min="1" step="1" value={noiseTuning.flapping.minimumStateChanges} onChange={(event) => updateFlapping("minimumStateChanges", Number(event.target.value))} />
                </label>
                <label>Window minutes
                  <input type="number" min="1" step="1" value={noiseTuning.flapping.windowMinutes} onChange={(event) => updateFlapping("windowMinutes", Number(event.target.value))} />
                </label>
                <label>Cooldown minutes
                  <input type="number" min="1" step="1" value={noiseTuning.flapping.cooldownMinutes} onChange={(event) => updateFlapping("cooldownMinutes", Number(event.target.value))} />
                </label>
                <label>Auto-recovered %
                  <input type="number" min="1" max="100" step="1" value={noiseTuning.flapping.autoRecoveredRatePercent} onChange={(event) => updateFlapping("autoRecoveredRatePercent", Number(event.target.value))} />
                </label>
              </article>
              <article className="settings-option-card noise-preview-card">
                <h3>Preview</h3>
                <div className="noise-preview-metrics">
                  <span><strong>{data.davisEvents.length.toLocaleString()}</strong> patterns</span>
                  <span><strong>{data.davisEvents.reduce((sum, event) => sum + event.frequency, 0).toLocaleString()}</strong> firings</span>
                  <span><strong>{data.davisEvents.filter((event) => event.frequency >= noiseTuning.thresholds.highFirings).length.toLocaleString()}</strong> high noise</span>
                </div>
                <small>Preview reflects loaded live or demo events and the current threshold settings.</small>
              </article>
            </section>
            <section className="settings-summary-grid" aria-label="Query cost summary">
              <article className="settings-metric">
                <span>Monthly query cost</span>
                <strong>{money.format(monthlyCost)}</strong>
                <small>Based on {money.format(queryRate)} per GiB scanned</small>
              </article>
              <article className="settings-metric">
                <span>Enabled queries</span>
                <strong>{enabledSchedules.length}</strong>
                <small>{querySchedules.length} configured schedules</small>
              </article>
              <article className="settings-metric">
                <span>Runs per month</span>
                <strong>{monthlyRuns.toLocaleString()}</strong>
                <small>Calculated from cadence</small>
              </article>
              <article className="settings-metric">
                <span>Estimated GiB</span>
                <strong>{monthlyGib.toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>
                <small>Adjust per query below</small>
              </article>
            </section>
            <label className="rate-field">
              <span>Standard query rate, USD per GiB scanned</span>
              <input type="number" min="0" step="0.0001" value={queryRate} onChange={(event) => setQueryRate(Number(event.target.value) || 0)} />
            </label>
            <div className="settings-section-header">
              <div>
                <h3>Query schedules</h3>
                <p>Enabled queries run on load, rerun on their cadence, and refresh the live advisor data.</p>
              </div>
            </div>
            <div className="schedule-list">
              {querySchedules.map((schedule) => (
                <article className="schedule-row" key={schedule.id}>
                  <label className="schedule-toggle">
                    <input type="checkbox" checked={schedule.enabled} onChange={(event) => updateSchedule(schedule.id, { enabled: event.target.checked })} />
                    <span>
                      <strong>{schedule.name}</strong>
                      <small>
                        {schedule.description}
                        {scheduleRuns[schedule.id]?.loading && " · running"}
                        {!scheduleRuns[schedule.id]?.loading && scheduleRuns[schedule.id]?.lastRun && ` · last run ${scheduleRuns[schedule.id]?.lastRun}`}
                        {!scheduleRuns[schedule.id]?.loading && scheduleRuns[schedule.id]?.recordCount != null && ` · ${scheduleRuns[schedule.id]?.recordCount} records`}
                        {scheduleRuns[schedule.id]?.error && " · failed"}
                      </small>
                    </span>
                  </label>
                  <label>
                    Minutes
                    <input type="number" min="5" step="5" value={schedule.cadenceMinutes} onChange={(event) => updateSchedule(schedule.id, { cadenceMinutes: Math.max(5, Number(event.target.value) || 5) })} />
                  </label>
                  <label>
                    GiB/run
                    <input type="number" min="0" step="0.01" value={schedule.estimatedGibPerRun} onChange={(event) => updateSchedule(schedule.id, { estimatedGibPerRun: Math.max(0, Number(event.target.value) || 0) })} />
                  </label>
                  <label>
                    Monthly
                    <input value={money.format(Math.floor(MINUTES_PER_MONTH / schedule.cadenceMinutes) * schedule.estimatedGibPerRun * queryRate)} disabled readOnly />
                  </label>
                  <button className="dql-button" type="button" onClick={() => openScheduleDql(schedule)}>DQL</button>
                </article>
              ))}
            </div>
            <div className="settings-section-header future-settings-header">
              <div>
                <h3>Future settings</h3>
                <p>These controls are visible for roadmap context, but they are disabled until live recommendation, AI provider, and workflow integrations are implemented.</p>
              </div>
            </div>
            <section className="settings-options-grid future-settings-grid" aria-label="Future settings">
              <article className="settings-option-card">
                <h3>Recommendations</h3>
                <label>Mode
                  <select defaultValue={defaultAiProviderSettings.operatingMode} disabled>
                    <option>Recommend only</option>
                    <option>Draft change</option>
                    <option>Apply after approval</option>
                  </select>
                </label>
                <label>Minimum confidence
                  <input type="number" min="0" max="100" step="5" defaultValue={80} disabled />
                </label>
              </article>
              <article className="settings-option-card">
                <h3>AI provider</h3>
                <label>Provider
                  <select defaultValue={defaultAiProviderSettings.provider} disabled>
                    <option>Dynatrace Intelligence</option>
                    <option>Azure OpenAI</option>
                    <option>OpenAI</option>
                    <option>Bedrock</option>
                    <option>MCP</option>
                  </select>
                </label>
                <label>Model
                  <input defaultValue={defaultAiProviderSettings.modelName} disabled />
                </label>
              </article>
              <article className="settings-option-card">
                <h3>Guardrails</h3>
                <label className="settings-checkbox"><input type="checkbox" defaultChecked={defaultAiProviderSettings.guardrails.requireApproval} disabled /> Require approval</label>
                <label className="settings-checkbox"><input type="checkbox" defaultChecked={defaultAiProviderSettings.guardrails.neverAutoMuteCriticalApps} disabled /> Never auto mute critical apps</label>
                <label className="settings-checkbox"><input type="checkbox" defaultChecked={defaultAiProviderSettings.guardrails.rollbackRequired} disabled /> Rollback required</label>
              </article>
              <article className="settings-option-card">
                <h3>Redaction</h3>
                <label className="settings-checkbox"><input type="checkbox" defaultChecked={defaultAiProviderSettings.redaction.hostname} disabled /> Hostname</label>
                <label className="settings-checkbox"><input type="checkbox" defaultChecked={defaultAiProviderSettings.redaction.endpointName} disabled /> Endpoint name</label>
                <label className="settings-checkbox"><input type="checkbox" defaultChecked={defaultAiProviderSettings.redaction.sqlText} disabled /> SQL text</label>
              </article>
            </section>
          </section>
        </div>
      )}
      {selectedDqlSchedule && (
        <div className="modal-backdrop" role="presentation">
          <section className="dql-dialog" role="dialog" aria-modal="true" aria-labelledby="dql-title">
            <div className="section-title">
              <div>
                <p className="eyebrow">DQL</p>
                <h2 id="dql-title">{selectedDqlSchedule.name}</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setSelectedDqlSchedule(null)} aria-label="Close DQL dialog">x</button>
            </div>
            <pre className="query-block">{applyTimeRangeToDql(selectedDqlSchedule.dql, filters.timeRange)}</pre>
            <div className="query-actions">
              <button type="button" onClick={() => runScheduleDql(selectedDqlSchedule)} disabled={queryRun.loading}>
                {queryRun.loading ? "Running..." : "Run DQL"}
              </button>
              <button type="button" onClick={() => openDqlInDynatrace(selectedDqlSchedule)}>Open in Dynatrace</button>
              <span>Returns up to {RESULT_LIMIT} records</span>
            </div>
            {(queryRun.loading || queryRun.error || queryRun.state || queryRun.records.length > 0) && (
              <section className="query-results">
                <div className="section-title compact-title">
                  <h3>Results</h3>
                  <span>{queryRun.loading ? "Running" : queryRun.error ? "Failed" : `${queryRun.records.length} records`}</span>
                </div>
                {queryRun.error && <div className="query-error">{queryRun.error}</div>}
                {queryRun.loading && <div className="query-loading">Running DQL and waiting for results...</div>}
                {!queryRun.loading && !queryRun.error && queryRun.records.length === 0 && <div className="query-loading">Query completed with no records.</div>}
                {!queryRun.loading && !queryRun.error && queryRun.records.length > 0 && (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {Object.keys(queryRun.records[0]).slice(0, 8).map((column) => <th key={column}>{column}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {queryRun.records.map((record, index) => (
                          <tr key={index}>
                            {Object.keys(queryRun.records[0]).slice(0, 8).map((column) => <td key={column}>{formatValue(record[column])}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </section>
        </div>
      )}
      {selectedRecommendationEvent && (() => {
        const recommendation = recommendationRun.recommendation ?? createRecommendation(selectedRecommendationEvent, noiseTuning);
        return (
          <div className="modal-backdrop" role="presentation">
            <section className="recommendation-dialog" role="dialog" aria-modal="true" aria-labelledby="event-recommendation-title">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Dynatrace Intelligence</p>
                  <h2 id="event-recommendation-title">Recommendation</h2>
                </div>
                <button className="close-button" type="button" onClick={() => setSelectedRecommendationEvent(null)} aria-label="Close recommendation">
                  x
                </button>
              </div>
              <div className="recommendation-dialog-grid">
                <section className="recommendation-context">
                  <div className="card-heading">
                    <div>
                      <h3>{selectedRecommendationEvent.eventType}</h3>
                      <p>{selectedRecommendationEvent.serviceName ?? selectedRecommendationEvent.entity}</p>
                      {recommendationRun.loading && <p className="server-note">Generating server recommendation...</p>}
                      {recommendationRun.error && <p className="server-note">Server AI unavailable. Showing draft fallback.</p>}
                    </div>
                    <RiskBadge risk={selectedRecommendationEvent.risk} />
                  </div>
                  <dl className="context-list">
                    <div><dt>Firings</dt><dd>{selectedRecommendationEvent.frequency.toLocaleString()}</dd></div>
                    <div><dt>Service</dt><dd>{selectedRecommendationEvent.serviceName ?? "Not service mapped"}</dd></div>
                    <div><dt>Entity</dt><dd>{selectedRecommendationEvent.entity}</dd></div>
                    <div><dt>Entity type</dt><dd>{selectedRecommendationEvent.hostGroup}</dd></div>
                    <div><dt>Category</dt><dd>{selectedRecommendationEvent.category ?? "Unknown"}</dd></div>
                    <div><dt>Provider</dt><dd>{selectedRecommendationEvent.sourceProvider ?? selectedRecommendationEvent.application}</dd></div>
                    <div><dt>Last fired</dt><dd>{selectedRecommendationEvent.lastFired || "Not provided"}</dd></div>
                    <div><dt>Kubernetes setting</dt><dd>{selectedRecommendationEvent.settingsObjectId || "Not mapped"}</dd></div>
                  </dl>
                </section>
                <section className="recommendation-output">
                  <h3>{recommendation.recommendation}</h3>
                  <p>{recommendation.rationale}</p>
                  <div className="mini-metrics">
                    <span>Confidence <strong>{recommendation.confidence}</strong></span>
                    <span>Expected reduction <strong>{recommendation.expectedReduction}</strong></span>
                    <span>Approval <strong>Required</strong></span>
                  </div>
                  <div className="rationale">
                    <strong>Validation checks</strong>
                    <ul>
                      {recommendation.validation.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="rationale">
                    <strong>Rollback plan</strong>
                    <p>{recommendation.rollbackPlan}</p>
                  </div>
                </section>
              </div>
            </section>
          </div>
        );
      })()}
    </div>
  );
};
