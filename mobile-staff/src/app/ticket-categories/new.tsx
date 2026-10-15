import { router } from 'expo-router'
import { TicketCategoryForm } from '@/components/forms/TicketCategoryForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewTicketCategoryScreen() {
  return (
    <Screen>
      <TicketCategoryForm
        onSaved={() => {
          notify('Đã thêm danh mục')
          router.back()
        }}
      />
    </Screen>
  )
}
