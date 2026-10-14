import { router } from 'expo-router'
import { SurveyForm } from '@/components/forms/SurveyForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewSurveyScreen() {
  return (
    <Screen>
      <SurveyForm
        onSaved={(s) => {
          notify('Đã tạo khảo sát (Nháp)')
          router.replace(`/surveys/${s.id}`)
        }}
      />
    </Screen>
  )
}
