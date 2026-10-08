# Codebase baseline và đề xuất onboarding Matt

Status: reviewed-current-code; agent-setup-complete; product-spec-pending-test-seams
Baseline: HEAD `dc89d77` cùng working tree hiện tại, bao gồm thay đổi chưa commit.

## Phạm vi

Rà soát codebase để chuẩn bị tài liệu và agent workflow; không phải review toàn bộ diff/PR, security audit đầy đủ hay xác nhận deployment đang chạy. Không thay đổi source, rules, dependencies hoặc cấu hình triển khai. Các thay đổi có sẵn trong working tree được giữ nguyên.

Không có Git remote được cấu hình. Repo là một ứng dụng React/TypeScript/Vite, không có dấu hiệu monorepo. Tại thời điểm rà soát ban đầu có README mẫu AI Studio và security spec; chưa có product spec, AGENTS.md, CLAUDE.md, CONTEXT.md hay docs/agents. Sau xác nhận của owner, đã tạo [AGENTS.md](../../AGENTS.md) và cấu hình trong docs/agents; product spec và glossary vẫn chưa được tạo.

## Current-system map

| Surface | Hành vi quan sát được | Nguồn |
| --- | --- | --- |
| Entry và routing | Teacher đăng nhập Google; learner mở đường dẫn student/join/learner hoặc room query | `src/App.tsx`, `src/firebase.ts` |
| Resource library | Resource thuộc teacher; lưu canonical text, sentence/paragraph units, annotations; publish và seeded resources | `src/services/resourceService.ts`, `src/components/ResourceEditorModal.tsx` |
| Phrase review | Dictionary matching, gợi ý AI tùy chọn; annotation pending/approved/rejected | `src/services/phraseDetection.ts`, `src/components/PhraseReviewModal.tsx`, `src/components/PhraseEditorStudio.tsx` |
| Teacher controls | Chọn resource, staged settings, apply, play/pause/resume, show/hide, chuyển unit, full review, kết thúc room | `src/components/TeacherDashboard.tsx`, `src/services/roomService.ts` |
| Live room | Firestore room snapshot chứa currentUnit và timing/settings; commands ghi document và revision | `src/services/roomService.ts`, `src/types.ts` |
| Learner | Nhập tên và room code; participant ID lưu localStorage; đăng ký trực tiếp, subscribe snapshots, heartbeat 15 giây | `src/components/StudentView.tsx` |
| Timeline | Tính hold/erase/blank từ room state và client time; hỗ trợ hai timing policies, pause và manual show | `src/utils/timingEngine.ts` |
| Reading preparation | Sentence/paragraph segmentation, gộp unit ngắn, reconcile highlight offsets | `src/utils/textSegmentation.ts` |
| Rendering | Bảy erase effects, dust direction; preview và learner dùng timeline/effect helpers | `src/components/EraseTextEffect.tsx`, `src/utils/eraseEffects.ts` |
| Optional API | Phrase detection và URL extraction qua Vite dev middleware hoặc Express server | `vite.config.ts`, `server.ts`, `src/server/apiHandlers.ts` |
| Deployment | Firebase Hosting phục vụ dist và rewrite tất cả về index.html; CI build/test rồi deploy hosting | `firebase.json`, `.github/workflows/ci-cd.yml` |

Đây là mô tả as-is, không phải yêu cầu product đã được owner duyệt. Không suy ra rationale lịch sử hoặc tạo ADR cho lựa chọn chưa được xác nhận.

## Findings cần xử lý trước khi coi spec là hợp đồng

### R1 — High: participant permissions trái security spec

`firestore.rules:85-91` cho phép create participant không có authenticated identity; update/delete chỉ kiểm tra độ dài ID. Người biết room và participant ID có thể sửa record của người khác, kể cả isRemoved, hoặc xóa record. Participant listing cũng được mở theo room ID.

Điều này không đáp ứng invariant self-registration/self-heartbeat và teacher-only eviction trong `security_spec.md`. Cần owner chốt anonymous authentication hoặc một cơ chế identity khác trước khi sửa rules; localStorage ID không phải authorization identity.

