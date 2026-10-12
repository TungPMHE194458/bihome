import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useListParams } from '@/hooks/useListParams'

const FILTERS = ['keyword', 'status', 'createdFrom'] as const

function setup(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  return renderHook(
    () => ({ list: useListParams({ filterKeys: FILTERS, defaultSort: 'createdAt,desc' }), location: useLocation() }),
    { wrapper },
  )
}

describe('useListParams', () => {
  it('reads paging, sorting, view and filters from the URL', () => {
    const { result } = setup('/buildings?page=3&size=20&sort=name,asc&view=grid&status=ACTIVE&other=x')

    expect(result.current.list).toMatchObject({ page: 3, size: 20, sort: 'name,asc', view: 'grid' })
    expect(result.current.list.filters).toEqual({ status: 'ACTIVE' })
    expect(result.current.list.hasFilters).toBe(true)
  })

  it('falls back to defaults for missing or invalid values', () => {
    const { result } = setup('/buildings?page=-2&size=999')

    expect(result.current.list).toMatchObject({ page: 0, size: 10, sort: 'createdAt,desc', view: 'list', hasFilters: false })
  })

  it('resets to the first page when a filter changes', () => {
    const { result } = setup('/buildings?page=4&status=ACTIVE')

    act(() => result.current.list.setFilter('keyword', 'Sun'))

    expect(result.current.list.page).toBe(0)
    expect(result.current.list.filters).toEqual({ status: 'ACTIVE', keyword: 'Sun' })
    expect(result.current.location.search).toBe('?status=ACTIVE&keyword=Sun')
  })

  it('removes a filter when it is cleared and clears all filters at once', () => {
    const { result } = setup('/buildings?status=ACTIVE&keyword=a&sort=name,asc')

    act(() => result.current.list.setFilter('status', ''))
    expect(result.current.list.filters).toEqual({ keyword: 'a' })

    act(() => result.current.list.clearFilters())
    expect(result.current.list.filters).toEqual({})
    expect(result.current.location.search).toBe('?sort=name%2Casc')
  })

  it('keeps every change when several updates happen before a re-render', () => {
    const { result } = setup('/buildings?status=ACTIVE&createdFrom=2026-10-01&keyword=a')

    act(() => {
      result.current.list.setFilter('createdFrom', '')
      result.current.list.setFilter('keyword', '')
      result.current.list.setView('grid')
    })

    expect(result.current.list.filters).toEqual({ status: 'ACTIVE' })
    expect(result.current.list.view).toBe('grid')
  })

  it('builds trimmed API params without empty values', () => {
    const { result } = setup('/buildings?keyword=%20Sun%20&status=%20')

    expect(result.current.list.apiParams).toEqual({ page: 0, size: 10, sort: 'createdAt,desc', keyword: 'Sun' })
  })

  it('updates page, size, sort and view', () => {
    const { result } = setup('/buildings?page=2')

    act(() => result.current.list.setSize(50))
    expect(result.current.list).toMatchObject({ size: 50, page: 0 })

    act(() => result.current.list.setPage(3))
    act(() => result.current.list.setSort('code,desc'))
    act(() => result.current.list.setView('grid'))
    expect(result.current.list).toMatchObject({ page: 3, sort: 'code,desc', view: 'grid' })

    act(() => result.current.list.setView('list'))
    expect(result.current.location.search).not.toContain('view')
  })
})
