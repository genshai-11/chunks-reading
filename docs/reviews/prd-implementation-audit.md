# PRD implementation audit — current main

Status: audit-complete; PRD-authority-confirmation-needed; implementation-partial
Scope: kiểm tra source theo lớp, traceability với PRD lịch sử và local tests; không sửa application code, không deploy hay ghi dữ liệu cloud.

## 1. PRD tìm thấy ở đâu?

Không có PRD trong working tree/main khi bắt đầu kiểm tra. Git history có `docs/PRD.md` và `specs/001-teacher-controlled-reading/spec.md` ở commit `78abf47c5ff99601d241369cb194656ff8a38c2d`, thuộc ref `origin/master`. `git merge-base --is-ancestor 78abf47 HEAD` trả exit 1: commit này **không phải ancestor của main hiện tại**. Ref remote-tracking có sẵn không đồng nghĩa repo còn cấu hình remote hoặc có thể fetch.

Đã lưu bản lịch sử nguyên văn để kiểm tra:

- [PRD snapshot](prd-audit-sources/PRD.78abf47.md)
- [Spec snapshot](prd-audit-sources/spec.78abf47.md)
- [Coverage report lịch sử](prd-audit-sources/coverage.78abf47.md)

Đây là archive, **không tự động trở thành product authority cho main**. Các liên kết bên trong archive giữ đường dẫn của nhánh gốc; một số tài liệu phụ thuộc không có trên main. Chủ project cần xác nhận PRD nào có hiệu lực, đặc biệt các yêu cầu mới khác với PRD này.

HEAD đổi từ `dc89d77` sang `c13b8151d19f295f4a1f6b5cbd785ccc7509637e` trong lúc audit do cập nhật bên ngoài. Các source đã đọc là working tree hiện tại, phần lớn nay được commit ở c13b815. Audit không thực hiện commit đó. Khi kết thúc audit HEAD là `5bbb97a`; commit mới này chỉ sửa `.github/workflows/ci-cd.yml`, không sửa application source. Deploy step có `continue-on-error: true`, nên CI xanh không chứng minh deploy thành công. Cần chạy lại acceptance checks nếu application code thay đổi tiếp.

**Kết luận:** main có nhiều chức năng classroom, nhưng **chưa triển khai đầy đủ PRD lịch sử và chưa có evidence đáp ứng release gates**. Test xanh hiện tại không đóng các khoảng trống security, publication, sync và learner isolation.

## 2. Quy ước đánh giá

- **Có code:** traced implementation tồn tại; không đồng nghĩa đã xác minh live.
- **Một phần:** có flow nhưng thiếu contract/edge cases.
- **Lệch:** source hoặc local probe mâu thuẫn yêu cầu rõ trong PRD.
- **Chưa có:** không thấy capability trong source/config hiện tại.
- **Chưa verify:** cần emulator, browser, OAuth hoặc multi-device/load evidence.

S1–S53 dưới đây là User Stories của spec lịch sử. PRD sections là nguồn yêu cầu product. Không chấm tỷ lệ hoàn thành tùy ý từ số component hoặc số test.

## 3. Layer review

| Lớp | Source chính | Đánh giá |
| --- | --- | --- |
| UI/routing | App, Navbar, TeacherDashboard, StudentView, editor/review components | Có teacher/learner flow; staged contract bị bypass, learner vẫn có teacher switch/footer, English-only và themes chưa đạt |
| Resource/publication | resourceService, ResourceEditorModal, PhraseEditorStudio | CRUD/import/review có code; không có frozen published-version storage; auto-publish và Published seed trái PRD |
| Room/presence services | roomService, StudentView | Snapshot realtime và commands có code; thiếu CAS/idempotency/clock offset; eviction bị lọc trước khi learner nhận |
| Pure domain/text/render | timingEngine, textSegmentation, phraseDetection, eraseEffects | Hai timing boundaries và dictionary fixture pass; stale span, AI occurrences và full-review precedence fail probes |
| Persistence/authorization | firebase.ts, types, firebase-blueprint, firestore.rules | Resource/room owner checks có; participant authorization/schema enforcement và narrow learner snapshot còn thiếu |
| API/deployment | apiHandlers, server, Vite config, Firebase config, CI | Có local API; URL fetch thiếu SSRF protection; Hosting không wiring API; chưa verify deployment |
| Tests/evidence | firestore.rules.test, eraseEffects.test, browser fixture | 27 existing tests pass; security simulator không phải Emulator; fixture không phải teacher–learner E2E |

## 4. Traceability matrix

