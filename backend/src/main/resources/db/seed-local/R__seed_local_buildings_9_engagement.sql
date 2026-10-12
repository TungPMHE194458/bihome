-- Nhắc nhở và khảo sát mẫu (local) ở SKY01. Chỉ thêm khi chưa có (theo tiêu đề).
INSERT INTO REMINDER (BUILDING_ID, TITLE, CONTENT, AUDIENCE, SCHEDULE_TYPE, MONTHLY_DAY, MONTHLY_TIME, NEXT_RUN_AT,
                      STATUS, CREATED_BY, UPDATED_BY)
SELECT b.ID, 'Nhắc đóng phí dịch vụ hằng tháng',
       '<p>Kính gửi Quý cư dân,</p><p>Ban quản lý xin nhắc <b>hạn đóng phí dịch vụ</b> là ngày 10 hằng tháng. '
           || 'Quý cư dân có thể chuyển khoản hoặc đóng trực tiếp tại văn phòng BQL (tầng 1).</p>',
       'ALL', 'MONTHLY', 5, '09:00',
       FROM_TZ(CAST(ADD_MONTHS(TRUNC(SYSDATE, 'MM'), 1) + 4 + 9 / 24 AS TIMESTAMP), 'Asia/Ho_Chi_Minh'),
       'SCHEDULED', 'admin', 'admin'
FROM BUILDING b
WHERE b.CODE = 'SKY01'
  AND NOT EXISTS (SELECT 1 FROM REMINDER r WHERE r.BUILDING_ID = b.ID AND r.TITLE = 'Nhắc đóng phí dịch vụ hằng tháng');

INSERT INTO REMINDER (BUILDING_ID, TITLE, CONTENT, AUDIENCE, SCHEDULE_TYPE, STATUS, RUN_COUNT, RECIPIENT_COUNT,
                      LAST_SENT_AT, CREATED_BY, UPDATED_BY)
SELECT b.ID, 'Lịch phun thuốc muỗi tầng 1–2',
       '<p>BQL sẽ phun thuốc diệt muỗi hành lang tầng 1–2 vào <b>sáng thứ 7</b>. Vui lòng đóng cửa sổ trong thời gian phun.</p>',
       'FLOOR', 'NOW', 'SENT', 1, 0, SYSTIMESTAMP, 'admin', 'admin'
FROM BUILDING b
WHERE b.CODE = 'SKY01'
  AND NOT EXISTS (SELECT 1 FROM REMINDER r WHERE r.BUILDING_ID = b.ID AND r.TITLE = 'Lịch phun thuốc muỗi tầng 1–2');

INSERT INTO REMINDER_CHANNEL (REMINDER_ID, CHANNEL)
SELECT r.ID, c.CHANNEL
FROM REMINDER r
CROSS JOIN (SELECT 'IN_APP' CHANNEL FROM DUAL UNION ALL SELECT 'EMAIL' FROM DUAL) c
WHERE r.TITLE IN ('Nhắc đóng phí dịch vụ hằng tháng', 'Lịch phun thuốc muỗi tầng 1–2')
  AND NOT EXISTS (SELECT 1 FROM REMINDER_CHANNEL x WHERE x.REMINDER_ID = r.ID);

INSERT INTO REMINDER_TARGET (REMINDER_ID, TARGET_VALUE)
SELECT r.ID, t.FLOOR_NO
FROM REMINDER r
CROSS JOIN (SELECT '1' FLOOR_NO FROM DUAL UNION ALL SELECT '2' FROM DUAL) t
WHERE r.TITLE = 'Lịch phun thuốc muỗi tầng 1–2'
  AND NOT EXISTS (SELECT 1 FROM REMINDER_TARGET x WHERE x.REMINDER_ID = r.ID);

-- Khảo sát đang mở (có phản hồi mẫu) và một khảo sát nháp.
INSERT INTO SURVEY (BUILDING_ID, TITLE, DESCRIPTION, AUDIENCE, START_AT, END_AT, ANONYMOUS, STATUS, PUBLISHED_AT,
                    CREATED_BY, UPDATED_BY)
