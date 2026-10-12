import { z } from 'zod'
import type { UserCreateRequest, UserDetail, UserUpdateRequest } from '@/features/user/types'
import dayjs from '@/lib/dayjs'

const textOrNull = (v: string) => (v.trim() ? v.trim() : null)
const optional = (max: number, label: string) => z.string().trim().max(max, `${label} tối đa ${max} ký tự`)

export const SUPER_ADMIN = 'SUPER_ADMIN'

export const userSchema = z
  .object({
    /** Bỏ trống khi sửa (không đổi được tên đăng nhập). */
    username: z.string().trim(),
    editing: z.boolean(),
    fullName: z.string().trim().min(1, 'Họ tên không được để trống').max(150, 'Họ tên tối đa 150 ký tự'),
    email: z
      .string()
      .trim()
      .min(1, 'Email không được để trống')
      .max(150, 'Email tối đa 150 ký tự')
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email không đúng định dạng'),
    phone: z
      .string()
      .trim()
      .regex(/^$|^(0|\+84)[35789]\d{8}$/, 'Số điện thoại không đúng định dạng Việt Nam.'),
    gender: z.enum(['', 'MALE', 'FEMALE', 'OTHER']),
    dateOfBirth: z.string().refine((v) => !v || dayjs(v).isBefore(dayjs(), 'day'), 'Ngày sinh phải trước ngày hôm nay'),
    jobTitle: optional(100, 'Chức vụ'),
    department: optional(100, 'Phòng ban'),
    address: optional(500, 'Địa chỉ'),
    roleCodes: z.array(z.string()).min(1, 'Phải chọn ít nhất một vai trò'),
    buildingIds: z.array(z.number()),
  })
  .superRefine((v, ctx) => {
    if (!v.editing && !/^[a-zA-Z0-9._-]{3,50}$/.test(v.username)) {
      ctx.addIssue({
        code: 'custom',
        path: ['username'],
        message: 'Tên đăng nhập dài 3–50 ký tự, chỉ gồm chữ không dấu, chữ số và . _ -',
      })
    }
  })
export type UserFormValues = z.infer<typeof userSchema>

export const emptyUser = (): UserFormValues => ({
  username: '',
  editing: false,
  fullName: '',
  email: '',
  phone: '',
  gender: '',
  dateOfBirth: '',
  jobTitle: '',
  department: '',
  address: '',
  roleCodes: ['STAFF'],
  buildingIds: [],
})

export const userToForm = (u: UserDetail): UserFormValues => ({
  username: u.username,
  editing: true,
  fullName: u.profile.fullName,
  email: u.email,
  phone: u.phone ?? '',
  gender: u.profile.gender ?? '',
  dateOfBirth: u.profile.dateOfBirth ?? '',
  jobTitle: u.profile.jobTitle ?? '',
  department: u.profile.department ?? '',
  address: u.profile.address ?? '',
  roleCodes: u.roles.map((r) => r.code),
  buildingIds: [...u.buildingIds].sort((a, b) => a - b),
})

const profile = (v: UserFormValues) => ({
  email: v.email.trim(),
  phone: textOrNull(v.phone),
  fullName: v.fullName.trim(),
  gender: v.gender || null,
  dateOfBirth: v.dateOfBirth || null,
  jobTitle: textOrNull(v.jobTitle),
  department: textOrNull(v.department),
  address: textOrNull(v.address),
})

/** Admin hệ thống làm việc ở mọi tòa nên không gửi danh sách tòa. */
const buildingsFor = (v: UserFormValues) => (v.roleCodes.includes(SUPER_ADMIN) ? [] : v.buildingIds)

export const userToCreateRequest = (v: UserFormValues): UserCreateRequest => ({
  ...profile(v),
  username: v.username.trim(),
  roleCodes: v.roleCodes,
  buildingIds: buildingsFor(v),
})

export const userToUpdateRequest = (v: UserFormValues, detail: UserDetail): UserUpdateRequest => ({
  ...profile(v),
  bio: detail.profile.bio ?? null,
  version: detail.version,
})

const sameSet = <T,>(a: T[], b: T[]) => a.length === b.length && a.every((x) => b.includes(x))

/** Chỉ gán lại vai trò / tòa khi có thay đổi. */
export function assignmentChanges(v: UserFormValues, detail: UserDetail) {
  const roles = detail.roles.map((r) => r.code)
  const buildings = buildingsFor(v)
  return {
    roleCodes: sameSet(roles, v.roleCodes) ? undefined : v.roleCodes,
    buildingIds: sameSet(detail.buildingIds, buildings) ? undefined : buildings,
  }
}
