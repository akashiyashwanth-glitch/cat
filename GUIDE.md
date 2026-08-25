Clinical Assessment Tracker — React Native Build Guide

Comprehensive step-by-step technical blueprint for building the Clinical Assessment
Tracker for **iOS and Android** with React Native (Expo managed workflow).

> Target stack is **Expo (SDK 51+)** with the new architecture enabled. This gives
> the fastest path to both platforms from a single codebase while keeping full
> native capability via Expo modules.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          ROUTER (React Navigation)              │
│  Stack: Splash → PatientEntry → AssessmentForm → ReviewSubmit    │
│         → ReportPreview → Scanner → Comparative                 │
│  Tab:  Home  |  History  |  Profile                              │
├─────────────────────────────────────────────────────────────────┤
│                          STATE / STORE                          │
│   Zustand store (patient, current session, tool selections,      │
│   answers, config)  +  persisted cross-session data             │
├─────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                                │
│   expo-sqlite (offline-first)  + JSON blobs for assessment       │
│   definitions & results  + file storage for generated PDFs       │
├─────────────────────────────────────────────────────────────────┤
│                         CORE SERVICES                            │
│   Assessment Engine  |  Scoring/Analytics  |  PDF Generator      │
│   Email Dispatcher  |  QR codegen/scan  |  Comparison Engine     │
├─────────────────────────────────────────────────────────────────┤
│                          NATIVE / EXPO MODULES                   │
│   expo-print (PDF)  |  react-native-svg + chart-kit (charts)     │
│   expo-camera (QR scan)  |  react-native-qrcode-svg (generate)   │
│   react-native-gesture-handler + reanimated (slide-to-submit)    │
└─────────────────────────────────────────────────────────────────┘
```

### Key design principles
- **Local-first, offline-capable.** Clinical data should not depend on a live
  server. Store everything on-device in SQLite; email dispatch via the device
  mail client (or an optional server endpoint) is most reliable.
- **Session = immutable snapshot.** Every assessment session captures the full
  set of answers as a JSON blob, so historical comparisons are exact and never
  corrupted by later edits.
- **QR = encoded session payload.** The printed/saved QR contains a small payload
  (session UUID + lookup token). Scanning resolves the local record — no
  internet required.

---

## 2. Recommended Tech Stack

| Concern              | Library                                   | Why |
|----------------------|-------------------------------------------|-----|
| Framework            | Expo (SDK 51+/53)                          | One codebase → iOS + Android |
| Navigation           | `@react-navigation/native` + native-stack + bottom-tabs | Standard, predictable |
| State                | `zustand` (+ persist middleware)           | Lightweight, flexible for forms |
| Local DB             | `expo-sqlite`                              | Structured sessions & tools |
| Files / PDFs         | `expo-file-system` + `expo-print`         | Print HTML → PDF with inline SVG charts |
| Charts               | `react-native-svg` + `react-native-chart-kit` | Native-drawn graphs |
| QR generate          | `react-native-qrcode-svg`                 | SVG QR embed in PDF |
| QR scan              | `expo-camera` (barcode)                    | Cross-platform scanning |
| Gestures             | `react-native-gesture-handler` + `react-native-reanimated` | Smooth "Slide to Submit" |
| PDF preview          | `react-native-pdf`                        | In-app report preview |
| Icons                | `@expo/vector-icons`                       | QR, mail, download, settings |
**Recommended scaffold command**
```bash
npx create-expo-app@latest cat --template blank-typescript
cd cat
npx expo install @react-navigation/native react-native-screens react-native-safe-area-context \
  expo-sqlite expo-camera expo-print expo-file-system expo-sharing \
  react-native-svg react-native-gesture-handler react-native-reanimated react-native-pdf
npm i @react-navigation/native-stack @react-navigation/bottom-tabs zustand \
  react-native-qrcode-svg react-native-chart-kit
```
Enable Reanimated in `babel.config.js` (add `react-native-reanimated/plugin` to plugins).

---

## 3. Project Folder Structure

```
cat/
  src/
    components/    # Button, Pill, ToolModal, SlideToSubmit, ScoreChip
    screens/       # Splash, PatientEntry, AssessmentForm, ReviewSubmit,
                   # ReportPreview, Scanner, Comparative, Profile, History
    navigation/    # RootStack.tsx, RootTabs.tsx
    store/         # zustand slices (session, toolsStore, settings)
    db/            # sqlite init, repo queries, migrations
    core/          # scoring/analytics + comparison engine
    services/      # pdf.ts, email.ts, qr.ts
    types/         # shared TS types
    theme/         # colors, spacing, typography (design tokens)
    assets/        # logo, splash, icons
