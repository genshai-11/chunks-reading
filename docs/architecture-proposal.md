---
title: Chunks reading — kiến trúc đề xuất
subtitle: Chốt hành vi → PRD → Stitch → AI Studio theo từng checkpoint
lang: vi
template: doc
theme: shadcn
---

## A Kết luận và cơ sở
**Khuyến nghị: dùng AI Studio Build cho web full-stack, Firebase cho dữ liệu và danh tính.** Dùng Stitch để chốt giao diện trước khi thực thi.

- **[Observed — mô tả của bạn]** Hai nhóm người dùng: teacher và học viên. Teacher quản lý bài đọc, category, phòng học và nhịp đọc.
- **[Observed — thư mục hiện tại]** `Chunks-reading/` đang trống, chưa có Git hay ứng dụng.
- **[Observed — tài liệu Google]** AI Studio hỗ trợ React và server Node.js. Có secrets, Firebase Auth/Firestore và triển khai Cloud Run.
- **[Assumed — đề xuất]** MVP là web responsive. Teacher dùng desktop/tablet; học viên dùng điện thoại hoặc laptop.
- **[Unknown]** Cần chốt quy mô lớp và đăng nhập học viên. Cần làm rõ 3 giây và hành vi highlight.

AI Studio tạo code frontend/backend; nó không thay thế database, phân quyền, kiểm thử hay vận hành. Chi phí Cloud Run, Firebase và Gemini phải được kiểm tra trước khi phát hành. Không mặc định hệ thống sẽ miễn phí.

