import { router } from 'expo-router'
import { AccessCardForm } from '@/components/forms/AccessCardForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewAccessCardScreen() {
  return (
    <Screen>
      <AccessCardForm
        onSaved={(c) => {
          notify('Đã thêm thẻ từ')
          router.replace(`/access-cards/${c.id}`)
        }}
      />
    </Screen>
  )
}
