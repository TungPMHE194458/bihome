import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Button, Icon, TextField } from '@/components/ui'
import { DateTimePicker } from '@/lib/file'
import { formatDate } from '@/lib/format'
import { colors, radius } from '@/theme'

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

// ------------------------------------------------------------ Chọn ngày

/**
 * Chọn ngày (yyyy-mm-dd). Web dùng {@link DateField} (gõ số); điện thoại mở picker gốc của hệ điều hành — iOS hiện
 * dạng spinner trong tấm trượt lên, Android tự mở hộp thoại hệ thống.
 */
export function DateInput({
  label,
  value,
  onChange,
  error,
  minimumDate,
  maximumDate,
}: {
  label: string
  value?: string | null
  onChange: (v: string | undefined) => void
  error?: string
  minimumDate?: Date
  maximumDate?: Date
}) {
  const [open, setOpen] = useState(false)
  const [webText, setWebText] = useState(value ? dayjs(value).format('DD/MM/YYYY') : '')
  if (Platform.OS === 'web') {
    return (
      <DateField
        label={label}
        value={webText}
        onChange={(t) => {
          setWebText(t)
          const parsed = parseVnDate(t)
          if (parsed !== null) onChange(parsed)
        }}
        error={error}
      />
    )
  }
  const date = value ? dayjs(value).toDate() : new Date()
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[dateStyles.field, error ? { borderColor: colors.danger } : null]}
        accessibilityLabel={label}
      >
        <Icon name="calendar-outline" size={18} color={colors.textMuted} />
        <Text style={[dateStyles.text, !value && { color: colors.textMuted }]}>{value ? formatDate(value) : 'Chọn ngày'}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {open && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, picked) => {
            if (Platform.OS === 'android') setOpen(false)
            if (event.type === 'dismissed') return
            if (picked) onChange(dayjs(picked).format('YYYY-MM-DD'))
          }}
        />
      )}
      {Platform.OS === 'ios' && open && <Button title="Xong" onPress={() => setOpen(false)} />}
    </View>
  )
}

const dateStyles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: { fontSize: 16, color: colors.text },
})

/** Chọn giờ (HH:mm). Web gõ trực tiếp theo mẫu; điện thoại mở picker gốc. */
export function TimeInput({ label, value, onChange, error }: { label: string; value?: string; onChange: (v: string | undefined) => void; error?: string }) {
  const [open, setOpen] = useState(false)
  if (Platform.OS === 'web') {
    return (
      <TextField
        label={label}
        value={value ?? ''}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, '').slice(0, 4)
          const formatted = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
          onChange(formatted || undefined)
        }}
        placeholder="hh:mm"
        keyboardType="number-pad"
        maxLength={5}
        error={error}
      />
    )
  }
  const [h, m] = (value ?? '08:00').split(':').map(Number)
  const date = new Date()
  date.setHours(h || 0, m || 0, 0, 0)
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={[dateStyles.field, error ? { borderColor: colors.danger } : null]} accessibilityLabel={label}>
        <Icon name="clock-outline" size={18} color={colors.textMuted} />
        <Text style={[dateStyles.text, !value && { color: colors.textMuted }]}>{value ?? 'Chọn giờ'}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {open && (
        <DateTimePicker
          value={date}
          mode="time"
          display="default"
          onChange={(event, picked) => {
            setOpen(false)
            if (event.type === 'dismissed' || !picked) return
            onChange(`${String(picked.getHours()).padStart(2, '0')}:${String(picked.getMinutes()).padStart(2, '0')}`)
          }}
        />
      )}
    </View>
  )
}

// ------------------------------------------------------------ Tìm & chọn (modal)

export interface PickerOption<T> {
  value: T
  label: string
  sublabel?: string
}

/**
 * Modal tìm kiếm + chọn một giá trị — dùng cho chọn tòa nhà, căn hộ, cư dân, danh mục, người xử lý... `options` tải
 * sẵn (danh mục ngắn) hoặc `onSearch` gọi API theo từ khoá (danh sách dài như căn hộ / cư dân).
 */
