import { useEffect, useRef } from 'react'
import { http } from '@/lib/http'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore, type PinnedPage } from '@/stores/uiStore'

/**
 * Đồng bộ trang ghim với server theo người dùng: tải khi đăng nhập, lưu lại (gộp các thay đổi liên tiếp) mỗi khi
 * ghim / bỏ ghim. Lỗi lưu chỉ ghi console — lần ghim sau sẽ gửi lại cả danh sách.
 */
export function usePinnedPagesSync() {
  const username = useAuthStore((s) => s.user?.username)
  const setPinnedPages = useUiStore((s) => s.setPinnedPages)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!username) return
    let cancelled = false
    useUiStore.setState({ pinnedPages: [], pinsLoaded: false })
    http
      .get<PinnedPage[]>('/profile/pinned-pages')
      .then((r) => !cancelled && setPinnedPages(r.data))
      .catch(() => !cancelled && setPinnedPages([]))
    return () => {
      cancelled = true
    }
  }, [username, setPinnedPages])

  useEffect(
    () =>
      useUiStore.subscribe((state, prev) => {
        if (!state.pinsLoaded || !prev.pinsLoaded || state.pinnedPages === prev.pinnedPages) return
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => {
          http.put('/profile/pinned-pages', { pages: useUiStore.getState().pinnedPages }).catch((e: unknown) => {
            console.warn('Không lưu được trang ghim', e)
          })
        }, 400)
      }),
    [],
  )
}
