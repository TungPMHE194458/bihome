import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { viVN } from '@mui/x-date-pickers/locales'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { SnackbarProvider } from 'notistack'
import type { ReactNode } from 'react'
import { theme } from '@/app/theme'
import '@/lib/dayjs'
import { queryClient as defaultQueryClient } from '@/lib/queryClient'

const pickerLocale = viVN.components.MuiLocalizationProvider.defaultProps.localeText

interface AppProvidersProps {
  children: ReactNode
  queryClient?: QueryClient
}

export function AppProviders({ children, queryClient = defaultQueryClient }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi" localeText={pickerLocale}>
          <SnackbarProvider maxSnack={3} autoHideDuration={4000} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
            {children}
          </SnackbarProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
