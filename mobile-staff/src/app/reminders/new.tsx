import { router } from 'expo-router'
import { ReminderForm } from '@/components/forms/ReminderForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewReminderScreen() {
  return (
    <Screen>
      <ReminderForm
        onSaved={(r) => {
          notify('Đã lưu nhắc nhở')
          router.replace(`/reminders/${r.id}`)
        }}
      />
    </Screen>
  )
}
