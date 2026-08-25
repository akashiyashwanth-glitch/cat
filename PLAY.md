# Clinical Assessment Tracker — AI Prompt Playbook for React Native

A sequence of **copy-paste-able prompts** to feed your AI coding agent (e.g. Cline)
to build the app incrementally. Run them **one phase at a time**, verify the output
on a simulator/emulator, then advance. Each prompt is self-contained, assumes prior
phases exist, and instructs the agent to follow existing code conventions.

> Companion doc: `BUILD_GUIDE.md` (architecture, data model, screen specs, PDF logic).

---

## How to Use This Playbook

1. Read `BUILD_GUIDE.md` first so you understand the architecture and data model.
2. Copy a phase prompt into your agent. The agent inspects the repo, implements,
   and (where possible) runs it.
3. After each phase test on iOS (`npx expo run:ios`) and Android
   (`npx expo run:android`) or `npx expo start` + Expo Go.
4. Commit the repo after every accepted phase — it makes rollback and agent context
   reliable.
5. Only advance to the next prompt once the current phase compiles and runs.

---

## Phase 0 — Project Scaffold & Navigation Shell

**Prompt an agent:**

> In the empty project at /workspaces/cat, set up an Expo (SDK 53, TypeScript) React
> Native app that builds for both iOS and Android.
>
> 1. If no package.json exists, run:
>    `npx create-expo-app@latest . --template blank-typescript`
>    Then install and wire up: @react-navigation/native + native-stack,
>    @react-navigation/bottom-tabs, react-native-screens, react-native-safe-area-context,
>    zustand, expo-sqlite, expo-camera, expo-print, expo-file-system, expo-sharing,
>    react-native-svg, react-native-chart-kit, react-native-qrcode-svg,
>    react-native-gesture-handler, react-native-reanimated, react-native-pdf.
> 2. Configure babel.config.js to include the react-native-reanimated/plugin at the
>    END of plugins so reanimated works.
> 3. Create the folder structure under src/: components, screens, navigation, store,
>    db, core, services, types, theme, assets.
> 4. Build a navigation shell: a native stack (Splash, PatientEntry, AssessmentForm,
>    ReviewSubmit, ReportPreview, Scanner, Comparative) plus a bottom-tab wrapper
>    (Home, History, Profile). Register stub placeholder screens so the app launches
>    cleanly.
> 5. Create src/theme with design tokens: a clean clinical palette with one primary
>    accent, spacing, radii, typography scale, and large touch-target sizing (>=48px).
> 6. Confirm it runs with `npx expo start` and both iOS + Android compile.
> Report what you built and any errors.
```

**Acceptance:** App launches, shows a stub screen, tab bar works, no Babel errors.

---

## Phase 1 — Data Layer (SQLite), Types, and Stores

**Prompt:**

```
In /workspaces/cat, implement the offline data layer described in BUILD_GUIDE.md
section 4.

1. Create src/types/index.ts with: Option, QuestionDef, ToolDef, Answer, ToolResult,
   Session, Patient, Settings, ComparativeResult.
2. Create src/db/ with an init function that opens an expo-sqlite database and
   creates tables: patients, sessions, tools (config_json), session_tools
   (answers_json, score), settings. Include a migration helper via PRAGMA
   user_version.
3. Seed 2 sample assessment tools (e.g. "PHQ-9" and "GAD-7") into the tools table
   on first launch using their config_json. Each schema must support question types:
   single-select, multiselect, rating, numeric, text.
4. Add typed repository modules: patients.ts, sessions.ts, tools.ts, settings.ts.
5. Add zustand store slices: toolsStore, sessionStore (current patient + active
   session + answers), settingsStore (defaultEmails). Persist relevant slices.
6. Follow existing conventions and export a single store index. TypeScript must
   compile with no errors.
Report a summary of tables, types, and how to call each repository function.
```

**Acceptance:** DB initializes, tools seed, a session + answer can be written and
read back; store slices hydrate.

---

## Phase 2 — Assessment Form Engine (schema-driven)

**Task:**

```
In /workspaces/cat, build the AssessmentForm screen that renders ANY tool from its
schema (src/types/ToolDef + repository).

