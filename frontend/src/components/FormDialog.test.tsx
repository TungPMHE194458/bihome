import { screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormTextField } from '@/components/form/FormTextField'
import { renderWithProviders } from '@/test/utils'

interface Values {
  name: string
}

function TestForm({ onSubmit, onClose }: { onSubmit: (v: Values) => Promise<void> | void; onClose: () => void }) {
  const { control, handleSubmit, formState } = useForm<Values>({ defaultValues: { name: '' } })
  return (
    <FormDialog
      open
      title="Thêm tòa nhà"
      onClose={onClose}
      dirty={formState.isDirty}
      submitting={formState.isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormTextField name="name" control={control} label="Tên tòa nhà" />
    </FormDialog>
  )
}

describe('FormDialog', () => {
  it('submits the form values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderWithProviders(<TestForm onSubmit={onSubmit} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText('Tên tòa nhà'), 'Sunrise')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ name: 'Sunrise' })
  })

  it('closes immediately when nothing was changed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(<TestForm onSubmit={vi.fn()} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Huỷ' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('asks for confirmation before discarding changes', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(<TestForm onSubmit={vi.fn()} onClose={onClose} />)

    await user.type(screen.getByLabelText('Tên tòa nhà'), 'A')
    await user.click(screen.getByRole('button', { name: 'Đóng' }))

    const confirm = await screen.findByRole('dialog', { name: 'Đóng biểu mẫu?' })
    await user.click(within(confirm).getByRole('button', { name: 'Huỷ' }))
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog', { name: 'Đóng biểu mẫu?' }))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Tên tòa nhà')).toHaveValue('A')

    await user.click(screen.getByRole('button', { name: 'Đóng' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Đóng biểu mẫu?' })).getByRole('button', { name: 'Đóng' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables actions while submitting', async () => {
    const user = userEvent.setup()
    let finish: () => void = () => {}
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    renderWithProviders(<TestForm onSubmit={onSubmit} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled())
    expect(screen.getByRole('button', { name: 'Huỷ' })).toBeDisabled()
    finish()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu' })).toBeEnabled())
  })
})
