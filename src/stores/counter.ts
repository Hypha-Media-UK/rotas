import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  Porter,
  Department,
  ShiftPattern,
  PorterDepartmentAssignment,
  PorterFormData,
  DepartmentFormData,
} from '@/types'
import { MySQLDatabaseService } from '@/services/mysqlDatabase'
import { PorterServiceAPI } from '@/services/porterServiceAPI'
import { DepartmentServiceAPI } from '@/services/departmentServiceAPI'
import { ApiClient } from '@/services/apiClient'

export const useRotaStore = defineStore('rota', () => {
  // State
  const porters = ref<Porter[]>([])
  const departments = ref<Department[]>([])
  const shiftPatterns = ref<ShiftPattern[]>([])
  const assignments = ref<PorterDepartmentAssignment[]>([])
  const currentDate = ref<string>(new Date().toISOString().split('T')[0])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activePorters = computed(() => porters.value.filter((p) => p.is_active))

  const activeDepartments = computed(() => departments.value)

  const activeShiftPatterns = computed(() => shiftPatterns.value)

  const activeAssignments = computed(() => assignments.value)

  // Actions
  const setLoading = (state: boolean) => {
    loading.value = state
  }

  const setError = (message: string | null) => {
    error.value = message
  }

  const setCurrentDate = (date: string) => {
    currentDate.value = date
  }

  // Load all data
  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [portersData, departmentsData, shiftPatternsData, assignmentsData] = await Promise.all([
        PorterServiceAPI.getAllPorters(),
        DepartmentServiceAPI.getAllDepartments(),
        ApiClient.getShiftPatterns(),
        ApiClient.getAssignments(),
      ])

      porters.value = portersData
      departments.value = departmentsData
      shiftPatterns.value = shiftPatternsData
      assignments.value = assignmentsData

      console.log('✅ Data loaded successfully from API')
      console.log('- Porters:', porters.value.length)
      console.log('- Departments:', departments.value.length)
      console.log('- Shift Patterns:', shiftPatterns.value.length)
      console.log('- Assignments:', assignments.value.length)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data'
      setError(message)
      console.error('❌ Failed to load data from API:', err)
    } finally {
      setLoading(false)
    }
  }

  return {
    // State
    porters,
    departments,
    shiftPatterns,
    assignments,
    currentDate,
    loading,
    error,

    // Computed
    activePorters,
    activeDepartments,
    activeShiftPatterns,
    activeAssignments,

    // Actions
    setLoading,
    setError,
    setCurrentDate,
    loadData,
  }
})