```

---

## 4. Data Model (source of truth)

### Tables (`expo-sqlite`)
```
patients        id TEXT PK, name TEXT, created_at INTEGER
sessions        id TEXT PK, patient_id TEXT FK, created_at TEXT, is_comparison INTEGER
tools           id TEXT PK, title TEXT, config_json TEXT            -- question schema
session_tools   session_id FK, tool_id FK, order INTEGER, answers_json TEXT,
                score REAL, raw_score REAL
settings        key TEXT PK, value TEXT                             -- recipient emails
```

### TypeScript core types
```ts
type Option = { value: string; label: string; score: number }
type QuestionDef = {
  id: string; prompt: string
  type: 'single-select' | 'multiselect' | 'rating' | 'text' | 'numeric'
  options?: Option[]; min?: number; max?: number; required?: boolean
}
type ToolDef = { id: string; name: string; shortName: string; questions: QuestionDef[]; maxScore: number }
type Answer = { questionId: string; value: string | number | string[] | null }
type ToolResult = { toolId: string; answers: Answer[]; score: number }
type Session = { id: string; patientId: string; toolResults: ToolResult[]; createdAt: number }
type Settings = { defaultEmails: string[]; practitionerName?: string }
```

**Tool config** lives as JSON (seeded or user-authored). The form screen renders
directly from the schema — one engine, any tool. This drives "Add Assessment Tool".

---

## 5. Navigation & Screen Map

```
Stack (root):
  Splash        →(auto)→ PatientEntry
  PatientEntry  →(Next)→ AssessmentForm | (QR)→ Scanner
  AssessmentForm →(Add Another | Submit)→ ReviewSubmit
  ReviewSubmit  →(slide)→ ReportPreview
  ReportPreview →(Email/Download) · (compare)→ Scanner
  Scanner       →payload→ Comparative | PatientEntry
Tabs (bottom):  Home | History | Profile
```

- The **QR scanner button** lives in headers of PatientEntry & AssessmentForm.
- Scan before submission → seeds current session with historical data.
- Scan after submission → opens Comparative instantly.

---

## 6. Screen-by-Screen Implementation

### 6.1 Splash / Launch
- Logo + subtle progress indicator (`Animated`/`Reanimated` loop).
- On mount: open DB, seed default tool configs, read settings.
- Auto-navigate to Patient after ~1.2s (or resume an undone session).

### 6.2 Patient Entry
- Top bar with QR Scanner icon (`headerRight`).
- `TextInput` for name (large font, maxLength ~60).
- "Next" → upsert patient, create `session.id = uuid()`.
- Secondary "Load by QR scan" link → Scanner.

### 6.3 Assessment Form (the engine)
- Header: tool dropdown (modal listing all tools); selecting appends a partition.
- Step indicator + card question components.
- Controls:
  - single-select → large pill group (touch ≥48px)
  - rating → n-circle scale
  - numeric → stepper + input
  - text → single minimal field
- Auto-save: answer change → zustand + debounced write to session.
- Footer: **"Add Another Assessment Tool"** (reopen modal) · **"Review & Submit"**.

### 6.4 Review & Submit
- Summary list of tools + pill answers + score chips.
- "Add Tool" reopens the toolbar modal.
- **"Slide to Submit"**: Reanimated horizontal slider needing a full drag;
### 6.5 Report Preview / Actions
- `react-native-pdf` renders the generated file.
- Buttons: **Send Email** (recipients from settings.defaultEmails), **Download PDF**
  (`expo-file-system` → `documentDirectory`, share via `expo-sharing`).

### 6.6 Scanner
- `expo-camera` barcode scanning for QR → decode `cat://s/{id}` → SQLite lookup →
  route (seed current session or open Comparative).

### 6.7 Comparative Mode (scan-triggered)
- Load historical scanned session + current/unsaved session.
- Per tool: `Δ score`, `% change`, trend arrows; build Comparative PDF with
  baseline-vs-current charts. Rendered inside ReportPreview.

### 6.8 Profile / Settings
- Tag-input list of default recipient emails; practitioner name/signature line.
- Persist to settings table; show "Saved" toast immediately on save.

---

## 7. PDF Generation & Analytics Logic

Use **`expo-print`**: build an HTML string, embed SVG (charts + QR), print to a
PDF, save to file. Avoids native chart/PDF extension divergence.

### Page 1 – Analytical Insights
- Header: patient name, date, session id; **QR top-right** (session payload).
- SVG bar charts — baseline vs current.
- Summary KPI row (Total / Average / Highest-risk tool).
- Risk badge (score-threshold rules, configurable).

