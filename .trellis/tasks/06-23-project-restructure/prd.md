# Tái cấu trúc project structure

## Goal

Sắp xếp lại cấu trúc thư mục cho rõ ràng, dễ quản lý theo chuẩn React/Vite.

## Current problems

- `App.tsx`, `index.tsx`, `index.css`, `types.ts` nằm ở root thay vì trong `src/`
- `types.ts` và `types/` tồn tại song song
- `Dockerfile` và `.dockerignore` nằm riêng rẽ thay vì trong `docker/`
- `metadata.json` không rõ vai trò
- Đường dẫn import lộn xộn giữa `./types`, `./components/`, `./views/`, `./services/`

## Proposed structure

```
insight-scholar/
├── public/
│   └── index.html
├── src/
│   ├── main.tsx              (từ index.tsx)
│   ├── App.tsx
│   ├── App.css               (từ index.css)
│   ├── types/
│   │   ├── index.ts          (gộp types.ts + types/)
│   │   └── global.d.ts
│   ├── components/
│   ├── views/
│   └── services/
├── docker/
│   ├── Dockerfile
│   └── .dockerignore
├── tests/
│   ├── unit/
│   └── e2e/
├── insight_scholar.py
├── AGENTS.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── README.md
```

## Requirements

1. Di chuyển `App.tsx`, `index.tsx` (→ `main.tsx`), `index.css` (→ `App.css`), `types.ts` vào `src/`
2. Gộp `types/` global.d.ts và `types.ts` vào `src/types/index.ts`
3. Cập nhật tất cả imports trong `src/` từ `'./types'` → `'./types'` (giữ nguyên nếu cùng thư mục)
4. Cập nhật import `index.tsx` → `main.tsx` trong `index.html`
5. Di chuyển `Dockerfile` và `.dockerignore` vào `docker/`
6. Cập nhật đường dẫn trong vite.config.ts, tsconfig.json (paths, typeRoots)
7. Cập nhật `insight_scholar.py` nếu có tham chiếu đường dẫn
8. Xoá `metadata.json` nếu không dùng

## Acceptance Criteria

- [ ] `npm run dev` chạy được, không lỗi module
- [ ] `npx tsc --noEmit` pass 0 lỗi
- [ ] `npx vitest run` pass 5 tests
- [ ] `npx vite build` thành công
- [ ] Docker build chạy được từ đường dẫn mới
- [ ] Không còn file `.tsx`/`.ts`/`.css` ở root ngoại trừ config files

## Out of Scope

- Đổi tên component/view/service bên trong
- Thay đổi logic code
- Cấu hình CI/CD
