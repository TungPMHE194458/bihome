import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'
import { bootstrapSession } from '@/features/auth/session'

export default function App() {
  useEffect(() => {
    void bootstrapSession()
  }, [])

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
