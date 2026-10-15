import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { ChipSelect, DateInput, MultiSearchPicker, type PickerOption } from '@/components/form'
import { Button, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { GENDER } from '@/lib/constants'
import { authApi, roleApi, userApi } from '@/lib/staff'
import { SUPER_ADMIN } from '@/lib/types'
import type { Gender, UserCreateRequest, UserDetail, UserUpdateRequest } from '@/lib/types'
import { colors } from '@/theme'

const GENDER_OPTIONS = (Object.keys(GENDER) as Gender[]).map((v) => ({ value: v, label: GENDER[v] }))

export function UserForm({
  user,
  onSaved,
}: {
  user?: UserDetail
  onSaved: (u: UserDetail, temporaryPassword?: string) => void
}) {
  const editing = !!user
  const [username, setUsername] = useState(user?.username ?? '')
  const [fullName, setFullName] = useState(user?.profile.fullName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [gender, setGender] = useState<Gender | null>(user?.profile.gender ?? null)
  const [dateOfBirth, setDateOfBirth] = useState(user?.profile.dateOfBirth)
  const [jobTitle, setJobTitle] = useState(user?.profile.jobTitle ?? '')
  const [department, setDepartment] = useState(user?.profile.department ?? '')
  const [address, setAddress] = useState(user?.profile.address ?? '')
  const [bio, setBio] = useState(user?.profile.bio ?? '')
  const [roles, setRoles] = useState<PickerOption<string>[]>(user?.roles.map((r) => ({ value: r.code, label: r.name })) ?? [])
  const [buildings, setBuildings] = useState<PickerOption<number>[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing || !user || user.buildingIds.length === 0) return
    void authApi.buildings().then((list) => {
      setBuildings(list.filter((b) => user.buildingIds.includes(b.id)).map((b) => ({ value: b.id, label: b.name })))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isSuperAdmin = roles.some((r) => r.value === SUPER_ADMIN)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!editing && !username.trim()) e.username = 'Vui lòng nhập tên đăng nhập'
    if (!fullName.trim()) e.fullName = 'Vui lòng nhập họ tên'
    if (!email.trim()) e.email = 'Vui lòng nhập email'
    if (!roles.length) e.roleCodes = 'Phải chọn ít nhất một vai trò'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      if (editing && user) {
        const body: UserUpdateRequest = {
          email: email.trim(),
          phone: phone.trim() || null,
          fullName: fullName.trim(),
          gender: gender ?? null,
          dateOfBirth: dateOfBirth || null,
          jobTitle: jobTitle.trim() || null,
          department: department.trim() || null,
          address: address.trim() || null,
          bio: bio.trim() || null,
          version: user.version,
        }
        let saved = await userApi.update(user.id, body)
        const roleCodes = roles.map((r) => String(r.value))
        if (roleCodes.sort().join() !== user.roles.map((r) => r.code).sort().join()) {
          saved = await userApi.assignRoles(user.id, roleCodes)
        }
        const buildingIds = buildings.map((b) => Number(b.value))
        if (buildingIds.sort().join() !== [...user.buildingIds].sort().join()) {
          saved = await userApi.assignBuildings(user.id, buildingIds)
        }
        onSaved(saved)
      } else {
        const body: UserCreateRequest = {
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          fullName: fullName.trim(),
          gender: gender ?? null,
          dateOfBirth: dateOfBirth || null,
          jobTitle: jobTitle.trim() || null,
          department: department.trim() || null,
          address: address.trim() || null,
          roleCodes: roles.map((r) => String(r.value)),
          buildingIds: buildings.map((b) => Number(b.value)),
        }
        const created = await userApi.create(body)
        onSaved(created.user, created.temporaryPassword)
      }
    } catch (err) {
      setErrors(fieldErrors(err))
      setMessage(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ gap: 16 }}>
      {message && <Text style={{ color: colors.danger }}>{message}</Text>}
      <TextField
        label="Tên đăng nhập *"
        value={username}
        onChangeText={setUsername}
        editable={!editing}
        error={errors.username}
        autoCapitalize="none"
      />
      <TextField label="Họ tên *" value={fullName} onChangeText={setFullName} error={errors.fullName} />
      <TextField label="Email *" value={email} onChangeText={setEmail} error={errors.email} autoCapitalize="none" keyboardType="email-address" />
      <TextField label="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
      <ChipSelect label="Giới tính" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
      <DateInput label="Ngày sinh" value={dateOfBirth} onChange={setDateOfBirth} maximumDate={new Date()} />
      <TextField label="Chức vụ" value={jobTitle} onChangeText={setJobTitle} />
      <TextField label="Phòng ban" value={department} onChangeText={setDepartment} />
      <TextField label="Địa chỉ" value={address} onChangeText={setAddress} />
      {editing && <TextField label="Giới thiệu" value={bio} onChangeText={setBio} multiline />}

      <Text style={styles.section}>Phân quyền</Text>
      <MultiSearchPicker
        label="Vai trò"
        selected={roles}
        onSearch={(k) => roleApi.list().then((list) => list.filter((r) => !k || r.name.toLowerCase().includes(k.toLowerCase())).map((r) => ({ value: r.code, label: r.name })))}
        onChange={setRoles}
        error={errors.roleCodes}
      />
      {isSuperAdmin ? (
        <Text style={styles.hint}>Admin hệ thống làm việc ở mọi tòa nhà và có toàn bộ quyền.</Text>
      ) : (
        <MultiSearchPicker
          label="Tòa nhà phụ trách"
          selected={buildings}
          onSearch={(k) => authApi.buildings().then((list) => list.filter((b) => !k || b.name.toLowerCase().includes(k.toLowerCase())).map((b) => ({ value: b.id, label: b.name })))}
          onChange={setBuildings}
          placeholder="Chọn tòa nhà"
        />
      )}
      {!editing && <Text style={styles.hint}>Hệ thống sinh mật khẩu tạm sau khi tạo; người dùng phải đổi mật khẩu ở lần đăng nhập đầu tiên.</Text>}

      <Button title={editing ? 'Lưu thay đổi' : 'Thêm người dùng'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}

const styles = {
  section: { fontSize: 15, fontWeight: '700' as const, color: colors.text, marginTop: 4 },
  hint: { fontSize: 12, color: colors.textMuted },
}
