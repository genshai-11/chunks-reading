---
title: Chunks reading
subtitle: Một lớp học. Một nhịp đọc. Hai giao diện.
lang: vi
template: doc
theme: agent-skill
mode: light
---
**Đề xuất, chưa triển khai.** Dùng AI Studio để build React + Node.js; dùng Firebase cho đăng nhập, dữ liệu và realtime.

Đọc từ trên xuống để hiểu trách nhiệm từng lớp. Mở **Xem chi tiết** khi cần thông tin kỹ thuật.

## A Kiến trúc từng lớp {meta="Đề xuất MVP"}

```layers Kiến trúc Chunks reading theo trách nhiệm
# Người dùng | Ai điều khiển, ai theo dõi?
teacher | Teacher | Chủ phòng | Chọn bài và điều khiển nhịp đọc. | Teacher quản lý nội dung và phòng của mình. Không tự động có quyền xem dữ liệu teacher khác.
users | Học viên | Thành viên phòng | Vào bằng link hoặc mã; xem bài cùng lớp. | Cách đăng nhập chưa chốt. Đề xuất mã phòng + tên, với anonymous identity và quyền thành viên được xác minh.
> Hai vai trò · hai giao diện
# Giao diện | Browser hiển thị, không quyết định quyền
monitor | Teacher console | React + TypeScript | Thư viện, editor, setup và điều khiển lớp. | Có preview màn học viên, trước/sau, pause, resume, replay và kết thúc phòng.
book | Student reader | React + TypeScript | Chữ lớn, highlight và hiệu ứng đọc. | Hiệu ứng chạy trên máy học viên theo mốc server. Không quay màn hình và không dùng camera theo dõi mắt.
> Lệnh teacher → HTTPS → xác minh phía server
# Backend và quyền | Nguồn xác thực lệnh điều khiển
server | Room API | Node.js | Xác minh và ghi trạng thái phòng. | Kiểm tra identity, quyền sở hữu và membership. Học viên gọi API điều khiển trực tiếp vẫn phải bị từ chối.
shield | Danh tính | Firebase Auth | Phân biệt chủ phòng và người tham gia. | Không tin role từ browser. Secrets, service credentials và API keys chỉ ở server.
> Ghi hợp lệ · đọc realtime theo quyền
# Dữ liệu và đồng bộ | Giữ một trạng thái đọc chung
database | Nội dung bền vững | Firestore | Lưu category, bài và phiên bản bài. | Chốt articleVersionId khi bắt đầu phiên. Sửa thư viện không làm đổi bài đang được lớp sử dụng.
sync | Trạng thái phòng | Firestore listeners | Chia sẻ câu/đoạn, timing và tiến độ. | Snapshot gồm revision, unitIndex, status, startedAt và pausedElapsedMs. Client ước lượng lệch đồng hồ; reconnect lấy trạng thái hiện tại.
> Dịch vụ hỗ trợ · không nằm trong từng frame hiệu ứng
# Import và triển khai | Mở rộng nội dung, đưa ứng dụng lên web
import | Nhập bài và annotations | Server import · Gemini tùy chọn | Text, TXT, URL; teacher xem và duyệt. | URL phải chặn nội mạng, kiểm tra redirect và giới hạn timeout/kích thước. Gemini chỉ gợi ý idioms/phrases; sai thì chỉnh tay.
cloud | Hosting | Cloud Run | Triển khai app do AI Studio tạo. | Firebase lưu dữ liệu ngoài bộ nhớ server. Kiểm tra chi phí, secrets, phân quyền và quy mô lớp trước release.
```

**Mũi tên giữa các lớp biểu thị ranh giới trách nhiệm.** Lớp cuối là dịch vụ hỗ trợ, không phải bước bắt buộc của mọi request.

## B Một lần teacher nhấn “Bắt đầu” {meta="Luồng thực tế"}

```sequence num
Teacher -> Node API: Bắt đầu đơn vị đọc
Node API -> Firebase Auth: Xác minh identity
Node API -> Firestore: Kiểm tra quyền và ghi snapshot
Firestore --> Học viên: Snapshot mới qua listener được cấp quyền
note Học viên: Nhận mốc server; tự tính tiến độ
== Tại mỗi thiết bị ==
Học viên -> Browser: Hiển thị chữ và chạy hiệu ứng
```

- Backend tăng `revision` để nhận biết trạng thái mới.
- Không gửi sự kiện cho từng từ hoặc từng frame.
- Vào muộn hoặc reconnect: lấy snapshot hiện tại, không đọc lại từ đầu.
- Mất mạng: báo trạng thái và chờ đồng bộ, không giả vờ đang kết nối.

