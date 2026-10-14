import { useQuery } from '@tanstack/react-query'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { callPhone, ListRow } from '@/components/common'
import { Screen } from '@/components/Screen'
import { AuthImage, Card, Chip, ErrorView, Icon, Loading, Row, SectionTitle } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { RELATIONSHIP, RESIDENCE_STATUS, RESIDENT_ROLE, TICKET_STATUS } from '@/lib/constants'
import { timeAgo } from '@/lib/format'
import { api } from '@/lib/staff'
import { colors } from '@/theme'

const USAGE: Record<string, string> = { OCCUPIED: 'Đang ở', VACANT: 'Trống', RENOVATING: 'Đang sửa chữa' }

/** Căn hộ: thông tin, người đang ở (gọi nhanh), xe, yêu cầu gần đây. */
export default function ApartmentScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id)
  const { can } = useAuth()
  // API chi tiết kiểm tra quyền theo tòa của căn, không theo tòa đang chọn.
  const apartment = useQuery({ queryKey: ['apartment', id], queryFn: () => api.apartment(id), enabled: can('APARTMENT_READ') })
  const members = useQuery({ queryKey: ['apartment', id, 'members'], queryFn: () => api.apartmentMembers(id), enabled: can('RESIDENT_READ') })
  const vehicles = useQuery({ queryKey: ['apartment', id, 'vehicles'], queryFn: () => api.vehicles({ apartmentId: id, status: 'ACTIVE' }), enabled: can('ASSET_READ') })
  const tickets = useQuery({ queryKey: ['apartment', id, 'tickets'], queryFn: () => api.tickets({ apartmentId: id, size: 10 }), enabled: can('TICKET_READ') })

  const refresh = () => Promise.all([apartment.refetch(), members.refetch(), vehicles.refetch(), tickets.refetch()])
  if (apartment.isLoading || members.isLoading) return <Loading />
  if (apartment.error) return <ErrorView message={errorMessage(apartment.error)} onRetry={() => void refresh()} />
  const a = apartment.data
  const living = (members.data ?? []).filter((m) => m.residenceStatus !== 'MOVED_OUT')

  return (
    <Screen onRefresh={refresh}>
      <Stack.Screen options={{ title: a ? `Căn ${a.code}` : 'Căn hộ' }} />
      {a && (
        <Card style={{ gap: 4 }}>
          <Text style={styles.title}>
            {a.code} · {a.name}
          </Text>
          <Row label="Tòa nhà" value={a.buildingName} />
          <Row label="Tầng" value={a.floorNo} />
          <Row label="Diện tích" value={`${a.area} m²`} />
          <Row label="Tình trạng" value={USAGE[a.usageStatus] ?? a.usageStatus} />
        </Card>
      )}

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
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  muted: { fontSize: 13, color: colors.textMuted },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  phone: { fontSize: 14, color: colors.text, fontWeight: '600' },
  call: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
})
