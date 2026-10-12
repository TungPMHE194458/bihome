-- Dữ liệu mẫu cho môi trường local (tòa nhà giả lập, không phải dữ liệu thật).
MERGE INTO BUILDING b
USING (
    SELECT 'SKY01' CODE, 'BiHome Sky Tower' NAME, 'Hà Nội' PROVINCE, 'Phường Cầu Giấy' WARD,
           'Số 1 đường Trung Kính' ADDRESS_DETAIL, 'BUILDING' TYPE, 35 FLOORS_ABOVE, 3 FLOORS_BELOW,
           'Công ty CP BiHome Land' INVESTOR, '1900 1234' HOTLINE, 'bql.sky@bihome.local' EMAIL, 'ACTIVE' STATUS
    FROM DUAL UNION ALL
    SELECT 'GRD01', 'Khu đô thị BiHome Garden', 'TP. Hồ Chí Minh', 'Phường Thủ Đức', 'Đường số 9, khu A',
           'COMPOUND', 25, 2, 'Công ty CP BiHome Land', '1900 5678', 'bql.garden@bihome.local', 'ACTIVE'
    FROM DUAL UNION ALL
    SELECT 'RIV01', 'BiHome Riverside', 'Đà Nẵng', 'Phường Hải Châu', '12 đường Bạch Đằng',
           'RENTAL', 18, 1, 'Công ty TNHH BiHome Đà Nẵng', '0236 3888 999', 'bql.riverside@bihome.local', 'ACTIVE'
    FROM DUAL UNION ALL
    SELECT 'OLD01', 'Tòa nhà Cũ An Phú', 'TP. Hồ Chí Minh', 'Phường An Khánh', '45 đường Lương Định Của',
           'BUILDING', 12, 1, NULL, NULL, NULL, 'INACTIVE'
    FROM DUAL
) s
ON (b.CODE = s.CODE)
WHEN NOT MATCHED THEN
    INSERT (CODE, NAME, PROVINCE, WARD, ADDRESS_DETAIL, TYPE, FLOORS_ABOVE, FLOORS_BELOW, INVESTOR, HOTLINE,
            MANAGEMENT_EMAIL, STATUS)
    VALUES (s.CODE, s.NAME, s.PROVINCE, s.WARD, s.ADDRESS_DETAIL, s.TYPE, s.FLOORS_ABOVE, s.FLOORS_BELOW,
            s.INVESTOR, s.HOTLINE, s.EMAIL, s.STATUS);
