-- Yêu cầu hỗ trợ mẫu (local, dữ liệu giả). Tên file sắp sau cư dân để chạy khi đã có căn hộ/cư dân.
-- Mã dùng ngày cố định trong quá khứ nên không đụng bộ đếm mã của ngày hiện tại.
MERGE INTO TICKET t
USING (
    SELECT b.ID BUILDING_ID, v.CODE, v.TITLE, v.DESCRIPTION, c.ID CATEGORY_ID, a.ID APARTMENT_ID, r.ID RESIDENT_ID,
           v.CHANNEL, v.PRIORITY, v.STATUS, u.ID ASSIGNEE_ID, v.AGE_HOURS,
           c.RESPONSE_SLA_HOURS, c.RESOLUTION_SLA_HOURS, v.RATING
    FROM (
        SELECT 'YC-261001-001' CODE, 'Mất điện căn A-01.01' TITLE, 'Cả căn mất điện từ 7h sáng, aptomat không bật lại được' DESCRIPTION,
               'Điện' CAT, 'A0101' APT, 'CD000001' RES, 'HOTLINE' CHANNEL, 'URGENT' PRIORITY, 'NEW' STATUS,
               CAST(NULL AS VARCHAR2(50)) ASSIGNEE, 30 AGE_HOURS, CAST(NULL AS NUMBER) RATING FROM DUAL UNION ALL
        SELECT 'YC-261001-002', 'Rò rỉ nước trần nhà vệ sinh', 'Nước nhỏ giọt từ trần, nghi do căn tầng trên',
               'Nước', 'A0102', 'CD000004', 'DIRECT', 'HIGH', 'IN_PROGRESS', 'admin', 5, NULL FROM DUAL UNION ALL
        SELECT 'YC-261001-003', 'Thang máy số 2 kêu to', 'Thang máy số 2 phát tiếng kêu khi lên xuống',
               'Thang máy', NULL, NULL, 'HOTLINE', 'MEDIUM', 'RECEIVED', 'admin', 2, NULL FROM DUAL UNION ALL
        SELECT 'YC-261001-004', 'Đề nghị lắp thêm đèn hành lang tầng 3', 'Hành lang tầng 3 khá tối vào buổi tối',
               'Góp ý', 'A0304', 'CD000007', 'APP', 'LOW', 'WAITING', 'admin', 50, NULL FROM DUAL UNION ALL
        SELECT 'YC-261001-005', 'Rác chưa được thu gom', 'Khu tập kết rác tầng hầm chưa được thu gom 2 ngày',
               'Vệ sinh', NULL, NULL, 'HOTLINE', 'MEDIUM', 'DONE', 'admin', 20, 4 FROM DUAL UNION ALL
        SELECT 'YC-261001-006', 'Khiếu nại tiếng ồn căn A-02.01', 'Tiếng ồn sau 23h',
               'Khiếu nại', 'A0201', 'CD000005', 'DIRECT', 'MEDIUM', 'CANCELLED', NULL, 72, NULL FROM DUAL
    ) v
    JOIN BUILDING b ON b.CODE = 'SKY01'
    JOIN TICKET_CATEGORY c ON c.NAME = v.CAT
    LEFT JOIN APARTMENT a ON a.BUILDING_ID = b.ID AND a.CODE = v.APT
    LEFT JOIN RESIDENT r ON r.BUILDING_ID = b.ID AND r.CODE = v.RES
    LEFT JOIN APP_USER u ON u.USERNAME = v.ASSIGNEE
) s
ON (t.CODE = s.CODE)
WHEN NOT MATCHED THEN
    INSERT (BUILDING_ID, CODE, TITLE, DESCRIPTION, CATEGORY_ID, APARTMENT_ID, RESIDENT_ID, CHANNEL, PRIORITY, STATUS,
            ASSIGNEE_ID, RESPONSE_DUE_AT, RESOLUTION_DUE_AT, RESPONDED_AT, RESOLVED_AT, RATING, CREATED_AT, UPDATED_AT,
            CREATED_BY, UPDATED_BY)
    VALUES (s.BUILDING_ID, s.CODE, s.TITLE, s.DESCRIPTION, s.CATEGORY_ID, s.APARTMENT_ID, s.RESIDENT_ID, s.CHANNEL,
            s.PRIORITY, s.STATUS, s.ASSIGNEE_ID,
            SYSTIMESTAMP - NUMTODSINTERVAL(s.AGE_HOURS, 'HOUR') + NUMTODSINTERVAL(s.RESPONSE_SLA_HOURS, 'HOUR'),
            SYSTIMESTAMP - NUMTODSINTERVAL(s.AGE_HOURS, 'HOUR') + NUMTODSINTERVAL(s.RESOLUTION_SLA_HOURS, 'HOUR'),
            CASE WHEN s.STATUS NOT IN ('NEW', 'CANCELLED') THEN SYSTIMESTAMP - NUMTODSINTERVAL(s.AGE_HOURS / 2, 'HOUR') END,
            CASE WHEN s.STATUS = 'DONE' THEN SYSTIMESTAMP - NUMTODSINTERVAL(1, 'HOUR') END,
            s.RATING,
            SYSTIMESTAMP - NUMTODSINTERVAL(s.AGE_HOURS, 'HOUR'), SYSTIMESTAMP - NUMTODSINTERVAL(s.AGE_HOURS, 'HOUR'),
            'admin', 'admin');

-- Mục "tạo yêu cầu" trên dòng thời gian cho các yêu cầu mẫu chưa có.
INSERT INTO TICKET_COMMENT (TICKET_ID, ENTRY_TYPE, VISIBILITY, CREATED_AT, UPDATED_AT, CREATED_BY, UPDATED_BY)
SELECT t.ID, 'CREATED', 'PUBLIC', t.CREATED_AT, t.CREATED_AT, 'admin', 'admin'
FROM TICKET t
WHERE t.CODE LIKE 'YC-261001-%'
  AND NOT EXISTS (SELECT 1 FROM TICKET_COMMENT e WHERE e.TICKET_ID = t.ID AND e.ENTRY_TYPE = 'CREATED');
