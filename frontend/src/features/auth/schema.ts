import { z } from 'zod'

/** Khớp PasswordPolicy ở backend. */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/
export const PASSWORD_MESSAGE =
  'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.'

const email = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập email')
  .email('Email không đúng định dạng')

const newPassword = z.string().regex(PASSWORD_REGEX, PASSWORD_MESSAGE)
const confirmPassword = z.string().min(1, 'Vui lòng nhập lại mật khẩu mới')
const passwordsMatch = {
  message: 'Mật khẩu nhập lại không khớp.',
  path: ['confirmPassword'],
}

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập hoặc email'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  rememberMe: z.boolean(),
})
export type LoginValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({ email })
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    email,
    otp: z.string().trim().regex(/^\d{6}$/, 'Mã OTP gồm 6 chữ số'),
    newPassword,
    confirmPassword,
  })
  .refine((v) => v.newPassword === v.confirmPassword, passwordsMatch)
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword,
    confirmPassword,
  })
  .refine((v) => v.newPassword === v.confirmPassword, passwordsMatch)
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
    path: ['newPassword'],
  })
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
