import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { QuestionBuilder } from '@/features/survey/components/QuestionBuilder'
import type { QuestionDraft } from '@/features/survey/schema'
import { renderWithProviders } from '@/test/utils'

function Harness({ onChange }: { onChange: (q: QuestionDraft[]) => void }) {
  const [value, setValue] = useState<QuestionDraft[]>([
    { key: 'a', type: 'TEXT', content: 'Góp ý', required: false, options: [] },
    { key: 'b', type: 'RATING', content: 'Hài lòng', required: true, options: [] },
  ])
  return (
    <QuestionBuilder
      value={value}
      onChange={(q) => {
        setValue(q)
        onChange(q)
      }}
    />
  )
}

describe('QuestionBuilder', () => {
  it('reorders, adds questions and gives choice questions two options', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<Harness onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Đưa câu 2 lên' }))
    expect((onChange.mock.lastCall![0] as QuestionDraft[]).map((q) => q.content)).toEqual(['Hài lòng', 'Góp ý'])

    await user.click(screen.getByRole('button', { name: 'Nhiều lựa chọn' }))
    const third = screen.getByRole('group', { name: 'Câu 3' })
    expect(within(third).getAllByRole('textbox', { name: /Câu 3 lựa chọn/ })).toHaveLength(2)
    await user.type(within(third).getByRole('textbox', { name: 'Câu 3 lựa chọn 1' }), 'Gym')
    await user.click(within(third).getByRole('button', { name: 'Thêm lựa chọn' }))
    const last = onChange.mock.lastCall![0] as QuestionDraft[]
    expect(last[2]).toMatchObject({ type: 'MULTIPLE', required: true })
    expect(last[2].options.map((o) => o.label)).toEqual(['Gym', '', ''])

    await user.click(screen.getByRole('button', { name: 'Xoá câu 1' }))
    expect((onChange.mock.lastCall![0] as QuestionDraft[]).map((q) => q.content)).toEqual(['Góp ý', ''])
  })
})
