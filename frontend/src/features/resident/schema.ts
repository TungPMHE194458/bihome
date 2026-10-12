import { z } from 'zod'
import type { ApartmentOption } from '@/features/apartment/types'
import { DEFAULT_NATIONALITY } from '@/features/resident/constants'
import type {
  LinkRequest,
  ResidentDetail,
  ResidentLink,
  ResidentRequest,
} from '@/features/resident/types'
import dayjs from '@/lib/dayjs'

const textOrNull = (v: string) => (v.trim() ? v.trim() : null)
const optionalText = (max: number, label: string) => z.string().trim().max(max, `${label} tối đa ${max} ký tự`)
const notInFuture = (v: string) => !v || !dayjs(v).isAfter(dayjs(), 'day')

const apartmentOption = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  buildingId: z.number(),
  buildingName: z.string(),
})

/** Chuẩn hoá giống backend: bỏ khoảng trắng, in hoa. */
export const normalizeIdNumber = (v: string) => v.replace(/\s+/g, '').toUpperCase()

// superRefine (không thu hẹp kiểu) để input/output của form giống nhau — xem asset/schema.ts.
export const linkSchema = z
  .object({
    apartment: apartmentOption.nullable(),
    role: z.enum(['', 'OWNER', 'TENANT', 'FAMILY', 'GUEST']),
    relationship: z.enum(['', 'SPOUSE', 'CHILD', 'PARENT', 'OTHER']),
    householdHead: z.boolean(),
    moveInDate: z.string().min(1, 'Ngày chuyển đến không được để trống'),
    moveOutDate: z.string(),
    residenceStatus: z.enum(['LIVING', 'TEMP_ABSENT', 'MOVED_OUT']),
    tempResidenceRegistered: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!v.apartment) ctx.addIssue({ code: 'custom', path: ['apartment'], message: 'Vui lòng chọn căn hộ' })
    if (!v.role) ctx.addIssue({ code: 'custom', path: ['role'], message: 'Vui lòng chọn vai trò tại căn hộ' })
    if (v.householdHead && v.role && v.role !== 'OWNER') {
      ctx.addIssue({ code: 'custom', path: ['householdHead'], message: 'Chủ hộ chính phải có vai trò Chủ sở hữu.' })
    }
    if (v.moveOutDate && v.moveInDate && v.moveOutDate < v.moveInDate) {
      ctx.addIssue({ code: 'custom', path: ['moveOutDate'], message: 'Ngày chuyển đi phải sau hoặc bằng ngày chuyển đến.' })
    }
  })
export type LinkFormValues = z.infer<typeof linkSchema>

export const residentSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^$|^[A-Za-z0-9._-]{1,20}$/, 'Mã cư dân tối đa 20 ký tự, chỉ gồm chữ không dấu, chữ số và . _ -'),
    fullName: z.string().trim().min(1, 'Họ và tên không được để trống').max(150, 'Họ và tên tối đa 150 ký tự'),
    phone: z
      .string()
      .trim()
      .min(1, 'Số điện thoại không được để trống')
      .regex(/^(0|\+84)[35789]\d{8}$/, 'Số điện thoại không đúng định dạng Việt Nam.'),
    email: z.string().trim().max(150, 'Email tối đa 150 ký tự').regex(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email không đúng định dạng'),
    gender: z.enum(['', 'MALE', 'FEMALE', 'OTHER']),
    dateOfBirth: z.string().refine(notInFuture, 'Ngày sinh không được sau hôm nay'),
    idType: z.enum(['', 'CCCD', 'PASSPORT']),
    idNumber: z.string(),
    idIssueDate: z.string().refine(notInFuture, 'Ngày cấp không được sau hôm nay'),
    idIssuePlace: optionalText(200, 'Nơi cấp'),
    nationality: optionalText(100, 'Quốc tịch'),
    note: optionalText(1000, 'Ghi chú'),
    avatar: z.object({ fileId: z.number(), url: z.string() }).nullable(),
    /** Căn hộ đầu tiên — chỉ khi thêm mới; null khi sửa. */
    residence: linkSchema.nullable(),
  })
  .superRefine((v, ctx) => {
    const id = normalizeIdNumber(v.idNumber)
    if (id && !v.idType) ctx.addIssue({ code: 'custom', path: ['idType'], message: 'Vui lòng chọn loại giấy tờ' })
    if (id && v.idType === 'CCCD' && !/^\d{12}$/.test(id)) {
      ctx.addIssue({ code: 'custom', path: ['idNumber'], message: 'Số CCCD gồm 12 chữ số' })
    }
    if (id && v.idType === 'PASSPORT' && !/^[A-Z0-9]{6,9}$/.test(id)) {
      ctx.addIssue({ code: 'custom', path: ['idNumber'], message: 'Số hộ chiếu gồm 6–9 chữ cái hoặc chữ số' })
    }
    if (v.idIssueDate && v.dateOfBirth && v.idIssueDate < v.dateOfBirth) {
      ctx.addIssue({ code: 'custom', path: ['idIssueDate'], message: 'Ngày cấp phải sau ngày sinh.' })
    }
  })