export function SearchPicker<T extends string | number>({
  label,
  value,
  valueLabel,
  options,
  onSearch,
  onChange,
  error,
  required,
  placeholder = 'Tìm kiếm…',
}: {
  label: string
  value: T | null
  /** Nhãn hiện trên ô khi đã chọn (vì options có thể chưa tải option đang chọn). */
  valueLabel?: string
  options?: PickerOption<T>[]
  onSearch?: (keyword: string) => Promise<PickerOption<T>[]>
  onChange: (v: T | null, option?: PickerOption<T>) => void
  error?: string
  required?: boolean
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<PickerOption<T>[]>(options ?? [])
  const [loading, setLoading] = useState(false)

  const search = async (text: string) => {
    setKeyword(text)
    if (!onSearch) {
      setResults((options ?? []).filter((o) => !text || o.label.toLowerCase().includes(text.toLowerCase())))
      return
    }
    setLoading(true)
    try {
      setResults(await onSearch(text))
    } finally {
      setLoading(false)
    }
  }

  const openModal = () => {
    setVisible(true)
    setKeyword('')
    void search('')
  }

  const selected = valueLabel ?? options?.find((o) => o.value === value)?.label

  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <Pressable
        onPress={openModal}
        style={[pickerStyles.field, error ? { borderColor: colors.danger } : null]}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <Text style={[pickerStyles.text, !selected && { color: colors.textMuted }]} numberOfLines={1}>
          {selected ?? placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={pickerStyles.modal}>
          <View style={pickerStyles.modalHeader}>
            <Pressable onPress={() => setVisible(false)} hitSlop={10} accessibilityLabel="Đóng">
              <Icon name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={pickerStyles.modalTitle}>{label}</Text>
            <View style={{ width: 24 }} />
          </View>
          <TextInput
            style={pickerStyles.search}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={keyword}
            onChangeText={(t) => void search(t)}
            autoFocus
          />
          {!required && (
            <Pressable
              onPress={() => {
                onChange(null)
                setVisible(false)
              }}
              style={pickerStyles.row}
            >
              <Text style={[pickerStyles.rowLabel, { color: colors.textMuted }]}>Bỏ chọn</Text>
            </Pressable>
          )}
          {loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(o) => String(o.value)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value, item)
                    setVisible(false)
                  }}
                  style={pickerStyles.row}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={pickerStyles.rowLabel}>{item.label}</Text>
                    {item.sublabel ? <Text style={pickerStyles.rowSub}>{item.sublabel}</Text> : null}
                  </View>
                  {item.value === value && <Icon name="check" size={20} color={colors.primary} />}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={pickerStyles.empty}>Không tìm thấy kết quả.</Text>}
            />
          )}
        </View>
      </Modal>
    </View>
  )
}

const pickerStyles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  text: { fontSize: 16, color: colors.text, flexShrink: 1 },
  modal: { flex: 1, backgroundColor: colors.card, paddingTop: 54 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: { fontSize: 15, color: colors.text },
  rowSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 32 },
})

// ------------------------------------------------------------ Tìm & chọn nhiều (modal)

/**
 * Như {@link SearchPicker} nhưng chọn nhiều — dùng cho đối tượng nhận nhắc nhở/khảo sát (căn hộ/cư dân cụ thể).
 * `selected` là danh sách {@link PickerOption} đã chọn (giữ nhãn kể cả khi không còn trong kết quả tìm gần nhất).
 */
export function MultiSearchPicker<T extends string | number>({
  label,
  selected,
  onSearch,
  onChange,
  error,
  placeholder = 'Tìm kiếm…',
}: {
  label: string
  selected: PickerOption<T>[]
  onSearch: (keyword: string) => Promise<PickerOption<T>[]>
  onChange: (v: PickerOption<T>[]) => void
  error?: string
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<PickerOption<T>[]>([])
  const [loading, setLoading] = useState(false)

  const search = async (text: string) => {
    setKeyword(text)
    setLoading(true)
    try {
      setResults(await onSearch(text))
    } finally {
      setLoading(false)
    }
  }

  const openModal = () => {
    setVisible(true)
    setKeyword('')
    void search('')
  }

  const toggle = (option: PickerOption<T>) => {
    const exists = selected.some((s) => s.value === option.value)
    onChange(exists ? selected.filter((s) => s.value !== option.value) : [...selected, option])
  }

  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={openModal} style={[pickerStyles.field, error ? { borderColor: colors.danger } : null]} accessibilityLabel={label} accessibilityRole="button">
        <Text style={[pickerStyles.text, !selected.length && { color: colors.textMuted }]} numberOfLines={1}>
          {selected.length ? `Đã chọn ${selected.length}` : placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      {selected.length > 0 && (
        <View style={multiStyles.chips}>
          {selected.map((s) => (
            <Pressable key={String(s.value)} onPress={() => toggle(s)} style={multiStyles.chip}>
              <Text style={multiStyles.chipText} numberOfLines={1}>
                {s.label}
              </Text>
              <Icon name="close" size={14} color={colors.primaryDark} />
            </Pressable>
          ))}
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={pickerStyles.modal}>
          <View style={pickerStyles.modalHeader}>
            <Pressable onPress={() => setVisible(false)} hitSlop={10} accessibilityLabel="Đóng">
              <Icon name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={pickerStyles.modalTitle}>
              {label} {selected.length ? `(${selected.length})` : ''}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <TextInput
            style={pickerStyles.search}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={keyword}
            onChangeText={(t) => void search(t)}
            autoFocus
          />
          {loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(o) => String(o.value)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const checked = selected.some((s) => s.value === item.value)
                return (
                  <Pressable onPress={() => toggle(item)} style={pickerStyles.row}>
                    <Icon name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={checked ? colors.primary : colors.textMuted} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={pickerStyles.rowLabel}>{item.label}</Text>
                      {item.sublabel ? <Text style={pickerStyles.rowSub}>{item.sublabel}</Text> : null}
                    </View>
                  </Pressable>
                )
              }}
              ListEmptyComponent={<Text style={pickerStyles.empty}>Không tìm thấy kết quả.</Text>}
            />
          )}
          <View style={multiStyles.doneBar}>
            <Button title={`Xong (${selected.length})`} onPress={() => setVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  )
}

const multiStyles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  chipText: { color: colors.primaryDark, fontWeight: '600', fontSize: 13, flexShrink: 1 },
  doneBar: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.card },
})
