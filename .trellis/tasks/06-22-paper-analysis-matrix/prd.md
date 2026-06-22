# Cải tiến quy trình phân tích và ma trận tổng quan bài báo

## Goal

Chuyển chế độ phân tích bài báo khoa học từ bản tóm tắt mô tả chung sang quy trình phản biện có căn cứ gồm 3 giai đoạn và 7 bước; trình bày kết quả dưới dạng chi tiết và ma trận tổng quan dễ đối chiếu, xuất dữ liệu và tái sử dụng.

## Confirmed Facts

- Ứng dụng React/Vite chạy hoàn toàn phía client, gọi Gemini hoặc OpenRouter và yêu cầu JSON theo schema.
- Chế độ `ACADEMIC` hiện dùng các trường cũ như luận đề, khung lý thuyết, phương pháp, kết quả và kết luận; chưa tách kết luận độc lập khỏi kết luận tác giả.
- Thay đổi đang dang dở đã tạo schema 7 bước nhưng giao diện, xuất báo cáo và các consumer vẫn dùng schema cũ nên hiện chưa đồng bộ.
- File PDF/DOCX chỉ được trích xuất thành text. Ảnh, cấu trúc bảng và biểu đồ không được truyền trực tiếp cho LLM; đánh giá phải công khai giới hạn này và không được suy diễn dữ liệu không có trong text.
- Màn hình `SynthesisMatrixView` hiện là ma trận liên bài: một hàng cho mỗi tài liệu, ba cột mặc định và cột tùy chỉnh; toàn bộ ma trận được gọi LLM để sinh lại.
- Xuất Excel hiện ghi object lồng nhau trực tiếp, nên không phù hợp với schema 7 bước.
- Xuất TXT và ZIP, phân loại thư mục, bibliometric và synthesis matrix đều phụ thuộc trực tiếp hoặc gián tiếp vào các trường học thuật cũ.
- Dự án chưa có test runner hoặc test tự động; chỉ có script build.
- Nhiều chuỗi tiếng Việt trong source đang bị mojibake và cần sửa tại các màn hình chạm tới trong phạm vi công việc.

## Requirements

### Quy trình phân tích 7 bước

1. Giai đoạn đánh giá tổng thể:
   - Bước 1: tổng quan loại nghiên cứu, phạm vi, bối cảnh/đối tượng, phương pháp chính và phát hiện nổi bật từ abstract/hình/bảng khả dụng.
   - Bước 2: câu hỏi hoặc giả thuyết nghiên cứu cốt lõi; ghi rõ là tác giả phát biểu trực tiếp hay hệ thống suy ra.
   - Bước 3: điều đã biết, điều chưa rõ và tầm quan trọng của khoảng trống tri thức.
2. Giai đoạn chất vấn:
   - Bước 4: độ phù hợp thiết kế, mẫu và power, đối chứng, thiên lệch, thống kê, dữ liệu/mã nguồn và khả năng tái lập.
   - Bước 5: kết luận độc lập chỉ từ Results/hình/bảng, tách khỏi Discussion/Conclusion; phân biệt ý nghĩa thống kê/thực tiễn và tương quan/nhân quả.
3. Giai đoạn phán quyết:
   - Bước 6: kết luận tác giả, mức đồng thuận với Bước 5 và dấu hiệu cường điệu/vượt bằng chứng.
   - Bước 7: hạn chế, nhiễu, giải thích thay thế, tài trợ/xung đột lợi ích và phán quyết cuối có mức độ chắc chắn.
4. Mọi bước phải có bằng chứng truy vết được theo section/table/figure hoặc diễn giải ngắn; thông tin thiếu phải được ghi là không được báo cáo, không bịa đặt.
5. Kết quả giữ ngôn ngữ chính của bài báo; nhãn giao diện theo lựa chọn VI/EN.

### Trình bày và ma trận

