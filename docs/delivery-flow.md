---
title: Chunks reading — Flow mới
subtitle: Giữ codebase. Tôi phụ trách design và review; Antigravity triển khai theo từng lát cắt.
lang: vi
template: doc
theme: agent-skill
mode: light
---
**Không cần quay lại tạo app mới bằng AI Studio.** PRD/spec đã chốt; codebase hiện tại là điểm xuất phát.

DESIGN.md mới là hợp đồng giao diện. Antigravity triển khai trực tiếp trên repo; AI Studio tùy chọn phải audit source đã import, không tạo lại app. Các export Stitch cũ đã xóa theo yêu cầu; không cần tái tạo chúng.

## A Ai chịu trách nhiệm gì? {meta="Flow đề xuất"}

```layers Quyền sở hữu công việc
# Hợp đồng | Chốt những gì phải đúng
book | PRD + Spec | Đã chốt sản phẩm | Giữ yêu cầu và tiêu chí nghiệm thu. | Code hiện tại không thay thế spec. Chi tiết hạ tầng chưa xác minh vẫn được ghi là mở.
> Đánh giá code trước khi giao việc
# Design | Tôi phụ trách hướng thiết kế
monitor | UI và motion | DESIGN.md + preview thực | CHUNKS đỏ, sách và trạng thái. | Agent tự cải thiện Teacher Setup/Live và Learner Reader trên source hiện tại; kiểm chứng motion thực.
> Chốt ticket và test seam, xem UI thực trước khi mở rộng
# Implementation | Một chủ sở hữu cho mỗi nhóm file
code | Antigravity | Repo hiện tại | Implement từng ticket có test gate. | Tôi có thể patch frontend hoặc giao agent port design. Không cùng sửa một file với Antigravity; backend/Firebase có phạm vi riêng.
> Diff và evidence, không chỉ ảnh đẹp
# Verification | Tôi đối chiếu kết quả
shield | Review + kiểm thử | Standards và Spec | Ghi Done/Partial/Missing/Unverified bằng bằng chứng. | Review code, test timeline, browser, API/data và quyền. Không coi Firebase SDK hoặc build pass là backend hoàn thiện.
```

## B Trình tự mới

```timeline v
01 | Audit baseline | Map spec vào code, chụp UI và ghi lỗi; chưa redesign mù.
02 | Design trên app hiện có | Layout, token đỏ, controls, mobile và motion states.
03 | Chốt ticket và seam | Agent cải thiện UI theo DESIGN.md; xem kết quả thực, không rebuild tất cả.
04 | Implement có ranh giới | Antigravity dùng prompt repo-aware, giữ route/component có ích.
05 | Review và sửa | So Standards và Spec; chạy test, browser và kiểm tra data.
06 | Mở rộng và release | Library/review/seed, Auth/realtime; deploy chỉ khi được duyệt.
```

**Hai luồng riêng:** visual có thể dùng mock rõ nhãn; tính năng chỉ Done sau kiểm chứng behavior/backend.

Không bật deploy hay ghi production trong prompt design. Không cho hai agent sửa đồng thời cùng file.

## C Hiện tại đã làm được gì? {meta="Static audit + build"}

| Nhóm | Đánh giá |
|---|---|
| React/Vite, TeacherView, StudentView | Có prototype; build pass |
| Sentence/Paragraph và toggle highlight | Có UI; hành vi mới chưa đủ |
| Paper/serif | Có nền tảng; chưa đúng CHUNKS đỏ/English UI |
| Timing 3s/1s, expiry và Show/Hide | Chưa đúng; eraser đang lặp |
| Apply to room và private navigation | Chưa có |
| Auth, join/presence và realtime | SDK/config có; flow thật chưa có trong code đã đọc |
| Library Draft/Published, review và seed | Có hợp đồng docs; chưa có implementation |
| Mobile, quyền và 20 learners | Chưa kiểm chứng |

Bằng chứng và vị trí code: [Spec coverage baseline](spec-coverage-baseline.md).

Không báo phần trăm hoàn thành khi chưa có acceptance evidence.

## D Tôi phụ trách design như thế nào?

1. Đọc code và chụp giao diện desktop/mobile hiện tại.
2. Thiết kế Teacher Setup/Live và Learner Reader theo DESIGN.md.
3. Agent cải thiện layout theo DESIGN.md; dùng preview thực cho eraser và reading guide.
4. Chốt ticket/test seam rồi implement; bạn xem UI thật để góp ý trước khi mở rộng.
5. Agent implement; tôi review diff, browser và từng tiêu chí spec.

Motion phải có Hold, Erasing, Blank waiting và Manual Show. Default giữ 3s rồi xóa 1s.

Within-window tổng 3s, xóa trong giây cuối. Pause/resume và late join phải giữ đúng phase.

## E Prompt sẽ đổi như thế nào?

Prompt AI Studio đã cập nhật theo PRD/spec hiện tại. Chạy [audit source](prompts/aistudio-audit.md) trước. Dùng [checkpoint đầu](prompts/aistudio-first-checkpoint.md) sau khi duyệt kế hoạch. Không phụ thuộc Stitch hay ZIP chưa tồn tại.

Prompt Antigravity phải chỉ rõ baseline, phạm vi file, những gì giữ nguyên, tiêu chí spec và test gate. Mỗi ticket trả diff, lệnh test, ảnh và giới hạn chưa xác minh.

**Bước kế tiếp:** dùng [prompt Antigravity](prompts/antigravity-redesign-and-backend.md), hoặc [handoff AI Studio](aistudio-handoff.md), với cùng source/PRD/spec. Không để hai agent cùng sửa một nhóm file.

Trang này là kế hoạch triển khai. Hai task design lịch sử chưa đạt gate đầy đủ; export Stitch local đã xóa. Chưa chạy implementation Antigravity/AI Studio, chưa có backend hoàn thiện hoặc deploy.

HTML đã render; keyboard, contrast và reflow của trang mới chưa kiểm tra trong browser.
