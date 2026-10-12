import { formatCurrency, formatDate, formatDateTime, formatFileSize, normalizeSearch } from '@/lib/format'

describe('format', () => {
  it('formats date-times in Vietnam time regardless of the input offset', () => {
    expect(formatDateTime('2026-10-02T03:51:00Z')).toBe('02/10/2026 10:51')
    expect(formatDateTime('2026-10-02T10:51:00+07:00')).toBe('02/10/2026 10:51')
    expect(formatDateTime(undefined)).toBe('')
  })

  it('formats plain dates without shifting the day', () => {
    expect(formatDate('1990-05-20')).toBe('20/05/1990')
  })

  it('formats file sizes like the document list', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(4096)).toBe('4 KB')
    expect(formatFileSize(1.2 * 1024 * 1024)).toBe('1.2 MB')
  })

  it('formats VND without decimals', () => {
    expect(formatCurrency(1500000).replace(/\s/g, ' ')).toMatch(/^1\.500\.000\s?₫$/)
  })

  it('normalizes Vietnamese text for accent-insensitive search', () => {
    expect(normalizeSearch('  Tòa Nhà Đông Á ')).toBe('toa nha dong a')
  })
})
