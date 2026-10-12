import type { ReactNode } from 'react'
import { usePermission } from '@/stores/authStore'

interface CanProps {
  permission?: string
  children: ReactNode
  fallback?: ReactNode
}

/** Ẩn phần tử khi user thiếu quyền. Backend vẫn kiểm tra lại, đây chỉ là ẩn trên giao diện. */
export function Can({ permission, children, fallback = null }: CanProps) {
  return usePermission(permission) ? children : fallback
}
