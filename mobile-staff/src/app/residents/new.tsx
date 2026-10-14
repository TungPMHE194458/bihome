import { router } from 'expo-router'
import { ResidentForm } from '@/components/forms/ResidentForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewResidentScreen() {
  return (
    <Screen>
      <ResidentForm
        onSaved={(r) => {
          notify('Đã thêm cư dân')
          router.replace(`/residents/${r.id}`)
        }}
      />
    </Screen>
  )
}
