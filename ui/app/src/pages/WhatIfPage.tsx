import React from "react";
import { EmptyState } from "../components/EmptyState";
import { WhatIfScenarioCard } from "../components/WhatIfScenarioCard";
import type { WhatIfScenario } from "../types/alertAdvisor";

export function WhatIfPage({ scenarios }: { scenarios: WhatIfScenario[] }) {
  if (scenarios.length === 0) {
    return <EmptyState title="No what-if scenarios loaded" message="Turn on demo data to view sample simulations, or add the live calculation engine in Step 2." />;
  }

  return (
    <section className="card-grid">
      {scenarios.map((scenario) => (
        <WhatIfScenarioCard key={scenario.id} scenario={scenario} />
      ))}
    </section>
  );
}
