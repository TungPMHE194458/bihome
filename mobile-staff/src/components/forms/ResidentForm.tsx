import { useState } from 'react'
import { Text, View } from 'react-native'
import { ChipSelect, DateInput, SearchPicker } from '@/components/form'
import { PhotoPicker, type UploadedPhoto } from '@/components/PhotoPicker'
import { Button, SwitchRow, TextField } from '@/components/ui'
import { apartmentApi } from '@/lib/api/apartment'
import { errorMessage, fieldErrors } from '@/lib/api'
import { DEFAULT_NATIONALITY, GENDER, ID_TYPE, RELATIONSHIP, RESIDENT_ROLE } from '@/lib/constants'
import { residentApi } from '@/lib/staff'
import type { Gender, IdDocumentType, Relationship, ResidentDetail, ResidentRequest, ResidentRole } from '@/lib/types'
import { colors } from '@/theme'

const GENDER_OPTIONS = (Object.keys(GENDER) as Gender[]).map((v) => ({ value: v, label: GENDER[v] }))
const ID_TYPE_OPTIONS = (Object.keys(ID_TYPE) as IdDocumentType[]).map((v) => ({ value: v, label: ID_TYPE[v] }))
const ROLE_OPTIONS = (Object.keys(RESIDENT_ROLE) as ResidentRole[]).map((v) => ({ value: v, label: RESIDENT_ROLE[v].label }))
const RELATIONSHIP_OPTIONS = (Object.keys(RELATIONSHIP) as Relationship[]).map((v) => ({ value: v, label: RELATIONSHIP[v] }))

