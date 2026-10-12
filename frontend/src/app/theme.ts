import { createTheme } from '@mui/material/styles'
import { viVN } from '@mui/material/locale'

export const brand = {
  primary: '#1F9D55',
  primaryDark: '#15803D',
  primaryLight: '#E8F5EC',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  toolbar: '#F4F6F8',
  danger: '#DC2626',
} as const

export const layout = {
  headerHeight: 76,
  railWidth: 64,
  panelWidth: 235,
} as const

export const theme = createTheme(
  {
    palette: {
      primary: {
        main: brand.primary,
        dark: brand.primaryDark,
        light: brand.primaryLight,
        contrastText: '#FFFFFF',
      },
      error: { main: brand.danger },
      text: { primary: brand.text, secondary: brand.textMuted },
      divider: brand.border,
      background: { default: '#FFFFFF', paper: '#FFFFFF' },
    },
    typography: {
      fontFamily: '"Be Vietnam Pro", "Roboto", sans-serif',
      fontSize: 14,
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiPaper: { styleOverrides: { rounded: { borderRadius: 12 } } },
      MuiCard: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiTableCell: {
        styleOverrides: {
          root: { fontSize: 14, borderColor: brand.border },
          head: { color: brand.primaryDark, fontWeight: 600, whiteSpace: 'nowrap' },
        },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
      MuiTooltip: { defaultProps: { arrow: true } },
    },
  },
  viVN,
)
