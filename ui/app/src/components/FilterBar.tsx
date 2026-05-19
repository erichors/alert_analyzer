import React from "react";
import type { AdvisorFilters, DomainFilter, RiskLevel, TimeRange } from "../types/alertAdvisor";

interface FilterBarProps {
  filters: AdvisorFilters;
  onChange: (filters: AdvisorFilters) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  return (
    <section className="filter-strip" aria-label="Advisor filters">
      <label>
        Time range
        <select value={filters.timeRange} onChange={(event) => onChange({ ...filters, timeRange: event.target.value as TimeRange })}>
          <option value="2h">Last 2 hours</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </label>
      <label>
        Product / domain
        <select value={filters.domain} onChange={(event) => onChange({ ...filters, domain: event.target.value as DomainFilter })}>
          <option value="all">All domains</option>
          <option value="applications">Applications</option>
          <option value="services">Services</option>
          <option value="hosts">Hosts</option>
          <option value="virtualization">Virtualization</option>
          <option value="database">Database</option>
        </select>
      </label>
      <label>
        Risk
        <select value={filters.risk} onChange={(event) => onChange({ ...filters, risk: event.target.value as "all" | RiskLevel })}>
          <option value="all">All risks</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </label>
    </section>
  );
}
