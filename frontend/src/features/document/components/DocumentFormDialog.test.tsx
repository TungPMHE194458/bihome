import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentFormDialog } from '@/features/document/components/DocumentFormDialog'
import { documentApi } from '@/features/document/api'
import type { DocumentItem } from '@/features/document/types'
import { uploadFile } from '@/lib/files'
import { useBuildingStore } from '@/stores/buildingStore'
import { renderWithProviders } from '@/test/utils'

vi.mock('@/features/document/api', () => ({
  documentApi: {
    get: vi.fn(),
    save: vi.fn(),
    categoryOptions: vi.fn().mockResolvedValue([
      { id: 3, name: 'Nội quy', color: '#DC2626', status: 'ACTIVE' },
      { id: 4, name: 'Biểu mẫu', color: '#16A34A', status: 'ACTIVE' },
    ]),
    tags: vi.fn().mockResolvedValue(['PCCC']),
  },
}))
vi.mock('@/features/building/hooks', () => ({
  useBuildingOptions: () => ({ data: [{ id: 1, code: 'SKY01', name: 'BiHome Sky Tower', status: 'ACTIVE' }] }),
}))
vi.mock('@/lib/files', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/files')>()),
  uploadFile: vi.fn(),
}))

const api = vi.mocked(documentApi)
const upload = vi.mocked(uploadFile)

const detail: DocumentItem = {
  id: 9,
  buildingId: 1,
  buildingCode: 'SKY01',
  buildingName: 'BiHome Sky Tower',
  code: '7',
  name: 'Nội quy hồ bơi',
  categoryId: 3,
  categoryName: 'Nội quy',
  categoryColor: '#DC2626',
  audience: 'ALL_RESIDENTS',
  tags: ['Hồ bơi'],
  fileName: 'ho-boi.pdf',
  fileSize: 2048,
  contentType: 'application/pdf',
  fileVersionNo: 1,
  createdAt: '2026-10-10T08:00:00+07:00',
  updatedAt: '2026-10-10T08:00:00+07:00',
  version: 4,
}

describe('DocumentFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useBuildingStore.setState({ selectedBuildingId: 1 })
  })

  it('uploads the file, suggests the name from it and creates the document', async () => {
    const user = userEvent.setup()
    upload.mockResolvedValue({ id: 55, name: 'noi_quy-thang-may.pdf', size: 4096, contentType: 'application/pdf', url: '/api/v1/files/55' })
    api.save.mockResolvedValue({ ...detail, id: 10, code: '8' })
    const { container } = renderWithProviders(<DocumentFormDialog open onClose={vi.fn()} />)

    const input = container.ownerDocument.querySelector<HTMLInputElement>('input[type="file"]')!
    await user.upload(input, new File(['%PDF-1.4'], 'noi_quy-thang-may.pdf', { type: 'application/pdf' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: /Tên tài liệu/ })).toHaveValue('noi quy thang may'))
    expect(screen.getByText('BiHome Sky Tower')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: /Danh mục/ }))
    await user.click(await screen.findByRole('option', { name: 'Biểu mẫu' }))
    await user.type(screen.getByRole('combobox', { name: /Thẻ/ }), 'Thang máy{Enter}')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1))
    expect(api.save.mock.calls[0]).toEqual([
      undefined,
      {
        code: null,
        name: 'noi quy thang may',
        description: null,
        categoryId: 4,
        audience: 'ALL_RESIDENTS',
        tags: ['Thang máy'],
        fileId: 55,
        version: undefined,
      },
    ])
  })

  it('requires a file and a category when creating', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DocumentFormDialog open onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Vui lòng chọn tệp tài liệu')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng chọn danh mục')).toBeInTheDocument()
    expect(api.save).not.toHaveBeenCalled()
  })

  it('edits metadata only and sends the version without a file', async () => {
    const user = userEvent.setup()
    api.get.mockResolvedValue(detail)
    api.save.mockResolvedValue({ ...detail, version: 5 })
    renderWithProviders(<DocumentFormDialog open documentId={9} onClose={vi.fn()} />)

    const name = await screen.findByRole('textbox', { name: /Tên tài liệu/ })
    await waitFor(() => expect(name).toHaveValue('Nội quy hồ bơi'))
    expect(screen.queryByText(/Kéo thả tệp/)).not.toBeInTheDocument()
    await user.clear(name)
    await user.type(name, 'Nội quy hồ bơi 2027')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1))
    expect(api.save.mock.calls[0][0]).toBe(9)
    expect(api.save.mock.calls[0][1]).toMatchObject({
      name: 'Nội quy hồ bơi 2027',
      code: '7',
      tags: ['Hồ bơi'],
      fileId: undefined,
      version: 4,
    })
  })
})