| Story / PRD section | Capability | Kết luận | Evidence / gap |
| --- | --- | --- | --- |
| S1 / §2–4 | Google teacher sign-in | Có code; chưa verify OAuth | firebase.ts signInTeacherWithGoogle + App auth subscription; không thử production OAuth |
| S2 / §3 | Teacher resource isolation | Có rules; chưa verify enforcement | firestore.rules checks ownerId cho resource reads/writes; chưa chạy Emulator |
| S3 / §9 | Book-like workspace / supplied logo | Một phần | Serif reading + paper CSS có; Navbar dùng wordmark tự tạo, không thấy supplied logo asset; DESIGN.md không có trên main |
| S4 / §10.1 | English-only UI/content | Lệch | TeacherDashboard notices và PhraseReviewModal validation có tiếng Việt, ví dụ dòng 405, 422, 93–111 |
| S5–S7 / §4 | Search/filters/custom categories | Một phần | Search, category, level, status và custom category có; chưa thấy đầy đủ topic/source-type filters hay category CRUD riêng |
| S8–S12 / §2, §8 | Paste/TXT/URL/import preview/fallback | Một phần | ResourceEditorModal handlers có; URL API chưa có Hosting route và thiếu required SSRF checks |
| S13 / §4, §7 | Immutable published versions | Chưa đạt | saveReadingResource setDoc cùng resource ID; publish chỉ đổi status/version pointer; room không có frozen version reference |
| S14–S16 / §7 | Detection, review, manual spans, conflicts | Một phần | Dictionary pending candidates và approve/reject/manual có; AI chỉ dùng indexOf đầu tiên; renderer giữ stale offsets nếu phrase không tìm thấy; conflicts chưa có review contract đầy đủ |
| S17, S21 / §4 | Review-before-publish, Draft not presented | Lệch | TeacherDashboard handleOpenClassroom và PhraseEditorStudio launch tự publish draft; không có guard publication/review ở createClassroomRoom |
| S18–S20 / §2, §7 | Categorized Draft seed/idempotent/version-safe | Lệch | SEEDED_DEFAULT_RESOURCES có Published/Approved; seedTeacherLibraryIfEmpty match theo title, có overwrite Published data; không content hash/new Draft version/dry-run/readback contract |
| S22–S24 / §2, §5 | Shared room link + name join | Có code; chưa E2E | room codes, getRoom, registerParticipant và snapshot subscriptions; learner không gọi ensureStudentAuth; không thử hai contexts qua backend thật |
| S25–S26 / §3–5 | Online presence + teacher removal | Một phần; removal lỗi | Heartbeat 15s và filter 45s; removed records bị service loại trước khi StudentView kiểm tra self.isRemoved; rules cho peer update/delete |
| S27–S28 / §2 | Sentence/Paragraph + independent highlight | Có code; staging lệch | Fields/toggles độc lập; handleSwitchGranularity tự gọi applyToRoomCommand thay vì chờ Apply |
| S29–S31 / §6 | Timing policies/configuration/private preview | Một phần | Hai default-policy boundaries pass pure probes; dashboard hold mặc định 3500ms, dynamic WPM bật; không giữ confirmed 3000ms default; Infinity không bị loại |
| S32 / §5–6 | Moving guide + polished erasure | Một phần | Bảy effects/geometry helpers có; không thấy guide setting/moving cue độc lập; chưa đo resize/render behavior trong browser |
| S33 / §4, §6 | Private Previous/Next selection | Lệch | handlePreviousSentenceOnly/handleNextSentenceOnly đều ghi applyToRoomCommand, đổi live state và clear learner thay vì chỉ private selection |
| S34–S36 / §6 | Play/replay/pause/resume/manual Show/Hide | Một phần | Commands và pause progress tests có; full review override idle/ended, Hide/End không reset flag |
| S37–S38 / §2, §4 | Staged changes + explicit Apply returns blank | Một phần | apply command đặt idle; nhưng switch granularity và lesson open/reuse áp dụng ngay, có đường bypass explicit Apply |
| S39 / §6 | Blank after timed expiry | Pass pure probe; full review là ngoại lệ chưa duyệt | Default policies blank tại 4000/3000ms; full review mang toàn văn và bypass timer |
| S40–S42 / §5–6 | Late join/reload/background/offline/stale recovery | Một phần; chưa sync verify | Derive elapsed từ timestamp có; teacher Date.now khác learner Date.now, thiếu offset/time endpoint, không stale-revision guard; reconnect indicator chỉ theo subscription error |
| S43–S45 / §3, §8 | No learner controls; server authority; current-only delivery | Một phần/lệch | Learner không có playback commands và room rules check teacher owner; đọc toàn room document public gồm teacher/resource metadata; full review đưa cả canonicalText vào currentUnit |
| S46–S48 / §5, §10.10 | Phone layout/keyboard/reduced motion | Một phần; chưa browser/a11y verify | Responsive classes và prefers-reduced-motion logic có; fixture chỉ effects, không classroom E2E; focus/announcements/alternative timing chưa đủ evidence |
| S49 / §7–8 | Honest errors/manual fallback | Một phần | URL failure có Paste fallback, AI errors trả deterministic; thiếu explicit response cho AI fallback, timeout/cache/output occurrence contract |
| S50 / §10.8 | Two devices / ~20 learners / measured sync | Chưa verify | Không có current load/E2E suite hoặc measurements; pure timing và snapshots không chứng minh <=250ms |
| S51–S52 / §2, §9, §10.12 | Minimal + Neobrutalism; authoritative theme without reset | Chưa có | Không có room theme field, update contract, theme picker hay two-theme state; neo styling cố định không đáp ứng switchable themes |
| S53 / §2, §5, §10.12 | Learner-only DOM and narrow snapshot | Lệch | StudentView Join có Switch to Teacher Dashboard; App luôn render Navbar/footer; signed-in profile có thể hiện ở learner; room/participants subscriptions không phải narrow per-learner snapshot |