- Trang chi tiết hiển thị rõ 3 giai đoạn, 7 bước, bằng chứng và các tiêu chí con quan trọng.
- Sau khi AI hoàn thành 7 bước, hệ thống ánh xạ kết quả thành một literature matrix chuẩn hóa; một bài báo tương ứng một hàng.
- Bộ cột literature matrix dựa trên Matrix Method và nhóm trường data-extraction của Cochrane: định danh; phạm vi/bối cảnh; câu hỏi/khoảng trống; thiết kế-mẫu-phân tích; kết quả; phản biện; đóng góp/synthesis.
- Bộ cột lõi là chuẩn đầy đủ mặc định, luôn được giữ để bảo đảm khả năng so sánh giữa các bài.
- Người dùng có thể thêm cột tùy chỉnh cho nhu cầu chuyên ngành; cột tùy chỉnh không thay thế, đổi nghĩa hoặc xóa cột lõi.
- Mỗi khái niệm phân tích là một cột riêng; không ghép các nội dung độc lập bằng dấu `/` trong một cột.
- `Từ khóa` và `Chủ đề` là hai cột riêng.
- `Hàm ý lý thuyết` và `Hàm ý thực tiễn` là hai cột riêng.
- Không đưa `Vị trí bằng chứng trong bài` vào sheet `Literature Matrix`; evidence/source location chỉ xuất ở sheet `Critical Appraisal`.
- Ma trận phải tách thông tin tác giả báo cáo khỏi nhận định độc lập của AI/người đọc.
- Ma trận dùng dữ liệu phân tích đã có, không gọi LLM lần hai để tái sinh các trường chuẩn hóa.
- File Excel của một bài gồm sheet `Literature Matrix` (một hàng chuẩn hóa), sheet `Critical Appraisal` (7 hàng có evidence) và sheet `Metadata` (nguồn, phiên bản schema, giới hạn trích xuất).
- Màn hình ma trận nhiều bài tiếp tục gom mỗi kết quả đã phân tích thành một hàng để so sánh và xuất chung.
- Excel/TXT/ZIP phải flatten dữ liệu có cấu trúc thành nội dung có thể đọc được.
- Dữ liệu học thuật schema cũ không được làm crash giao diện; phải có chiến lược tương thích hoặc yêu cầu phân tích lại rõ ràng.

### Chất lượng kỹ thuật

- TypeScript schema, prompt, UI, export, phân loại và tổng hợp phải đồng bộ.
- Xác thực/chuẩn hóa JSON trả về trước khi đưa vào state.
- Không thay đổi logic chế độ `POLICY` ngoài các sửa lỗi cần thiết để tránh regression.
- Giữ nguyên các chỉnh sửa OpenRouter đã có trong working tree.
- Cung cấp một entrypoint Python để tự động chuẩn bị và kích hoạt hệ thống trên máy local; hành vi chi tiết chờ chốt trong Open Questions.
- Mức độ mạnh bằng chứng dùng thang trung tính `Mạnh`, `Trung bình`, `Hạn chế`, `Rất hạn chế`, `Không đủ thông tin`; luôn kèm lý do và không gắn nhãn GRADE.

## Acceptance Criteria

- [ ] Một bài báo học thuật mới trả về đủ 7 bước, đúng cấu trúc và có evidence cho từng bước.
- [ ] Prompt cấm bịa dữ liệu và công khai giới hạn khi hình/bảng không có trong text trích xuất.
- [ ] UI chi tiết hiển thị đủ 3 giai đoạn, 7 bước và các tiêu chí con mà không đọc trường schema cũ.
- [ ] Mỗi kết quả học thuật tạo được một hàng literature matrix chuẩn hóa mà không gọi lại LLM.
- [ ] Excel một bài có đủ `Literature Matrix`, `Critical Appraisal`, `Metadata`; ô dài được wrap và header dễ đọc.
- [ ] Ma trận nhiều bài dùng cùng bộ cột lõi và có thể xuất một workbook so sánh.
- [ ] Không có cột lõi nào ghép hai khái niệm độc lập; từ khóa, chủ đề, hàm ý lý thuyết và hàm ý thực tiễn được tách riêng.
- [ ] Sheet matrix chính không có cột vị trí bằng chứng; sheet appraisal vẫn giữ evidence cho từng bước.
- [ ] Xuất Excel và TXT/ZIP thể hiện đủ 7 bước, không có `[object Object]` hoặc trường `undefined`.
- [ ] Bibliometric, phân loại thư mục và synthesis không hỏng khi dùng kết quả schema mới.
- [ ] Kết quả cũ không làm crash giao diện.
- [ ] Build TypeScript/Vite thành công.
- [ ] Các hành vi chuyển đổi/flatten quan trọng có kiểm thử tự động hoặc kiểm thử fixture tương đương.
- [ ] Nhật ký Trellis ghi lại thiết kế, thay đổi và kết quả xác minh.
- [ ] Có file Python entrypoint với thông báo lỗi rõ ràng và không ghi đè cấu hình/người dùng ngoài ý muốn.

## Out of Scope

- OCR cho PDF scan.
- Computer vision để đọc trực tiếp ảnh/biểu đồ trong PDF.
- Backend lưu trữ hoặc cơ sở dữ liệu mới.
- Thay đổi nghiệp vụ phân tích chính sách/tin tức.

## Open Questions

Không còn câu hỏi chặn planning.

## Confirmed Product Decisions

- Một AI phải hoàn thành đủ 7 bước trước khi tạo literature matrix.
- Literature matrix có bộ cột lõi đầy đủ; người dùng được thêm cột tùy chỉnh về sau.
- Mỗi nội dung độc lập là một cột; không ghép bằng dấu `/`.
- Excel là đầu ra bắt buộc sau phân tích, gồm matrix, critical appraisal và metadata.
- Thang bằng chứng là thang nội bộ trung tính, không gọi là GRADE.
- `insight_scholar.py` là entrypoint duy nhất với hai chế độ `run` và `test`.
