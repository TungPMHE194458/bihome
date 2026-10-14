import { StyleSheet, Text, View } from 'react-native'
import { colors } from '@/theme'

/** Logo BiHome (khớp BiHomeMark của web) dựng bằng View, không cần SVG. */
export function Logo({ size = 40, showText = true }: { size?: number; showText?: boolean }) {
  const u = size / 40
  return (
    <View style={styles.row}>
      <View style={{ width: size, height: size, borderRadius: 10 * u, backgroundColor: colors.primary, overflow: 'hidden' }}>
        {/* mái */}
        <View
          style={{
            position: 'absolute',
            left: 9 * u,
            top: 9 * u,
            width: 0,
            height: 0,
            borderLeftWidth: 11 * u,
            borderRightWidth: 11 * u,
            borderBottomWidth: 9 * u,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: '#FFFFFF',
          }}
        />
        {/* thân + cửa */}
        <View style={{ position: 'absolute', left: 9 * u, top: 18 * u, width: 22 * u, height: 13 * u, backgroundColor: '#FFFFFF', borderRadius: u }} />
        <View style={{ position: 'absolute', left: 16 * u, top: 21 * u, width: 8 * u, height: 10 * u, backgroundColor: colors.primary, borderRadius: 1.5 * u }} />
        <View style={{ position: 'absolute', left: 24.6 * u, top: 10.6 * u, width: 4.8 * u, height: 4.8 * u, borderRadius: 2.4 * u, backgroundColor: '#BBF7D0' }} />
      </View>
      {showText && (
        <View>
          <Text style={{ fontSize: size * 0.5, fontWeight: '800', color: colors.text }}>
            Bi<Text style={{ color: colors.primary }}>Home</Text>
          </Text>
          <Text style={{ fontSize: Math.max(11, size * 0.22), color: colors.textMuted }}>Ứng dụng Ban quản lý</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
})
