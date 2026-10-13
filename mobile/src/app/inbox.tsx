import { useQueryClient } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { Pressable, Text } from 'react-native'
import { InboxRow } from '@/components/InboxRow'
import { Screen } from '@/components/Screen'
import { Card, EmptyState, ErrorView, Loading } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useInbox } from '@/lib/queries'
import { api } from '@/lib/resident'
import { colors } from '@/theme'

export default function InboxScreen() {
  const qc = useQueryClient()
  const inbox = useInbox()
  const items = inbox.data?.content ?? []
  const readAll = async () => {
    await api.markAllRead()
    await qc.invalidateQueries({ queryKey: ['inbox'] })
  }
  return (
    <Screen onRefresh={() => inbox.refetch()}>
      <Stack.Screen
        options={{
          headerRight: () =>
            items.some((i) => !i.read) ? (
              <Pressable onPress={() => void readAll()} hitSlop={8}>
                <Text style={{ color: colors.primaryDark, fontWeight: '600' }}>Đọc tất cả</Text>
              </Pressable>
            ) : null,
        }}
      />
      {inbox.isLoading ? (
        <Loading />
      ) : inbox.error ? (
        <ErrorView message={errorMessage(inbox.error)} onRetry={() => void inbox.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="bell-outline" message="Chưa có thông báo nào" />
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {items.map((item, i) => (
            <InboxRow key={item.id} item={item} last={i === items.length - 1} />
          ))}
        </Card>
      )}
    </Screen>
  )
}
