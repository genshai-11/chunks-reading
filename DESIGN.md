---
name: Chunks Reading
defaultTheme: Minimal
availableThemes: [Minimal, Neobrutalism]
colors:
  surface: '#f9f9f6'
  surface-dim: '#dadad7'
  surface-bright: '#f9f9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f1'
  surface-container: '#eeeeeb'
  surface-container-high: '#e8e8e5'
  surface-container-highest: '#e2e3e0'
  on-surface: '#1a1c1b'
  on-surface-variant: '#5b403d'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f1f1ee'
  outline: '#8f6f6c'
  outline-variant: '#e4beb9'
  surface-tint: '#b91c1c'
  primary: '#93000b'
  on-primary: '#ffffff'
  primary-container: '#b91c1c'
  on-primary-container: '#ffcdc7'
  inverse-primary: '#ffb4ab'
  secondary: '#1d4ed8'
  on-secondary: '#ffffff'
  secondary-container: '#4069f2'
  on-secondary-container: '#fffbff'
  tertiary: '#00497f'
  on-tertiary: '#ffffff'
  tertiary-container: '#0061a6'
  on-tertiary-container: '#c1dbff'
  error: '#991b1b'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000b'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b7c4ff'
  on-secondary-fixed: '#001551'
  on-secondary-fixed-variant: '#0039b5'
  tertiary-fixed: '#d2e4ff'
  tertiary-fixed-dim: '#a0caff'
  on-tertiary-fixed: '#001c37'
  on-tertiary-fixed-variant: '#00497e'
  background: '#f9f9f6'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e0'
  paper: '#f6f6f3'
  card: '#ffffff'
  raised: '#edede8'
  ink: '#222220'
  muted: '#62625c'
  border: '#cfcfc9'
  control-border: '#73736c'
  accent: '#b91c1c'
  accent-soft: '#fef2f2'
  phrase: '#f3e2ad'
  phrase-text: '#222220'
  focus: '#1d4ed8'
  success: '#166534'
typography:
  headline-lg:
    fontFamily: Literata, Georgia, serif
    fontSize: 30px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Literata, Georgia, serif
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.2'
  reading-desktop:
    fontFamily: Literata, Georgia, serif
    fontSize: 36px
    fontWeight: '400'
    lineHeight: '1.7'
  reading-mobile:
    fontFamily: Literata, Georgia, serif
    fontSize: 26px
    fontWeight: '400'
    lineHeight: '1.7'
  body:
    fontFamily: Inter, sans-serif
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  small:
    fontFamily: Inter, sans-serif
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
  label:
    fontFamily: Inter, sans-serif
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 16px
  margin: 24px
  space-xs: 4px
  space-sm: 8px
  space-md: 16px
  space-lg: 24px
  space-xl: 32px
  space-2xl: 48px
---

# Chunks Reading — App Design Contract

## Brand & Style

This system supports two selectable themes for the same teacher-controlled English classroom: **Minimal** (the existing/default editorial theme) and **Neobrutalism** (bold, playful blocks with light borders). Add the new theme; never replace Minimal. Theme choice applies to both the teacher and the learners in that room. These are appearance variants, not different products or timing policies. This updated contract is not a claim that theme switching is implemented.

- **Minimal:** retain the existing cream-paper editorial layout, serif reading and restrained red accents.
- **Neobrutalism:** chunky rectangular controls, strong flat accent panels, bold UI headings, hard offset shadows and simple layouts. Borders remain **1px**, not thick black outlines on every element. The reader stays quiet and readable; no visual noise behind the text.
- **Target Audience:** Educators managing live reading sessions and learners focused on text comprehension.
- **Emotional Response:** Calm, focused, intellectual, and reliable.

## Colors

