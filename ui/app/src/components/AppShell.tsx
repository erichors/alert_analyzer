import React from "react";
import { FilterBar } from "./FilterBar";
import { TabNav, type AdvisorTab } from "./TabNav";
import type { AdvisorFilters } from "../types/alertAdvisor";

interface AppShellProps {
  activeTab: AdvisorTab;
  children: React.ReactNode;
  filters: AdvisorFilters;
  onFilterChange: (filters: AdvisorFilters) => void;
  onOpenSettings: () => void;
  onTabChange: (tab: AdvisorTab) => void;
  onToggleTheme: () => void;
  theme: "dark" | "light";
}

export function AppShell({ activeTab, children, filters, onFilterChange, onOpenSettings, onTabChange, onToggleTheme, theme }: AppShellProps) {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="mark">A</div>
          <div>
            <p className="eyebrow">Alert Advisor</p>
            <h1>Alert Advisor</h1>
            <p className="subtitle">AI assisted alert tuning, suppression simulation, and validation</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="mode-toggle" type="button" onClick={onToggleTheme}>{theme === "dark" ? "Dark" : "Light"}</button>
          <button className="settings-button" type="button" onClick={onOpenSettings}>
            <span aria-hidden="true">⚙</span>
            Settings
          </button>
        </div>
      </header>
      <FilterBar filters={filters} onChange={onFilterChange} />
      <TabNav activeTab={activeTab} onChange={onTabChange} />
      <section className="page-surface">{children}</section>
    </main>
  );
}