### Page 2+ – Detailed Tool Results
- Each tool: title, score, itemized question→answer rows.

### Comparative PDF (scan-triggered)
- Additional section: per-tool table `Previous | Current | Δ | % change | Trend`.
- Auto-generated insight blurb from the largest-delta tool.

**Analytics rules (configurable)**
- Normalize: each tool maps raw score to a 0–100% ratio.
- Risk level from tool threshold rules.
- Trend = current − baseline; flag if |Δ| > threshold.

---

## 8. QR Strategy

- **Payload**: `cat://sess/{sessionId}` (compact, stable).
- **Generate**: react-native-qrcode-svg → SVG string embedded in expo-print HTML.
- **Scan**: expo-camera barCodeScanner → onScanned → parse URL → resolve session.
- Same payload rule on all PDFs → one source for comparisons.

---

## 9. Email Dispatch

Two tiers:
- **A) Device fallback** — save PDF then `Linking.openURL('mailto:…&subject=…')`
  with an attached/encoded hint. Simple, offline-friendly, no backend.
- **B) SMTP via tiny backend** — an Edge/Node function (Resend/SendGrid) that
  receives PDF bytes and dispatches to all recipients. Recommended for reliable
  multi-recipient dispatch.
Recipients come from Profile settings.

---

## 10. Step-by-Step Build Instructions

> Work through the steps **in order**. Each step ends with a **Verify** note telling
> you exactly what to test before moving on. Commit to git after every green step.
>
> Quick command reference
> - Start dev server: `npx expo start` (then press `i` for iOS sim, `a` for Android emu)
> - Native builds: `npx expo run:ios` / `npx expo run:android`
> - Type-check: `npx tsc --noEmit`
> - Tests: `npm test`

### Step 1 — Scaffold a new Expo (TypeScript) project

**Goal:** a launchable iOS + Android app skeleton.

```bash
# root of /workspaces/cat (empty dir)
npx create-expo-app@latest . --template blank-typescript
npm install
```

Install the libraries we'll use (Expo picks compatible native versions for installable
packages):

```bash
npx expo install @react-navigation/native react-native-screens react-native-safe-area-context \
  expo-sqlite expo-camera expo-print expo-file-system expo-sharing \
  react-native-svg react-native-gesture-handler react-native-reanimated react-native-pdf

npm install @react-navigation/native-stack @react-navigation/bottom-tabs \
  zustand react-native-qrcode-svg react-native-chart-kit @expo/vector-icons
```

Create the source folder structure:

```
src/
  components/  screens/  navigation/  store/
  db/  core/  services/  types/  theme/  assets/
```

**Enable Reanimated** — edit `babel.config.js` so `react-native-reanimated/plugin`
is the **last** entry in `plugins`, otherwise the animation plugin errors:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // must be last
  };
};
```

**Verify:** `npx expo start` boots with no red screen; `npx tsc --noEmit` passes.

---

### Step 2 — Theme (design tokens) + Navigation shell

**Goal:** consistent styling base and working navigation to stub screens.

**Theme — `src/theme/index.ts`:**
```ts
export const colors = {
  primary: '#2B6CBF', primaryDark: '#1F4E8A', background: '#F6F8FB',
  surface: '#FFFFFF', text: '#10203A', textMuted: '#5B6B84',
  success: '#2E9E6B', warning: '#E8A33D', danger: '#D9534F',
};
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 12, lg: 20 };
export const touch = { min: 48 };         // >= 48px touch targets (PRD)
export const typography = { h1: 28, h2: 22, body: 16, caption: 13 };
```

**Navigation — create stub screens first:**
```
src/screens/Splash.tsx
src/screens/PatientEntry.tsx
src/screens/AssessmentForm.tsx
src/screens/ReviewSubmit.tsx
src/screens/ReportPreview.tsx
src/screens/Scanner.tsx
src/screens/Comparative.tsx
src/screens/History.tsx
src/screens/Profile.tsx      // (inside Tabs)
src/screens/Home.tsx
```

**`src/navigation/RootStack.tsx`:**
```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
const Stack = createNativeStackNavigator<RootStackParamList>();

