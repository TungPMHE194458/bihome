import { useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PAGE_SIZES } from '@/components/DataTable/ListPagination'
import type { FilterValues } from '@/components/DataTable/types'

export type ViewMode = 'list' | 'grid'

interface UseListParamsOptions {
  /** Tên các tham số lọc (gồm cả keyword, fromKey/toKey của khoảng ngày). */
  filterKeys: readonly string[]
  defaultSort?: string
}

/**
 * Filter, phân trang, sắp xếp và chế độ xem nằm trên URL để tải lại / chia sẻ link vẫn giữ nguyên.
 * Đổi filter hoặc số dòng mỗi trang thì quay về trang đầu.
 */
export function useListParams({ filterKeys, defaultSort }: UseListParamsOptions) {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(0, Number(searchParams.get('page')) || 0)
  const rawSize = Number(searchParams.get('size'))
  const size = PAGE_SIZES.includes(rawSize) ? rawSize : PAGE_SIZES[0]
  const sort = searchParams.get('sort') ?? defaultSort
  const view: ViewMode = searchParams.get('view') === 'grid' ? 'grid' : 'list'

  const filterKeysKey = filterKeys.join('|')
  const filters = useMemo(() => {
    const result: FilterValues = {}
    for (const key of filterKeysKey.split('|')) {
      const value = searchParams.get(key)
      if (value) result[key] = value
    }
    return result
  }, [searchParams, filterKeysKey])

  // setSearchParams(prev => …) của React Router nhận searchParams của lần render trước, nên hai lần cập nhật
  // liên tiếp trước khi render lại (vd xoá cả "từ ngày" lẫn "đến ngày") sẽ ghi đè nhau. Giữ bản mới nhất ở ref.
  const pending = useRef({ seen: searchParams, latest: searchParams })
  if (pending.current.seen !== searchParams) pending.current = { seen: searchParams, latest: searchParams }

  const update = useCallback(
    (changes: Record<string, string | undefined>, resetPage: boolean) => {
      const next = new URLSearchParams(pending.current.latest)
      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined || value === '') next.delete(key)
        else next.set(key, value)
      }
      if (resetPage) next.delete('page')
      pending.current.latest = next
      setSearchParams(next, { replace: true })
    },
    [setSearchParams],
  )

  const setFilter = useCallback((key: string, value: string) => update({ [key]: value }, true), [update])
  const clearFilters = useCallback(
    () => update(Object.fromEntries(filterKeysKey.split('|').map((k) => [k, undefined])), true),
    [update, filterKeysKey],
  )
  const setPage = useCallback((p: number) => update({ page: p > 0 ? String(p) : undefined }, false), [update])
  const setSize = useCallback((s: number) => update({ size: String(s) }, true), [update])
  const setSort = useCallback((s: string | undefined) => update({ sort: s }, false), [update])
  const setView = useCallback((v: ViewMode) => update({ view: v === 'grid' ? 'grid' : undefined }, false), [update])

  /** Tham số gửi lên API: bỏ giá trị rỗng, cắt khoảng trắng thừa. */
  const apiParams = useMemo(() => {
    const params: Record<string, string | number> = { page, size }
    if (sort) params.sort = sort
    for (const [key, value] of Object.entries(filters)) {
      const trimmed = value?.trim()
      if (trimmed) params[key] = trimmed
    }
    return params
  }, [filters, page, size, sort])

  return {
    page,
    size,
    sort,
    view,
    filters,
    hasFilters: Object.keys(filters).length > 0,
    apiParams,
    setFilter,
    clearFilters,
    setPage,
    setSize,
    setSort,
    setView,
  }
}