Nguồn chính thức đã kiểm tra trong phiên: [Build apps](https://ai.google.dev/gemini-api/docs/aistudio-build-mode), [Full-stack apps](https://ai.google.dev/gemini-api/docs/aistudio-fullstack).

## B Hợp đồng sản phẩm đề xuất
**[Assumed — để bạn duyệt]** Luồng chính:

1. Teacher nhập bài, chọn category và sửa nội dung.
2. Teacher kiểm tra cách tách câu/đoạn và idioms/phrases.
3. Teacher tạo phòng, chia sẻ link hoặc mã phòng.
4. Học viên vào phòng và chờ teacher bắt đầu.
5. Teacher điều khiển nhịp đọc: bắt đầu, pause, trước/sau, replay, kết thúc.
6. Học viên xem cùng nội dung và tiến độ hiệu ứng.

| Thành phần | Đề xuất MVP |
|---|---|
| Quyền teacher | Quản lý nội dung của mình, phòng của mình và người tham gia |
| Quyền học viên | Chỉ xem phòng đã được cấp quyền; không đổi nhịp đọc chung |
| Category | News, TED Talks, Inspiration; teacher có thể tạo thêm |
| Đơn vị đọc | Câu hoặc đoạn |
| Highlight | Bật/tắt idioms và phrases trên câu hoặc đoạn |
| Timing | Fixed duration hoặc dynamic theo số từ và tốc độ đọc |
| Hiệu ứng | Reading guide và eraser có thể bật/tắt độc lập |

**Tách 3 trục cấu hình:** câu/đoạn là đơn vị hiển thị; highlight là lớp nhấn mạnh; mắt đọc/cục gôm là hiệu ứng. Nếu bạn muốn ba mode loại trừ nhau, PRD sẽ đổi theo lựa chọn đó.

Teacher có toàn quyền với tài khoản của mình. Không tự động được truy cập dữ liệu giáo viên khác.

## C Kiến trúc và ranh giới quyền
**[Assumed — kiến trúc ứng viên, chưa triển khai]**

```flow LR
Teacher -> Web app: lệnh đọc và nhập bài
Học viên -> Web app: tham gia và xem
Web app -> Node API: thao tác cần phân quyền
Node API -> Firebase Auth: xác minh danh tính
Node API -> Firestore: ghi nội dung và trạng thái phòng
Firestore -> Web app: cập nhật realtime được cấp quyền
Node API -> Import service: tải và trích xuất bài
Import service --> Gemini: gợi ý idioms khi cần
```

- **Frontend:** React + TypeScript. Có màn quản lý teacher và màn đọc học viên riêng.
- **Backend:** Node.js kiểm tra identity, quyền sở hữu, lệnh điều khiển và nhập URL. Không tin role gửi từ browser.
- **Auth:** Teacher đăng nhập. Học viên có thể dùng Firebase anonymous identity nếu bạn chọn vào nhanh bằng mã phòng.
- **Database:** Firestore lưu bài đọc và category. Nó cũng lưu phiên bản bài, thành viên và trạng thái phòng.
- **Realtime:** Client chỉ nghe snapshot được phép đọc. Lệnh teacher đi qua backend; học viên không có quyền ghi trạng thái điều khiển.
- **Gemini:** Tùy chọn cho gợi ý idioms/phrases. Không cần AI trong đường chạy realtime; không gọi model mỗi khi chuyển câu.
- **Hosting:** Cloud Run là hướng triển khai từ AI Studio. Secrets và service credentials chỉ tồn tại phía server.

Chọn Firestore trước để tránh tự vận hành WebSocket nhiều instance ở MVP. Đây là lựa chọn đề xuất, không phải cam kết về độ trễ hoặc chi phí. Cần thử trên mạng và quy mô lớp thực tế.

## D Đồng bộ nhịp đọc và hiệu ứng
**[Assumed — hợp đồng kỹ thuật đề xuất]** Room snapshot tối thiểu:

`roomId`, `articleVersionId`, `revision`, `status`, `unitMode`, `unitIndex`, `highlightEnabled`, `timingMode`, `durationMs`, `startedAt`, `pausedElapsedMs`, `effects`.

- Server là nguồn xác thực trạng thái phòng. Mỗi lệnh hợp lệ tăng `revision`.
- Chốt phiên bản bài khi bắt đầu. Việc sửa thư viện không làm lệch lớp đang học.
- Browser ước lượng chênh lệch đồng hồ với server và tính tiến độ từ `startedAt`.
- Không phát sự kiện qua mạng cho từng từ hoặc từng frame hiệu ứng.
- Pause giữ thời gian đã trôi; resume tạo mốc bắt đầu tương ứng. Replay đặt lại tiến độ.
- Học viên vào muộn hoặc reconnect nhận snapshot hiện tại. Không chạy lại từ đầu.
- Khi mất kết nối, hiện thông báo. Ngừng tự chuyển nội dung cho đến khi đồng bộ lại.

**Fixed:** mỗi câu/đoạn có cùng thời lượng được cấu hình. **Dynamic:** thời lượng ứng viên = số từ × 60.000 / WPM, với giới hạn min/max teacher chọn. Chưa chốt 3 giây là thời gian giữ chữ, thời gian xóa hay tổng thời gian.

**Reading guide:** vệt nhấn di chuyển theo từ/cụm từ. Không theo dõi mắt bằng camera. **Eraser:** che/xóa chữ dần theo tiến độ, giữ nguyên vị trí để không làm nhảy dòng. Khi đổi kích thước màn hình, tính lại bố cục nhưng giữ tiến độ.

Cần tùy chọn giảm chuyển động, chế độ chữ tĩnh và font dễ đọc. Không tuyên bố hiệu ứng có hiệu quả học tập đã được chứng minh.

## E Import nội dung và AI
**[Assumed — chia phạm vi để làm nhanh nhưng không hứa quá mức]**

| Giai đoạn | Dạng import | Hành vi khi thất bại |
|---|---|---|
| MVP | Dán text, TXT, URL bài viết công khai | Chuyển sang dán text thủ công |
| MVP | TED transcript do teacher cung cấp hoặc nguồn cho phép truy cập | Không hứa trích xuất được mọi TED/video URL |
| Sau MVP | DOCX, PDF có lớp text | Hiện preview và cảnh báo lỗi tách dòng |
| Sau MVP | PDF scan/OCR và video transcription | Phạm vi, chi phí và quyền nội dung riêng |

Pipeline nhập: tải nguồn → trích xuất → chuẩn hóa → preview.

Pipeline duyệt: teacher sửa → lưu phiên bản → tách câu/đoạn → duyệt annotations.

URL import chạy ở server và chỉ cho HTTP(S). Chặn private/local IP và metadata endpoint. Kiểm tra lại redirect; giới hạn kích thước và timeout. Không vượt paywall hoặc yêu cầu người dùng gửi cookies.

Lưu nguồn, tác giả nếu có và thời điểm import. Teacher chịu trách nhiệm quyền sử dụng. Nội dung web là dữ liệu không đáng tin. Loại script và không dùng nội dung làm chỉ dẫn hệ thống.

Gemini chỉ đề xuất annotation với loại `idiom`/`phrase`, vị trí và giải nghĩa. Code kiểm tra vị trí khớp text; teacher duyệt trước khi dùng. Nếu model lỗi hoặc trả annotation sai, vẫn có chỉnh tay. Model/API cụ thể sẽ chọn sau khi kiểm tra tài liệu và ngân sách hiện hành.

## F Giao diện và bàn giao Stitch
**[Observed — yêu cầu của bạn]** Phong cách đọc sách; tên **Chunks reading**; logo tại `C:/Users/gensh/Downloads/logo.png`.

**[Assumed — visual direction]** Nền giấy ngà, chữ mực đậm, điểm nhấn xanh rêu, highlight vàng nhạt. Serif cho bài đọc; sans-serif cho nút và bảng điều khiển. Không dùng dashboard nhiều màu hoặc trang học viên đầy công cụ.

Các màn cần tạo trong Stitch sau khi chốt yêu cầu:

1. Library của teacher: category, tìm kiếm, nguồn và trạng thái bài.
2. Import/editor: preview bài, sửa câu/đoạn và duyệt annotations.
3. Room setup: mode, fixed/dynamic, timing, hiệu ứng và preview học viên.
4. Live teacher console: toàn bài, preview, thành viên và điều khiển lớn.
5. Join/waiting room: mã phòng, tên hiển thị và trạng thái kết nối.
6. Student reader: chữ là trung tâm; bản desktop và mobile, trạng thái pause/reconnect/end.

Stitch là nguồn thiết kế, không chứng minh backend hay realtime hoạt động. Hiệu ứng eraser phải được thử trong browser sau đó. Stitch/AI Studio không truy cập được đường dẫn logo trên máy. Cần upload asset hoặc đưa vào gói source. Không thay bằng logo AI.

## G PRD và các checkpoint AI Studio
**[Assumed — kế hoạch]** Không gửi một mega-prompt yêu cầu build toàn bộ trong một lần.

| Checkpoint | Đầu ra | Bằng chứng phải có |
|---|---|---|
| 1. Chốt PRD | Actors, mode, timing, state machine, quyền, import, non-goals | Bạn duyệt các quyết định và acceptance criteria |
| 2. Stitch | Màn teacher/student, tokens và assets | Bạn duyệt desktop/mobile; không coi mockup là chức năng thật |
| 3. Walking skeleton | Frontend + API với bài fixture | Hai tab teacher/student chạy câu, đoạn, pause, replay |
| 4. Backend thật | Auth, lưu bài, room, realtime và reconnect | Hai thiết bị đồng bộ; học viên gửi lệnh bị từ chối |
| 5. Import + annotations | URL/text, preview, chỉnh tay; AI tùy chọn | URL lỗi có fallback; annotation sai bị phát hiện |
| 6. Release gate | Kiểm thử, quan sát lỗi, giới hạn dùng, deploy | Thử quy mô lớp đã chốt; kiểm tra secrets và phân quyền |

PRD phải định nghĩa pause/resume, đổi mode và thời điểm áp dụng timing. Cần quy tắc cho teacher disconnect và học viên vào muộn. Chốt các quy tắc này trước khi tạo prompt phần realtime.

Acceptance quan trọng: học viên không điều khiển phòng dù gọi API trực tiếp; teacher khác không đọc thư viện riêng; refresh không mất trạng thái; import không truy cập nội mạng; hiệu ứng không nhảy dòng. Ngưỡng sai lệch thời gian sẽ chốt và đo trên thiết bị thật.

Hiện chưa tạo Stitch hay viết prompt thực thi cuối cùng. Chưa provision Firebase và chưa deploy. Đây là đề xuất kiến trúc để duyệt.

## H Năm quyết định cần bạn chốt
1. **Cách vào phòng:** cần tài khoản hay mã phòng + tên? Đề xuất vào nhanh bằng mã và anonymous identity; mã không được xem là quyền quản trị.
2. **Ba mode:** sentence / paragraph / highlight là ba mode riêng, hay câu/đoạn kết hợp highlight? Đề xuất kết hợp.
3. **3 giây:** thời gian giữ chữ, xóa chữ hay tổng thời gian? Đề xuất tách `holdDuration` và `eraseDuration`; dynamic tính theo WPM.
4. **Quy mô:** bao nhiêu học viên/phòng? Bao nhiêu phòng đồng thời? Đề xuất MVP thử với 30 học viên/phòng; đây là mục tiêu thử, không phải năng lực đã đo.
5. **Phạm vi đầu:** giao diện tiếng Việt, bài đọc tiếng Anh; import text/TXT/URL trước, PDF/DOCX sau có phù hợp không? Đề xuất như vậy để có lớp học thật sớm.