### R2 — High: learner không nhận được eviction flag

`subscribeToParticipants` trong `src/services/roomService.ts:538-539` loại bỏ mọi participant có isRemoved trước khi gửi list. `src/components/StudentView.tsx:186-188` lại tìm self trong list rồi kiểm tra self.isRemoved. Khi teacher remove, record self biến mất khỏi list, nên nhánh xử lý removed không chạy. Learner có thể tiếp tục đọc room; heartbeat cũng chưa bị rules chặn.

Acceptance candidate: learner nhận eviction qua subscription phù hợp, ngừng heartbeat và hiển thị removed state; quyền đọc sau eviction cần quyết định product riêng.

### R3 — High: security tests không thực thi Firestore rules

`firestore.rules.test.ts` tự viết các hàm checkRoomCreate/checkRoomUpdate/checkParticipantCreate. Suite không tải `firestore.rules` và không dùng Firestore Emulator. Test xanh chỉ chứng minh simulator; không chứng minh enforcement thực tế. Ví dụ checkResourceCreate trong simulator còn thiếu category constraint có trong rules.

Các negative durations và teacher profile extra fields trong security spec chưa được rules tương ứng kiểm tra đầy đủ. Cần emulator integration tests cho ownership, participant permissions, schema và malformed commands.

### R4 — Medium: full review ưu tiên hơn hide/ended trong timeline

`src/utils/timingEngine.ts:120` xử lý isFullReview trước idle/ended; hide/end commands không reset isFullReview. Kiểm tra trực tiếp hàm cho room full-review cho kết quả `idle -> manual_show` và `ended -> manual_show`. StudentView có xử lý ended riêng, nên kết quả hàm không đồng nghĩa chắc chắn learner tiếp tục thấy bài sau end; tuy nhiên hợp đồng timeline và preview cần thống nhất.

Acceptance candidate: idle/hide và ended luôn có precedence rõ ràng, kể cả khi full review đang bật.

### R5 — Medium: API chỉ có trong local/server runtime, chưa được wiring trên Hosting

Vite plugin chỉ chạy configureServer; Express có routes API, nhưng Firebase Hosting hiện chỉ deploy dist và rewrite `**` về index.html. Trong cấu hình được kiểm tra, `/api/*` không được chuyển đến server/function. Không thể coi AI detection và URL import đã hoạt động trên Firebase Hosting chỉ vì build thành công.

Acceptance candidate: quyết định deploy API runtime hoặc thông báo/disable tính năng API ở static-only deployment; verify response JSON, không phải index.html.

### R6 — Medium: tên serverStartTime không phản ánh clock authority

Play/resume trong roomService dùng `Date.now()` của teacher browser, còn learner timeline trừ `Date.now()` của learner browser. Không có clock-offset correction trong đường đi đã đọc. Các máy lệch giờ có thể hiển thị phase khác nhau; revision tăng từ giá trị caller cung cấp, không có transaction/CAS để chống stale command.

Cần chốt độ lệch sync cho phép và quyền điều khiển đa-tab trước khi quyết định giải pháp. Không ghi “exact authoritative progress” thành bảo đảm đã được kiểm chứng.

### R7 — Product clarification: full-text review là ngoại lệ của no-leak invariant

`setFullReviewCommand` đưa toàn bộ canonicalText vào currentUnit khi teacher bật review. `security_spec.md` hiện nói room không bao giờ chứa toàn bộ resource. Cần ghi rõ ngoại lệ teacher-approved full review hoặc thay đổi implementation; không tự chọn thay owner.

## Verification thực hiện

| Check | Kết quả | Giới hạn |
| --- | --- | --- |
| `npm run lint` | PASS | Script là TypeScript noEmit, không phải ESLint |
| `npm run build` | PASS | Có warning Vite native config và bundle > 500 kB |
| `npm test` | PASS, 20/20 | Simulator, không kiểm tra rules engine |
| `npm run test:erase` | PASS, 7/7 | Timing/erase helper tests, không phải browser E2E |
| Timeline probe full-review + idle/ended | Cả hai trả manual_show | Reproduce trực tiếp pure function |