/** Hồ sơ cư dân. Tạo mới bắt buộc gán ngay một căn hộ (backend yêu cầu); sửa thì không đổi cư trú ở đây. */
export function ResidentForm({ resident, onSaved }: { resident?: ResidentDetail; onSaved: (r: ResidentDetail) => void }) {
  const [code, setCode] = useState(resident?.code ?? '')
  const [fullName, setFullName] = useState(resident?.fullName ?? '')
  const [phone, setPhone] = useState(resident?.phone ?? '')
  const [email, setEmail] = useState(resident?.email ?? '')
  const [gender, setGender] = useState<Gender | null>(resident?.gender ?? null)
  const [dateOfBirth, setDateOfBirth] = useState<string | undefined>(resident?.dateOfBirth)
  const [idType, setIdType] = useState<IdDocumentType | null>(resident?.idType ?? null)
  const [idNumber, setIdNumber] = useState(resident?.idNumber ?? '')
  const [idIssueDate, setIdIssueDate] = useState<string | undefined>(resident?.idIssueDate)
  const [idIssuePlace, setIdIssuePlace] = useState(resident?.idIssuePlace ?? '')
  const [nationality, setNationality] = useState(resident?.nationality ?? DEFAULT_NATIONALITY)
  const [note, setNote] = useState(resident?.note ?? '')
  const [avatar, setAvatar] = useState<UploadedPhoto[]>(resident?.avatarFileId && resident.avatarUrl ? [{ fileId: resident.avatarFileId, uri: resident.avatarUrl }] : [])
  // Cư trú — chỉ hỏi khi tạo mới.
  const [apartmentId, setApartmentId] = useState<number | null>(null)
  const [apartmentLabel, setApartmentLabel] = useState<string>()
  const [role, setRole] = useState<ResidentRole>('FAMILY')
  const [relationship, setRelationship] = useState<Relationship | null>(null)
  const [householdHead, setHouseholdHead] = useState(false)
  const [moveInDate, setMoveInDate] = useState<string | undefined>(new Date().toISOString().slice(0, 10))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!fullName.trim()) e.fullName = 'Vui lòng nhập họ và tên'
    if (!/^(0|\+84)[35789]\d{8}$/.test(phone.trim())) e.phone = 'Số điện thoại không đúng định dạng Việt Nam'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Email không hợp lệ'
    if (!resident) {
      if (!apartmentId) e.apartment = 'Vui lòng chọn căn hộ'
      if (!moveInDate) e.moveInDate = 'Vui lòng chọn ngày vào ở'
    }
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return

    const body: ResidentRequest = {
      code: code.trim() ? code.trim().toUpperCase() : null,
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      gender,
      dateOfBirth: dateOfBirth || null,
      idType,
      idNumber: idNumber.trim() ? idNumber.trim().toUpperCase() : null,
      idIssueDate: idIssueDate || null,
      idIssuePlace: idIssuePlace.trim() || null,
      nationality: nationality.trim() || null,
      avatarFileId: avatar[0]?.fileId ?? null,
      note: note.trim() || null,
      version: resident?.version,
      ...(resident
        ? {}
        : {
            apartment: {
              apartmentId: apartmentId!,
              role,
              relationship,
              householdHead: role === 'OWNER' ? householdHead : false,
              moveInDate: moveInDate!,
              moveOutDate: null,
              residenceStatus: 'LIVING',
              tempResidenceRegistered: false,
            },
          }),
    }
    setSaving(true)
    try {
      onSaved(await residentApi.save(resident?.id, body))
    } catch (err) {
      const fe = fieldErrors(err)
      // Backend trả "apartment.apartmentId" — gỡ tiền tố để khớp ô nhập.
      const mapped: Record<string, string> = {}
      for (const [k, v] of Object.entries(fe)) mapped[k.replace(/^apartment\./, '')] = v
      setErrors(mapped)
      setMessage(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ gap: 16 }}>
      {message && <Text style={{ color: colors.danger }}>{message}</Text>}
      <Text style={{ fontWeight: '700', color: colors.text }}>Ảnh đại diện</Text>
      <PhotoPicker value={avatar} onChange={(v) => setAvatar(v.slice(-1))} purpose="RESIDENT_AVATAR" max={1} />
      <TextField label="Mã cư dân" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="Bỏ trống để tự sinh" error={errors.code} />
      <TextField label="Họ và tên *" value={fullName} onChangeText={setFullName} error={errors.fullName} />
      <TextField label="Số điện thoại *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
      <ChipSelect label="Giới tính" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
      <DateInput label="Ngày sinh" value={dateOfBirth} onChange={setDateOfBirth} maximumDate={new Date()} />
      <ChipSelect label="Loại giấy tờ" options={ID_TYPE_OPTIONS} value={idType} onChange={setIdType} />
      <TextField label="Số giấy tờ" value={idNumber} onChangeText={setIdNumber} autoCapitalize="characters" error={errors.idNumber} />
      <DateInput label="Ngày cấp" value={idIssueDate} onChange={setIdIssueDate} maximumDate={new Date()} />
      <TextField label="Nơi cấp" value={idIssuePlace} onChangeText={setIdIssuePlace} />
      <TextField label="Quốc tịch" value={nationality} onChangeText={setNationality} />
      <TextField label="Ghi chú" value={note} onChangeText={setNote} multiline />

      {!resident && (
        <>
          <Text style={{ fontWeight: '700', color: colors.text }}>Căn hộ ở (bắt buộc)</Text>
          <SearchPicker
            label="Căn hộ"
            required
            value={apartmentId}
            valueLabel={apartmentLabel}
            onSearch={(k) => apartmentApi.options(k).then((os) => os.map((o) => ({ value: o.id, label: `${o.code} · ${o.name}`, sublabel: o.buildingName })))}
            onChange={(v, o) => {
              setApartmentId(v)
              setApartmentLabel(o?.label)
            }}
            error={errors.apartment}
          />
          <ChipSelect label="Vai trò" required options={ROLE_OPTIONS} value={role} onChange={(v) => v && setRole(v)} />
          <ChipSelect label="Quan hệ với chủ hộ" options={RELATIONSHIP_OPTIONS} value={relationship} onChange={setRelationship} />
          {role === 'OWNER' && (
            <SwitchRow label="Là chủ hộ chính" value={householdHead} onValueChange={setHouseholdHead} />
          )}
          <DateInput label="Ngày vào ở *" value={moveInDate} onChange={setMoveInDate} error={errors.moveInDate} />
        </>
      )}

      <Button title={resident ? 'Lưu thay đổi' : 'Thêm cư dân'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}
