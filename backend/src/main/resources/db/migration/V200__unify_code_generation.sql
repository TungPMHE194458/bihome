-- Hợp nhất mã tự sinh: Cư dân (CD), Dịch vụ (SP, đổi từ DV%04d vì DV đã dùng cho đơn dịch vụ), Tài liệu (TL) và Yêu
-- cầu hỗ trợ (YC) chuyển sang dùng chung DailyCodeGenerator/CODE_COUNTER thay vì tự tính MAX+1 theo tòa hoặc bảng
-- đếm riêng. Xem quy chuẩn đầy đủ trong docs/SPEC.md mục "Quy chuẩn mã tự sinh".

-- Chuyển bộ đếm theo ngày hiện có của Yêu cầu hỗ trợ sang CODE_COUNTER dùng chung (giữ đúng số đã dùng trong ngày,
-- tránh sinh trùng mã YC nếu migration chạy giữa ngày đang có yêu cầu được tạo).
INSERT INTO CODE_COUNTER (PREFIX, CODE_DATE, LAST_NO)
SELECT 'YC', CODE_DATE, LAST_NO FROM TICKET_CODE_COUNTER;

DROP TABLE TICKET_CODE_COUNTER;