SELECT b.ID, 'Đánh giá chất lượng dịch vụ quý 4',
       'Ý kiến của Quý cư dân giúp Ban quản lý cải thiện dịch vụ vệ sinh, an ninh và tiện ích.',
       'ALL', SYSTIMESTAMP - INTERVAL '3' DAY, SYSTIMESTAMP + INTERVAL '20' DAY, 0, 'OPEN', SYSTIMESTAMP - INTERVAL '3' DAY,
       'admin', 'admin'
FROM BUILDING b
WHERE b.CODE = 'SKY01'
  AND NOT EXISTS (SELECT 1 FROM SURVEY s WHERE s.BUILDING_ID = b.ID AND s.TITLE = 'Đánh giá chất lượng dịch vụ quý 4');

INSERT INTO SURVEY (BUILDING_ID, TITLE, DESCRIPTION, AUDIENCE, START_AT, END_AT, ANONYMOUS, STATUS, CREATED_BY, UPDATED_BY)
SELECT b.ID, 'Khảo sát nhu cầu lắp trạm sạc xe điện', NULL, 'ALL',
       SYSTIMESTAMP + INTERVAL '7' DAY, SYSTIMESTAMP + INTERVAL '30' DAY, 1, 'DRAFT', 'admin', 'admin'
FROM BUILDING b
WHERE b.CODE = 'SKY01'
  AND NOT EXISTS (SELECT 1 FROM SURVEY s WHERE s.BUILDING_ID = b.ID AND s.TITLE = 'Khảo sát nhu cầu lắp trạm sạc xe điện');

INSERT INTO SURVEY_QUESTION (SURVEY_ID, POSITION, TYPE_CODE, CONTENT, REQUIRED)
SELECT s.ID, q.POS, q.TYPE_CODE, q.CONTENT, q.REQUIRED
FROM SURVEY s
JOIN (
    SELECT 'Đánh giá chất lượng dịch vụ quý 4' TITLE, 0 POS, 'RATING' TYPE_CODE, 'Mức độ hài lòng chung với Ban quản lý' CONTENT, 1 REQUIRED FROM DUAL UNION ALL
    SELECT 'Đánh giá chất lượng dịch vụ quý 4', 1, 'SINGLE', 'Vệ sinh khu vực chung', 1 FROM DUAL UNION ALL
    SELECT 'Đánh giá chất lượng dịch vụ quý 4', 2, 'MULTIPLE', 'Tiện ích Quý cư dân muốn bổ sung', 0 FROM DUAL UNION ALL
    SELECT 'Đánh giá chất lượng dịch vụ quý 4', 3, 'TEXT', 'Góp ý khác', 0 FROM DUAL UNION ALL
    SELECT 'Khảo sát nhu cầu lắp trạm sạc xe điện', 0, 'SINGLE', 'Gia đình có xe điện không?', 1 FROM DUAL
) q ON q.TITLE = s.TITLE
WHERE NOT EXISTS (SELECT 1 FROM SURVEY_QUESTION x WHERE x.SURVEY_ID = s.ID);

INSERT INTO SURVEY_OPTION (QUESTION_ID, POSITION, LABEL)
SELECT q.ID, o.POS, o.LABEL
FROM SURVEY_QUESTION q
JOIN (
    SELECT 'Vệ sinh khu vực chung' CONTENT, 0 POS, 'Rất tốt' LABEL FROM DUAL UNION ALL
    SELECT 'Vệ sinh khu vực chung', 1, 'Tốt' FROM DUAL UNION ALL
    SELECT 'Vệ sinh khu vực chung', 2, 'Cần cải thiện' FROM DUAL UNION ALL
    SELECT 'Tiện ích Quý cư dân muốn bổ sung', 0, 'Sân chơi trẻ em' FROM DUAL UNION ALL
    SELECT 'Tiện ích Quý cư dân muốn bổ sung', 1, 'Phòng đọc sách' FROM DUAL UNION ALL
    SELECT 'Tiện ích Quý cư dân muốn bổ sung', 2, 'Sân cầu lông' FROM DUAL UNION ALL
    SELECT 'Gia đình có xe điện không?', 0, 'Đã có' FROM DUAL UNION ALL
    SELECT 'Gia đình có xe điện không?', 1, 'Dự định mua' FROM DUAL UNION ALL
    SELECT 'Gia đình có xe điện không?', 2, 'Không' FROM DUAL
) o ON o.CONTENT = q.CONTENT
WHERE NOT EXISTS (SELECT 1 FROM SURVEY_OPTION x WHERE x.QUESTION_ID = q.ID);