The YAML palette above remains the **Minimal** baseline; preserve its existing token values. Neobrutalism overrides semantic appearance tokens through a scoped theme selector, never a second component tree or a stylesheet that overwrites Minimal. Both retain CHUNKS red actions, high-contrast ink, warm exact-phrase highlights and a neutral reading canvas. Bright secondary panels stay outside the reading field.

## Typography

Minimal retains the existing literary serif headings and sans-serif controls. Neobrutalism uses bold Inter UI headings/labels; reading text remains Literata/Georgia in both themes. All headings are roman, not italic. Reading line-heights are tightly controlled between 1.65 and 1.8, with optimal measure width maintained around 55–70ch for teachers and narrower widths for learner focus.

## Layout & Spacing

A disciplined fixed-to-fluid editorial grid model governs the interface. Layout spacing scales predictably using a base-4 and base-8 rhythm.

- **Gutters & Margins:** Content containers maintain strict 16px internal grid gutters and 24px outer canvas margins on desktop, collapsing smoothly on mobile breakpoints (320px, 375px, 414px, 768px).
- **Adaptation:** Teacher multi-panel layouts automatically reflow into stacked drawers on smaller viewports, while learner typography scales down fluidly without hiding words or breaking touch targets below 44px.

## Elevation & Depth

Minimal retains subtle tonal layering and diffused shadows. Neobrutalism uses small hard offset shadows on selected teacher cards/actions, not blurred elevation or gradients. Learner reading canvas has no offset shadow; quiet text visibility outranks decoration.
- **Surfaces:** Distinct hierarchical tiers (`--color-paper`, `--color-card`, `--color-raised`) create natural depth against the background canvas.
- **Shadows:** Minimal keeps `--shadow-card: 0 4px 8px rgba(0,0,0,.05)`; Neobrutalism uses the hard-shadow variant below sparingly. Neither puts distracting shadows behind learner text.
- **Outlines:** Crisp, utilitarian borders (`--color-border`) delineate interactive containers and workbench panels, maintaining a clean architectural clarity.

## Shapes

Minimal retains component radii (`--radius-sm: 4px`, `--radius-md: 8px`). Neobrutalism uses `--radius-sm: 2px`, `--radius-md: 4px` for firmer edges, with 1px borders and the same >=44px touch targets.
- Elements favor subtle corner rounding to maintain a polished, bookish feel without leaning into overly playful or pill-heavy aesthetics.
- Interactive targets, buttons, and card containers strictly adhere to these radii to preserve structural rigor.

## Components

All components must reference locked semantic tokens, ensuring complete keyboard accessibility, visible 3.0px focus rings (`--color-focus`), and robust interactive states (default, hover, focus-visible, active, disabled).

- **Buttons:** Compact, crisp edges with minimum 44px touch heights. Primary actions use solid accent fills (`--color-accent`), while secondary actions use neutral borders and transparent backgrounds.
- **Input Fields:** Clear top-level labels, high-contrast borders (`--color-control-border`), inline validation messaging, and explicit error/success states.
- **Cards & Containers:** White cards on paper backgrounds, anchored by thin borders and soft shadows. Used for resource items, timing policy configurations, and teacher workbench panels.
- **Chips & Tags:** Used for AI suggestions and category filters. AI suggestions explicitly display a "Pending review" status alongside distinct approve/reject action triggers.
- **Checkboxes & Radios:** High-contrast control indicators with native keyboard behavior and clear focus states.
- **Reading Canvas & Phrase Highlights:** Inline warm highlights (`--color-phrase`) wrap around exact phrase spans exclusively—never full sentences or paragraphs.

## Theme variants and synchronized appearance

Stable IDs: `minimal` and `neobrutalism`; labels: Minimal and Neobrutalism. Minimal is the default for a new room and legacy rooms without a theme. Unknown values fall back safely in rendering; invalid teacher commands must be rejected rather than stored.

Teacher Settings has a labelled Theme selector with both options; learner has **no theme control**. A teacher's saved preference may set the next room's initial theme, but the current room's authoritative theme wins for every learner. LocalStorage alone is not multi-device propagation.

