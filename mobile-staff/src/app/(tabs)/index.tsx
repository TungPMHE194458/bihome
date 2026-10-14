import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BuildingBar, ListRow, StatTile } from '@/components/common'
import { Screen } from '@/components/Screen'
import { Card, Icon, SectionTitle } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { SOS_TYPE, TICKET_STATUS } from '@/lib/constants'
import { money, timeAgo } from '@/lib/format'
import { usePendingCounts, useSosActive, useUnreadCount } from '@/lib/queries'
import { api } from '@/lib/staff'
import { colors } from '@/theme'

const OPEN = new Set(['NEW', 'RECEIVED', 'IN_PROGRESS', 'WAITING'])

export default function HomeScreen() {
  const { me, can, buildingId } = useAuth()
  const sos = useSosActive()
  const pending = usePendingCounts()
  const unread = useUnreadCount()
  const month = dayjs().format('YYYY-MM')
  const dashboard = useQuery({
    queryKey: ['dashboard', buildingId, month],
    queryFn: () => api.dashboard(month),
    enabled: can('DASHBOARD_READ'),
  })
  const myTickets = useQuery({
    queryKey: ['tickets', 'mine', buildingId],
    queryFn: () => api.tickets({ assigneeId: me?.id, size: 50 }),
    enabled: can('TICKET_READ') && !!me,
  })
  const open = (myTickets.data?.content ?? []).filter((t) => OPEN.has(t.status))
  const d = dashboard.data
  const hour = dayjs().hour()
  const greeting = hour < 11 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'

  const refresh = () => Promise.all([sos.refetch(), dashboard.refetch(), myTickets.refetch(), unread.refetch()])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <Screen onRefresh={refresh}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>{greeting},</Text>
            <Text style={styles.name} numberOfLines={1}>
              {me?.profile.fullName ?? me?.username}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/notifications')} hitSlop={8} accessibilityLabel="Thông báo">
            <Icon name="bell-outline" size={26} />
            {unread.data?.count ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread.data.count > 99 ? '99+' : unread.data.count}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <BuildingBar />

        {sos.enabled && (sos.data?.count ?? 0) > 0 && (
          <Pressable onPress={() => router.push('/sos')} style={styles.sos} accessibilityRole="button">
            <Icon name="alarm-light" size={30} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.sosTitle}>
                {sos.data!.count} cảnh báo SOS đang mở{sos.data!.newCount ? ` · ${sos.data!.newCount} chưa tiếp nhận` : ''}
              </Text>
              {sos.data!.latest[0] && (
                <Text style={styles.sosSub} numberOfLines={1}>
                  {SOS_TYPE[sos.data!.latest[0].alertType].label}
                  {sos.data!.latest[0].apartmentCode ? ` · căn ${sos.data!.latest[0].apartmentCode}` : ''} ·{' '}
                  {timeAgo(sos.data!.latest[0].createdAt)}
                </Text>
              )}
            </View>
            <Icon name="chevron-right" size={24} color="#FFFFFF" />
          </Pressable>
        )}

        {d && (
          <View style={styles.tiles}>
            <StatTile
              label="Yêu cầu đang mở"
              value={d.openTickets}
              icon="message-text-outline"
              tone={colors.info}
              onPress={can('TICKET_READ') ? () => router.push('/tickets') : undefined}
            />
            <StatTile
              label="Yêu cầu quá hạn"
              value={d.overdueTickets}
              icon="clock-alert-outline"
              tone={colors.danger}
              onPress={can('TICKET_READ') ? () => router.push({ pathname: '/tickets', params: { filter: 'overdue' } }) : undefined}
            />
            <StatTile label="Lượt tiện ích hôm nay" value={d.amenityBookingsToday ?? '—'} icon="calendar-today" tone={colors.primary} />
            <StatTile
              label="Căn hộ có người ở"
              value={`${d.occupiedApartmentCount}/${d.apartmentCount}`}
              icon="home-city-outline"
              tone={colors.neutral}
            />
            {d.feeDebt != null && <StatTile label="Công nợ phí" value={money(d.feeDebt)} icon="cash-clock" tone={colors.warning} />}
            {d.feeCollectionRate != null && (
              <StatTile
                label={`Tỉ lệ thu kỳ ${d.feePeriod ?? ''}`}
                value={`${Math.round(d.feeCollectionRate * 100)}%`}
                icon="chart-donut"
                tone={colors.primary}
              />
            )}
          </View>
        )}

        {pending.any && pending.total > 0 && (
          <Card onPress={() => router.push('/approvals')} style={styles.pending}>
            <Icon name="clipboard-check-outline" size={26} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingTitle}>{pending.total} việc chờ duyệt</Text>
              <Text style={styles.muted}>
                {[
                  pending.bookings ? `${pending.bookings} đăng ký tiện ích` : null,
                  pending.declarations ? `${pending.declarations} phiếu kê khai` : null,
                  pending.orders ? `${pending.orders} đơn dịch vụ` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Icon name="chevron-right" size={22} color={colors.textMuted} />
          </Card>
        )}

        <View style={styles.actions}>
          {can('METER_READING_WRITE') && <Action icon="gauge" label="Ghi chỉ số" onPress={() => router.push('/meter')} />}
          {(can('RESIDENT_READ') || can('APARTMENT_READ') || can('ASSET_READ')) && (
            <Action icon="account-search-outline" label="Tra cứu" onPress={() => router.push('/lookup')} />
          )}
          {can('TICKET_READ') && <Action icon="format-list-checks" label="Yêu cầu" onPress={() => router.push('/tickets')} />}
          <Action icon="bell-outline" label="Thông báo" onPress={() => router.push('/notifications')} />
        </View>

        {can('TICKET_READ') && (
          <>
            <SectionTitle title="Việc của tôi" action={<Text style={styles.link} onPress={() => router.push({ pathname: '/tickets', params: { filter: 'mine' } })}>Xem tất cả</Text>} />
            {open.length === 0 ? (
              <Card>
                <Text style={styles.muted}>Không có yêu cầu nào đang giao cho bạn.</Text>
              </Card>
            ) : (
              open.slice(0, 5).map((t) => (
                <ListRow
                  key={t.id}
                  title={t.title}
                  subtitle={`${t.code}${t.apartmentCode ? ` · căn ${t.apartmentCode}` : ''} · ${t.categoryName}`}
                  meta={timeAgo(t.createdAt)}
                  chip={TICKET_STATUS[t.status]}
                  highlight={t.overdue}
                  onPress={() => router.push(`/tickets/${t.id}`)}
                />
              ))
            )}
          </>
        )}
      </Screen>
    </SafeAreaView>
  )
}

function Action({ icon, label, onPress }: { icon: Parameters<typeof Icon>[0]['name']; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      <View style={styles.actionIcon}>
        <Icon name={icon} size={24} color={colors.primaryDark} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  hello: { color: colors.textMuted, fontSize: 14 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  sos: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.danger, borderRadius: 16, padding: 14 },
  sosTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  sosSub: { color: '#FEE2E2', fontSize: 13, marginTop: 2 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, borderLeftColor: colors.warning },
  pendingTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13 },
  link: { color: colors.primaryDark, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, alignItems: 'center', gap: 6 },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
})
