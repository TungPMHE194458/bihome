import { router } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Button, Chip, Icon, TextField, type IconName } from '@/components/ui'
import { useBuildingName } from '@/lib/auth'
import type { Chip as ChipStyle } from '@/lib/constants'
import { colors, radius } from '@/theme'

/** Gọi điện nhanh cho cư dân / người báo. */
export function callPhone(phone?: string | null) {
  if (phone) void Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)
}

/** Một dòng trong danh sách: tiêu đề, dòng phụ, chip trạng thái bên phải. */
export function ListRow({
  title,
  subtitle,
  meta,
  chip,
  icon,
  iconColor,
  highlight,
  onPress,
}: {
  title: string
  subtitle?: string
  meta?: string
  chip?: ChipStyle
  icon?: IconName
  iconColor?: string
  /** Viền đỏ bên trái (quá hạn, SOS mới…). */
  highlight?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, highlight && styles.rowHighlight, pressed && { opacity: 0.85 }]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {icon && (
        <View style={[styles.rowIcon, { backgroundColor: (iconColor ?? colors.primary) + '1A' }]}>
          <Icon name={icon} size={22} color={iconColor ?? colors.primary} />
        </View>
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      </View>
      {chip && <Chip {...chip} />}
    </Pressable>
  )
}

/** Thanh nhỏ đầu màn hình: tòa đang chọn, bấm để đổi tòa. */
export function BuildingBar({ right }: { right?: ReactNode }) {
  const name = useBuildingName()
  return (
    <View style={styles.bar}>
      <Pressable onPress={() => router.push('/building')} style={styles.barButton} accessibilityLabel="Đổi tòa nhà">
        <Icon name="office-building-marker-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.barText} numberOfLines={1}>
          {name}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.primaryDark} />
      </Pressable>
      {right}
    </View>
  )
}

/** Hàng chip lọc cuộn ngang được (dùng trong danh sách). */
export function FilterChips<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { value: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <View style={styles.filters}>
      {items.map((i) => {
        const active = i.value === value
        return (
          <Pressable
            key={i.value}
            onPress={() => onChange(i.value)}
            style={[styles.filter, active && styles.filterActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.filterText, active && { color: '#FFFFFF' }]}>
              {i.label}
              {i.count ? ` (${i.count})` : ''}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/**
 * Hộp nhập lý do / ghi chú (Alert.prompt chỉ có trên iOS). `required` thì nút xác nhận chỉ bật khi đã nhập.
 */
export function PromptModal({
  visible,
  title,
  label,
  confirmLabel,
  danger,
  required = true,
  extra,
  onCancel,
  onConfirm,
}: {
  visible: boolean
  title: string
  label: string
  confirmLabel: string
  danger?: boolean
  required?: boolean
  extra?: ReactNode
  onCancel: () => void
  onConfirm: (text: string) => Promise<void>
}) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const close = () => {
    setText('')
    onCancel()
  }
  const submit = async () => {
    setLoading(true)
    try {
      await onConfirm(text.trim())
      setText('')
    } finally {
      setLoading(false)
    }
  }
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{title}</Text>
          {extra}
          <TextField label={label} value={text} onChangeText={setText} multiline maxLength={1000} autoFocus />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Huỷ" variant="outline" onPress={close} style={{ flex: 1 }} />
            <Button
              title={confirmLabel}
              variant={danger ? 'danger' : 'primary'}
              onPress={() => void submit()}
              loading={loading}
              disabled={required && !text.trim()}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

/** Ô số liệu nhỏ trên Tổng quan. */
export function StatTile({
  label,
  value,
  icon,
  tone = colors.primary,
  onPress,
}: {
  label: string
  value: string | number
  icon: IconName
  tone?: string
  onPress?: () => void
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, pressed && onPress && { opacity: 0.85 }]}>
      <View style={[styles.tileIcon, { backgroundColor: tone + '1A' }]}>
        <Icon name={icon} size={20} color={tone} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowHighlight: { borderLeftWidth: 4, borderLeftColor: colors.danger },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 13, color: colors.textMuted },
  rowMeta: { fontSize: 12, color: colors.textMuted },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  barButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexShrink: 1,
  },
  barText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14, flexShrink: 1 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, gap: 14, maxWidth: 520, width: '100%', alignSelf: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tileIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tileValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  tileLabel: { fontSize: 13, color: colors.textMuted },
})
