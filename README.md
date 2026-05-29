# Alert Advisor

Alert Advisor is a Dynatrace AppEngine app for finding recurring Davis event noise, estimating alert-fatigue opportunity, and preparing alert tuning recommendations with approval and validation guardrails.

The app runs in Dynatrace and uses Grail DQL through `@dynatrace-sdk/client-query`. Demo data is optional and is meant only for walkthroughs.

## Data Modes

Alert Advisor starts in real-data mode.

- **Real data mode** runs enabled DQL schedules against the tenant. It does not load mock recommendation, what-if, approval, or validation records.
- **Demo data mode** loads packaged mock records for the full end-to-end story: recommendations, what-if scenarios, approvals, and validation cards.
- Features that only have demo backing are disabled in real-data mode until the corresponding live service is connected. This is intentional so demo-only workflow content is not mistaken for tenant findings.

Current real-data behavior:

- Overview event count comes from the `Total events` query.
- Noisy events and noise score come from the `Noisy events` query.
- Recommendations can be generated from a selected noisy event; if the server AI endpoint is unavailable, the app shows a draft fallback for that selected event only.
- Recommendations, what-if, approval queue, and validation tabs require demo data or future live workflow/integration work, so they are disabled when demo data is off.

## Noisy Event Formula

The live noisy-event query groups Davis events and counts firings:

```text
fire_count = count()
grouped by provider, source entity, source entity type, event name, event category, and settings object
```

The app then assigns risk from `fire_count`:

```text
critical = fire_count >= criticalFirings
high     = fire_count >= highFirings
medium   = fire_count >= mediumFirings
low      = below mediumFirings
```

Default thresholds:

- Medium: `10` firings
- High: `100` firings
- Critical: `1000` firings

Noise score by application/provider is:

```text
noisyEvents = sum(frequency for grouped noisy events)
score = round(noisyEvents / maxNoisyEvents * 100)
opportunityPercent = round(noisyEvents / totalNoisyEvents * 100)
```

## Adjusting Noise And Flapping Settings

Open **Settings > Noise & Flapping**.

- **Noise thresholds** control the medium/high/critical cutoffs used by the formula above.
- **Grouping rules** define which dimensions should be considered when reasoning about noisy patterns. The current live DQL groups by the standard full key; these toggles are settings UI for the tuning workflow and future query customization.
- **Flapping detection** defines a recovery-loop candidate:
  - enabled/disabled
  - minimum state changes
  - detection window in minutes
  - cooldown minutes
  - auto-recovered percentage threshold

Current default flapping settings:

- Enabled: `true`
- Minimum state changes: `4`
- Window: `30` minutes
- Cooldown: `15` minutes
- Auto-recovered rate: `80%`

The current noisy-event live query does not yet calculate state-change counts or auto-recovered rate, so flapping settings are captured for recommendation logic and future DQL expansion. The optional `Auto recovered rate` query is the first supporting query for that work.

## Query Schedules

Query schedules live in `ui/app/src/config/advisorConfig.ts`. They serve three purposes:

- Run enabled live polling while the app is open.
- Provide editable schedule/cost estimates in Settings.
- Provide DQL previews that can be run in-app or opened in Dynatrace Notebooks.

Only these schedules are enabled by default:

- **Total events**: counts all Davis events in the selected timeframe. Used for the overview total.
- **Noisy events**: groups recurring Davis events by entity/event/settings dimensions. Used for the noise explorer and noise score.

Optional schedules are included but disabled by default because they add scan cost and their outputs are not fully wired into the UI yet:

- **Events by event type**: ranks event names by volume. Useful for future distribution cards.
- **Auto recovered rate**: calculates closed/recovered ratio by event name. Needed for flapping and low-value auto-recovery recommendations.
- **Average event duration**: calculates average event duration. Needed for duration-threshold tuning recommendations.
- **Top noisy host groups**: finds noisy infrastructure/Kubernetes groups. Intended for infrastructure-focused tuning views.
- **Problem to incident conversion**: estimates whether noisy problems recover without incident escalation. Intended for validation and over-suppression guardrails.

They are kept because they define the planned analysis surface and can be run manually from Settings today. They can be removed if the product scope is intentionally narrowed to only total/noisy event detection.

## Run Locally

```bash
npm install
npm run start
```

Build locally:

```bash
npm run build
```

Deploy:

```bash
npm run deploy
```

## Project Structure

- `ui/app/App.tsx`: app state, DQL execution, settings, and page routing.
- `ui/app/src/config/advisorConfig.ts`: default query schedules, AI defaults, and noise/flapping defaults.
- `ui/app/src/pages`: top-level tab content.
- `ui/app/src/mocks`: demo-only records.
- `ui/app/src/services`: demo data adapter and future live service boundary.
- `ui/app/src/types`: shared data models.
