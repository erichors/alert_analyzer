export type RiskLevel = "critical" | "high" | "medium" | "low";

export type DomainFilter = "all" | "applications" | "services" | "hosts" | "virtualization" | "database";

export type TimeRange = "2h" | "6h" | "24h" | "7d" | "30d";

export interface DavisEvent {
  id: string;
  application: string;
  category?: string;
  tier: "App tier" | "DB tier" | "Infra tier" | "Virtualization";
  hostGroup: string;
  entity: string;
  eventType: string;
  serviceName?: string;
  frequency: number;
  autoRecoveredRate: number;
  avgDurationMinutes: number;
  suggestedAction: string;
  risk: RiskLevel;
  settingsObjectId?: string;
  lastFired?: string;
  sourceProvider?: string;
  tags: string[];
}

export interface NoiseScore {
  application: string;
  noisyEvents: number;
  score: number;
  opportunityPercent: number;
}

export interface Recommendation {
  id: string;
  title: string;
  recommendation: string;
  rationale: string;
  confidence: number;
  expectedReduction: number;
  risk: RiskLevel;
  requiredApproval: boolean;
  sourceEventIds: string[];
}

export interface WhatIfScenario {
  id: string;
  title: string;
  change: string;
  expectedAlertReduction: number;
  affectedEntities: string[];
  risk: RiskLevel;
  rollbackPlan: string;
}

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export interface ApprovalItem {
  id: string;
  recommendationId: string;
  title: string;
  requester: string;
  ownerTeam: string;
  status: ApprovalStatus;
  expiresIn: string;
  risk: RiskLevel;
}

export interface ValidationMetric {
  id: string;
  label: string;
  before: number;
  after: number;
  unit: string;
  trend: "positive" | "neutral" | "negative";
}

export type AiProvider = "Dynatrace Intelligence" | "Azure OpenAI" | "OpenAI" | "Bedrock" | "MCP";

export interface AiProviderSettings {
  provider: AiProvider;
  modelName: string;
  temperature: number;
  operatingMode: "Recommend only" | "Draft change" | "Apply after approval";
  redaction: {
    hostname: boolean;
    endpointName: boolean;
    eventDescription: boolean;
    sqlText: boolean;
  };
  guardrails: {
    requireApproval: boolean;
    neverAutoMuteCriticalApps: boolean;
    maxMuteDurationHours: number;
    rollbackRequired: boolean;
  };
  integrations: {
    serviceNow: boolean;
    jira: boolean;
    teams: boolean;
    slack: boolean;
  };
}

export interface AdvisorQuerySchedule {
  id: string;
  name: string;
  description: string;
  dql: string;
  cadenceMinutes: number;
  estimatedGibPerRun: number;
  enabled: boolean;
}

export interface AdvisorFilters {
  timeRange: TimeRange;
  domain: DomainFilter;
  risk: "all" | RiskLevel;
}
