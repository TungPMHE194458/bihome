import { router, type Href } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { BuildingBar } from '@/components/common'
import { Screen } from '@/components/Screen'
import { Card, Icon, type IconName } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { colors } from '@/theme'

interface ManageItem {
  icon: IconName
  label: string
  /** Chuỗi (ép kiểu Href lúc điều hướng) — dễ liệt kê lộ trình các module trước khi màn hình được dựng xong. */
  href: string
  show: boolean
}

interface Section {
  title: string
  items: ManageItem[]
}

/** Hub quản lý theo nhóm, khớp sidebar web (Vận hành / Tiện ích / Yêu cầu & tài liệu). Mục chưa có quyền bị ẩn. */
export default function ManageScreen() {
  const { can } = useAuth()

  const sections: Section[] = [
    {
      title: 'Quản lý tòa nhà',
      items: [
        { icon: 'office-building-outline', label: 'Tòa nhà', href: '/buildings', show: can('BUILDING_READ') },
        { icon: 'home-city-outline', label: 'Căn hộ', href: '/apartments', show: can('APARTMENT_READ') },
        { icon: 'car-info', label: 'Hạng mục căn hộ', href: '/apartment-assets', show: can('ASSET_READ') },
        { icon: 'account-group-outline', label: 'Cư dân', href: '/residents', show: can('RESIDENT_READ') },
        { icon: 'clipboard-account-outline', label: 'Kê khai từ cư dân', href: '/declarations', show: can('RESIDENT_READ') },
        { icon: 'ticket-percent-outline', label: 'Voucher', href: '/vouchers', show: can('VOUCHER_READ') },
        { icon: 'card-account-details-outline', label: 'Thẻ từ', href: '/access-cards', show: can('ACCESS_CARD_READ') },
        { icon: 'bell-ring-outline', label: 'Nhắc nhở', href: '/reminders', show: can('REMINDER_READ') },
        { icon: 'poll', label: 'Khảo sát ý kiến', href: '/surveys', show: can('SURVEY_READ') },
      ],
    },
    {
      title: 'Quản lý tiện ích',
      items: [
        { icon: 'calendar-check-outline', label: 'Đăng ký tiện ích', href: '/bookings', show: can('AMENITY_BOOKING_READ') },
        { icon: 'pool', label: 'Danh mục tiện ích', href: '/amenities', show: can('AMENITY_READ') },
        { icon: 'room-service-outline', label: 'Dịch vụ', href: '/services', show: can('SERVICE_READ') },
        { icon: 'tag-multiple-outline', label: 'Loại dịch vụ', href: '/service-types', show: can('SERVICE_READ') },
        { icon: 'cash-multiple', label: 'Lịch sử giao dịch', href: '/transactions', show: can('TRANSACTION_READ') },
        { icon: 'chart-box-outline', label: 'Báo cáo tiện ích', href: '/amenity-reports', show: can('AMENITY_REPORT_READ') },
      ],
    },
    {
      title: 'Yêu cầu và tài liệu',
      items: [
        { icon: 'format-list-bulleted', label: 'Danh mục yêu cầu', href: '/ticket-categories', show: can('TICKET_READ') },
        { icon: 'file-document-multiple-outline', label: 'Tài liệu', href: '/documents', show: can('DOCUMENT_READ') },
        { icon: 'folder-outline', label: 'Danh mục tài liệu', href: '/document-categories', show: can('DOCUMENT_READ') },
      ],
    },
    {
      title: 'Công cụ',
      items: [
        { icon: 'gauge', label: 'Ghi chỉ số điện nước', href: '/meter', show: can('METER_READING_WRITE') },
        {
          icon: 'account-search-outline',
          label: 'Tra cứu cư dân, căn hộ, xe',
          href: '/lookup',
          show: can('RESIDENT_READ') || can('APARTMENT_READ') || can('ASSET_READ'),
        },
      ],
    },
  ]

  return (
    <Screen>
      <BuildingBar />
      {sections
        .filter((s) => s.items.some((i) => i.show))
        .map((s) => (
          <View key={s.title} style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Card style={{ paddingVertical: 4 }}>
              {s.items
                .filter((i) => i.show)
                .map((i, idx, arr) => (
                  <Pressable
                    key={i.label}
                    onPress={() => router.push(i.href as Href)}
                    style={({ pressed }) => [styles.item, idx < arr.length - 1 && styles.divider, pressed && { opacity: 0.7 }]}
                  >
                    <Icon name={i.icon} size={22} color={colors.primaryDark} />
                    <Text style={styles.itemText}>{i.label}</Text>
                    <Icon name="chevron-right" size={20} color={colors.textMuted} />
                  </Pressable>
                ))}
            </Card>
          </View>
        ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginTop: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  itemText: { flex: 1, fontSize: 15, color: colors.text },
})
