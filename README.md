# Sentinel — Hackathon Mobile Prototype

**Sentinel** is a proactive personal-safety intelligence prototype built with Expo + React Native + TypeScript.

The differentiator is not simply a crime map. Sentinel takes incident observations and turns them into **contextual safety information** through Safety Mode, while clearly separating unverified community reports from corroborated/official information.

## What works in this ZIP

- Interactive map with incident markers, category filters, your live location dot and a "centre on me" button
- Incident reporting that immediately updates the map (and jumps the map to the new report) and alerts feed
- **Real device notifications** (local) for new reports, safety context, agent alerts and test emergencies
- Safety Mode using the phone's foreground GPS, **live**: it keeps watching while you move between tabs and notifies you once per newly-relevant incident within 1.5 km
- **Sentinel Agent** tab: a tool-using agent (GPS → nearby incidents → optional alert). Uses Claude when the Edge Function below is deployed; otherwise runs the same tools on-device so it always works
- A **Demo Route Alert** for a guaranteed hackathon demonstration
- Test emergency/panic flow that captures GPS and records a local/Supabase event
- Alerts feed
- News/community feed with source labels
- Supabase persistence: reports are saved, loaded on startup, and arrive live from other phones
- Local demo fallback: the app works without Supabase

## Important safety statement

This is a hackathon prototype. The emergency button **does not contact SAPS, medical services, private security, or any other responder**. Preloaded incident data is fictional demo data.

## Requirements

Current Expo SDK 57 requires Node.js 22.13.x or newer in the SDK 57 documentation.

Install:

```bash
npm install
npx expo start
```

Then scan the QR code with Expo Go on a compatible device. **Use a real phone**: GPS, notifications and map tiles are unreliable or missing on simulators.

Notes:
- Expo Go needs no Google Maps key on Android. A standalone Android build does (add `android.config.googleMaps.apiKey` to `app.json`).
- Notifications are local (no push server). Tap **Allow** on the permission prompt the first time.
- `npm run web` was removed: `react-native-maps` does not support web.
- `npm run typecheck` should pass cleanly.

If package versions need reconciliation on your machine:

```bash
npx expo install --fix
```

## Optional Supabase setup

The app runs without Supabase. To enable cloud persistence:

1. Create a Supabase project.
2. Run `sql/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env`.
4. Fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

5. Restart Expo.

`sql/schema.sql` also enables demo Row Level Security policies (anonymous read/insert) and realtime on `incidents`. Without those policies, projects with RLS on silently reject inserts.

**Never put a Supabase service-role key in a mobile app.**

## Optional: enable the AI agent (Claude)

Without this, the Agent tab still works using the on-device agent (it labels its answer `ON-DEVICE`). To use Claude for the planning/wording step, the API key must live server-side, never in the app:

```bash
npm i -g supabase          # or use npx supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy sentinel-agent
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Optional: `supabase secrets set ANTHROPIC_MODEL=<model>` (default `claude-sonnet-5-5`). The function is a thin proxy (fixed model, token cap, size limit). Tools (GPS, incident lookup, notification) run on the phone. Answers labelled `AI AGENT` came from Claude. Note: anyone holding your anon key can call the function, so add auth/rate limiting before any real deployment.

## Four-hour demo flow

1. Open **Home** and explain Sentinel's proactive-safety proposition.
2. Open **Report**, submit a sample robbery/hijacking report.
3. Open **Map** and show that the new report appears immediately.
4. Open **Alerts** and show the automatically-created unverified report alert.
5. Open **Agent → Ask Sentinel** to show the tool-using briefing (with its step trace), then return to **Home → Demo route alert** to demonstrate personalised/contextual safety intelligence.
6. Trigger the **test emergency distress** flow and show captured location + timestamp.
7. Finish on **Community** to explain official/community source separation.

## Team split

### Person 1 — Map + reporting
Primary areas:
- `App.tsx` map/report screens
- `components/IncidentCard.tsx`
- UI refinement for map markers and filters

### Person 2 — Backend + GPS + emergency (your area)
Primary files:
- `lib/supabase.ts`
- `lib/location.ts`
- `lib/types.ts`
- `services/incidents.ts`
- `services/emergency.ts`
- `services/safety.ts`
- `sql/schema.sql`

Your success condition:

`Report → local state/Supabase → map + alert` and `Panic → GPS → test emergency event`.

### Person 3 — Alerts + community + presentation polish
Primary areas:
- Alerts screen in `App.tsx`
- Community screen in `App.tsx`
- `data/demoData.ts`
- Copy, labels, demo content and presentation flow

## Recommended VS Code extensions

The repo includes `.vscode/extensions.json` for:

- ESLint
- Prettier
- Expo Tools
- GitLens
- Error Lens

## Architecture

```text
Citizen / observer
      |
      v
React Native + Expo
  |      |       |
Report  Safety  Emergency
  |      Mode     GPS
  |       |       |
  +-------+-------+
          |
     Shared local state
          |
     Optional Supabase
          |
   Map + Alerts + Feed
```

## Deliberately not included in the 4-hour build

- Real emergency dispatch
- SAPS/prosecutor integration
- Background GPS
- Automated criminal identification
- Production authentication
- Predictive policing
- Dynamic route rerouting
- Multi-agent orchestration, autonomous actions (the agent can only read data and notify you)

These belong in the roadmap, not the hackathon MVP.
