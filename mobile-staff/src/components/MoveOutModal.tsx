import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { DateInput } from '@/components/form'
import { Button, Icon } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { notify } from '@/lib/dialogs'
import { residentApi } from '@/lib/staff'
import type { ResidentDetail, ResidentLink } from '@/lib/types'
import { colors } from '@/theme'

/** Chuyển đi một hoặc nhiều căn đang ở. Mặc định chọn hết các căn đang hoạt động (giống web). */
export function MoveOutModal({
  visible,
  residentId,
  links,
  onClose,
  onSaved,
}: {
  visible: boolean
  residentId: number
  links: ResidentLink[]
  onClose: () => void
  onSaved: (r: ResidentDetail) => void
}) {
  const [date, setDate] = useState<string | undefined>(new Date().toISOString().slice(0, 10))
  const [selected, setSelected] = useState<Set<number>>(new Set(links.map((l) => l.id)))
  const [saving, setSaving] = useState(false)

  const toggle = (id: number) => {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submit = async () => {
    if (!date || selected.size === 0) {
      notify('Thiếu thông tin', 'Chọn ngày chuyển đi và ít nhất một căn.')
      return
    }
    setSaving(true)
    try {
      const allSelected = selected.size === links.length
      const saved = await residentApi.moveOut(residentId, date, allSelected ? undefined : Array.from(selected))
      onSaved(saved)
    } catch (e) {
      notify('Không chuyển đi được', errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Chuyển đi</Text>
          <DateInput label="Ngày chuyển đi" value={date} onChange={setDate} maximumDate={new Date()} />
          <Text style={styles.label}>Căn hộ chuyển đi</Text>
          {links.map((l) => (
            <Pressable key={l.id} onPress={() => toggle(l.id)} style={styles.row}>
              <Icon name={selected.has(l.id) ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={selected.has(l.id) ? colors.primary : colors.textMuted} />
              <Text style={styles.rowText}>{l.apartmentCode} · {l.apartmentName}</Text>
            </Pressable>
          ))}
          <Text style={styles.hint}>Thẻ từ gắn với cư dân tại các căn này sẽ bị thu hồi.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Huỷ" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button title="Chuyển đi" variant="danger" onPress={() => void submit()} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.card, borderRadius: 16, padding: 18, gap: 14, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  rowText: { fontSize: 14, color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted },
})
