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

export function TabNav({ activeTab, onChange }: { activeTab: AdvisorTab; onChange: (tab: AdvisorTab) => void }) {
  return (
    <nav className="tab-nav" aria-label="Alert Advisor sections">
      {tabs.map((tab) => (
        <button key={tab.id} className={activeTab === tab.id ? "active" : ""} type="button" onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
