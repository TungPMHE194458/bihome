import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BuildingState {
  /** null = "Tất cả tòa nhà" (không gửi X-Building-Id). */
  selectedBuildingId: number | null
  setSelectedBuildingId: (id: number | null) => void
}

export const useBuildingStore = create<BuildingState>()(
  persist(
    (set) => ({
      selectedBuildingId: null,
      setSelectedBuildingId: (selectedBuildingId) => set({ selectedBuildingId }),
    }),
    { name: 'bihome-building' },
  ),
)
