import { useState, type ReactNode } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { SafeAreaView, type Edge } from 'react-native-safe-area-context'
import { colors } from '@/theme'

interface ScreenProps {
  children: ReactNode
  /** Kéo xuống để tải lại. */
  onRefresh?: () => Promise<unknown>
  scroll?: boolean
  edges?: Edge[]
  contentStyle?: StyleProp<ViewStyle>
}

/** Khung màn hình: vùng an toàn + cuộn + kéo để làm mới, nền xám nhạt của BiHome. */
export function Screen({ children, onRefresh, scroll = true, edges = ['left', 'right'], contentStyle }: ScreenProps) {
  const [refreshing, setRefreshing] = useState(false)
  const refresh = onRefresh
    ? async () => {
        setRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
        }
      }
    : undefined
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
})
