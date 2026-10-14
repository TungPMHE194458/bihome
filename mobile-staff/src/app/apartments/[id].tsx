import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { callPhone, ListRow } from '@/components/common'
import { ApartmentForm } from '@/components/forms/ApartmentForm'
import { Screen } from '@/components/Screen'
import { AuthImage, Button, Card, Chip, ErrorView, Icon, Loading, Row, SectionTitle } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { APARTMENT_STATUS, RELATIONSHIP, RESIDENCE_STATUS, RESIDENT_ROLE, TICKET_STATUS, USAGE_STATUS } from '@/lib/constants'
import { confirm, notify } from '@/lib/dialogs'
import { timeAgo } from '@/lib/format'
import { apartmentApi, lookupApi, ticketApi } from '@/lib/staff'
import { colors } from '@/theme'

/** Căn hộ: thông tin, người đang ở (gọi nhanh), xe, yêu cầu gần đây. */
export default function ApartmentScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const qc = useQueryClient()
  const { can } = useAuth()
  const [editing, setEditing] = useState(false)
  // API chi tiết kiểm tra quyền theo tòa của căn, không theo tòa đang chọn.
  const apartment = useQuery({ queryKey: ['apartment', id], queryFn: () => lookupApi.apartment(id), enabled: can('APARTMENT_READ') })
  const members = useQuery({ queryKey: ['apartment', id, 'members'], queryFn: () => lookupApi.apartmentMembers(id), enabled: can('RESIDENT_READ') })
  const vehicles = useQuery({ queryKey: ['apartment', id, 'vehicles'], queryFn: () => lookupApi.vehicles({ apartmentId: id, status: 'ACTIVE' }), enabled: can('ASSET_READ') })
  const tickets = useQuery({ queryKey: ['apartment', id, 'tickets'], queryFn: () => ticketApi.list({ apartmentId: id, size: 10 }), enabled: can('TICKET_READ') })

  const refresh = () => Promise.all([apartment.refetch(), members.refetch(), vehicles.refetch(), tickets.refetch()])
  if (apartment.isLoading || members.isLoading) return <Loading />
  if (apartment.error) return <ErrorView message={errorMessage(apartment.error)} onRetry={() => void refresh()} />
  const a = apartment.data
  const living = (members.data ?? []).filter((m) => m.residenceStatus !== 'MOVED_OUT')

  if (editing && a) {
    return (
      <Screen>
        <Stack.Screen options={{ title: `Sửa ${a.code}` }} />
        <ApartmentForm
          apartment={a}
          onSaved={() => {
            setEditing(false)
            void apartment.refetch()
            notify('Đã lưu thay đổi')
          }}
        />
      </Screen>
    )
  }

  const toggleStatus = () => {
    if (!a) return
    const next = a.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    confirm(
      next === 'INACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại',
      `Chuyển căn "${a.code}" sang ${next === 'INACTIVE' ? APARTMENT_STATUS.INACTIVE.label.toLowerCase() : APARTMENT_STATUS.ACTIVE.label.toLowerCase()}?`,
      next === 'INACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt',
      () => void apartmentApi.status(id, next).then(() => apartment.refetch()),
      next === 'INACTIVE',
    )
  }

  const remove = () => {
    if (!a) return
    confirm(
      'Xoá căn hộ',
      `Xoá căn "${a.code}"? Chỉ xoá được khi căn không còn cư dân, kể cả lịch sử. Không thể hoàn tác.`,
      'Xoá',
      () =>
        void apartmentApi
          .remove(id)
          .then(() => {
            void qc.invalidateQueries({ queryKey: ['apartments'] })
            router.back()
          })
          .catch((e) => notify('Không xoá được', errorMessage(e))),
      true,
    )
  }

  return (
    <Screen onRefresh={refresh}>
      <Stack.Screen options={{ title: a ? `Căn ${a.code}` : 'Căn hộ' }} />
      {a && (
        <Card style={{ gap: 4 }}>
          <View style={styles.top}>
            <Text style={styles.title}>
              {a.code} · {a.name}
            </Text>
            <Chip {...APARTMENT_STATUS[a.status]} />
          </View>
          <Row label="Tòa nhà" value={a.buildingName} />
          <Row label="Tầng" value={a.floorNo} />
          <Row label="Diện tích" value={`${a.area} m²`} />
          <Row label="Tình trạng" value={USAGE_STATUS[a.usageStatus].label} />
          {a.description ? <Row label="Mô tả" value={a.description} /> : null}
        </Card>
      )}
      {a && can('APARTMENT_WRITE') && (
        <View style={{ gap: 10 }}>
          <Button title="Chỉnh sửa" icon="pencil-outline" onPress={() => setEditing(true)} />
          <Button
            title={a.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
            variant="outline"
            onPress={toggleStatus}
          />
        </View>
      )}
      {a && can('APARTMENT_DELETE') && <Button title="Xoá căn hộ" variant="ghost" onPress={remove} />}

      {can('RESIDENT_READ') && (
        <>
          <SectionTitle title={`Người đang ở (${living.length})`} />
          {living.length === 0 ? (
            <Card>
              <Text style={styles.muted}>Chưa có cư dân.</Text>
            </Card>
          ) : (
            living.map((m) => (
              <Card key={m.linkId} style={styles.member}>
                <AuthImage url={m.avatarUrl} style={styles.avatar} icon="account" />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.name}>{m.fullName}</Text>
                  <Text style={styles.muted}>
                    {RESIDENT_ROLE[m.role].label}
                    {m.householdHead ? ' · chủ hộ' : ''}
                    {m.relationship ? ` · ${RELATIONSHIP[m.relationship]}` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Text style={styles.phone}>{m.phone}</Text>
                    {m.residenceStatus === 'TEMP_ABSENT' && <Chip {...RESIDENCE_STATUS.TEMP_ABSENT} />}
                  </View>
                </View>
                <Pressable onPress={() => callPhone(m.phone)} style={styles.call} accessibilityLabel={`Gọi ${m.fullName}`}>
                  <Icon name="phone" size={20} color="#FFFFFF" />
                </Pressable>
              </Card>
            ))
          )}
        </>
      )}

      {can('ASSET_READ') && (
        <>
          <SectionTitle title={`Xe (${vehicles.data?.content.length ?? 0})`} />
          {(vehicles.data?.content ?? []).map((v) => (
            <ListRow
              key={v.id}
              icon="car-outline"
              title={`${v.plateNumber ?? 'Không biển'} · ${v.name}`}
              subtitle={`${v.categoryName}${v.accessCardNo ? ` · thẻ ${v.accessCardNo}` : ''}`}
            />
          ))}
        </>
      )}

      {can('TICKET_READ') && !!tickets.data?.content.length && (
        <>
          <SectionTitle title="Yêu cầu gần đây" />
          {tickets.data.content.map((t) => (
            <ListRow
              key={t.id}
              title={t.title}
              subtitle={`${t.code} · ${timeAgo(t.createdAt)}`}
              chip={TICKET_STATUS[t.status]}
              highlight={t.overdue}
              onPress={() => router.push(`/tickets/${t.id}`)}
            />
          ))}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6, flexShrink: 1 },
  muted: { fontSize: 13, color: colors.textMuted },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  phone: { fontSize: 14, color: colors.text, fontWeight: '600' },
  call: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
})
