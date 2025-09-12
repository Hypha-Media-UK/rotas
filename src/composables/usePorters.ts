import { ref, computed } from 'vue'
import { PorterServiceAPI } from '@/services/porterServiceAPI'
import type { Porter, PorterType, PorterFormData } from '@/types'

export function usePorters() {
  const porters = ref<Porter[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadPorters = async () => {
    loading.value = true
    error.value = null
    try {
      porters.value = await PorterServiceAPI.getAllPorters()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load porters'
    } finally {
      loading.value = false
    }
  }

  const getPortersByType = (type: PorterType) => {
    return computed(() => porters.value.filter((porter) => porter.type === type))
  }

  const createPorter = async (data: PorterFormData) => {
    loading.value = true
    error.value = null
    try {
      const porter = await PorterServiceAPI.createPorter(data)
      await loadPorters() // Refresh the list
      return porter.id
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create porter'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updatePorter = async (id: number, data: Partial<PorterFormData>) => {
    loading.value = true
    error.value = null
    try {
      await PorterServiceAPI.updatePorter(id, data)
      await loadPorters() // Refresh the list
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update porter'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deletePorter = async (id: number) => {
    loading.value = true
    error.value = null
    try {
      await PorterServiceAPI.deletePorter(id)
      await loadPorters() // Refresh the list
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete porter'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getAvailablePorters = (date: string, type?: PorterType) => {
    // This method needs to be implemented in PorterServiceAPI
    return []
  }

  // Initialize on first use
  loadPorters()

  return {
    porters: computed(() => porters.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    loadPorters,
    getPortersByType,
    createPorter,
    updatePorter,
    deletePorter,
    getAvailablePorters,
  }
}
