<template>
  <div class="staff-view">
    <div class="page-header">
      <h1>Staff Management</h1>
      <p>Manage porters, supervisors, and relief staff</p>
    </div>

    <!-- Staff Type Tabs -->
    <NavTabs :tabs="staffTabs" :active-tab="activeTab" @update:active-tab="activeTab = $event" />

    <!-- Search and Actions Bar -->
    <div class="search-actions-bar">
      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search porters by name, hours, or department..."
          class="search-input"
        />
        <button v-if="searchQuery" @click="clearSearch" class="clear-search-btn">×</button>
      </div>
      <button @click="addModal.open()" class="btn btn-primary">Add {{ activeTab }} Porter</button>
    </div>

    <!-- Porter List -->
    <div class="porter-list">
      <div v-for="porter in currentPorters" :key="porter.id" class="porter-card">
        <div class="porter-info">
          <h3>{{ porter.name }}</h3>
          <div class="porter-details">
            <span class="detail-item">
              <strong>Hours:</strong> {{ porter.contracted_hours || 'Not set' }}
            </span>
            <span class="detail-item">
              <strong>Department:</strong>
              {{ getPorterDepartmentName(porter.id) || 'Not assigned' }}
            </span>
            <div class="detail-item shift-assignment">
              <strong>Shift:</strong>
              <select
                :value="getPorterShiftTypeId(porter.id)"
                @change="updatePorterShiftAllocation(porter.id, $event.target.value)"
                :disabled="updatingPorterId === porter.id"
                class="shift-select"
                :class="{ updating: updatingPorterId === porter.id }"
              >
                <option value="">No Shift Assignment</option>
                <option
                  v-for="shiftType in activeShiftTypes"
                  :key="shiftType.id"
                  :value="shiftType.id"
                >
                  {{ shiftType.name }}
                </option>
              </select>
            </div>
          </div>
        </div>
        <div class="porter-actions">
          <button @click="handleEditPorter(porter)" class="btn btn-sm btn-secondary">Edit</button>
          <button @click="handleDeletePorter(porter.id)" class="btn btn-sm btn-danger">
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-if="currentPorters.length === 0"
      :title="searchQuery ? 'No Matching Porters Found' : `No ${activeTab} Porters Found`"
      :description="
        searchQuery
          ? `No porters match your search for '${searchQuery}'. Try a different search term or clear the search.`
          : getEmptyStateDescription(activeTab)
      "
      icon="👥"
    >
      <template #actions>
        <button @click="addModal.open()" class="btn btn-primary">Add {{ activeTab }} Porter</button>
      </template>
    </EmptyState>

    <!-- Add Porter Modal -->
    <BaseModal v-model="addModal.isOpen.value" :title="`Add ${activeTab} Porter`">
      <PorterForm @submit="handleAddPorter" @cancel="addModal.close()" />
    </BaseModal>

    <!-- Edit Porter Modal -->
    <BaseModal v-model="editModal.isOpen.value" :title="`Edit Porter`">
      <PorterForm
        :initial-data="editingPorter"
        :is-editing="true"
        @submit="handleUpdatePorter"
        @cancel="editModal.close()"
      />
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import NavTabs from '@/components/NavTabs.vue'
import EmptyState from '@/components/EmptyState.vue'
import BaseModal from '@/components/BaseModal.vue'
import PorterForm from '@/components/PorterForm.vue'
import { useModal } from '@/composables/useModal'
import { usePorters } from '@/composables/usePorters'
import { DepartmentServiceAPI } from '@/services/departmentServiceAPI'
import { ShiftManagementService } from '@/services/shiftManagementService'
import { ApiClient } from '@/services/apiClient'
import type { PorterType, PorterFormData, Porter, ShiftType } from '@/types'

type StaffCategory =
  | 'Not Allocated'
  | 'Day Shift'
  | 'Night Shift'
  | 'PTS'
  | 'Departmental'
  | 'Relief'
  | 'Supervisors'

const activeTab = ref<StaffCategory>('Not Allocated')
const editingPorter = ref<Porter | null>(null)
const searchQuery = ref('')
const shiftTypes = ref<ShiftType[]>([])
const updatingPorterId = ref<number | null>(null)
const assignments = ref<any[]>([])
const departments = ref<any[]>([])

// Use composables
const addModal = useModal()
const editModal = useModal()
const { porters, getPortersByType, createPorter, updatePorter, deletePorter, loadPorters } =
  usePorters()

