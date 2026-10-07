---
title: Chunks reading
subtitle: Một lớp học. Một nhịp đọc. Hai giao diện.
lang: vi
template: doc
theme: agent-skill
mode: light
---
**Đã chốt sản phẩm; có prototype React/Vite, production backend chưa xác minh.** Nền tảng trợ giảng, không kiểm tra/chấm điểm. Brand app: CHUNKS đỏ, phong cách sách và chuyển động gọn đẹp. UI và bài đọc đều tiếng Anh; khoảng 20 học viên/phòng.

Cải thiện codebase hiện tại theo DESIGN.md bằng Antigravity; AI Studio là lựa chọn audit/import source theo checkpoint. Export Stitch local đã xóa, không phải đầu vào bắt buộc. Node.js + Firebase là hướng backend đề xuất, chưa phải hạ tầng production đã kiểm chứng.

Đọc từ trên xuống để hiểu trách nhiệm từng lớp. Mở **Xem chi tiết** khi cần thông tin kỹ thuật.

## A Kiến trúc từng lớp {meta="Đề xuất MVP"}

```layers Kiến trúc Chunks reading theo trách nhiệm
# Người dùng | Ai điều khiển, ai theo dõi?
teacher | Teacher | Chủ phòng | Chọn bài và điều khiển nhịp đọc. | Teacher quản lý nội dung và phòng của mình. Không tự động có quyền xem dữ liệu teacher khác.
users | Học viên | Thành viên phòng | Mở link, nhập tên; xem cùng trạng thái lớp. | Không đăng ký tài khoản hay chờ duyệt vào phòng. Identity kỹ thuật và membership vẫn phải xác minh; tên tự nhập không chứng minh danh tính.
> Hai vai trò · hai giao diện
# Giao diện | Browser hiển thị, không quyết định quyền
monitor | Teacher console | React + TypeScript | Thư viện, editor, setup và điều khiển lớp. | Có preview màn học viên, trước/sau, pause, resume, replay và kết thúc phòng.
book | Student reader | React + TypeScript | Chữ lớn, highlight và hiệu ứng đọc. | Hiệu ứng chạy trên máy học viên theo mốc server. Không quay màn hình và không dùng camera theo dõi mắt.
> Lệnh teacher → HTTPS → xác minh phía server
# Backend và quyền | Nguồn xác thực lệnh điều khiển
server | Room API | Node.js | Xác minh và ghi trạng thái phòng. | Kiểm tra identity, quyền sở hữu và membership. Học viên gọi API điều khiển trực tiếp vẫn phải bị từ chối.
shield | Danh tính | Firebase Auth | Teacher đăng nhập Google qua Firebase. | Phân biệt chủ phòng và học viên; không tin role từ browser. Secrets, service credentials và API keys chỉ ở server.
> Ghi hợp lệ · đọc realtime theo quyền
# Dữ liệu và đồng bộ | Giữ một trạng thái đọc chung
database | Nội dung bền vững | Firestore | Lưu resource phân loại, Draft/Published và phiên bản. | Agent seed trực tiếp Draft; teacher duyệt nội dung/cụm rồi publish. Chốt articleVersionId khi bắt đầu phiên. Sửa thư viện không làm đổi bài đang được lớp sử dụng.
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

## C Ba nhóm cấu hình đọc {meta="Đã chốt"}

```layers Cấu hình đọc độc lập
# Chia nội dung | Học viên thấy bao nhiêu chữ?
book | Câu | Sentence | Hiển thị một câu mỗi lần.
book | Đoạn | Paragraph | Hiển thị một đoạn mỗi lần.
> Kết hợp lớp nhấn mạnh
# Highlight | Chú ý đến cách dùng tiếng Anh
spark | Phát hiện và highlight cụm | Dictionary + AI | Chỉ tô đúng cụm như “long story short”. | Xử lý dữ liệu hoặc AI tạo candidate. Teacher duyệt; lưu exact spans. Không tô toàn câu/đoạn. Manual review vẫn dùng được khi AI lỗi.
> Chọn nhịp và hiệu ứng
# Timing và hiệu ứng | Chữ tồn tại và biến mất thế nào?
clock | Hold then erase | Mặc định | Hiện đầy đủ 3 giây, sau đó xóa trong 1 giây. | Teacher chỉnh thời gian đọc/xóa và xem animation preview. Tới giây thứ 4 mới hết chữ; không ép hết ở giây thứ 3.
eraser | Erase within window | Lựa chọn thứ hai | Tổng 3 giây: hiện 2 giây, xóa trong giây cuối. | Điểm dẫn đọc/cục gôm đi theo dòng; không theo dõi mắt thật. Hai policy có deadline riêng. Late join theo cùng phase và mask progress.
book | Show / Hide | Thủ công | Hiện cố định để giải thích; Hide mới ẩn. | Tách khỏi Play/Replay có thời gian. Resource/mode/settings mới cần Apply to room: về trang trống, rồi teacher Play/Show. Sentence/Paragraph độc lập với bật/tắt highlight.
```

## D Nhập bài mà không bị mắc kẹt {meta="Phạm vi đã chốt"}

```timeline v
01 | Nguồn | News, TED transcript hoặc bài truyền cảm hứng.
02 | Import MVP | Dán text, TXT hoặc URL công khai có thể truy cập.
03 | Preview và sửa | Teacher kiểm tra nội dung, nguồn, câu và đoạn.
04 | Duyệt cụm từ | Chỉnh tay hoặc duyệt gợi ý Gemini.
05 | Publish và dùng | Duyệt Draft; phân loại chủ đề/trình độ/loại nguồn; chốt phiên bản khi mở lớp.
```

**Agent seed:** ghi trực tiếp database dưới trạng thái Draft. Lưu nguồn, quyền sử dụng và phân loại. Teacher duyệt trước publish. Hướng dẫn: [Resource seeding](resource-seeding.md). Chưa có seed script hay database thật đã xác minh.

**Fallback:** URL không lấy được → dán text. Không hứa đọc mọi TED/video URL hoặc vượt paywall.

PDF/DOCX đề xuất ở giai đoạn sau. PDF scan cần OCR; video cần transcription và kiểm tra quyền sử dụng.

## E Từ bản thiết kế đến lớp học thật {meta="Không dùng mega-prompt"}

```timeline v
01 | Chốt PRD | Quyền, mode, timing, reconnect và tiêu chí nghiệm thu.
02 | Audit + ticket/seam | Đọc source và DESIGN.md, chốt lát cắt đầu với test gate.
03 | Cải thiện tại chỗ | Teacher Setup/Live, Join/Reader và motion thực; fixture demo có nhãn.
04 | Backend thật | Auth, lưu bài, room, realtime; thử trên hai thiết bị.
05 | Import và kiểm thử | URL lỗi có fallback; annotation sai có chỉnh tay.
06 | Release gate | Kiểm tra secrets, quyền, chi phí và số học viên mục tiêu.
```

**Phong cách app:** đọc sách, nền giấy ngà, chữ mực, serif cho bài đọc. UI và nội dung bài đều tiếng Anh.

Theme của tài liệu này không thay thế brand của app.

**Logo app:** `assets/logo.png`. Attach asset cùng source cho AI Studio; đường dẫn local không phải URL công khai.

## F Hợp đồng sản phẩm đã chốt

| Nội dung | Trạng thái |
|---|---|
| Highlight | Đã chốt: detect và tô exact phrase, không tô cả câu/đoạn |
| Thời gian | Mặc định giữ 3s + xóa 1s; tùy chọn tổng 3s có 1s xóa cuối |
| Quy mô | Đã chốt: khoảng 20 học viên/phòng; cần load test |
| Ngôn ngữ | Đã chốt: UI tiếng Anh, bài tiếng Anh |
| Học viên vào phòng | Link + tên, không đăng ký; late join cùng trạng thái hiện tại |
| Sau khi xóa | Trang trống chờ teacher; giáo viên chuyển thủ công |
| Teacher | Google sign-in qua Firebase; toàn quyền phòng của mình |
| Import MVP | Text/TXT/URL; agent seed Draft trực tiếp database; PDF/DOCX sau |

**Trạng thái:** prototype từng build pass trong audit; chưa xác minh production Auth/backend/rules/realtime hoặc deploy. Export Stitch local đã xóa; remote project không bị xóa. Xem [handoff hiện hành](aistudio-handoff.md).

Xem yêu cầu chi tiết tại [PRD](PRD.md), visual contract tại [DESIGN.md](../DESIGN.md).

**Cơ sở:** yêu cầu của bạn và tài liệu Google về [AI Studio Build](https://ai.google.dev/gemini-api/docs/aistudio-build-mode), [full-stack](https://ai.google.dev/gemini-api/docs/aistudio-fullstack).

Bản `docs/architecture-proposal.md` là lịch sử, không phải hợp đồng hiện tại. PRD và DESIGN.md là nguồn chuẩn; lựa chọn triển khai cloud còn cần xác minh.
