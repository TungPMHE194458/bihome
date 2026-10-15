import { useState } from 'react'
import { router } from 'expo-router'
import { TemporaryPasswordModal } from '@/components/TemporaryPasswordModal'
import { UserForm } from '@/components/forms/UserForm'
import { Screen } from '@/components/Screen'

export default function NewUserScreen() {
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null)

  return (
    <Screen>
      <UserForm
        onSaved={(u, temporaryPassword) => setCreated({ username: u.username, password: temporaryPassword ?? '' })}
      />
      {created && (
        <TemporaryPasswordModal
          visible
          username={created.username}
          password={created.password}
          onClose={() => router.back()}
        />
      )}
    </Screen>
  )
}
