import { useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { ChipSelect, DateField, parseVnDate } from '@/components/form'
import { Screen } from '@/components/Screen'
import { Button, Icon, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { GENDER, RELATIONSHIP } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { api } from '@/lib/resident'
import type { Gender, Relationship, ResidentRole } from '@/lib/types'
import { colors } from '@/theme'

const PHONE = /^(0|\+84)[35789]\d{8}$/

const ROLES: { value: ResidentRole; label: string }[] = [
  { value: 'FAMILY', label: 'Thành viên gia đình' },
  { value: 'TENANT', label: 'Người thuê' },
  { value: 'GUEST', label: 'Khách lưu trú' },
]

/** Kê khai thành viên gia đình: gửi phiếu cho BQL duyệt (BQL bổ sung SĐT nếu thành viên chưa có). */
export default function DeclareMemberScreen() {
  const apt = useApartment()
  const qc = useQueryClient()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [dob, setDob] = useState('')
  const [role, setRole] = useState<ResidentRole>('FAMILY')
  const [relationship, setRelationship] = useState<Relationship | null>(null)
  const [idType, setIdType] = useState<'CCCD' | 'PASSPORT' | null>(null)
  const [idNumber, setIdNumber] = useState('')
  const [moveIn, setMoveIn] = useState('')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<{ id: number; uri: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setUploading(true)
    try {
      const name = asset.fileName ?? `thanh-vien-${Date.now()}.jpg`
      const uploaded = Platform.OS === 'web' && asset.file
        ? await api.uploadAvatarBlob(asset.file, name)
        : await api.uploadAvatar(asset.uri, name, asset.mimeType ?? 'image/jpeg')
      setPhoto({ id: uploaded.id, uri: asset.uri })
    } catch (e) {
      notify('Không tải được ảnh', errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!fullName.trim()) e.fullName = 'Họ và tên không được để trống'
    if (phone.trim() && !PHONE.test(phone.trim())) e.phone = 'Số điện thoại không đúng định dạng Việt Nam.'
    const dateOfBirth = parseVnDate(dob)
    if (dateOfBirth === null) e.dateOfBirth = 'Ngày không hợp lệ (dd/mm/yyyy)'
    const moveInDate = parseVnDate(moveIn)
    if (moveInDate === null) e.moveInDate = 'Ngày không hợp lệ (dd/mm/yyyy)'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const d = await api.declareMember({
        apartmentId: apt.id,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        gender: gender ?? undefined,
        dateOfBirth: dateOfBirth ?? undefined,
        idType: idType ?? undefined,
        idNumber: idNumber.trim() || undefined,
        role,
        relationship: relationship ?? undefined,
        moveInDate: moveInDate ?? undefined,
        photoFileId: photo?.id,
        note: note.trim() || undefined,
      })
      await qc.invalidateQueries({ queryKey: ['apt', apt.id] })
      router.replace(`/declarations/${d.id}`)
    } catch (err) {
      const fe = fieldErrors(err)
      setErrors(fe)
      if (!Object.keys(fe).length) notify('Không gửi được', errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <Text style={styles.intro}>
        Khai báo người đang ở cùng căn {apt.code}. Ban quản lý kiểm tra rồi thêm vào hồ sơ cư trú; kết quả báo về mục Thông báo.
      </Text>
      <Pressable onPress={() => void pickPhoto()} style={styles.photo} accessibilityLabel="Chọn ảnh thành viên">
        {uploading ? (
          <ActivityIndicator color={colors.primary} />
        ) : photo ? (
          <Image source={{ uri: photo.uri }} style={styles.photoImg} contentFit="cover" />
        ) : (
          <>
            <Icon name="camera-plus-outline" size={28} color={colors.primary} />
            <Text style={styles.photoText}>Ảnh (tuỳ chọn)</Text>
          </>
        )}
      </Pressable>
      <TextField label="Họ và tên *" value={fullName} onChangeText={setFullName} error={errors.fullName} maxLength={150} />
      <ChipSelect label="Vai trò tại căn hộ" options={ROLES} value={role} onChange={(v) => setRole(v ?? 'FAMILY')} required />
      <ChipSelect
        label="Quan hệ với chủ hộ"
        options={(Object.keys(RELATIONSHIP) as Relationship[]).map((v) => ({ value: v, label: RELATIONSHIP[v] }))}
        value={relationship}
        onChange={setRelationship}
      />
      <TextField
        label="Số điện thoại"
        placeholder="Bỏ trống nếu chưa có (trẻ em)"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
      />
      <ChipSelect
        label="Giới tính"
        options={(Object.keys(GENDER) as Gender[]).map((v) => ({ value: v, label: GENDER[v] }))}
        value={gender}
        onChange={setGender}
      />
      <DateField label="Ngày sinh" value={dob} onChange={setDob} error={errors.dateOfBirth} />
      <ChipSelect
        label="Giấy tờ tuỳ thân"
        options={[
          { value: 'CCCD' as const, label: 'CCCD' },
          { value: 'PASSPORT' as const, label: 'Hộ chiếu' },
        ]}
        value={idType}
        onChange={setIdType}
      />
      {idType && (
        <TextField label={idType === 'CCCD' ? 'Số CCCD (12 số)' : 'Số hộ chiếu'} value={idNumber} onChangeText={setIdNumber}
          error={errors.idNumber} maxLength={20} keyboardType={idType === 'CCCD' ? 'number-pad' : 'default'} />
      )}
      <TextField label="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} error={errors.email} />
      <DateField label="Ngày bắt đầu ở (bỏ trống = hôm nay)" value={moveIn} onChange={setMoveIn} error={errors.moveInDate} />
      <TextField label="Ghi chú cho Ban quản lý" multiline value={note} onChangeText={setNote} maxLength={1000} />
      <View style={{ height: 4 }} />
      <Button title="Gửi kê khai" icon="send" onPress={() => void submit()} loading={saving} disabled={uploading} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, fontSize: 14 },
  photo: {
    alignSelf: 'center',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImg: { width: '100%', height: '100%' },
  photoText: { fontSize: 11, color: colors.primaryDark, marginTop: 2 },
})
