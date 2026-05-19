import React from "react";
import type { AiProviderSettings } from "../types/alertAdvisor";

const providers: AiProviderSettings["provider"][] = ["Dynatrace Intelligence", "Azure OpenAI", "OpenAI", "Bedrock", "MCP"];
const integrations: Array<keyof AiProviderSettings["integrations"]> = ["serviceNow", "jira", "teams", "slack"];

export function SettingsPage({ settings }: { settings: AiProviderSettings }) {
  return (
    <section className="settings-layout">
      <article className="panel settings-panel">
        <div className="section-title">
          <h2>AI provider</h2>
          <span>Mock settings</span>
        </div>
        <label>
          Provider
          <select defaultValue={settings.provider}>
            {providers.map((provider) => <option key={provider}>{provider}</option>)}
          </select>
        </label>
        <label>
          Model name
          <input defaultValue={settings.modelName} />
        </label>
        <label>
          Temperature
          <input type="number" min="0" max="1" step="0.1" defaultValue={settings.temperature} />
        </label>
        <label>
          Operating mode
          <select defaultValue={settings.operatingMode}>
            <option>Recommend only</option>
            <option>Draft change</option>
            <option>Apply after approval</option>
          </select>
        </label>
      </article>

      <article className="panel settings-panel">
        <div className="section-title">
          <h2>Redaction</h2>
          <span>Before AI prompt building</span>
        </div>
        {Object.entries(settings.redaction).map(([key, value]) => (
          <label key={key} className="checkbox-line">
            <input type="checkbox" defaultChecked={value} />
            <span>{key}</span>
          </label>
        ))}
      </article>

      <article className="panel settings-panel">
        <div className="section-title">
          <h2>Guardrails</h2>
          <span>No writes in Step 1</span>
        </div>
        <label className="checkbox-line"><input type="checkbox" defaultChecked={settings.guardrails.requireApproval} /> Require approval</label>
        <label className="checkbox-line"><input type="checkbox" defaultChecked={settings.guardrails.neverAutoMuteCriticalApps} /> Never auto mute critical apps</label>
        <label>Max mute duration <input type="number" defaultValue={settings.guardrails.maxMuteDurationHours} /></label>
        <label className="checkbox-line"><input type="checkbox" defaultChecked={settings.guardrails.rollbackRequired} /> Rollback required</label>
      </article>

      <article className="panel settings-panel">
        <div className="section-title">
          <h2>Integrations</h2>
          <span>Placeholders</span>
        </div>
        {integrations.map((integration) => (
          <label key={integration} className="checkbox-line">
            <input type="checkbox" defaultChecked={settings.integrations[integration]} />
            <span>{integration}</span>
          </label>
        ))}
      </article>
    </section>
  );
}