## C Ba nhóm cấu hình đọc {meta="Cần bạn duyệt"}

```layers Cấu hình đọc độc lập
# Chia nội dung | Học viên thấy bao nhiêu chữ?
book | Câu | Sentence | Hiển thị một câu mỗi lần.
book | Đoạn | Paragraph | Hiển thị một đoạn mỗi lần.
> Kết hợp lớp nhấn mạnh
# Highlight | Chú ý đến cách dùng tiếng Anh
spark | Idioms và phrases | Bật / tắt | Nhấn mạnh cụm từ trên câu hoặc đoạn. | Đây là đề xuất. Nếu bạn muốn highlight là mode riêng, PRD sẽ đổi theo lựa chọn đó.
> Chọn nhịp và hiệu ứng
# Timing và hiệu ứng | Chữ tồn tại và biến mất thế nào?
clock | Fixed / dynamic | Giây / WPM | Thời lượng cố định hoặc theo số từ. | Dynamic đề xuất: số từ × 60.000 / WPM, kèm min/max. Chưa chốt 3 giây là giữ chữ, xóa chữ hay tổng thời gian.
eraser | Reading guide + eraser | Tùy chọn độc lập | Dẫn hướng đọc; che chữ dần, không nhảy dòng. | Có chế độ chữ tĩnh và giảm chuyển động. Reading guide không phải eye tracking bằng camera.
```

## D Nhập bài mà không bị mắc kẹt {meta="Phạm vi đề xuất"}

```timeline v
01 | Nguồn | News, TED transcript hoặc bài truyền cảm hứng.
02 | Import MVP | Dán text, TXT hoặc URL công khai có thể truy cập.
03 | Preview và sửa | Teacher kiểm tra nội dung, nguồn, câu và đoạn.
04 | Duyệt cụm từ | Chỉnh tay hoặc duyệt gợi ý Gemini.
05 | Lưu và dùng | Phân loại category; chốt phiên bản khi mở lớp.
```

**Fallback:** URL không lấy được → dán text. Không hứa đọc mọi TED/video URL hoặc vượt paywall.

PDF/DOCX đề xuất ở giai đoạn sau. PDF scan cần OCR; video cần transcription và kiểm tra quyền sử dụng.

## E Từ bản thiết kế đến lớp học thật {meta="Không dùng mega-prompt"}

```timeline v
01 | Chốt PRD | Quyền, mode, timing, reconnect và tiêu chí nghiệm thu.
02 | Stitch | Library, editor, setup, live console, join và student reader.
03 | AI Studio: skeleton | Bài fixture; hai tab chạy câu/đoạn, pause và replay.
04 | Backend thật | Auth, lưu bài, room, realtime; thử trên hai thiết bị.
05 | Import và kiểm thử | URL lỗi có fallback; annotation sai có chỉnh tay.
06 | Release gate | Kiểm tra secrets, quyền, chi phí và số học viên mục tiêu.
```

**Phong cách app:** đọc sách, nền giấy ngà, chữ mực, serif cho bài đọc. Theme của tài liệu này không thay thế brand của app.

**Logo app:** `C:/Users/gensh/Downloads/logo.png`. Cần upload asset cho Stitch/AI Studio; đường dẫn local không phải URL công khai.

## F Năm quyết định trước khi tạo Stitch

| Cần chốt | Đề xuất mặc định |
|---|---|
| Học viên vào phòng thế nào? | Mã/link + tên; anonymous identity |
| Highlight riêng hay kết hợp? | Câu/đoạn kết hợp highlight |
| 3 giây nghĩa là gì? | Tách thời gian giữ chữ và thời gian xóa |
| Bao nhiêu học viên/phòng? | Thử MVP với 30; chưa đo năng lực thực tế |
| Ngôn ngữ và import ban đầu? | UI tiếng Việt, bài tiếng Anh; text/TXT/URL |

**Trạng thái:** chưa tạo Stitch, chưa provision Firebase, chưa build/deploy ứng dụng.

**Cơ sở:** yêu cầu của bạn và tài liệu Google về [AI Studio Build](https://ai.google.dev/gemini-api/docs/aistudio-build-mode), [full-stack](https://ai.google.dev/gemini-api/docs/aistudio-fullstack).

Bản kỹ thuật đầy đủ được giữ trong `docs/architecture-proposal.md`. Các quyết định ở đây vẫn là đề xuất.
