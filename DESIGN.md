# Uni-Inside Studio — CMS Design System

> **Status:** design direction / implementation guide (not a claim that existing pages already comply)  
> **Scope:** internal CMS UI, UX, and future content-management workflows.  
> **Visual inspiration:** Duolingo's approachable, bold, outlined, tactile interface; **identity remains Uni-Inside Studio's**.  
> **Owner of product/field decisions:** Uni-Inside Studio product lead.  
> **Last reviewed:** 2026-10-21.

## 1. North star: welcoming, confident, and easy for first-time editors

The CMS serves both experienced members and newly onboarded junior teammates. A new editor should be able to create a product, service, or article without knowing SEO terminology, database columns, HTTP, or technical publishing concepts.

Design for **clarity first, playful confidence second**:

- Present the next action clearly; avoid visually competing actions.
- Use friendly, straightforward **Bahasa Indonesia** for labels, help, feedback, and errors.
- Prefer recognition over recall: choices, previews, examples, and contextual hints.
- Use large, rounded, *outlined and tactile* controls rather than glassmorphism, blur, or soft floating shadows.
- Use warmth and personality, but not distraction: this is a work tool, not a game.
- Make all actions predictable: users should always know whether work is a draft, being saved, published, or failing.
- Progressive disclosure is acceptable for advanced choices **only if those choices are explicitly approved**. Never add back removed fields just to match the database.

### Decision hierarchy

1. **Approved CMS form fields and workflows** determine what team members can edit.
2. Backend validation/API and the database support these approved fields (plus necessary invisible system metadata).
3. The public landing page renders only approved content fields for the intended card/detail placement.
4. Visual polish must never introduce unapproved fields, mutate saved data, or silently change publishing behavior.

An existing database column is **not** permission to add a CMS input or a public-facing display.

## 2. Inspiration, not imitation

The accompanying Duolingo reference screenshots demonstrate four complementary patterns:

| Reference | Learn from it | Adapt for Uni-Inside |
| --- | --- | --- |
| Light landing/onboarding | Strong negative space, concise headline, clear primary/secondary actions | Calm CMS start states, single focal action, bright paper surfaces |
| Dark sign-in | Large rounded inputs, strong button hierarchy, restrained iconography | Friendly CMS login with high-contrast dark treatment when appropriate |
| Dark multi-choice flow | Bold outlines, large selectable cards, progress indication, unmistakable disabled state | Media selection, categories, multi-step tasks **only if warranted** |
| Mobile lesson screen | Single-column flow, generous touch targets, easy-to-scan choices | Responsive form editing, media picking, sticky actions without obstruction |

**Important correction:** Duolingo-like buttons often appear raised because of a **hard-edged darker bottom layer/border**. Our intended approach is **no fuzzy drop shadows and no blur**, but a small crisp 2–4px pressed-depth effect on important buttons or selectable cards. Never confuse this decorative depth with a keyboard focus indicator.

**Brand independence / asset policy:**
- Do **not** copy Duo the owl, Duolingo characters, trademarked logos, Duolingo screens, wording, or proprietary illustrations.
- Do **not** use the proprietary Feather typeface or brand assets without a license.
- Use Uni-Inside logos, color identity, original iconography/illustrations, and content. The UI may echo *principles* of friendliness and feedback, not Duolingo's distinct brand.
- Avoid literal copying of full layouts, pixel-for-pixel screens, or proprietary design assets.

## 3. Design personality

**Keywords:** welcoming, rounded, bold, organized, bright, useful, memorable, responsive.

**Visual character:**
- Clean light workspaces with **Uni-Inside yellow** as the main accent, charcoal text, and white cards.
- An optional dark surface for the sidebar/login (existing CMS already has a charcoal navigation sidebar). Do not implement whole-app dark mode unless requested.
- Crisp strokes, visibly separated choices, rounded corners, playful but controlled hierarchy.
- Space is a design element: avoid wrapping every group with unnecessary nested panels.
- Use illustration only to explain an empty state or clarify a task; avoid decorative noise during long editing sessions.
- Do not add streaks, XP, leaderboards, countdown timers, confetti, or gamification mechanics to administrative workflows unless independently requested and justified.

