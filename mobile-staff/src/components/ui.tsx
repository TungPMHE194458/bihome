import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Image } from 'expo-image'
import { useState, type ComponentProps, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { authHeaders, fileUrl } from '@/lib/api'
import type { Chip as ChipStyle } from '@/lib/constants'
import { colors, radius, TONES } from '@/theme'

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name']

export function Icon({ name, size = 22, color = colors.text }: { name: IconName; size?: number; color?: ComponentProps<typeof MaterialCommunityIcons>['color'] }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />
}

// ------------------------------------------------------------ Nút

type Variant = 'primary' | 'outline' | 'danger' | 'ghost'

interface ButtonProps {
  title: string
  onPress?: () => void
  variant?: Variant
  icon?: IconName
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style }: ButtonProps) {
  const off = disabled || loading
  const palette = {
    primary: { bg: colors.primary, fg: '#FFFFFF', border: colors.primary },
    outline: { bg: colors.card, fg: colors.primaryDark, border: colors.primary },
    danger: { bg: colors.danger, fg: '#FFFFFF', border: colors.danger },
    ghost: { bg: 'transparent', fg: colors.primaryDark, border: 'transparent' },
  }[variant]
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: off ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={20} color={palette.fg} />}
          <Text style={[styles.buttonText, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  )
}

// ------------------------------------------------------------ Ô nhập

interface FieldProps extends TextInputProps {
  label: string
  error?: string
  /** Ô mật khẩu có nút hiện / ẩn. */
  secret?: boolean
}

export function TextField({ label, error, secret, style, multiline, ...rest }: FieldProps) {
  const [hidden, setHidden] = useState(true)
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error ? { borderColor: colors.danger } : null]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secret && hidden}
          multiline={multiline}
          style={[styles.input, multiline && { minHeight: 96, textAlignVertical: 'top' }, style]}
          accessibilityLabel={label}
          {...rest}
        />
        {secret && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'}>
            <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

// ------------------------------------------------------------ Hiển thị

export function Chip({ label, tone }: ChipStyle) {
  const t = TONES[tone]
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <Text style={[styles.chipText, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }, style]}>
        {children}
      </Pressable>
    )
  }
  return <View style={[styles.card, style]}>{children}</View>
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  )
}

export function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[styles.rowValue, strong && { fontWeight: '700', color: colors.text }]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  )
}

/** Công tắc + nhãn — cả dòng bấm được, không chỉ riêng công tắc (dễ bấm trúng hơn trên điện thoại). */
export function SwitchRow({ label, value, onValueChange, disabled }: { label: string; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      style={styles.switchRow}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
    >
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.primary }} disabled={disabled} />
      <Text style={[styles.switchLabel, disabled && { color: colors.textMuted }]}>{label}</Text>
    </Pressable>
  )
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

export function EmptyState({ icon = 'inbox-outline', message }: { icon?: IconName; message: string }) {
  return (
    <View style={[styles.center, { paddingVertical: 48 }]}>
      <Icon name={icon} size={48} color={colors.border} />
      <Text style={styles.muted}>{message}</Text>
    </View>
  )
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={[styles.center, { paddingVertical: 48, gap: 12 }]}>
      <Icon name="cloud-alert" size={44} color={colors.danger} />
      <Text style={[styles.muted, { textAlign: 'center' }]}>{message}</Text>
      {onRetry && <Button title="Thử lại" variant="outline" onPress={onRetry} />}
    </View>
  )
}

/** Ảnh từ API tệp của cư dân (cần token); chưa có ảnh thì hiện icon. */
export function AuthImage({ url, style, icon = 'image-outline' }: { url?: string | null; style: StyleProp<ViewStyle>; icon?: IconName }) {
  const uri = fileUrl(url)
  if (!uri) {
    return (
      <View style={[style, styles.placeholder]}>
        <Icon name={icon} size={36} color={colors.textMuted} />
      </View>
    )
  }
  return <Image source={{ uri, headers: authHeaders() }} style={style as never} contentFit="cover" transition={150} />
}

export const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    gap: 8,
  },
  // Bản web: bỏ viền focus mặc định của trình duyệt (khung ngoài đã có viền).
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 12, ...Platform.select({ web: { outlineStyle: 'none' as never } }) },
  error: { color: colors.danger, fontSize: 13 },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  switchLabel: { flex: 1, color: colors.text, fontSize: 15 },
  rowLabel: { color: colors.textMuted, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  muted: { color: colors.textMuted, fontSize: 14 },
  placeholder: { backgroundColor: colors.neutralLight, alignItems: 'center', justifyContent: 'center' },
})
