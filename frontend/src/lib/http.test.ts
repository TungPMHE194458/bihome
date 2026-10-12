import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { http, refreshAccessToken } from '@/lib/http'
import { useAuthStore } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse {
  return { data, status, statusText: '', headers: {}, config }
}

describe('http client', () => {
  const originalAdapter = http.defaults.adapter

  beforeEach(() => {
    useAuthStore.setState({ status: 'authenticated', accessToken: 'old', user: null })
    useBuildingStore.setState({ selectedBuildingId: null })
  })

  afterEach(() => {
    http.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('shares a single refresh request between concurrent callers', async () => {
    const post = vi.spyOn(axios, 'post').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { accessToken: 'new' } }), 10)),
    )

    const tokens = await Promise.all([refreshAccessToken(), refreshAccessToken(), refreshAccessToken()])

    expect(tokens).toEqual(['new', 'new', 'new'])
    expect(post).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().accessToken).toBe('new')

    await refreshAccessToken()
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('refreshes once on 401 and retries the original requests with the new token', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'new' } })
    const seen: (string | undefined)[] = []
    http.defaults.adapter = async (config) => {
      const auth = config.headers.Authorization as string | undefined
      seen.push(auth)
      if (auth === 'Bearer new') return respond(config, 200, 'ok')
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, respond(config, 401, { status: 401 }))
    }

    const results = await Promise.all([http.get('/users'), http.get('/roles')])

    expect(results.map((r) => r.data)).toEqual(['ok', 'ok'])
    expect(post).toHaveBeenCalledTimes(1)
    expect(seen.filter((h) => h === 'Bearer old')).toHaveLength(2)
  })

  it('logs the user out when the refresh itself fails', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('expired'))
    http.defaults.adapter = async (config) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, respond(config, 401, { status: 401 }))
    }

    await expect(http.get('/users')).rejects.toBeInstanceOf(AxiosError)
    expect(useAuthStore.getState()).toMatchObject({ status: 'anonymous', accessToken: null })
  })

  it('sends the selected building unless the request opts out', async () => {
    useBuildingStore.setState({ selectedBuildingId: 7 })
    const headers: unknown[] = []
    http.defaults.adapter = async (config) => {
      headers.push(config.headers['X-Building-Id'])
      return respond(config, 200, null)
    }

    await http.get('/apartments')
    await http.get('/buildings/options', { skipBuildingContext: true })

    expect(headers).toEqual(['7', undefined])
  })

  it('clears the selected building when the server denies access to it', async () => {
    useBuildingStore.setState({ selectedBuildingId: 7 })
    http.defaults.adapter = async (config) => {
      throw new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, null,
        respond(config, 403, { status: 403, code: 'BUILDING_ACCESS_DENIED' }))
    }

    await expect(http.get('/apartments')).rejects.toBeInstanceOf(AxiosError)
    expect(useBuildingStore.getState().selectedBuildingId).toBeNull()
  })
})
