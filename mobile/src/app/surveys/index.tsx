import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/Screen'
import { Card, Chip, EmptyState, ErrorView, Icon, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useApartment } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

export default function SurveysScreen() {
  const apt = useApartment()
  const surveys = useQuery({ queryKey: ['apt', apt.id, 'surveys'], queryFn: () => api.surveys(apt.id) })
  const items = surveys.data ?? []
  return (
    <Screen onRefresh={() => surveys.refetch()}>
      {surveys.isLoading ? (
        <Loading />
      ) : surveys.error ? (
        <ErrorView message={errorMessage(surveys.error)} onRetry={() => void surveys.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="poll" message="Hiện chưa có khảo sát nào dành cho bạn" />
      ) : (
        items.map((s) => (
          <Card key={s.id} onPress={() => router.push(`/surveys/${s.id}`)} style={{ gap: 6 }}>
            <View style={styles.top}>
              <Text style={styles.title}>{s.title}</Text>
              {s.answered ? <Chip label="Đã trả lời" tone="success" /> : <Chip label="Chưa trả lời" tone="warning" />}
            </View>
            {s.description ? (
              <Text style={styles.muted} numberOfLines={2}>
                {s.description}
              </Text>
            ) : null}
            <View style={styles.meta}>
              <Icon name="clock-outline" size={15} color={colors.textMuted} />
              <Text style={styles.muted}>
                Đến {formatDateTime(s.endAt)} · {s.questionCount} câu{s.anonymous ? ' · ẩn danh' : ''}
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  muted: { fontSize: 13, color: colors.textMuted },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
})
