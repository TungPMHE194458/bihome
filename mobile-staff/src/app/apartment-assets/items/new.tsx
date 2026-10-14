import { router } from 'expo-router'
import { AssetItemForm } from '@/components/forms/AssetItemForm'
import { Screen } from '@/components/Screen'
import { notify } from '@/lib/dialogs'

export default function NewAssetItemScreen() {
  return (
    <Screen>
      <AssetItemForm
        onSaved={() => {
          notify('Đã thêm hạng mục')
          router.back()
        }}
      />
    </Screen>
  )
}