// Filter porters by staff category
const getPortersByCategory = (category: StaffCategory) => {
  return computed(() => {
    return porters.value.filter((porter) => {
      if (!porter.is_active) return false

      switch (category) {
        case 'Not Allocated':
          // Show porters with no shift assignment
          return !porter.shift_group
        case 'Day Shift':
          return porter.shift_group?.includes('Day Shift')
        case 'Night Shift':
          return porter.shift_group?.includes('Night Shift')
        case 'PTS':
          // PTS porters have PTS A/B shift groups or PTS in their name
          return (
            porter.shift_group?.includes('PTS') ||
            porter.name?.toLowerCase().includes('pts') ||
            porter.contracted_hours?.includes('PTS')
          )
        case 'Departmental':
          // Porters who have shift assignments that are not Day/Night/PTS
          // Include Regular type, null type, and actual role types from database
          const isDepartmental =
            (porter.type === 'Regular' ||
              porter.type === null ||
              porter.type === 'Day Shift One' ||
              porter.type === 'Day Shift Two' ||
              porter.type?.includes('Day Shift')) &&
            porter.shift_group &&
            !porter.shift_group.includes('Day Shift') &&
            !porter.shift_group.includes('Night Shift') &&
            !porter.shift_group.includes('PTS')

          return isDepartmental
        case 'Relief':
          // Relief should only be Relief type porters (not shift group)
          const isRelief = porter.type === 'Relief'
          if (isRelief) {
            console.log(
              `🔍 Relief porter found: ${porter.name} (type: ${porter.type}, shift_group: ${porter.shift_group})`,
            )
          }
          return isRelief
        case 'Supervisors':
          return porter.type === 'Supervisor'
        default:
          return false
      }
    })
  })
}

const staffTabs = computed(() => [
  {
    key: 'Not Allocated',
    label: 'Not Allocated',
    count: getPortersByCategory('Not Allocated').value.length,
  },
  {
    key: 'Day Shift',
    label: 'Day Shift',
    count: getPortersByCategory('Day Shift').value.length,
  },
  {
    key: 'Night Shift',
    label: 'Night Shift',
    count: getPortersByCategory('Night Shift').value.length,
  },
  {
    key: 'PTS',
    label: 'PTS',
    count: getPortersByCategory('PTS').value.length,
  },
  {
    key: 'Departmental',
    label: 'Departmental',
    count: getPortersByCategory('Departmental').value.length,
  },
  {
    key: 'Relief',
    label: 'Relief',
    count: getPortersByCategory('Relief').value.length,
  },
  {
    key: 'Supervisors',
    label: 'Supervisors',
    count: getPortersByCategory('Supervisors').value.length,
  },
])

const currentPorters = computed(() => {
  let porters = getPortersByCategory(activeTab.value).value

  // Apply search filter if search query exists
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    porters = porters.filter(
      (porter) =>
        porter.name?.toLowerCase().includes(query) ||
        porter.contracted_hours?.toLowerCase().includes(query) ||
        porter.type?.toLowerCase().includes(query) ||
        getPorterDepartmentName(porter.id)?.toLowerCase().includes(query),
    )
  }

  return porters
})

// Get the appropriate porter type for the current category
const getPorterTypeForCategory = (category: StaffCategory): PorterType => {
  switch (category) {
    case 'Not Allocated':
    case 'Day Shift':
    case 'Night Shift':
    case 'PTS':
    case 'Departmental':
      return 'Regular'
    case 'Relief':
      return 'Relief'
    case 'Supervisors':
      return 'Supervisor'
    default:
      return 'Regular'
  }
}

// Get descriptive text for empty state
const getEmptyStateDescription = (category: StaffCategory): string => {
  switch (category) {
    case 'Not Allocated':
      return 'Staff members who have not been assigned to a specific shift. Use the shift dropdown in each porter card to assign them to a shift.'
    case 'Day Shift':
      return 'Add porters who work the 4-on/4-off day shift rotation (07:00-19:00).'
    case 'Night Shift':
      return 'Add porters who work the 4-on/4-off night shift rotation (19:00-07:00).'
    case 'PTS':
      return 'Add Patient Transport Service porters who transport patients between departments.'
    case 'Departmental':
      return 'Add porters who are permanently assigned to specific departments.'
    case 'Relief':
      return 'Add relief porters who provide coverage for absences and illness.'
    case 'Supervisors':
      return 'Add supervisory staff who manage porter operations.'
    default:
      return `Get started by adding your first ${category.toLowerCase()} porter.`
  }
}

