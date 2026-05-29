import React from "react";

export type AdvisorTab = "overview" | "noise" | "recommendations" | "what-if" | "approval" | "validation";

const tabs: Array<{ id: AdvisorTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "noise", label: "Noise Explorer" },
  { id: "recommendations", label: "Recommendations" },
  { id: "what-if", label: "What If" },
  { id: "approval", label: "Approval Queue" },
  { id: "validation", label: "Validation" },
];

export function TabNav({ activeTab, disabledTabs = [], onChange }: { activeTab: AdvisorTab; disabledTabs?: AdvisorTab[]; onChange: (tab: AdvisorTab) => void }) {
  return (
    <nav className="tab-nav" aria-label="Alert Advisor sections">
      {tabs.map((tab) => {
        const disabled = disabledTabs.includes(tab.id);
        return (
          <button
            key={tab.id}
            aria-disabled={disabled}
            className={activeTab === tab.id ? "active" : ""}
            disabled={disabled}
            title={disabled ? "Requires demo data or a live workflow integration" : undefined}
            type="button"
            onClick={() => onChange(tab.id)}
          >
            {tab.label}{disabled ? " (demo)" : ""}
          </button>
        );
      })}
    </nav>
  );
}
