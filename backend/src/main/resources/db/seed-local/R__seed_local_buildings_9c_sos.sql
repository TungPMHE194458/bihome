-- Cảnh báo SOS mẫu (local) ở SKY01: một cảnh báo đã xử lý (không để cảnh báo đang mở để nút SOS không báo động).
INSERT INTO SOS_ALERT (BUILDING_ID, CODE, ALERT_TYPE, SOURCE, APARTMENT_ID, REPORTER_NAME, REPORTER_PHONE, LOCATION,
                       DESCRIPTION, STATUS, ACKNOWLEDGED_AT, ACKNOWLEDGED_BY, RESOLVED_AT, RESOLVED_BY, RESOLUTION_NOTE,
                       CREATED_AT, CREATED_BY, UPDATED_BY)
SELECT b.ID, 'SOS-SEED-001', 'ELEVATOR', 'MANUAL', NULL, 'Bảo vệ ca đêm', '0900000009', 'Thang máy số 2, kẹt giữa tầng 4 và 5',
       'Có 2 người mắc kẹt, gọi qua bộ đàm thang máy.', 'RESOLVED',
       SYSTIMESTAMP - INTERVAL '3' DAY + INTERVAL '3' MINUTE, 'admin',
       SYSTIMESTAMP - INTERVAL '3' DAY + INTERVAL '25' MINUTE, 'admin',
       'Kỹ thuật thang máy đã cứu hộ, không ai bị thương. Đã báo nhà thầu bảo trì kiểm tra.',
       SYSTIMESTAMP - INTERVAL '3' DAY, 'admin', 'admin'
FROM BUILDING b
WHERE b.CODE = 'SKY01' AND NOT EXISTS (SELECT 1 FROM SOS_ALERT s WHERE s.CODE = 'SOS-SEED-001');