const handleAddPorter = async (data: PorterFormData & { assigned_department_id?: number }) => {
  try {
    // Ensure the porter type matches the current category
    const porterData = {
      ...data,
      type: getPorterTypeForCategory(activeTab.value),
    }

    // Remove assigned_department_id from porter data (it's not part of porter schema)
    const { assigned_department_id, ...cleanPorterData } = porterData

    // Create the porter first
    const newPorter = await createPorter(cleanPorterData)

    // If department is assigned, create the department assignment
    if (assigned_department_id && newPorter) {
      console.log(
        `🎯 Assigning new porter ${newPorter.name} (ID: ${newPorter.id}) to department ${assigned_department_id}`,
      )
      try {
        const success = await DepartmentServiceAPI.assignPorterToDepartment(
          newPorter.id,
          assigned_department_id,
        )
        if (success) {
          console.log(
            `✅ Successfully assigned porter ${newPorter.name} to department ${assigned_department_id}`,
          )
        } else {
          console.error(
            `❌ Failed to assign porter ${newPorter.name} to department ${assigned_department_id}`,
          )
        }
      } catch (assignmentError) {
        console.error('Failed to assign porter to department:', assignmentError)
        // Porter was created but assignment failed - could show a warning
      }
    } else {
      console.log(`ℹ️ No department assignment requested for porter ${newPorter?.name}`)
    }

    addModal.close()
    // Reload assignments to reflect changes
    await loadAssignments()
  } catch (error) {
    console.error('Failed to create porter:', error)
  }
}

const handleEditPorter = async (porter: Porter) => {
  // Get department assignments for this porter
  const assignments = await DepartmentServiceAPI.getPorterAssignments(porter.id)

  // Create enhanced porter data with department assignments
  const porterWithAssignments = {
    ...porter,
    department_assignments: assignments,
  }

  console.log(`📝 Editing porter ${porter.name} (ID: ${porter.id}) with assignments:`, assignments)
  console.log(`📝 Porter data being passed to form:`, porterWithAssignments)

  editingPorter.value = porterWithAssignments
  editModal.open()
}

const handleUpdatePorter = async (data: PorterFormData & { assigned_department_id?: number }) => {
  if (!editingPorter.value) return

  try {
    // Remove assigned_department_id from porter data (it's not part of porter schema)
    const { assigned_department_id, ...cleanPorterData } = data

    // Update the porter first
    await updatePorter(editingPorter.value.id, cleanPorterData)

    // Handle department assignment changes
    if (assigned_department_id !== undefined) {
      console.log(
        `🎯 Updating department assignment for porter ${editingPorter.value.name} (ID: ${editingPorter.value.id})`,
      )
      console.log(`🎯 New department ID: ${assigned_department_id}`)

      // Remove existing assignments for this porter
      // TODO: Implement getPorterAssignments in API
      const existingAssignments = [] // DepartmentServiceAPI.getPorterAssignments(editingPorter.value.id)
      console.log(
        `🔍 Found ${existingAssignments.length} existing assignments:`,
        existingAssignments,
      )

      for (const assignment of existingAssignments) {
        console.log(`🗑️ Removing assignment from department ${assignment.department_id}`)
        // TODO: Implement removePorterFromDepartment in API
        // await DepartmentServiceAPI.removePorterFromDepartment(editingPorter.value.id, assignment.department_id)
      }

      // Add new assignment if department is selected
      if (assigned_department_id) {
        console.log(`➕ Adding new assignment to department ${assigned_department_id}`)
        try {
          const success = await DepartmentServiceAPI.assignPorterToDepartment(
            editingPorter.value.id,
            assigned_department_id,
          )
          if (success) {
            console.log(
              `✅ Successfully updated porter ${editingPorter.value.name} assignment to department ${assigned_department_id}`,
            )
          } else {
            console.error(
              `❌ Failed to update porter ${editingPorter.value.name} assignment to department ${assigned_department_id}`,
            )
          }
        } catch (assignmentError) {
          console.error('Failed to assign porter to department:', assignmentError)
        }
      } else {
        console.log(`ℹ️ No new department assignment for porter ${editingPorter.value.name}`)
      }
    }

    editModal.close()
    editingPorter.value = null
    // Reload assignments to reflect changes
    await loadAssignments()
  } catch (error) {
    console.error('Failed to update porter:', error)
  }
}

const handleDeletePorter = async (id: number) => {
  if (confirm('Are you sure you want to delete this porter?')) {
    try {
      await deletePorter(id)
    } catch (error) {
      console.error('Failed to delete porter:', error)
    }
  }
}

const clearSearch = () => {
  searchQuery.value = ''
}