export type RootStackParamList = {
  Splash: undefined;
  Patient: undefined;
  Assessment: undefined;
  Review: undefined;
  Report: { sessionId: string };
  Scanner: undefined;
  Comparative: { sessionId: string };
};

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash">
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Patient" component={PatientEntryScreen} />
        <Stack.Screen name="Assessment" component={AssessmentFormScreen} />
        <Stack.Screen name="Review" component={ReviewSubmitScreen} />
        <Stack.Screen name="Report" component={ReportPreviewScreen} />
        <Stack.Screen name="Scanner" component={ScannerScreen} />
        <Stack.Screen name="Comparative" component={ComparativeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

Set each stub screen's `options={{ headerTitle: '…' }}` so you can tell them apart.
Wrap the app in `<SafeAreaProvider>` in `App.tsx`/`_layout.tsx`.

**Verify:** every route opens from its stub; tab bar works; colors applied on a test
screen; `npx tsc --noEmit` clean.

---

### Step 3 — Types + SQLite data layer

**Goal:** typed tables and repository functions for patients, sessions, tools,
session results, and settings. Create these files:

```
src/types/index.ts
src/db/database.ts       // open + migrate
src/db/tools.ts
src/db/patients.ts
src/db/sessions.ts
src/db/settings.ts
```

**`src/types/index.ts`:**
```ts
export type Option = { value: string; label: string; score: number };
export type QuestionDef = {
  id: string; prompt: string;
  type: 'single-select' | 'multiselect' | 'rating' | 'numeric' | 'text';
  options?: Option[]; min?: number; max?: number; required?: boolean;
};
export type ToolDef = { id: string; name: string; shortName: string;
  questions: QuestionDef[]; maxScore: number };
export type Answer = { questionId: string; value: string | number | string[] | null };
export type ToolResult = { toolId: string; answers: Answer[]; score: number };
export type Session = { id: string; patientId: string;
  toolResults: ToolResult[]; createdAt: number };
export type Patient = { id: string; name: string; createdAt: number };
export type Settings = { defaultEmails: string[]; practitionerName?: string };
```

**`src/db/database.ts`:** (schema + migration)
```ts
import * as SQLite from 'expo-sqlite';
const db = SQLite.openDatabaseSync('cat.db');

export function openDatabase() {
  db.execSync(`PRAGMA user_version = 1`);
  db.execSync(`
    CREATE TABLE IF NOT EXISTS patients(
      id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER);
    CREATE TABLE IF NOT EXISTS sessions(
      id TEXT PRIMARY KEY, patient_id TEXT NOT NULL,
      created_at INTEGER, is_comparison INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS tools(
      id TEXT PRIMARY KEY, name TEXT NOT NULL, config_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS session_tools(
      session_id TEXT NOT NULL, tool_id TEXT NOT NULL, ord INTEGER,
      answers_json TEXT NOT NULL, score REAL DEFAULT 0,
      PRIMARY KEY(session_id, tool_id));
    CREATE TABLE IF NOT EXISTS settings(
      key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  return db;
}
```
> Wrap both `execSync` calls in try/catch and keep a `schemaVersion` variable plus a
> `PRAGMA user_version` guard when you add later migrations.

**Seeding tools — `src/db/tools.ts`:** insert two schemas (e.g. PHQ-9 and GAD-7)
whose `config_json` holds `{ questions: QuestionDef[], maxScore }`. Seed **only when**
the tools table is empty:

```ts
export function seedTools() {
  const row = db.getFirstSync<{ c: number }>('SELECT count(*) c FROM tools');
  if (row!.c > 0) return;
  for (const t of [makePhq9(), makeGad7()]) insertTool(t);
}

**Repository pattern — `src/db/sessions.ts`:**
```ts
export function createSession(patientId: string): Session {
  const id = crypto.randomUUID();
  db.runSync('INSERT INTO sessions (id, patient_id, created_at) VALUES (?,?,?)',
    [id, patientId, Date.now()]);
  return { id, patientId, toolResults: [], createdAt: Date.now() };
}
export function saveToolResult(sessionId: string, tr: ToolResult, order: number) {
  db.runSync(`INSERT OR REPLACE INTO session_tools
    (session_id, tool_id, ord, score, answers_json) VALUES (?,?,?,?,?)`,
    [sessionId, tr.toolId, order, tr.score, JSON.stringify(tr.answers)]);
}
```

**Verify:** app starts with no DB errors; seed runs once; you can write and read back
a session + tool result.

---

### Step 4 — Zustand stores

**`src/store/index.ts`** exporting slices `useSessionStore`, `useSettingsStore`,
`useToolsStore`:

```ts
export const useSessionStore = create<SessionState>((set) => ({
  patient: null,
  activeSession: null as Session | null,
  setPatient: (p) => set({ patient: p }),
  setSession: (s) => set({ activeSession: s }),
  addToolResult: (toolId, answers) => set((st) => {
    const tr: ToolResult = {
      toolId, answers, score: scoreToolResult(toolId, answers),
    };
    const toolResults = [...(st.activeSession?.toolResults ?? [])];
    const i = toolResults.findIndex((t) => t.toolId === toolId);
    if (i >= 0) toolResults[i] = tr; else toolResults.push(tr);
    return { activeSession: { ...st.activeSession!, toolResults } };
  }),
}));

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { defaultEmails: [] },
  setSettings: (s) => set({ settings: s }),
}));

export const useToolsStore = create<ToolsState>((set) => ({
  tools: [],
  loadTools: async () => set({ tools: getTools() }), // src/db/tools.ts
}));
```

Load `useToolsStore.loadTools()` and the settings store on the Splash screen before
navigating onward. Keep the **DB as the source of truth**; stores are the in-memory
working copy that screens render from.

**Verify:** after `loadTools()`, tools appear in state; calling `addToolResult`
updates `activeSession.toolResults` and persists via `saveToolResult()`.

---

### Step 5 — Schema-driven Assessment Form and Patient Entry

**Patient Entry — `src/screens/PatientEntry.tsx`:**
```tsx
export default function PatientEntry({ navigation }) {
  const [name, setName] = useState('');
  const setPatient = useSessionStore((s) => s.setPatient);
  const setSession = useSessionStore((s) => s.setSession);

  const startSession = () => {
    const patient = upsertPatient(name.trim());      // db/patients.ts
    setPatient(patient);
    setSession(createSession(patient.id));           // db/sessions.ts
    navigation.navigate('Assessment');
  };

  return (
    <View style={s.container}>
      <TextInput style={s.input} value={name} onChangeText={setName}
        maxLength={60} placeholder="Patient full name" autoCapitalize="words" />
      <PrimaryButton title="Next" onPress={startSession}
        disabled={name.trim().length === 0} />
      <LinkButton onPress={() => navigation.navigate('Scanner')}
        icon="qrcode">Load by QR scan</LinkButton>
    </View>
  );
}
```

Expose the persistent **QR header icon** from PatientEntry and AssessmentForm:
```tsx
navigation.setOptions({
  headerRight: () => (
    <Pressable onPress={() => navigation.navigate('Scanner')}
               hitSlop={8} accessibilityLabel="Scan QR">
      <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
    </Pressable>
  ),
});
```

**Assessment Form engine — `src/screens/AssessmentForm.tsx`:** render each
`ToolResult` in the active session against its `ToolDef`. A **ToolSelector** modal
lists all tools (`useToolsStore`); picking one appends a blank `ToolResult`. Render
one control per question:

```tsx
function QuestionControl({ q, value, onChange }) {
  switch (q.type) {
    case 'single-select':
      return (
        <View style={s.pillRow}>
          {q.options!.map((o) => (
            <Pressable key={o.value} onPress={() => onChange(o.value)}
              style={[s.pill, value === o.value && s.pillSelected]}>
              <Text style={[s.pillText, value === o.value && s.pillTextSelected]}>
                {o.label}</Text>
            </Pressable>
          ))}
        </View>
      );
    case 'rating':
      return /* row of N Pressable circles, onChange(n) */
    case 'numeric':
      return /* stepper + / -  and a small TextInput */
    case 'multiselect':
      return /* toggle chips toggling array membership */
    default: // text
      return <TextInput onChangeText={onChange} defaultValue={value as string} />;
  }
}
```

On each change call `useSessionStore.addToolResult(toolId, answers)` — the store
already writes through to `session_tools`. Debounce the DB write (~400ms). Footer:
**"Add Another Assessment Tool"** (reopen modal) and **"Review & Submit"** (navigate
to `Review`).

**Verify:** you can add >1 tool in one session, answer every question type, kill &
reopen the app, and answers restore from `session_tools`.

---

### Step 6 — Review screen and Slide-to-Submit

**Goal:** summary of added tools with computed scores, plus a guarded "Slide to
Submit" gesture (PRD requirement to prevent accidental submissions).

**Scoring — `src/core/scoring.ts`:**
```ts
export function scoreToolResult(toolId: string, answers: Answer[]): number {
  // Load ToolDef, then sum the score of each selected option / numeric value.
  const def = getTool(toolId);
  let sum = 0;
  for (const a of answers) {
    const q = def.questions.find((x) => x.id === a.questionId);
    if (!q) continue;
    if (q.type === 'single-select' && typeof a.value === 'string') {
      sum += q.options!.find((o) => o.value === a.value)?.score ?? 0;
    } else if (q.type === 'rating' && typeof a.value === 'number') {
      sum += a.value;
    } else if (q.type === 'numeric' && typeof a.value === 'number') {
      sum += a.value;
    }
    // multiselect: sum scores of selected options; text: ignored.
  }
  return sum;
}
```

**Review screen — `src/screens/ReviewSubmit.tsx`:** map `activeSession.toolResults`
to a summary list (tool name, answer pills, score chip) and render the slider:

```tsx
export default function ReviewSubmit({ navigation }) {
  const activeSession = useSessionStore((s) => s.activeSession);
  const [slided, setSlided] = useState(false);

  const submit = async () => {
    if (slided) return;                       // idempotence guard
    setSlided(true);
    await finalizeSession(activeSession!.id); // mark completed in DB
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Toast.show('Assessment saved');
    navigation.replace('Report', { sessionId: activeSession!.id });
  };

  return (
    <View style={s.container}>
      {activeSession!.toolResults.map((tr) => <ToolSummary key={tr.toolId} tr={tr} />)}
      <Pressable onPress={() => openToolModal()}>+ Add Tool</Pressable>
      <SlideToSubmit onComplete={submit} />
    </View>
  );
}
```

**`src/components/SlideToSubmit.tsx`** (Reanimated): a track whose `translateX` is
driven by a pan gesture; if `translateX` reaches track width → `onComplete()`, else
animate back to `0` on release.

```tsx
export function SlideToSubmit({ onComplete }: { onComplete: () => void }) {
  const translateX = useSharedValue(0);
  const { width } = useWindowDimensions();
  const track = width - 48;                         // thumb space

  const gesture = Gesture.Pan()
    .onUpdate((e) => { translateX.value = clamp(e.translationX, 0, track); })
    .onEnd(() => {
      if (translateX.value >= track - 8) {          // reached the end
        runOnJS(onComplete)();
      }
      translateX.value = withTiming(0);             // snap back always
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[s.track, { width: track }]}>
        <Animated.View style={{ transform: [{ translateX }] }} />
        <Text>Slide to Submit ▸</Text>
      </Animated.View>
    </GestureDetector>
  );
}
```

> `submit()`'s `slided` flag + `navigation.replace` make a double-fire impossible.

**Verify:** partial drag snaps back with **no** submission; a full drag submits once
and navigates; haptic + toast confirmed.

---

### Step 7 — PDF generator and Report Preview

**Goal:** turn a session into an A4 PDF with analytics page (QR + summary + chart)
and detailed results pages, then preview/share it.

**`src/core/analytics.ts`:**
```ts
export function analyzeSession(session: Session, baseline?: Session) {
  const tools = session.toolResults.map((tr) => {
    const def = getTool(tr.toolId);
    const norm = def.maxScore > 0 ? tr.score / def.maxScore : 0;
    const prev = baseline?.toolResults.find((b) => b.toolId === tr.toolId);
    return {
      toolId: tr.toolId, name: def.name, score: tr.score, max: def.maxScore,
      normalized: norm, riskLevel: riskFor(def, norm),
      delta: prev ? tr.score - prev.score : undefined,
      pctChange: prev && prev.score !== 0
        ? ((tr.score - prev.score) / prev.score) * 100 : undefined,
    };
  });
  const avg = tools.length ? tools.reduce((a, t) => a + t.normalized, 0) / tools.length : 0;
  const highestRisk = tools.sort((a, b) => b.riskLevel.idx - a.riskLevel.idx)[0];
  return { tools, average: avg, highestRisk };
}
```

**`src/services/pdf.ts`:** build an HTML string and print it to a file.
```ts
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';

export async function generateReportPDF(session, opts = {}): Promise<{ uri: string }> {
  const a = analyze(session, opts.baseline);
  const html = `
    <html><body>
      <div class="page">
        <h1>${patientName}</h1>
        <p>${date} • Session ${session.id}</p>
        ${await qrImg(session.id)}
        ${summarySection(a)}
        ${barChartHtml(a)}      <!-- inline SVG, baseline vs current -->
      </div>
      ${session.toolResults.map((tr) => `<div class="page">${toolDetailHtml(tr)}</div>`).join('')}
    </body></html>`;
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const dest = `${FileSystem.documentDirectory}report-${session.id}.pdf`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return { uri: dest };
}
```
Add `<style>@page{size:A4;margin:18mm} .page{page-break-after:always}</style>`.

**Report Preview — `src/screens/ReportPreview.tsx`:** on mount call
`generateReportPDF`, show it with `react-native-pdf`, and render action buttons:
"Send Email" (`email.ts`, Step 11) and "Download PDF" (share via `expo-sharing`).

```tsx
import Pdf from 'react-native-pdf';
<Pdf source={{ uri: uri }} style={{ flex: 1 }} />
```

**Verify:** the PDF has page 1 analytics + a page per tool; "Download PDF" saves and
shares a valid file on both iOS and Android.

---

### Step 8 — Analytics and SVG bar chart

**Goal:** insights reused by the PDF and the in-app "Analytics" view.

**`src/core/analytics.ts`** (as written in Step 7) computes normalized scores,
average, highest-risk tool, and per-tool delta. `src/core/comparative.ts` is the
same idea but returns the full table shape for the Comparative screen (Step 10).

In-app Analytics — a `View` with `react-native-svg` bars:
```tsx
import Svg, { Rect, Line } from 'react-native-svg';
<View style={s.card}>
  <Text style={s.title}>Baseline vs Current</Text>
  <Svg height={140} width={320}>
    {tools.map((t, i) => (
      <>
        <Rect x={20 + i * 100} y={140 - (t.baseline ?? 0) * 100} width={30}
              height={(t.baseline ?? 0) * 100} fill={colors.textMuted} />
        <Rect x={60 + i * 100} y={140 - t.current * 100} width={30}
              height={t.current * 100} fill={colors.primary} />
        <Line x1={i * 100} x2={i * 100 + 120} y1={140} y2={140} stroke="#E3E8F0" />
        <Text x={i * 100 + 45} y={150}>{t.shortName}</Text>
      </>
    ))}
  </Svg>
</View>
```

Add a **risk badge** component mapping `riskLevel` → background `colors.success |
warning | danger` and label ("Low / Moderate / High").

**QR — `src/services/qr.ts`:**
```ts
import QRCode from 'react-native-qrcode-svg';
export const QR_PREFIX = 'cat://sess/';
export function sessionPayload(id: string) { return `${QR_PREFIX}${id}`; }
export function parsePayload(uri: string): string | null {
  const m = uri.match(new RegExp(`^${QR_PREFIX}([\\w-]+)$`));
  return m ? m[1] : null;
}
```
In the PDF page 1 header embed the QR via a base64 image (see Step 7 `qrImg()`):
```tsx
const svgBase64 = await QRCode.toDataURL(sessionPayload(session.id));
// -> `<img src="data:image/png;base64,${svgBase64}" width="110"/>`
```

**Verify:** a QR renders on the PDF and in an on-screen preview; the payload decodes
with `parsePayload`.

---

### Step 9 — Scanner screen (expo-camera)

**`src/screens/Scanner.tsx`:**
```tsx
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function Scanner({ navigation }: ScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const activeSession = useSessionStore((s) => s.activeSession);
  const scanned = useRef(false);

  if (!permission) return <LoadingScreen/>;
  if (!permission.granted) {
    return <View><Text>Camera permission needed</Text>
      <Button title="Grant" onPress={requestPermission} /></View>;
  }

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned.current) return;                 // scan-once
    const id = parsePayload(data);
    if (!id) { Toast('Invalid QR'); return; }
    scanned.current = true;
    const past = getSession(id);                 // db/sessions.ts
    if (!past) { Toast('Session not found'); return; }
    if (activeSession?.toolResults.length) {
      navigation.navigate('Comparative', { pastId: id });
    } else {
      // load past into new comparison baseline
      useSessionStore((s) => s.setBaseline)(past);
      navigation.navigate('Assessment');
    }
  };

  return (
    <CameraView style={StyleSheet.absoluteFill} facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={handleScan} enableTorch={torch} />
  );
}
```
Add a camera permission explanation string to `app.json`:
`"ios": {"infoPlist": {"NSCameraUsageDescription": "Scan assessment QR codes"}}`.

**Verify:** scanning a printed PDF's QR finds its session; bad QR shows a toast;
scan-once prevents re-triggering.
---

### Step 10 — Comparative Engine, screen, and Comparative PDF

**`src/core/comparative.ts`:**
```ts
export function compareSessions(current: Session, previous: Session) {
  const risking = (norm: number) => norm > 0.7 ? 'high' : norm > 0.4 ? 'med' : 'low';
  return current.toolResults.map((c) => {
    const p = previous.toolResults.find((x) => x.toolId === c.toolId);
    const cN = normalize(c), pN = p ? normalize(p) : 0;
    const delta = p ? c.score - p.score : 0;
    const pct = p && p.score !== 0 ? (delta / p.score) * 100 : 0;
    return {
      toolId: c.toolId, previousScore: p?.score ?? 0, currentScore: c.score,
      delta, pctChange: pct, trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
      highlight: Math.abs(delta) >= (thresholds[c.toolId] ?? 2),
      currentRisk: risking(cN), previousRisk: p ? risking(pN) : 'low',
    };
  });
}
```

**Comparative screen — `src/screens/Comparative.tsx`:** pull the previous session
by `pastId`, the current from `useSessionStore`, and render a table per tool:
```
Tool      Previous | Current | Δ    | %      | Trend
PHQ-9       14        8      -6   -42.9%      ▼ improved
```
Color-code current risk (`Low/Moderate/High` badge) and add an auto insight line:
> *"Largest change: PHQ-9 improved by 6 points (−42.9%)."*

**Comparative PDF:** reuse `generateReportPDF` with `opts.baseline = previous`; the
analytics page already renders `Δ score` and `% change` bars. Add the table above as
a fourth section page when `opts.mode === 'comparative'`.

**Verify:** scanning a previous session's QR loads the comparison; deltas, %, and
trend arrows are correct.

---

### Step 11 — Profile settings and email dispatch

**`src/services/email.ts`** — offline-friendly dispatch:
```ts
export async function dispatchEmail({ recipients, subject, body, pdfUri }) {
  if (EMAIL_BACKEND_URL) {
    // Tier B: POST multipart to a small SMTP function (Resend/SendGrid etc.)
    await uploadAndSend(EMAIL_BACKEND_URL, pdfUri, recipients, subject, body);
    return { method: 'smtp' };
  }
  // Tier A: device mail client fallback
  const to = recipients.join(',');
  const url = `mailto:${to}?subject=${encodeURIComponent(subject)}
               &body=${encodeURIComponent(body)}\n\nPDF saved at: ${pdfUri}`;
  await Linking.openURL(url);
  return { method: 'mailto' };
}
```

**Profile screen — `src/screens/Profile.tsx`:** a chips/tag input for
`defaultEmails` (commit on Enter/comma/newline, removable chips), a practitioner
name field, both persisted to the `settings` table via `saveSetting('defaultEmails')`
and synced to `useSettingsStore`. Show a **"Saved"** toast (debounce ~800ms).

Wire the ReportPreview **"Send Email"** button:
```tsx
const recipients = useSettingsStore((s) => s.settings.defaultEmails);
const onEmail = async () => {
  if (!recipients.length) {
    Toast('Add a recipient in Profile first'); return;
  }
  await dispatchEmail({
    recipients, subject: `Assessment report — ${patientName}`,
    body: 'Attached: clinical assessment report.', pdfUri: pdf.uri,
  });
};
```

**Verify:** emails persist across restarts; empty-recipients path prompts; email
opens with recipients prefilled (or SMTP sends when configured).

---

### Step 12 — Polish, QA, and release prep

1. **Empty states** — `No tools configured`, `No history yet`, `Add a recipient
   email in Profile`.
2. **Toasts/errors** — wrap DB + camera permission + PDF operations in try/catch
   with `Toast.show(error.message)`.
3. **Double-submit guard** — verified in Step 6 (`slided` flag + `replace`).
4. **Header QR icon** — present on PatientEntry/AssessmentForm (Step 5) and on
   ReportPreview (for instant re-comparison).
5. **Tests** — add `jest-expo` + `@testing-library/react-native`; unit-test
   `scoring.ts`, `analytics.ts`, `comparative.ts`. Run `npx jest`.
6. **README** — run instructions (`npx expo start`), env key for `EMAIL_BACKEND_URL`,
   camera-permission notes.
7. **End-to-end demo walkthrough** — follow the PRD flow on a device and tick the
   QA checklist below.

**Verify:** full PRD flow works on iOS simulator AND Android emulator:
launch → patient → multiple tools → review → slide → PDF → email/download →
scan-back → comparative → settings.

---

## 11. Testing & QA Checklist

- [ ] Add multiple tools in one session; answers persist across app kills.
- [ ] Slide-to-submit: partial drag resets; full drag submits exactly once.
- [ ] PDF: page1 analytics + QR, page2 itemized; opens & shares on both OS.
- [ ] Scan a saved session → seeds comparison correctly.
- [ ] Comparative PDF shows correct Δ and trends.
- [ ] Email settings saved; empty defaults → handled with a toast/alert.
- [ ] Offline session + PDF generation with no network.
- [ ] Pass cold-start on both iOS simulator AND Android emulator.

---

## 12. Build & Release

- **iOS**: `npx expo prebuild` → Xcode archive → App Store Connect; add
  `NSCameraUsageDescription` (magnetometer, photo key probably needed).
- **Android**: `npx expo prebuild` → Gradle bundle → Play Console.
- **EAS Build**: `eas build` for CI-friendly iOS+Android archives.
- **Updates**: `expo-updates` for instant JS/schema pushes.