1. Top bar: a "Select Tool" dropdown/modal listing tools from the DB. Choosing one
   appends a new tool partition to the active session.
2. Card-style question renderer by type with large touch targets:
   - single-select → pill / segmented option group (>=48px height, selected state)
   - multiselect → toggle chips
   - rating → n-circle scale (5 or 7)
   - numeric → stepper with +/- and a small input
   - text → single minimal TextInput
3. Step indicator showing current question / total.
4. Auto-save: on each answer change, update the zustand session slice and write a
   debounced copy to session_tools.answers_json.
5. Footer buttons: "Add Another Assessment Tool" (reopens the tool menu) and
   "Review & Submit" (navigates to ReviewSubmit with the current session).
6. Keep styling consistent with src/theme tokens.
Validate by rendering both seeded tools and confirming answers persist across a
screen refresh. Report the files you created.
```

**Acceptance:** adding one or more tools to a session works; answers persist.

---

## Phase 3 — Patient Entry & Session Lifecycle

**Task:**

```
Implement the patient lifecycle and the PatientEntry screen.

1. PatientEntry: a name TextInput (large font, maxLength 60) and a primary "Next"
   CTA. On submit: upsert a patient row, create a new session (uuid) linked to that
   patient, store it in the zustand sessionStore, and navigate to AssessmentForm.
2. Add a persistent QR code icon button in the top header (headerRight) of both
   PatientEntry and AssessmentForm that opens the Scanner screen.
3. Support resume: if an incomplete session exists for the patient, offer to resume
   it; otherwise start fresh.
4. Provide a secondary "Load by QR scan" action linking to Scanner.
Use existing style tokens. Ensure creating a patient + session is idempotent.
```

---

## Phase 4 — Review & Submit with Slide-to-Submit

**Task:**

```
Implement ReviewSubmit using react-native-gesture-handler + react-native-reanimated.

1. Summary card list: for each tool in the current session show tool name, the
   selected answers as pills, and an auto-computed score chip. Use the core scoring
   function src/core/scoring.ts (create it if missing; score from ToolDef options).
2. An "Add Tool" button reopens the tool selection modal (reuse from AssessmentForm).
3. A "Slide to Submit" control: a track with a draggable thumb that must travel the
   full width; releasing early snaps back (no submit). On full travel, call
   submitSession() to persist the session as completed and guard with a 'submitting'
   boolean to prevent double-fire, then navigate to ReportPreview (which generates
   the PDF on entry).
4. Confirm success with a toast and a haptic.
```

**Acceptance:** partial drag resets; full drag submits exactly once.

---

## Phase 5 — PDF Report Generator

**Task:**

```
Build the PDF generator using expo-print + expo-file-system.

1. src/services/pdf.ts:
   - generateReportPDF(session, opts) and generateComparativePDF(current, previous,
     opts): build an HTML string with inline styles (A4 portrait), print via
     Print.printToFileAsync({ html }), save to the file-system documents dir, return
     { uri, name, size }.
2. Report structure:
   - PAGE 1: header (patient name, date, session id) with a QR of the session
     payload top-right; a summary KPI row (Total, Average, Highest-risk tool) and a
     risk-level badge; an SVG bar chart of baseline-vs-current (baseline optional).
   - PAGE 2+: for each tool print title, score, and itemized q->answer rows, using
     page-break-after between major sections.
3. Create src/core/scoring.ts + analytics.ts: normalization to %, risk threshold
   rules, min/max across tools.
4. Use react-native-pdf in ReportPreview to display the generated file.
Report the HTML template function names and how to call them.
```

**Acceptance:** "Download PDF" saves a valid, shareable PDF on both OS.

---

## Phase 6 — Analytics & Charts

**Task:**

```
1. Build src/core/analytics.ts: per-tool normalized scores, average, highest-risk
   tool, risk level from threshold rules, and (current - baseline) delta.
2. Render an SVG bar chart (baseline vs current) inside PDF page 1 and in a
   ReportPreview "Analytics" section using react-native-svg / react-native-chart-kit.
   Keep charts compact and print-friendly.