Chưa chạy browser harness, Firestore Emulator, teacher/learner multi-browser flow, API live calls hoặc production verification. Không dùng API credentials và không deploy.

## Tài liệu cần bổ sung

1. `AGENTS.md`: entry point ngắn, pointers và guardrails riêng project.
2. `docs/agents/issue-tracker.md`: tracker lựa chọn, cách publish spec và ticket.
3. `docs/agents/triage-labels.md`: vocabulary năm trạng thái nếu owner giữ mặc định.
4. `docs/agents/domain.md`: single-context, quy tắc đọc glossary và ADR liên quan.
5. `CONTEXT.md`: chỉ glossary; tách resource, unit, turn, room, participant, staged settings và live state.
6. Product baseline/spec: user stories, behavior contracts, test seams, out-of-scope và câu hỏi còn mở. As-is evidence nằm trong báo cáo này; không gắn ready-for-agent cho các requirement chưa được duyệt.
7. README: hướng dẫn chạy thực tế, optional API fallback, các test tiers và giới hạn static deployment.

## Draft đã trình bày trong review

Owner đã xác nhận tracker local, AGENTS.md và năm triage labels mặc định. Cấu hình có hiệu lực nằm trong [AGENTS.md](../../AGENTS.md), [tracker](../agents/issue-tracker.md), [triage labels](../agents/triage-labels.md) và [domain docs](../agents/domain.md). Phần dưới giữ lại đề xuất ban đầu như lịch sử review, không phải hướng dẫn cấu hình hiện hành.

### Tracker

Đề xuất **local Markdown**, vì hiện không có remote. Theo template Matt:

- Spec: `.scratch/<feature>/spec.md`.
- Ticket: `.scratch/<feature>/issues/<NN>-<slug>.md`.
- Status và blocking dependencies đặt ở đầu file.
- Dùng đường dẫn ticket rõ ràng; không tạo GitHub issues hay labels khi chưa được yêu cầu.

### Triage

Đề xuất giữ năm labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. Skill triage có trên máy, nhưng vocabulary cần owner xác nhận trước khi thiết lập.

### Agent entry point — dự thảo

```markdown
# Agent guide

Before changing classroom behavior, read CONTEXT.md when present and the relevant product spec.
For Firestore changes, read security_spec.md and docs/reviews/codebase-baseline.md; validate actual rules with emulator tests, not the simulator alone.
Preserve staged versus applied room state. Learner authority is read-only for room commands.
Keep secrets out of client bundles and documentation. Deployment, destructive library reset and data deletion require explicit approval.
For verification, inspect package.json scripts. Report typecheck, build, helper tests, rules enforcement and browser E2E separately.

## Agent skills

### Issue tracker
Local Markdown under .scratch/<feature>/; read docs/agents/issue-tracker.md before publishing specs or tickets.

### Triage labels
Read docs/agents/triage-labels.md before assigning ticket readiness.

### Domain docs
Single-context; read docs/agents/domain.md before domain exploration.
```

## Route tiếp theo

1. Confirm tracker (local đề xuất) và agent entry file (AGENTS.md đề xuất).
2. Confirm triage vocabulary mặc định; duyệt draft setup rồi ghi các file.
3. Chốt test seam: teacher/learner observable flow; Firestore Emulator là enforcement seam, timing/erase helpers là supporting unit tests.
4. Dùng `to-spec` tổng hợp product baseline với câu hỏi mở; không phát minh yêu cầu hoặc đánh dấu ready-for-agent khi còn blocker.
5. Chỉ `to-tickets` và implement sau khi spec đã được owner duyệt; mỗi ticket là vertical slice có acceptance check.

Tracker đã được xác nhận và agent setup đã hoàn tất. Chưa chạy `to-spec` publish vì test seams chưa được owner xác nhận. Không dùng workflow write-a-spec từ accepted proposal cho baseline hồi cứu; repo chưa có accepted proposal để suy ra thiết kế tính năng mới.
