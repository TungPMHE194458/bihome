import { isAxiosError } from 'axios'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ProblemDetail } from '@/lib/api-types'

export function getProblem(error: unknown): ProblemDetail | undefined {
  if (isAxiosError(error) && error.response?.data && typeof error.response.data === 'object') {
    return error.response.data as ProblemDetail
  }
  return undefined
}

export function getErrorMessage(
  error: unknown,
  fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.',
): string {
  if (isAxiosError(error) && !error.response) {
    return 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối mạng.'
  }
  return getProblem(error)?.detail ?? fallback
}

/**
 * Gắn lỗi theo trường từ ProblemDetail.errors vào form; trả về true nếu có lỗi nào được gắn.
 * @param aliases đổi tên trường API sang trường form (vd { apartmentId: 'apartment' }).
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields?: readonly string[],
  aliases: Record<string, string> = {},
): boolean {
  const errors = getProblem(error)?.errors
  if (!errors?.length) return false
  let applied = false
  for (const item of errors) {
    const field = aliases[item.field] ?? item.field
    if (!fields || fields.includes(field)) {
      setError(field as Path<T>, { type: 'server', message: item.message })
      applied = true
    }
  }
  return applied
}