// Create a computed property for porter department mappings
const porterDepartmentMap = computed(() => {
  const map = new Map<number, string>()

  assignments.value.forEach((assignment) => {
    if (assignment.is_active) {
      const department = departments.value.find((d) => d.id === assignment.department_id)
      if (department) {
        map.set(assignment.porter_id, department.name)
      }
    }
  })

  // console.log('🗺️ Porter department map:', Object.fromEntries(map))
  return map
})

// Get department name for a porter
const getPorterDepartmentName = (porterId: number): string | null => {
  return porterDepartmentMap.value.get(porterId) || null
}

// Load assignments and departments data
const loadAssignments = async () => {
  try {
    assignments.value = await ApiClient.getAssignments()
    console.log(`🔗 Loaded ${assignments.value.length} assignments`)
  } catch (error) {
    console.error('Failed to load assignments:', error)
  }
}

const loadDepartments = async () => {
  try {
    departments.value = await DepartmentServiceAPI.getAllDepartments()
    console.log(`🏢 Loaded ${departments.value.length} departments`)
  } catch (error) {
    console.error('Failed to load departments:', error)
  }
}

// Shift Management Functions
const loadShiftTypes = async () => {
  try {
    shiftTypes.value = await ShiftManagementService.getAllShiftTypes()
    console.log(`📋 Loaded ${shiftTypes.value.length} shift types for staff assignments`)
  } catch (error) {
    console.error('Failed to load shift types:', error)
  }
}

const activeShiftTypes = computed(() => {
  const active = shiftTypes.value.filter((st) => st.is_active === true || st.is_active === 1)
  console.log(
    `🎯 Active shift types for dropdown: ${active.length}`,
    active.map((st) => st.name),
  )
  return active
})

const getPorterShiftTypeId = (porterId: number): string => {
  const porter = porters.value.find((p) => p.id === porterId)
  if (!porter || !porter.shift_group) {
    return ''
  }

  // Map the porter's shift_group to a shift type ID
  const shiftType = shiftTypes.value.find(
    (st) => st.name === porter.shift_group || st.id === porter.shift_group,
  )

  return shiftType ? shiftType.id : ''
}

const updatePorterShiftAllocation = async (porterId: number, shiftTypeId: string) => {
  try {
    updatingPorterId.value = porterId
    console.log(`🔄 Updating porter ${porterId} shift allocation to: ${shiftTypeId}`)

    if (shiftTypeId === '') {
      // Remove shift assignment
      await ShiftManagementService.removePorterFromShiftType(porterId)
      console.log(`✅ Removed porter ${porterId} from shift assignment`)
    } else {
      // Assign to new shift type
      await ShiftManagementService.assignPorterToShiftType(porterId, shiftTypeId)
      const shiftType = shiftTypes.value.find((st) => st.id === shiftTypeId)
      console.log(`✅ Assigned porter ${porterId} to shift: ${shiftType?.name}`)
    }

    // Force refresh of porter data from the composable
    // This will trigger a re-fetch from the API
    await loadPorters()
  } catch (error) {
    console.error('Failed to update porter shift allocation:', error)
    alert('Failed to update shift allocation. Please try again.')
  } finally {
    updatingPorterId.value = null
  }
}

// Load data on component mount
const initializeData = async () => {
  await loadShiftTypes()
  await loadDepartments()
  await loadAssignments()
  console.log('🚀 All data loaded successfully')
}

initializeData()
</script>

<style scoped>
.staff-view {
  max-width: var(--container-xl);
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 var(--spacing-sm) 0;
}

.page-header p {
  color: var(--color-text-muted);
  margin: 0;
}

.search-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.search-container {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  padding-right: 2.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.clear-search-btn {
  position: absolute;
  right: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.clear-search-btn:hover {
  background-color: var(--color-gray-100);
  color: var(--color-text);
}

.actions-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--spacing-lg);
}

.porter-list {
  display: grid;
  gap: var(--spacing-md);
}

.porter-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: var(--shadow-sm);
}

.porter-info h3 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.porter-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.detail-item {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.shift-assignment {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.shift-select {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  background: white;
  min-width: 150px;
  transition: all 0.2s ease;
}

.shift-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.shift-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--color-gray-50);
}

.shift-select.updating {
  border-color: var(--color-primary);
  background: var(--color-background);
}

.porter-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

@container (max-width: 768px) {
  .search-actions-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-container {
    max-width: none;
  }

  .porter-card {
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .porter-actions {
    align-self: flex-end;
  }
}
</style>
