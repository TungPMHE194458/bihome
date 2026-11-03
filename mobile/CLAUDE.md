@AGENTS.md

# BiHome — app cư dân (Expo)

Đọc `../CLAUDE.md` (quy ước chung) và `README.md` (chức năng, chạy, build EAS). Luật nghiệp vụ phía backend của app cư
dân: `../docs/MODULES.md` mục "App cư dân" và "Kê khai từ cư dân".

- Dùng **npm** (không pnpm). Kiểm tra: `npm run typecheck && npm run lint` và `npx expo-doctor`. Bản web
  `npm run web` (cổng 8081, đã có trong CORS local); tài khoản mẫu `0900000001` / `CuDan@123`.
- Chỉ gọi `/api/v1/resident/**` — token cư dân (`typ=resident`) không dùng được cho API Ban quản lý. Cần dữ liệu mới
  thì thêm endpoint ở `backend/.../residentapp/` (gọi lại service của module qua `ResidentSession.actor()`, kiểm tra căn
  bằng `ResidentContext.requireApartment/requireOwned`), không mở API BQL cho cư dân.
- `src/lib/api.ts` (axios + tự làm mới token), `src/lib/auth.tsx` (phiên, căn đang chọn), `src/lib/resident.ts` (mọi
  lời gọi API), `src/lib/types.ts`. Form dùng chung ở `src/components/form.tsx` (DateField dd/mm/yyyy, ChipSelect,
  Segmented, Stepper); mở PDF / tệp qua `src/lib/pdf.openFile`.
- Danh sách gọi API luôn `size` 10/20/50. Địa chỉ backend: `EXPO_PUBLIC_API_URL` (theo profile trong `eas.json`).
