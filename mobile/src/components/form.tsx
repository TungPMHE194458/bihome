import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { TextField } from '@/components/ui'
import { colors } from '@/theme'

dayjs.extend(customParseFormat)

/** "dd/mm/yyyy" đã nhập đủ → "yyyy-mm-dd"; rỗng → undefined; sai → null. */
export function parseVnDate(text: string): string | null | undefined {
  if (!text.trim()) return undefined
  const d = dayjs(text.trim(), 'DD/MM/YYYY', true)
  return d.isValid() ? d.format('YYYY-MM-DD') : null
}

/** Ô ngày dạng DD/MM/YYYY (gõ số, tự chèn dấu "/"), không cần thư viện chọn ngày gốc. */
export function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string
  /** dd/mm/yyyy */
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const format = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/')
  }
  return (
    <TextField
      label={label}
      placeholder="dd/mm/yyyy"
      keyboardType="number-pad"
      value={value}
      onChangeText={(t) => onChange(format(t))}
      maxLength={10}
      error={error}
    />
  )
}

export interface Choice<T extends string | number> {
  value: T
  label: string
}

/** Chọn một giá trị bằng chip (thay cho select); bấm lại chip đang chọn để bỏ chọn nếu không bắt buộc. */
export function ChipSelect<T extends string | number>({
  label,
  options,
  value,
  onChange,
  required,
  error,
}: {
  label: string
  options: Choice<T>[]
  value: T | null
  onChange: (v: T | null) => void
  required?: boolean
  error?: string
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const active = o.value === value
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(active && !required ? null : o.value)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && { color: '#FFFFFF' }]}>{o.label}</Text>
            </Pressable>
          )
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

/** Thanh chia tab nhỏ trong một màn hình. */
export function Segmented<T extends string>({ items, value, onChange }: { items: Choice<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {items.map((i) => {
        const active = i.value === value
        return (
          <Pressable key={i.value} onPress={() => onChange(i.value)} style={[styles.segmentItem, active && styles.segmentActive]}
            accessibilityRole="tab" accessibilityState={{ selected: active }}>
            <Text style={[styles.segmentText, active && { color: colors.primaryDark }]}>{i.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** Ô số lượng có nút − / +. */
export function Stepper({ value, onChange, min = 1, max = 99, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)))
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => set(value - step)} style={styles.step} accessibilityLabel="Giảm">
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable onPress={() => set(value + step)} style={styles.step} accessibilityLabel="Tăng">
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '500' },
  error: { color: colors.danger, fontSize: 13 },
  segment: { flexDirection: 'row', backgroundColor: colors.neutralLight, borderRadius: 12, padding: 4, gap: 4 },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { fontWeight: '600', color: colors.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  step: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 20, color: colors.text },
  stepValue: { fontSize: 18, fontWeight: '700', minWidth: 32, textAlign: 'center' },
})