3. Produce a ComparativeResult object reusable by the scanner flow (Phase 8).
```

---

## Phase 7 — QR Code Generation & Embed

**Task:**

```
1. src/services/qr.ts: createQRSvg(session) returning an SVG string via
   react-native-qrcode-svg with payload `cat://sess/{sessionId}`.
2. Embed the QR into the PDF HTML page-1 header (base64 <img> or inline <svg>).
3. On ReportPreview also show a live QR preview.
4. Provide parsePayload(uri) to extract `cat://sess/{id}` for the scanner.
```
---

## Phase 8 — Scanner + Comparative Engine + Comparative PDF

**Task (scan-first, then compare):**

```
A. Scanner screen:
   1. Use expo-camera (useCameraPermissions + a QR barcode scanner, barcodeTypes
      ['qr']) to read the code and get its value.
   2. Parse `cat://sess/{id}` and look up the session in SQLite.
   3. Two paths:
      - If no active in-progress session: load the patient + historical session and
        route to a "Comparative" summary, offering "Start new session for
        comparison" (preloads that session as baseline).
      - If an active submission session is open: load the scanned historical
        session and route into the Comparative flow.
   4. Handle camera permission UI, an error toast for an invalid/unrecognized QR,
      a flash toggle for low light, and scan-once semantics per view.

2. src/core/comparative.ts: given current + previous session produce per-tool:
   previousScore, currentScore, delta, percentChange, trend ('up'|'down'|'flat'),
   and flag when |delta| > threshold.

3. Comparative screen: per tool a table Previous | Current | Δ | % change | Trend
   (▲▼→) color-coded, plus an auto-generated insight paragraph from the largest-delta
   tool.

4. generateComparativePDF (extend src/services/pdf.ts) adds the comparative table
   and charts to the report template.
```

**Acceptance:** scanning a printed session seeds a comparison; comparative PDF
displays correct deltas and trends.

---

## Phase 9 — Profile / Settings & Email Dispatch

**Task:**

```
1. Profile screen: default recipient email addresses as tagged chips (text input
   commits on Enter/comma/newline, removable), practitioner name + notes fields,
   all persisted to the settings table and synced to a zustand slice. A "Saved"
   status toast appears shortly after each save (debounced).
2. src/services/email.ts:
   - dispatchEmail({ recipients, subject, body, pdfUri }):
       try SMTP-via-backend; else fall back to Linking.openURL('mailto:...') with
       the PDF path. Provide both and a config flag.
   - A helper sendReportViaMail(recipient, pdfUri) for the offline case.
3. Wire the ReportPreview "Send Email" button to dispatchEmail using
   settings.defaultEmails. If empty, prompt the user to add recipients in Profile.
```

---

## Phase 10 — Final Polish, QA & Validation

**Task:**

```
1. Empty states: no tools configured, no history, no recipient email.
2. Loading and error toasts throughout (DB errors, camera permission denied).
3. Confirm Slide-to-Submit cannot double-trigger (guard + haptic).
4. Ensure the shared header always exposes the QR scan icon where required, and apps
   consistent theming across screens.
5. Add jest + @testing-library/react-native with unit tests for src/core/scoring.ts,
   analytics.ts, comparative.ts, and key store reducers. Run `npm test`.
6. Add a README with run instructions (`npx expo start`) and config notes on email
   and camera permissions.
Run the app end-to-end in demo mode on both platforms and confirm the full PRD flow:
launch -> patient -> multiple tools -> review -> slide -> PDF -> email/download ->
scan-back -> comparative -> settings.
```

> Numbering note: the playbook intentionally runs Phase 0-9 plus a final Phase 10
> polish pass; renumber phases freely to match your sprint plan.

---

## Prompting Tips

- Paste **one prompt per session**; give the agent time to inspect and validate.
- Always end with acceptance criteria so the agent self-checks.
- Keep prompts **scope-limited** (one screen or one service). Bigger prompts get
  partial, lower-quality output sooner.
- Ask the agent to actually run (`npx expo start`, `npm test`) and report errors
  rather than only claiming success.
- Commit after each accepted phase; revert cleanly if a phase breaks the app.
- Seed realistic sample tool schemas early so the form engine is validated against
  real-world questionnaire structures (single-select + rating + numeric).