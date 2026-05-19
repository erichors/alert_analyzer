# Alert Advisor

Alert Suppression Advisor is a Dynatrace AppEngine React + TypeScript app shell for analyzing recurring events and preparing alert suppression, anomaly tuning, and threshold recommendations.

This is Step 1 only. Demo mode uses mocked records, placeholder services, and UI-only actions. It does not write Dynatrace settings, call an external AI provider, or execute approval workflows.

## Run Locally

```bash
npm install
npm run start
```

Build locally:

```bash
npm run build
```

Deploy when ready:

```bash
npm run deploy
```

## Project Structure

- `ui/app/App.tsx` - Dynatrace app entry point.
- `ui/app/src/components` - reusable UI components.
- `ui/app/src/pages` - top-level tab/page content.
- `ui/app/src/config` - default settings and query schedules that are available whether demo data is on or off.
- `ui/app/src/mocks` - demo records for events, recommendations, what-if scenarios, approval queue, and validation metrics.
- `ui/app/src/services` - data-access abstraction layer. Step 1 loads demo records only when the demo switch is on.
- `ui/app/src/types` - shared data models.

## Settings

Settings are opened from the top-right button only. Step 1 includes:

- Demo data toggle. When off, pre-packaged mock tab data is not loaded.
- Adjustable query schedules for advisor polling queries.
- Estimated GiB per run and standard query rate inputs.
- Monthly run, scan, and cost estimates.
- DQL preview buttons for viewing, running, or opening planned advisor queries in Dynatrace.

The schedule rows drive in-app polling while the app is open. Step 2 should persist schedule edits and optionally move execution to workflow schedules.

## Real Data Integration Points

Real DQL services should be added in `ui/app/src/services/alertAdvisorService.ts`.

Initial DQL placeholder:

```dql
fetch dt.davis.events
| summarize events = count()
```

Future DQL placeholders are included as TODO comments for:

- events by application
- events by event type
- auto recovered rate
- average event duration
- top noisy host groups
- problem to incident conversion

## Step 2 Preview

Recommended Step 2 tasks:

- Replace mock data with live DQL queries.
- Add a Grail query service.
- Add a real what-if calculation engine.
- Add an AI prompt builder.
- Add settings persistence.
- Add approval workflow integration.