-- Phản hồi mẫu của 3 cư dân (BQL nhập hộ).
INSERT INTO SURVEY_RESPONSE (SURVEY_ID, APARTMENT_ID, RESIDENT_ID, SUBMITTED_AT, CREATED_BY, UPDATED_BY)
SELECT s.ID, a.ID, r.ID, SYSTIMESTAMP - NUMTODSINTERVAL(x.AGO, 'HOUR'), 'admin', 'admin'
FROM SURVEY s
JOIN BUILDING b ON b.ID = s.BUILDING_ID AND b.CODE = 'SKY01'
JOIN (
    SELECT 'A0101' APT, 'CD000002' RES, 50 AGO FROM DUAL UNION ALL
    SELECT 'A0201', 'CD000005', 30 FROM DUAL UNION ALL
    SELECT 'A0102', 'CD000004', 5 FROM DUAL
) x ON 1 = 1
JOIN APARTMENT a ON a.BUILDING_ID = b.ID AND a.CODE = x.APT
JOIN RESIDENT r ON r.BUILDING_ID = b.ID AND r.CODE = x.RES
WHERE s.TITLE = 'Đánh giá chất lượng dịch vụ quý 4'
  AND NOT EXISTS (SELECT 1 FROM SURVEY_RESPONSE y WHERE y.SURVEY_ID = s.ID AND y.RESIDENT_ID = r.ID);

INSERT INTO SURVEY_ANSWER (RESPONSE_ID, QUESTION_ID, OPTION_ID, TEXT_VALUE, RATING)
SELECT rs.ID, q.ID, o.ID, v.TEXT_VALUE, v.RATING
FROM SURVEY_RESPONSE rs
JOIN SURVEY s ON s.ID = rs.SURVEY_ID AND s.TITLE = 'Đánh giá chất lượng dịch vụ quý 4'
JOIN RESIDENT r ON r.ID = rs.RESIDENT_ID
JOIN (
    SELECT 'CD000002' RES, 0 POS, NULL LABEL, NULL TEXT_VALUE, 5 RATING FROM DUAL UNION ALL
    SELECT 'CD000002', 1, 'Rất tốt', NULL, NULL FROM DUAL UNION ALL
    SELECT 'CD000002', 2, 'Sân chơi trẻ em', NULL, NULL FROM DUAL UNION ALL
    SELECT 'CD000002', 2, 'Phòng đọc sách', NULL, NULL FROM DUAL UNION ALL
    SELECT 'CD000005', 0, NULL, NULL, 4 FROM DUAL UNION ALL
    SELECT 'CD000005', 1, 'Tốt', NULL, NULL FROM DUAL UNION ALL
    SELECT 'CD000005', 2, 'Sân chơi trẻ em', NULL, NULL FROM DUAL UNION ALL
    SELECT 'CD000005', 3, NULL, 'Nên tăng tần suất thu gom rác cuối tuần.', NULL FROM DUAL UNION ALL
    SELECT 'CD000004', 0, NULL, NULL, 3 FROM DUAL UNION ALL
    SELECT 'CD000004', 1, 'Cần cải thiện', NULL, NULL FROM DUAL UNION ALL
    SELECT 'CD000004', 3, NULL, 'Thang máy số 2 thường xuyên chờ lâu.', NULL FROM DUAL
) v ON v.RES = r.CODE
JOIN SURVEY_QUESTION q ON q.SURVEY_ID = s.ID AND q.POSITION = v.POS
LEFT JOIN SURVEY_OPTION o ON o.QUESTION_ID = q.ID AND o.LABEL = v.LABEL
WHERE NOT EXISTS (SELECT 1 FROM SURVEY_ANSWER y WHERE y.RESPONSE_ID = rs.ID);