## 4. Tokens and implementation direction

**The values below are proposed design targets.** Existing CSS variables in \`src/admin/admin.css\` are the starting point, not something to replace globally in a single commit.

### 4.1 Color

Current CMS tokens observed in \`src/admin/admin.css\`:

| Role | Existing token / current value | Guidance |
| --- | --- | --- |
| Accent / primary | \`--yellow: #FFD52D\` | Primary button, selected navigation, active step |
| Main text | \`--ink: #202121\` | Headings, labels, body text |
| App background | \`--paper: #F5F5F2\` | Workspace canvas |
| Card/surface | \`--surface: #FFFFFF\` | Inputs, cards, modals |
| Border | \`--line: #E4E4DF\` | Low-emphasis separators |
| Strong border | \`--line-strong: #CFD0CA\` | Inputs and actionable outlines |
| Muted text | \`--muted: #62655F\` | Hints; confirm contrast in context |
| Success | \`--success: #236A43\` | Saved/published confirmations |
| Destructive | \`--danger: #A5322D\` | Delete/error actions |

Suggested additive tokens (names/values illustrative; evaluate contrast in the actual component):

\`\`\`css
.cms {
  --ui-outline: #BCC1B8;
  --ui-outline-strong: #737970;
  --ui-yellow-depth: #C9A10B;
  --ui-canvas-dark: #172227;
  --ui-dark-surface: #213139;
  --ui-dark-outline: #435862;
  --ui-focus: #916A00;
  --ui-step-size: 8px;
  --ui-press-depth: 3px;
}
\`\`\`

Rules:
- Reserve yellow for navigation emphasis and primary actions. Avoid filling every card yellow.
- A success state must combine semantic **text + icon + color**; error states likewise.
- Distinguish disabled state from merely muted/inactive appearance.
- Accessible contrast outranks visual fidelity. Light yellow **requires dark text** in most ordinary buttons.
- Dark variants should use carefully tuned neutrals with readable light text, not arbitrary inverted styles.
- Do not introduce Duolingo green as Uni-Inside's default brand color.

### 4.2 Type and content hierarchy

The current CMS declares Inter/Poppins/system UI fallbacks. Keep that stack unless a separately approved typography task changes it. Friendly rounded shapes matter more than purchasing/copying a brand font. A licensed/open substitute such as Nunito may be **evaluated later**, not silently installed.

| Text role | Suggested desktop | Suggested mobile | Intent |
| --- | --- | --- | --- |
| Page heading (H1) | 28–36px / 750–800 | 25–30px | Short, readable page title |
| Section heading (H2) | 18–22px / 700–800 | 18–20px | Clear form section division |
| Field label | 14–15px / 600–700 | 14–15px | Legible without squinting |
| Body/input | 14–16px / 400–600 | 16px inputs | Comfortable reading; mobile zoom prevention |
| Helper/error text | 13–14px / 400–600 | 13–14px | Never tiny gray decoration |
| Primary button | 14–16px / 700–800 | 15–16px | Concise, action-oriented |

- Use sentence case in ordinary Indonesian UI copy (\`Simpan draf\`, \`Terbitkan produk\`), not all caps everywhere.
- Prefer line-height 1.4–1.6 for explanatory text; tighter only for short headings.
- Maximum paragraph width about 60–75 characters where practical.
- Labels remain visible when fields contain a value; placeholders **never replace labels**.
- Consistent language and terminology across all CMS pages.

### 4.3 Spacing and geometry

Work from the existing 4/8px spacing foundation:

\`\`\`text
4 / 8 / 12 / 16 / 24 / 32 / 40 / 48 px
\`\`\`

- Use a stable hierarchy: page header > section card > field group > hint.
- Desktop work area typically uses a main content column plus a 260–320px preview/actions sidebar **where useful**.
- Card radius: ~12–18px. Input radius: ~10–14px. Primary button radius: ~12–16px.
- Controls: aim for 44–52px height and generous clickable space; compact table actions may need an alternative accessible control.
- Use 2px outlines for clear selection, with a discreet hard-edged bottom depth on major buttons.
- Avoid arbitrary widths, cramped 10–11px labels, and visually uneven gutters.

## 5. Component patterns

### 5.1 Primary, secondary, destructive buttons

**Primary:** solid Uni-Inside yellow, dark text, rounded corners, crisp 2–4px lower color/border; on press the lower depth visually compresses. No glow, glass, or blurred box-shadow.

**Secondary:** white/neutral surface, strong charcoal/gray 2px outline and optionally the same crisp lower depth; should never compete with primary.

**Destructive:** outlined or solid red reserved for confirmed destructive actions; require clear confirmation and explanation of consequences.

**Disabled:** actual HTML \`disabled\` when not actionable, visibly unavailable, not only color-coded; explain why when useful.

Illustrative only (adapt to existing components and test visual states):

\`\`\`css
.cms-action-primary {
  min-height: 48px;
  border: 2px solid #C9A10B;
  border-bottom-width: 4px;
  border-radius: 14px;
  background: var(--yellow);
  color: var(--ink);
  font-weight: 750;
  transition: transform 140ms ease, border-bottom-width 140ms ease;
}
.cms-action-primary:active:not(:disabled) {
  transform: translateY(2px);
  border-bottom-width: 2px;
}
.cms-action-primary:focus-visible {
  outline: 3px solid var(--ui-focus);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .cms-action-primary { transition: none; }
}
\`\`\`

Do not mass-replace \`.cms-button\` across the application just to implement this example; coordinate a component-scoped rollout.

### 5.2 Inputs, selects, textareas and rich text

- Always show a clear, associated field label.
- Use rounded, visible borders (usually 1.5–2px) with a clear focus ring.
- Group related fields in sensible reading order; limit columns on narrow screens.
- Express required/optional state in plain language, especially when publishing differs from drafting.
- Help text should contain a useful example, not restate the label. E.g., \`Contoh: Paket dokumentasi acara\`.
- Validation belongs near the field **and** can be summarized near the save action; don't clear entered values after an error.
- Rich text toolbar: large, labeled buttons with active/pressed state; do not remove formatting support during visual work.
- Avoid overloading junior members with database field names, SEO jargon, or technical IDs.

### 5.3 Selectable tiles and media pickers

- Large enough to choose accurately, with clear neutral/hover/selected/disabled states.
- Selection = visible stroke + optional check icon + accessible state (\`aria-pressed\`, \`aria-selected\` as appropriate).
- Media slots: consistent proportions, dashed empty placeholders, descriptive actions (\`Tambah foto utama\`, \`Ganti gambar\`, \`Hapus foto\`).
- A selected photo needs edit/removal controls; maintain keyboard access and meaningful alt text.
- Drag-and-drop must have a non-drag alternative (move up/down or set as cover).
- Do not imply variant-photo persistence works if the backend/schema still rejects it.

### 5.4 Cards and hierarchy

- Use a white surface with a visible border or strong separation from the app canvas.
- Prefer crisp outlines over soft elevation; don't layer multiple shadows, gradients, and panels.
- Section title + one-sentence explanation may precede complex form sections.
- Keep preview useful: show exactly the fields represented on the approved public page; don't introduce forbidden fields into a preview.
- Avoid turning analytics, admin tables or audit logs into oversized gamified tiles. Density should follow task complexity.

### 5.5 Feedback, status, and loading

- Distinguish \`Memuat...\`, \`Menyimpan...\`, \`Draf tersimpan\`, \`Berhasil diterbitkan\`, and \`Gagal menyimpan\`.
- Provide actionable error recovery (\`Coba lagi\`, field-level correction) and preserve draft changes.
- Confirm destructive actions and navigation away from unsaved edits.
- Loading indicators must avoid layout shift and not block unrelated actions unnecessarily.
- Success feedback should be affirmative but restrained (not confetti for every autosave).
- Use a progress bar only for a real progress measure (upload/multi-step flow), not decorative fake progress.

## 6. UX writing for Indonesian CMS users

Default tone: **plain, supportive, concise, professional, slightly warm**.

| Avoid | Prefer |
| --- | --- |
| \`Submit resource\` | \`Simpan draf\` or \`Terbitkan produk\` |
| \`Invalid media_id\` | \`Pilih foto utama terlebih dahulu.\` |
| \`Constraint violation\` | \`Nama varian ini sudah digunakan.\` (only if true) |
| \`SEO metadata required\` | Auto-generate metadata if not user-approved as a field |
| \`Something went wrong\` | \`Konten belum tersimpan. Coba lagi.\` plus useful detail when available |

- Provide exact verbs for actions: \`Tambah\`, \`Simpan draf\`, \`Terbitkan\`, \`Batalkan\`.
- Label choices by meaning, not by internal enum names.
- Do not use guilt, urgency traps, fake scarcity, or pressure to publish.
- Do not hide error details needed to recover; also do not leak backend secrets or stack traces.

## 7. Form ↔ API ↔ public frontend agreement

This rule is **stronger than visual styling** and must be enforced in later integration work.

- Product lead defines approved fields for **Tambah** and **Edit**. Both must be coherent and equally understandable.
- The API may retain internal technical fields (IDs, slugs, status, timestamps, audit data) without showing them in a form.
- Publishing rules may need stricter validation than saving a draft; explain the difference.
- Public cards and detail routes display only fields approved for that surface. Remove legacy UI/routes that exist solely to expose disallowed content fields, after checking dependencies.
- New fields that are absent from Aiven schema require explicit review and a new additive SQL migration, not edits to applied migration \`001\`.
- Do not reset production content or change a form's payload as part of a visual-only task.
- Visual refinement work **must never modify** hosting config, backend credentials, or the production Render API override.

## 8. Page-specific application guide

### Product creation and editing

Current targets: \`src/admin/pages/ProductCreatePage.tsx\`, \`src/admin/products/\`, product styles in \`src/admin/admin.css\`.

- Maintain primary + eight gallery slots, preview, feature rows, variants, price/stock controls, purchase destinations, and draft/publish functions unless a later specification explicitly changes them.
- Make variant rows legible and operable on narrow viewports without relying on tiny controls.
- Distinguish visual refinement from unfinished variant-photo database support.
- Use the shared visual language; do not force the exact same field layout as Service.

### Service creation and editing

Current targets: \`src/admin/pages/ServiceCreatePage.tsx\`, \`src/admin/pages/service-create.css\`.

- Preserve pricing, duration, scope, steps, CTA, and media data.
- Use sectioned layouts that explain what members need to prepare.
- Avoid weakening validations or hiding required fields to resemble a screenshot.

### Article creation and editing

Current targets: \`src/admin/pages/ArticleCreatePage.tsx\`, \`src/admin/pages/article-create.css\`.

- Preserve cover, category, content type, excerpt, rich text, optional media and author handling.
- Reading/preview experience should remain readable and distraction-free.
- Product and Service layouts are references for visual primitives **not a mandate for identical information architecture**.

### Shared CMS shell

Current targets: \`src/admin/layouts/CmsLayout.tsx\`, \`src/admin/admin.css\`.

- Maintain dark charcoal sidebar with clear yellow active item and readable text.
- Use consistent top bar, breadcrumbs, heading hierarchy, spacing and active/focus states.
- Standardize controls gradually; scope CSS carefully to avoid broad regressions.
- Login may use a calm dark variation; do not force the entire editor dark.
- Public landing page retains its own branded design unless a separate public-UI brief is approved.

## 9. Responsive behavior and accessibility

Minimum review widths: **375, 430, 768, 1024, 1280, 1440px**, plus a keyboard-only pass.

- Never create horizontal overflow at 320–375px for normal forms. A dense data table may scroll inside a clearly bounded container.
- Reflow desktop form + preview into one column; avoid sticky panels obstructing fields or the submit action.
- Aim for 44x44px pointer targets; WCAG 2.2 AA minimum is 24x24px unless an explicit exception applies.
- Keep contrast ratios >= 4.5:1 for normal text and >= 3:1 for large text; important non-text control/state boundaries >= 3:1.
- Provide unmistakable \`:focus-visible\` outline; do not remove keyboard focus styling in pursuit of a cleaner look.
- Keep semantic headings, native inputs, explicit labels, accessible dialogs and appropriately announced status.
- Meet reduced-motion preferences and avoid essential information communicated by animation alone.
- Test at 200% text zoom and for lengthy Indonesian content.
- Do not rely on icon or color alone to communicate selection, success, error, or draft/published state.

## 10. Rollout rules for Codex and human contributors

**Read this document before redesigning CMS pages.**

1. Read affected components, current CSS, backend contract, and approved field specification.
2. State whether the task is **visual-only**, **form-field change**, or **end-to-end content integration**; do not silently switch scopes.
3. Reuse existing tokens/components where possible. Prefer small, scoped CSS edits; no giant global overwrite.
4. Preserve every approved field and all functional semantics during visual-only work.
5. Check empty, filled, loading, validation, success, disabled, modal, keyboard, desktop and mobile states.
6. Run at least \`npm run lint\`, \`npm run test:config\`, and \`npm run build\` on relevant frontend code. Add targeted tests when editing behavior.
7. If screenshots or browser tooling are available, compare before/after; describe any visual checks not performed.
8. Never include proprietary Duolingo logos/art/fonts in the repository. No new dependencies just for aesthetics without approval.
9. Do **not** change production API routing: the frontend currently uses Render, database Aiven; Kroombox serves the frontend.
10. For tasks explicitly requesting repository delivery, commit and push the finished scoped changes to \`origin/main\` **without force push**, after synchronizing to the latest head; otherwise follow the user's stated Git workflow.
11. Avoid running concurrent CSS changes blindly. Check latest \`origin/main\` and do not overwrite in-progress Codex work.

### Visual acceptance checklist

- [ ] Page title, section headings and helper copy form a clear hierarchy.
- [ ] Uni-Inside yellow and charcoal remain the primary identity.
- [ ] Buttons look tactile through crisp outlines/bottom depth, not blur or heavy shadows.
- [ ] Inputs have clearly labeled, consistent padding and focus states.
- [ ] Touch and keyboard interactions work, including selected/disabled/error states.
- [ ] Layout works across desktop/tablet/mobile.
- [ ] Clear Indonesian copy and honest feedback.
- [ ] Approved CMS fields and payloads unchanged by styling-only changes.
- [ ] No runtime regressions and no global CSS damage to other CMS forms.
- [ ] Changes scoped, checks reported, and commit/branch identified.

## 11. Source references and provenance

**First-party inspiration (Duolingo):**
- Typography and substitution guidance: https://design.duolingo.com/identity/typography
- Imagery and illustration philosophy: https://design.duolingo.com/identity/imagery
- Evolution toward minimal, bright, rounded UI: https://blog.duolingo.com/shape-language-duolingos-art-style/
- UI craft, consistent typography, spacing, simplified navigation: https://blog.duolingo.com/core-tabs-redesign/
- Clear, concise brand writing: https://design.duolingo.com/writing/

**Accessibility references (W3C/WCAG):**
- WCAG 2.2: https://www.w3.org/TR/wcag/
- Target size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- Focus appearance: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance

**Project-specific references:**
- Existing CMS style tokens and components: \`src/admin/admin.css\`
- Product form: \`src/admin/pages/ProductCreatePage.tsx\`
- Service form and styles: \`src/admin/pages/ServiceCreatePage.tsx\`, \`src/admin/pages/service-create.css\`
- Article form and styles: \`src/admin/pages/ArticleCreatePage.tsx\`, \`src/admin/pages/article-create.css\`

This document is **an original Uni-Inside design brief informed by observation and public design principles**, not Duolingo's official UI specification. Token values and code examples are proposed guidance, **not claims** about Duolingo's exact implementation.