## 5. Blocking gaps ưu tiên

### B1 — Publication/review và seeded data không theo PRD

PRD §2/4/7 yêu cầu Draft seed, human review, immutable Published versions. Current flows tự publish khi mở room; seed Approved/Published và có thể overwrite published content. Editor truyền lại initialResource với sentences/paragraphs/annotations cũ, còn saveReadingResource ưu tiên arrays có sẵn dù canonicalText đã đổi. Vì vậy sửa text có thể giữ units/approved spans của bài cũ.

Nguồn: `src/components/ResourceEditorModal.tsx:153`, `src/services/resourceService.ts:509-542, 591-633`, `src/components/TeacherDashboard.tsx:338-345`, `src/components/PhraseEditorStudio.tsx:309-324`.

Cần: versioned Draft→review→Published contract, invalidation khi edit, room reference frozen version. Không sửa/seed/delete production data trong audit.

### B2 — Participant authorization/removal không enforce được

PRD §3/5 và security_spec yêu cầu self-heartbeat + teacher-only removal. Current rules update/delete participants chỉ kiểm tra valid IDs; subscription lọc removed nên learner không nhận state Removed. Identity trong localStorage không đủ làm authorization.

Nguồn: `firestore.rules:85-91`, `src/services/roomService.ts:524-544`, `src/components/StudentView.tsx:182-190`.

Cần: chốt technical learner identity/membership; Emulator deny/allow tests và E2E eviction.

### B3 — Commands thiếu conflict/idempotency và shared clock

PRD §6 yêu cầu commandId/expectedRevision, reject conflicts, same phase across devices. Current service tăng caller revision + 1 qua updateDoc; không CAS/transaction hoặc duplicate-command check. Play/resume ghi teacher Date.now; learner so với clock riêng.

Nguồn: `src/services/roomService.ts:213-455`, `src/utils/timingEngine.ts:108-185`.

Cần: enforced revision/idempotency và measured clock/sync strategy. Firestore ownership rules có thể là authority boundary; không kết luận thiếu Node command API tự nó là authorization failure.

### B4 — Private selection/apply contract đã thay đổi

PRD §2/4/6 yêu cầu private selection đến Play/Show và reading settings đến explicit Apply. Current previous/next, granularity switch và room lesson reuse gọi apply ngay. Có optional auto-advance và WPM automation; PRD nói manual progression và WPM deferred. Đây có thể là thay đổi product mới, nhưng chưa có tài liệu xác nhận trong nhánh này.

Nguồn: `src/components/TeacherDashboard.tsx:338-375, 648-695, 740-833, 1025-1045`.

Cần owner xác nhận behavior mới hoặc đưa implementation về PRD. Không tự rollback feature mới.

### B5 — Learner isolation và full review mâu thuẫn contract

PRD §3/5/10.12 yêu cầu learner-only UI và current-unit-only data. Current Join có teacher switch, shared App chrome; learner đọc nguyên room và participant list. Full review đưa toàn văn vào currentUnit. Hide/End khi full review còn bật vẫn derive manual_show; StudentView ended alert không loại reading canvas, isFullReview vẫn làm text visible.

Nguồn: `src/App.tsx:114-127, 245-252`, `src/components/StudentView.tsx:361-391, 463, 557`, `src/services/roomService.ts:293-345, 430-455`, `src/utils/timingEngine.ts:120`.

Cần xác nhận full-review exception, correct precedence và narrow learner data/UI contract.

