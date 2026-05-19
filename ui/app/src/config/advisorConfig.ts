import type { AdvisorQuerySchedule, AiProviderSettings } from "../types/alertAdvisor";

export const defaultAiProviderSettings: AiProviderSettings = {
  provider: "Dynatrace Intelligence",
  modelName: "dt-intelligence-alert-tuning",
  temperature: 0.2,
  operatingMode: "Recommend only",
  redaction: {
    hostname: true,
    endpointName: true,
    eventDescription: false,
    sqlText: true,
  },
  guardrails: {
    requireApproval: true,
    neverAutoMuteCriticalApps: true,
    maxMuteDurationHours: 72,
    rollbackRequired: true,
  },
  integrations: {
    serviceNow: true,
    jira: false,
    teams: true,
    slack: false,
  },
};

export const defaultQuerySchedules: AdvisorQuerySchedule[] = [
  {
    id: "total-events",
    name: "Total events",
    description: "Base polling query for all events.",
    dql: `fetch dt.davis.events, from:now()-24h
| summarize events=count()`,
    cadenceMinutes: 15,
    estimatedGibPerRun: 0.25,
    enabled: true,
  },
  {
    id: "noisy-events",
    name: "Noisy events",
    description: "Finds recurring events by source entity and Kubernetes setting.",
    dql: `fetch dt.davis.events, from:now()-24h
| filter isNotNull(dt.settings.object_id)
| summarize {
    fire_count = count(),
    last_fired = max(timestamp)
  }, by: {
    event.provider,
    dt.source_entity,
    dt.source_entity.type,
    event.name,
    event.category,
    dt.settings.object_id
  }
| lookup [fetch dt.entity.synthetic_test | fields id, entity.name],
    sourceField: dt.source_entity, lookupField: id, prefix: "syn_test_"
| lookup [fetch dt.entity.http_check | fields id, entity.name],
    sourceField: dt.source_entity, lookupField: id, prefix: "http_chk_"
| lookup [fetch dt.entity.http_check_step | fields id, entity.name],
    sourceField: dt.source_entity, lookupField: id, prefix: "http_step_"
| lookup [fetch dt.entity.host | fields id, entity.name],
    sourceField: dt.source_entity, lookupField: id, prefix: "host_"
| lookup [fetch dt.entity.service | fields id, entity.name],
    sourceField: dt.source_entity, lookupField: id, prefix: "svc_"
| lookup [fetch dt.entity.process_group | fields id, entity.name],
    sourceField: dt.source_entity, lookupField: id, prefix: "pg_"
| lookup [fetch dt.entity.process_group_instance | fields id, entity.name],
    sourceField: dt.source_entity, lookupField: id, prefix: "pgi_"
| lookup [fetch dt.entity.kubernetes_cluster | fields id, entity.name],
    sourceField: dt.source_entity, lookupField: id, prefix: "k8s_"
| lookup [fetch dt.entity.cloud_application | fields id, entity.name],
    sourceField: dt.source_entity, lookupField: id, prefix: "cloudapp_"
| fieldsAdd entity_name = coalesce(
    syn_test_entity.name,
    http_chk_entity.name,
    http_step_entity.name,
    host_entity.name,
    svc_entity.name,
    pg_entity.name,
    pgi_entity.name,
    k8s_entity.name,
    cloudapp_entity.name,
    dt.source_entity
  )
| fields event.provider, event.category, event.name, dt.source_entity.type, entity_name, dt.source_entity, fire_count, last_fired, dt.settings.object_id
| sort fire_count desc
| limit 50`,
    cadenceMinutes: 15,
    estimatedGibPerRun: 0.42,
    enabled: true,
  },
  {
    id: "events-by-type",
    name: "Events by event type",
    description: "Ranks OS, service, host, disk, CPU, and virtualization event volume.",
    dql: `fetch dt.davis.events, from:now()-24h
| summarize events = count(), by:{event.name}
| sort events desc`,
    cadenceMinutes: 60,
    estimatedGibPerRun: 0.32,
    enabled: false,
  },
  {
    id: "auto-recovered-rate",
    name: "Auto recovered rate",
    description: "Calculates recovery ratio for alert fatigue candidates.",
    dql: `fetch dt.davis.events, from:now()-24h
| summarize total = count(), auto_recovered = countIf(event.status == "CLOSED"), by:{event.name}
| fieldsAdd auto_recovered_rate = auto_recovered * 100.0 / total
| sort auto_recovered_rate desc`,
    cadenceMinutes: 120,
    estimatedGibPerRun: 0.36,
    enabled: false,
  },
  {
    id: "average-event-duration",
    name: "Average event duration",
    description: "Feeds duration tuning recommendations.",
    dql: `fetch dt.davis.events, from:now()-24h
| filter isNotNull(event.end) and isNotNull(event.start)
| fieldsAdd duration = event.end - event.start
| summarize avg_duration = avg(duration), by:{event.name}
| sort avg_duration desc`,
    cadenceMinutes: 120,
    estimatedGibPerRun: 0.3,
    enabled: false,
  },
  {
    id: "top-noisy-host-groups",
    name: "Top noisy host groups",
    description: "Identifies host groups producing recurring low-value volume.",
    dql: `fetch dt.davis.events, from:now()-24h
| summarize events = count(), by:{k8s.cluster.name}
| sort events desc`,
    cadenceMinutes: 60,
    estimatedGibPerRun: 0.38,
    enabled: false,
  },
  {
    id: "problem-to-incident-conversion",
    name: "Problem to incident conversion",
    description: "Checks whether proposed tuning reduces tickets without hiding real incidents.",
    dql: `fetch dt.davis.events, from:now()-24h
| summarize problems = count(), recovered = countIf(event.status == "CLOSED"), by:{event.name}
| fieldsAdd recovery_rate = recovered * 100.0 / problems
| sort recovery_rate desc`,
    cadenceMinutes: 240,
    estimatedGibPerRun: 0.22,
    enabled: false,
  },
];
