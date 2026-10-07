# Paper candidate — partial delivery, blocked
**Outcome: FAILED completion contract**, not a completed redesign. Design-only; no app implementation or deployment.

## Real artifact
[Open Paper candidate](https://app.paper.design/file/01M4B47GZ9SNSN67J51WB6K0FR/p-1-0)
- File: `01M4B47GZ9SNSN67J51WB6K0FR`; page: `p-1-0`.
- New file: **Chunks reading - Red book redesign - Paper candidate**. No user canvas overwritten.
- Native token set created; hash `791f1282`.
- Authored Library, Import/editor + phrase review, Setup, Live and Join content. Reserved Reader variants and sign-in artboard are incomplete.
- Paper reported: **“Weekly MCP limit reached. It resets in 2 days. Upgrade to Paper Pro to continue.”** Current-unit write stopped; subsequent get_children and get_jsx were blocked. No pending generation IDs or resubmitted generation.
- Mandatory `finish_working_on_nodes` succeeded with **OK**, despite quota blocking other calls.

## Screen inventory
| Artboard | ID | Dimensions | State |
|---|---|---|---|
| Library | 1-0 | 1440×900 | Authored |
| Import/editor + phrase review | 2-0 | 1440×900 | Authored |
| Private Setup | 3-0 | 1440×900 | Authored |
| Teacher Live | 4-0 | 1440×900 | Authored |
| Join | 5-0 | 390×844 | Authored |
| Reader Hold | 6-0 | 390×844 | Header/metadata only |
| Reader Erasing | 7-0 | 390×844 | Header only |
| Reader Blank | 8-0 | 390×844 | Header only |
| Reader Manual Show | 9-0 | 390×844 | Header only |
| Google sign-in | A-0 | 600×600 | Empty reserved board |

Screenshot tool outputs retained as `01-library.jpg`, `02-editor.jpg`, `03-setup.jpg`, `04-live.jpg` and their base64 copies. Join screenshot was returned during a script which subsequently failed, but not retained locally. **Image reading is disabled in this agent environment**: screenshots were requested, but appearance/contrast/clipping were not visually certified; tool return does not prove rendered correctness. No JSX or HTML export was obtained; get_jsx hit quota. No invented export links.

## Direction
Editorial book workbench: locked CHUNKS red #b91c1c, paper #f6f6f3, white work surfaces, ink #222220, phrase gold #f3e2ad. Red binding rule separates the reading field from compact controls. Literata reading and Inter tokenized UI; font-family availability was checked, but Paper basic-info reported System Sans-Serif for UI, so actual Inter resolution needs review.
Setup uses a 420px private settings column beside an 892px preview. Live separates a teacher-only source column, blank learner-display preview and a named presence drawer. Source and participant content are explicitly samples, never evidence of a shared backend.

## Acceptance matrix
“Pass” below means **authored design intent only**, never functional/runtime verification.
| Criterion | Result | Evidence / gap |
|---|---|---|
| English | Pass | Authored labels and original English fixture |
| Red/book | Pass intent; visual unverified | Native red/paper tokens and Literata |
| Mode independent of highlight | Pass | Separate Sentence/Paragraph selection and Highlight phrases On |
| Exact spans | Pass Setup intent; Reader unverified | Setup gold backgrounds only on Long story short and give it a shot; punctuation separate |
| Both timing policies | Pass | Hold 3 + Erase 1 = Total 4; alternative Hold 2 + final Erase 1 = Total 3 |
| Separate Show/Hide | Pass | Dedicated Live controls and persistent-state copy |
| Apply waits | Pass | Explicit Apply clears to blank; separate Play/Show |
| Link/name join | Pass | Display name and Join, no signup/admission/cap |
| Draft review | Pass | Agent-seeded Draft rows; Pending review candidates; disabled Publish after review |
| No learner playback | Pass authored controls | Reader states remain incomplete, not a full acceptance pass |
| Desktop/mobile | Fail | 1440 desktop authored; 390 Join authored; core mobile Reader missing |
| Actual remote IDs | Pass | File/page/artboard IDs above |
| Google sign-in | Fail artifact | Reserved board empty due quota |
| Motion state variants | Fail artifact | Reader Hold/Erasing/Blank/Manual not completed |
| Screenshot QA / responsive / a11y | Unverified | Cannot inspect images; no browser or keyboard tests |
| Shared backend / auth / build | Unverified | No implementation, tests or deployment requested/performed |

## Motion blueprint — specification, not working animation
- Default Hold then erase: elapsed 0–2999ms full text; 3000–3999ms erase; >=4000ms empty reading field. Alternative Erase within window: 0–1999ms hold; 2000–2999ms erase; >=3000ms blank.
- Setup-only Preview timing may replay privately. No automatic learner looping, no automatic advance.
- Reading cue: small red underline/caret across measured words, not a full-column highlight. Eraser: opaque paper mask follows measured rendered lines, highlights erased together with their text. Dissolve remains alternative effect; guide cue configured independently.
- Pause freezes elapsed phase and mask; Resume continues, not a fresh hold. Replay explicitly begins a new timed turn.
- Show persists without expiry until Hide or authoritative replacement. Hide clears timed or manual display.
- Resource/mode/highlight/timing/effect changes are staged until Apply; Apply replaces published reference/configuration and clears to waiting. Private unit navigation stays private until Play/Show.
- Late join derives the same absolute elapsed phase/mask, never grants a fresh timer; offline timed text still expires. Resize recomputes line geometry, not time.
- Reduced motion uses static/progress-based rendering on identical deadlines. Micro-interactions 150ms; drawer transition 250ms, no delay added to reading deadlines.
- Future control states: default white/ink; hover raised surface; active accent-soft; 3px focus ring token; disabled 50% with semantic disabled. Async actions need loading, actionable error and retry; dialogs need Escape/focus trap/return. These are documented, not fully drawn or tested.

## Existing component mapping
- `src/App.tsx`: replace local role-switch authority with approved teacher/learner entry boundaries; current useState is not a room service.
- `src/components/TeacherView.tsx`: reusable UI boundary for Setup + Live; split private selection/configuration from room display; separate Play/Replay, Pause/Resume and Show/Hide.
- `src/components/StudentView.tsx`: Reader boundary only; replace always-visible article and looping mask with authorized current-unit spans and absolute-phase visibility; no future article annotations.
- `src/types.ts`: future resource versions, reviewed UTF-16 offsets, explicit timing policies and manual-visible/waiting states; current fixed/dynamic union cannot represent the contract.
- `src/index.css`: locked native Paper tokens map to future approved app tokens; current forest/Lora/Vietnamese styling is obsolete.
- Library/editor/phrase review/Join/sign-in need new UI boundaries after approval, not source changes in this task.

## Deviations and next gate
Actual `assets/logo.png` not transferred; labelled logo slots, never a invented logo or local Windows src. Mobile screens are browser content, no fabricated OS/device chrome. Teacher mobile reflow, error-state boards, duration inputs, preview motion and exact 390 Reader wrapping are not verified. Some compact fields are static labels/control outlines in this candidate, not functional inputs.
Resume in the **same Paper file**, after quota reset or owner upgrade: inspect existing nodes first, complete the current-unit Reader states and compact Google sign-in, export JSX, visually inspect and correct overflow/fonts. User must approve the completed candidate before app implementation; do not treat this partial file as an approved design.