Implement theme updates through an authenticated owner-only room appearance command, atomic/idempotent with revision handling. Add `theme` to the narrow learner snapshot. No teacher email/profile, private draft/settings, participant roster, future text or control payload belongs in that snapshot. Late join/reload/reconnect takes the current theme. Change appearance without modifying status, startedAt, paused elapsed, unit, phrase approval or deadlines; do not dispatch Play/Replay/Apply, remount the reader or recreate room authority. Appearance is an explicit exception to staged reading-settings Apply.

Use a stable `data-theme` attribute/CSS variables on the app/reader shell. Do not key React trees by theme. Teacher preview can inherit the room theme; unpublished theme preview must not claim it is already broadcast.

Neobrutalism overrides (proposed token values, measure contrast before acceptance):

| Role | Neobrutalism value |
|---|---|
| surface / paper | #fff9ed / #fffdf6 |
| card / raised | #ffffff / #ffe8aa |
| ink / muted | #171717 / #525252 |
| accent / accent-soft | #b91c1c / #ffe3de |
| border / control-border | #bab5a9 / #666157; **1px width** |
| phrase / phrase-text | #ffe38a / #171717 |
| focus | #1d4ed8; visible 3px ring |
| panel-yellow / panel-blue / panel-lilac | #ffdf66 / #b8ddff / #dfccff, ink text |
| UI display / reading | Inter 800 / Literata 400 |
| radius-sm / radius-md | 2px / 4px |
| shadow-card | 3px 3px 0 #222220; sparse teacher use |
| shadow-reader | none |

Minimal continues using the YAML roles and existing 4px/8px radii and soft shadow. Bright panel colors do not replace focus/error/success semantics. No thick global outline, tilt, flashing/bouncing decoration or new reading typography that changes the teaching task.

## Learner-only phone-first surface

- Separate learner entry/route and shell; never render a Teacher/Learner role switch, Teacher Workbench, teacher sign-in, private Library/Setup/source, participant roster or infrastructure/debug footer there. Hiding UI is not authorization: server and rules must independently restrict access.
- Entry: valid active link -> display name -> Join. Keep teacher Google sign-in on the teacher entry surface, not inside the learner join screen. Invalid/ended/removed rooms must fail honestly.
- Reader essentials only: current approved unit, compact connection/waiting/paused/ended status, optionally own name and the published resource title. Room code appears once if useful. No duplicate branding, hosting/app IDs, counters or technical phase/proof notes crowding the canvas. Never use a teacher's private selection as learner title.
- Mobile first at 320/375/390/414px, then tablet/desktop. Use actual width and 100dvh/min-height with safe-area handling, 16px side gutters and readable serif text; allow vertical scroll for long paragraphs. Do not enforce a 520px-wide header or use overflow-x:clip/hidden to conceal inaccessible content.
- Both themes preserve wrapped text/highlight geometry, exact expiry and reduced-motion deadlines. Theme changes may trigger layout measurement, never restart elapsed time.

## Implementation precedence and token mapping

This user-supplied system replaces the previous visual contract. Antigravity may improve layout, hierarchy and micro-interactions directly in the existing app; Paper drafts are optional historical references, not approved pixel-perfect targets. Obsolete local Stitch artifacts were removed at the user's request; do not recreate or require them. Product behavior remains governed by the confirmed PRD/spec.

