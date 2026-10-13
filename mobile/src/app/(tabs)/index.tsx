import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { InboxRow } from '@/components/InboxRow'
import { Screen } from '@/components/Screen'
import { Card, ErrorView, Icon, SectionTitle, type IconName } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDate, money } from '@/lib/format'
import { useHome, useInbox, useUnreadCount } from '@/lib/queries'
import { colors, radius } from '@/theme'

const ACTIONS: { label: string; icon: IconName; href: string }[] = [
  { label: 'Gửi yêu cầu', icon: 'message-plus-outline', href: '/tickets/new' },
  { label: 'Đặt tiện ích', icon: 'calendar-plus', href: '/amenities' },
  { label: 'Dịch vụ', icon: 'room-service-outline', href: '/services' },
  { label: 'Khảo sát', icon: 'poll', href: '/surveys' },
  { label: 'Căn hộ', icon: 'home-account', href: '/apartment' },
  { label: 'Kê khai', icon: 'clipboard-text-outline', href: '/declarations' },
  { label: 'Tài liệu', icon: 'folder-text-outline', href: '/documents' },
  { label: 'Thanh toán', icon: 'history', href: '/payments' },
]

export default function HomeScreen() {
  const { me, apartment, selectApartment } = useAuth()
  const home = useHome()
  const inbox = useInbox()
  const unread = useUnreadCount()
  const recent = inbox.data?.content.slice(0, 3) ?? []
  const firstName = me?.fullName.split(' ').pop()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <Screen onRefresh={() => Promise.all([home.refetch(), inbox.refetch(), unread.refetch()])}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Xin chào, {firstName}</Text>
            <Text style={styles.building} numberOfLines={1}>
              {apartment?.buildingName} · Căn {apartment?.code}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/inbox')} style={styles.bell} accessibilityLabel="Thông báo">
            <Icon name="bell-outline" size={24} />
            {!!unread.data?.count && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread.data.count > 99 ? '99+' : unread.data.count}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {me && me.apartments.length > 1 && (
          <View style={styles.apartments}>
            {me.apartments.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => selectApartment(a.id)}
                style={[styles.aptChip, a.id === apartment?.id && styles.aptChipActive]}
              >
                <Text style={[styles.aptText, a.id === apartment?.id && { color: '#FFFFFF' }]}>Căn {a.code}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {home.error ? (
          <ErrorView message={errorMessage(home.error)} onRetry={() => void home.refetch()} />
        ) : (
          <Pressable onPress={() => router.push('/fees')}>
            <View style={styles.debt}>
              <Text style={styles.debtLabel}>Phí cần thanh toán</Text>
              <Text style={styles.debtValue}>{home.data ? money(home.data.outstanding) : '…'}</Text>
              <Text style={styles.debtSub}>
                {home.data?.unpaidNotices
                  ? `${home.data.unpaidNotices} thông báo · hạn gần nhất ${formatDate(home.data.nearestDueDate)}`
                  : 'Bạn không còn khoản phí nào chưa thanh toán'}
              </Text>
              <View style={styles.debtCta}>
                <Text style={styles.debtCtaText}>Xem và thanh toán</Text>
                <Icon name="chevron-right" size={20} color="#FFFFFF" />
              </View>
            </View>
          </Pressable>
        )}

        <View style={styles.grid}>
          {ACTIONS.map((a) => (
            <Pressable key={a.href} style={styles.action} onPress={() => router.push(a.href as never)}>
              <View style={styles.actionIcon}>
                <Icon name={a.icon} size={26} color={colors.primary} />
              </View>
              <Text style={styles.actionText}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.stats}>
          <Card style={styles.stat} onPress={() => router.push('/tickets')}>
            <Text style={styles.statValue}>{home.data?.openTickets ?? '–'}</Text>
            <Text style={styles.statLabel}>Yêu cầu đang xử lý</Text>
          </Card>
          <Card style={styles.stat} onPress={() => router.push('/bookings')}>
            <Text style={styles.statValue}>{home.data?.upcomingBookings ?? '–'}</Text>
            <Text style={styles.statLabel}>Lượt đặt sắp tới</Text>
          </Card>
        </View>

        <Pressable style={styles.sos} onPress={() => router.push('/sos')} accessibilityLabel="Gửi cảnh báo khẩn cấp SOS">
          <Icon name="alarm-light" size={28} color="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.sosTitle}>Khẩn cấp (SOS)</Text>
            <Text style={styles.sosSub}>Báo ngay cho Ban quản lý khi có cháy, cấp cứu, mất an ninh…</Text>
          </View>
        </Pressable>

        <SectionTitle
          title="Thông báo mới"
          action={
            <Pressable onPress={() => router.push('/inbox')}>
              <Text style={styles.link}>Xem tất cả</Text>
            </Pressable>
          }
        />
        <Card style={{ paddingVertical: 4 }}>
          {recent.length === 0 ? (
            <Text style={[styles.statLabel, { paddingVertical: 16, textAlign: 'center' }]}>Chưa có thông báo nào</Text>
          ) : (
            recent.map((item, i) => <InboxRow key={item.id} item={item} last={i === recent.length - 1} />)
          )}
        </Card>
      </Screen>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hello: { fontSize: 22, fontWeight: '800', color: colors.text },
  building: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  apartments: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  aptChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  aptChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  aptText: { fontWeight: '600', color: colors.text },
  debt: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: 20, gap: 4 },
  debtLabel: { color: '#DCFCE7', fontSize: 14 },
  debtValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  debtSub: { color: '#DCFCE7', fontSize: 13 },
  debtCta: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  debtCtaText: { color: '#FFFFFF', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  action: { width: '23%', alignItems: 'center', gap: 6 },
  actionIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 12, color: colors.text, textAlign: 'center', fontWeight: '500' },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 2 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 13, color: colors.textMuted },
  sos: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.danger, borderRadius: radius.lg, padding: 16 },
  sosTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  sosSub: { color: '#FEE2E2', fontSize: 13 },
  link: { color: colors.primaryDark, fontWeight: '600' },
})