export type ResidentFormValues = z.infer<typeof residentSchema>

/** Lỗi API của căn hộ đầu tiên (apartment.*) → trường form residence.*. */
export const RESIDENCE_ERROR_ALIASES: Record<string, string> = {
  'apartment.apartmentId': 'residence.apartment',
  'apartment.role': 'residence.role',
  'apartment.householdHead': 'residence.householdHead',
  'apartment.moveInDate': 'residence.moveInDate',
  'apartment.moveOutDate': 'residence.moveOutDate',
}

/** Lỗi API của form gán/sửa cư trú. */
export const LINK_ERROR_ALIASES: Record<string, string> = { apartmentId: 'apartment' }

export const emptyLink = (apartment: ApartmentOption | null = null): LinkFormValues => ({
  apartment,
  role: '',
  relationship: '',
  householdHead: false,
  moveInDate: dayjs().format('YYYY-MM-DD'),
  moveOutDate: '',
  residenceStatus: 'LIVING',
  tempResidenceRegistered: false,
})

export const linkToForm = (l: ResidentLink, buildingId: number, buildingName: string): LinkFormValues => ({
  apartment: { id: l.apartmentId, code: l.apartmentCode, name: l.apartmentName, buildingId, buildingName },
  role: l.role,
  relationship: l.relationship ?? '',
  householdHead: l.householdHead,
  moveInDate: l.moveInDate,
  moveOutDate: l.moveOutDate ?? '',
  residenceStatus: l.residenceStatus,
  tempResidenceRegistered: l.tempResidenceRegistered,
})

export const linkToRequest = (v: LinkFormValues, version?: number): LinkRequest => ({
  apartmentId: v.apartment!.id,
  role: v.role as LinkRequest['role'],
  relationship: v.relationship || null,
  householdHead: v.role === 'OWNER' && v.householdHead,
  moveInDate: v.moveInDate,
  moveOutDate: v.moveOutDate || null,
  // Bỏ ngày chuyển đi của một lần cư trú đã kết thúc = cho ở lại.
  residenceStatus: v.residenceStatus === 'MOVED_OUT' && !v.moveOutDate ? 'LIVING' : v.residenceStatus,
  tempResidenceRegistered: v.tempResidenceRegistered,
  version,
})

export const emptyResident = (apartment: ApartmentOption | null = null): ResidentFormValues => ({
  code: '',
  fullName: '',
  phone: '',
  email: '',
  gender: '',
  dateOfBirth: '',
  idType: 'CCCD',
  idNumber: '',
  idIssueDate: '',
  idIssuePlace: '',
  nationality: DEFAULT_NATIONALITY,
  note: '',
  avatar: null,
  residence: emptyLink(apartment),
})

export const residentToForm = (r: ResidentDetail): ResidentFormValues => ({
  code: r.code,
  fullName: r.fullName,
  phone: r.phone,
  email: r.email ?? '',
  gender: r.gender ?? '',
  dateOfBirth: r.dateOfBirth ?? '',
  idType: r.idType ?? (r.idNumber ? '' : 'CCCD'),
  idNumber: r.idNumber ?? '',
  idIssueDate: r.idIssueDate ?? '',
  idIssuePlace: r.idIssuePlace ?? '',
  nationality: r.nationality ?? '',
  note: r.note ?? '',
  avatar: r.avatarFileId != null && r.avatarUrl ? { fileId: r.avatarFileId, url: r.avatarUrl } : null,
  residence: null,
})

export const residentToRequest = (v: ResidentFormValues, version?: number): ResidentRequest => {
  const idNumber = normalizeIdNumber(v.idNumber) || null
  return {
    code: textOrNull(v.code)?.toUpperCase() ?? null,
    fullName: v.fullName.trim(),
    phone: v.phone.trim(),
    email: textOrNull(v.email),
    gender: v.gender || null,
    dateOfBirth: v.dateOfBirth || null,
    idType: idNumber ? v.idType || null : null,
    idNumber,
    idIssueDate: idNumber ? v.idIssueDate || null : null,
    idIssuePlace: idNumber ? textOrNull(v.idIssuePlace) : null,
    nationality: textOrNull(v.nationality),
    avatarFileId: v.avatar?.fileId ?? null,
    note: textOrNull(v.note),
    apartment: v.residence ? linkToRequest(v.residence) : undefined,
    version,
  }
}

/** Có ngày chuyển đi ≤ hôm nay thì backend sẽ chuyển sang Đã chuyển đi. */
export const willMoveOut = (moveOutDate: string) => !!moveOutDate && !dayjs(moveOutDate).isAfter(dayjs(), 'day')