- Export the YAML palette as named CSS tokens. Semantic app tokens govern roles: reading canvas uses paper/ink, cards use card, primary actions use accent with white text, phrase spans use phrase/phrase-text, focus uses focus. The broader surface/Material palette is available for secondary roles; do not replace CHUNKS accent with primary merely because a library names its button "primary".
- In Minimal, the rounded scale and component radii have different names: `--radius-sm: 4px` maps to rounded DEFAULT; `--radius-md: 8px` maps to rounded lg. Keep rounded sm=2px and md=6px as scale tokens, not silent replacements for component semantic radii.
- Reading fonts, title fonts and UI fonts follow the YAML roles. Component styles reference tokens, not repeated literals. Motion-fast=150ms, motion-normal=250ms and target-touch=44px remain semantic tokens.
- Assess foreground/background contrast and focus boundaries in rendered states. Token availability or a design export is not an accessibility certificate.
- Use the actual repo asset `assets/logo.png` or its verified public copy; no "Logo slot" in the finished app and no Windows-path image src.

## Screen and interaction contract

- **Library:** compact searchable rows; category/topic/estimated CEFR/content-type/source and Draft/Published filters; custom categories. Clearly identify seeded Draft content. No invented metrics or grades.
- **Import/editor:** paste/TXT/supported URL, editable text and source metadata; exact phrase candidate review with approve/reject/edit/manual addition. Teacher reviews before Publish.
- **Teacher sign-in:** compact Continue with Google via Firebase Auth.
- **Setup:** independent Sentence/Paragraph and Highlight phrases; timing policy, labelled duration inputs and private live animation preview. Show Hold/Erase/Total, independent guide cue, eraser/dissolve effect. No decorative control clutter.
- **Teacher Live:** resource switcher and dynamic private unit navigation, teacher-only full source, clearly labelled learner preview, online count/name drawer. Separate Play/Replay, Pause/Resume, Show/Hide and End. Stage resource/mode/settings changes; Apply to room clears learners to blank waiting and does not auto-play.
- **Join:** shared link → display name → Join, no account registration or admission queue. Anyone with an active link may join; approximately 20 learners is a test target, not a hard cap.
- **Reader:** learner-only phone-first shell as above, room-synchronized Minimal/Neobrutalism, large exact text and minimal necessary status. No teacher navigation/controls, learner next/replay/reveal/theme controls, debug labels, infrastructure footer or fake sync proof.

## Timing and motion contract

- Default **Hold then erase**: full text for 3000ms; erasing during 3000–4000ms; blank at elapsed >=4000ms. Teacher may adjust hold and erase durations.
- Alternative **Erase within window**: total 3000ms, final 1000ms erase; full text through 2000ms, blank at elapsed >=3000ms. Show the effective durations explicitly.
- **Show** stays visible until teacher Hide; it is not a timed replay. Pause/Resume preserves phase/progress; Replay creates an explicit new turn. No automatic learner looping or automatic advance.
- Guide cue and eraser follow measured rendered lines/words without changing text layout. Erasing a whole vertical strip across all wrapped lines is not a line-following effect. Erase text and phrase background together; expiry must remove readable text, not leave a translucent mask.
- Late join/reload/reconnect uses the room's current phase/mask; resize recalculates geometry without restarting time. Reduced motion preserves policy-specific deadlines.

## States, responsive behavior and acceptance

All interactive controls define default/hover/focus-visible/active/disabled. Async controls add loading/error/success/retry. Inputs have associated labels and validation. Dialogs support Escape, focus trap and focus return. Sample/mock states are clearly labelled and never presented as a working backend.

Verify 320/375/390/414/768/1440 widths without body overflow or clipped reading text. A 390px fixed canvas inside a padded desktop shell is not a mobile-responsive reader. Teacher panels stack or become accessible drawers. Long names/titles wrap, control targets remain >=44px, and learner chrome stays minimal.

Acceptance evidence: real logo, English UI/content, both selectable themes synchronized across separate teacher/learner contexts without playback restart, no teacher chrome/data in learner DOM/snapshot, phone-first reflow, exact approved spans, both timing policies, manual Show/Hide, staged Apply, keyboard/contrast/reduced-motion and actual browser/API/data tests. Report unverified checks explicitly. No marketing hero, fake device/browser frames, lexical heatmap, grading UI or unproven training-effect claims.
