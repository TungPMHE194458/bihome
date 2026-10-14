import { router } from 'expo-router'
import { BuildingForm } from '@/components/forms/BuildingForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewBuildingScreen() {
  return (
    <Screen>
      <BuildingForm
        onSaved={(b) => {
          notify('Đã thêm tòa nhà')
          router.replace(`/buildings/${b.id}`)
        }}
      />
    </Screen>
  )
}
