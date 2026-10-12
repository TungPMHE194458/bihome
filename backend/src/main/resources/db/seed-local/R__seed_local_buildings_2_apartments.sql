-- Căn hộ mẫu cho môi trường local. Tên file sắp sau "seed local buildings" để chạy sau khi đã có tòa nhà.
MERGE INTO APARTMENT a
USING (
    SELECT b.ID BUILDING_ID,
           'A' || LPAD(f.n, 2, '0') || LPAD(u.n, 2, '0') CODE,
           'A-' || LPAD(f.n, 2, '0') || '.' || LPAD(u.n, 2, '0') NAME,
           TO_CHAR(f.n) FLOOR_NO,
           CASE WHEN u.n IN (1, 4) THEN 3 ELSE 2 END BEDROOMS,
           CASE WHEN u.n IN (1, 4) THEN 5 ELSE 4 END ROOMS,
           CASE WHEN u.n IN (1, 4) THEN 98.5 ELSE 72.3 END AREA,
           CASE WHEN f.n = 6 THEN 'PENTHOUSE' ELSE 'APARTMENT' END TYPE,
           CASE WHEN MOD(f.n + u.n, 3) = 0 THEN 'RENT' ELSE 'OWN' END OWNERSHIP_TYPE,
           CASE WHEN MOD(f.n * u.n, 5) = 0 THEN 'VACANT'
                WHEN MOD(f.n * u.n, 7) = 0 THEN 'RENOVATING'
                ELSE 'OCCUPIED' END USAGE_STATUS
    FROM BUILDING b
    CROSS JOIN (SELECT LEVEL n FROM DUAL CONNECT BY LEVEL <= 6) f
    CROSS JOIN (SELECT LEVEL n FROM DUAL CONNECT BY LEVEL <= 4) u
    WHERE b.CODE = 'SKY01'
    UNION ALL
    SELECT b.ID, 'V' || LPAD(v.n, 2, '0'), 'Villa V-' || LPAD(v.n, 2, '0'), '1', 4, 7, 250, 'VILLA',
           'OWN', CASE WHEN v.n = 8 THEN 'VACANT' ELSE 'OCCUPIED' END
    FROM BUILDING b
    CROSS JOIN (SELECT LEVEL n FROM DUAL CONNECT BY LEVEL <= 8) v
    WHERE b.CODE = 'GRD01'
    UNION ALL
    SELECT b.ID, 'SH' || LPAD(s.n, 2, '0'), 'Shophouse SH-' || LPAD(s.n, 2, '0'), '1', 0, 2, 120, 'SHOPHOUSE',
           'RENT', 'OCCUPIED'
    FROM BUILDING b
    CROSS JOIN (SELECT LEVEL n FROM DUAL CONNECT BY LEVEL <= 2) s
    WHERE b.CODE = 'GRD01'
) s
ON (a.BUILDING_ID = s.BUILDING_ID AND a.CODE = s.CODE)
WHEN NOT MATCHED THEN
    INSERT (BUILDING_ID, CODE, NAME, FLOOR_NO, BEDROOMS, ROOMS, AREA, TYPE, OWNERSHIP_TYPE, USAGE_STATUS, STATUS)
    VALUES (s.BUILDING_ID, s.CODE, s.NAME, s.FLOOR_NO, s.BEDROOMS, s.ROOMS, s.AREA, s.TYPE, s.OWNERSHIP_TYPE,
            s.USAGE_STATUS, 'ACTIVE');