### B6 — URL import chưa đạt security/runtime contract

PRD §8/10.9 yêu cầu private/metadata/redirect SSRF protection, response limits. Handler chỉ kiểm tra prefix và new URL rồi fetch mặc định redirects; mock probe xác nhận localhost đi tới fetch. Không gọi localhost hay metadata thật trong audit. Hosting rewrite tất cả về index.html không route API đến Express.

Nguồn: `src/server/apiHandlers.ts:182-215`, `firebase.json`, `vite.config.ts:11`, `server.ts`.

Cần SSRF boundary tests, payload/response limits và quyết định API runtime trước khi mở URL import live.

## 6. Verification thực sự đã chạy

- `npm run lint`: PASS (TypeScript noEmit, không ESLint).
- `npm test`: PASS — 20 simulator/contract tests + 7 timing/erase tests. Current package script nay chạy cả hai; kết quả lịch sử 50 Vitest tests không áp dụng main.
- `npm run build`: PASS; warnings native Vite config và bundle khoảng 1 MB minified.
- Audit probes: **4 PASS / 6 FAIL**, xem [kết quả JSON](prd-audit-probes.json). Script local tại `.scratch/prd-audit/probes.ts`, chạy bằng `node --import tsx .scratch/prd-audit/probes.ts`; `.scratch` bị ignore. Exit code script không thể hiện pass/fail vì nó thu thập mọi result; đọc status từng probe.

| Probe | Result |
| --- | --- |
| Hold then erase: 2999/3000/4000ms | PASS |
| Erase within window: 1999/2000/3000ms | PASS |
| Exact PRD phrase fixture; text reconstruction | PASS |
| Repeated dictionary expression after emoji | PASS |
| Hide when full review enabled | FAIL: manual_show thay vì idle |
| End when full review enabled | FAIL: manual_show thay vì ended |
| Stale approved phrase missing from text | FAIL: highlight unrelated substring |
| Infinite timing | FAIL: nonfinite total duration |
| Localhost URL rejected before fetch | FAIL: fetch called (stub only) |
| AI repeated occurrences | FAIL: hai candidates cùng một offset |

Không gọi Gemini, không dùng API key, không Firebase reads/writes trong probes; fetch được stub và restore sau kiểm tra. Không tạo test xanh giả từ simulator cho rules thật.

### Chưa chạy / không có evidence

- Firestore Emulator: chưa có @firebase/rules-unit-testing trong dependency set, không tìm thấy firebase/java CLI qua path checks, chưa có emulator harness/config cho acceptance này. Không tự cài dependencies.
- Browser classroom E2E: không có Playwright package/script trong project; agent-browser không tìm thấy qua command lookup. Dev-only effects fixture không thay thế authenticated teacher→data→learner verification.
- Real OAuth, two-device sync, 20-learner load, a11y/phone screenshots, AI malformed/timeout/injection, redirects/private IPv6 và production backend/deployment.

## 7. Vì sao coverage report cũ không chứng minh main hoàn thành?

Archive report nói 10 Vitest files/50 tests, RoomAuthorityService, domain/timing, importService SSRF, Draft seedService và narrow LearnerRoomSnapshot. Những source đó thuộc commit 78abf47/ref origin/master, không tồn tại trên main. Báo cáo cũng không được audit này kiểm chứng E2E trên nhánh lịch sử. Trạng thái Verified của report là claim lịch sử, không phải kết quả kiểm tra hiện tại.

## 8. Next decision và delivery route

1. **Owner xác nhận authority:** dùng PRD 78abf47 làm baseline cho main, hay current teacher instant-switch/full-review/WPM/auto-advance là product revision? Giữ câu hỏi này mở; không tự đổi thành ready-for-agent.
2. Test seams đã được user chấp thuận trong cuộc hội thoại: primary teacher–learner observable flow, Firestore Emulator enforcement, timing/text/erase supporting unit tests.
3. Sau quyết định (1), `to-spec` chỉ ghi gap remediation/approved deviations, không tái tạo spec từ code rồi giả định hoàn thành.
4. `to-tickets`: vertical slices Publication/review → identity/removal → command/sync → private apply/isolation → safe API → themes/a11y/load, với dependency và check cụ thể. Không phát hành tickets cho quyết định chưa chốt.
5. Implementation có thể TDD từ failing probes, nhưng probes cần nâng thành maintained regression tests đúng boundary; re-run E2E/Emulator trước khi đánh dấu release-ready.

Có thể bổ sung glossary từ PRD sau khi chốt authority. Chưa merge/cherry-pick/restore code từ origin/master; chưa sửa PRD archive hay application code.
