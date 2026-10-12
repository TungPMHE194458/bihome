import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PinnedPage {
  path: string
  title: string
}

interface UiState {
  sidebarCollapsed: boolean
  openGroups: string[]
  /** Trang ghim của người đang đăng nhập — lưu ở server (usePinnedPagesSync), không lưu trong trình duyệt. */
  pinnedPages: PinnedPage[]
  /** Đã tải danh sách ghim từ server (trước đó chưa đồng bộ ngược lên server). */
  pinsLoaded: boolean
  setPinnedPages: (pages: PinnedPage[]) => void
  toggleSidebar: () => void
  toggleGroup: (key: string) => void
  openGroup: (key: string) => void
  togglePin: (page: PinnedPage) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      openGroups: [],
      pinnedPages: [],
      pinsLoaded: false,
      setPinnedPages: (pages) => set({ pinnedPages: pages, pinsLoaded: true }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleGroup: (key) =>
        set((s) => ({
          openGroups: s.openGroups.includes(key)
            ? s.openGroups.filter((k) => k !== key)
            : [...s.openGroups, key],
        })),
      openGroup: (key) =>
        set((s) => (s.openGroups.includes(key) ? s : { openGroups: [...s.openGroups, key] })),
      togglePin: (page) =>
        set((s) => ({
          pinnedPages: s.pinnedPages.some((p) => p.path === page.path)
            ? s.pinnedPages.filter((p) => p.path !== page.path)
            : [...s.pinnedPages, page],
        })),
    }),
    {
      name: 'bihome-ui',
      // Chỉ lưu tuỳ chọn giao diện; trang ghim theo người dùng nằm ở server.
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, openGroups: s.openGroups }),
    },
  ),
)
