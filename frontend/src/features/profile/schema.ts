import { z } from 'zod'

const optionalText = (max: number, label: string) => z.string().trim().max(max, `${label} tối đa ${max} ký tự`)

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ tên không được để trống').max(150, 'Họ tên tối đa 150 ký tự'),
  phone: z
    .string()
    .trim()
    .regex(/^$|^(0|\+84)[35789]\d{8}$/, 'Số điện thoại không đúng định dạng Việt Nam.'),
  gender: z.enum(['', 'MALE', 'FEMALE', 'OTHER']),
  dateOfBirth: z.string().refine((v) => !v || new Date(v) < new Date(), 'Ngày sinh phải trước ngày hôm nay'),
  jobTitle: optionalText(100, 'Chức vụ'),
  department: optionalText(100, 'Phòng ban'),
  address: optionalText(500, 'Địa chỉ'),
  bio: optionalText(1000, 'Giới thiệu'),
})

export type ProfileValues = z.infer<typeof profileSchema>
