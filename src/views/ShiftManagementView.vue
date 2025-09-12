<template>
  <div class="shift-management-view">
    <div class="page-header">
      <h1>Shift Management</h1>
      <p>Create and manage shift types and patterns</p>
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <button @click="createShiftModal.open()" class="btn btn-primary">
        Create New Shift Type
      </button>
    </div>

    <!-- Shift Types View -->
    <div class="shift-types-section">
      <div class="section-header">
        <h2>Shift Types</h2>
        <p>Manage different shift patterns and schedules</p>
      </div>

      <div v-if="shiftTypes.length === 0" class="empty-state">
        <h3>No Shift Types Created</h3>
        <p>Create your first shift type to get started with shift management.</p>
        <button @click="createShiftModal.open()" class="btn btn-primary">Create Shift Type</button>
      </div>

      <div v-else class="shift-types-grid">
        <div v-for="shiftType in shiftTypes" :key="shiftType.id" class="shift-type-card">
          <div class="shift-type-header">
            <h3>{{ shiftType.name }}</h3>
            <div class="shift-type-actions">
              <button @click="editShiftType(shiftType)" class="btn btn-sm btn-secondary">
                Edit
              </button>
              <button @click="deleteShiftType(shiftType.id)" class="btn btn-sm btn-danger">
                Delete
              </button>
            </div>
          </div>

          <div class="shift-type-details">
            <div class="detail-row">
              <span class="label">Schedule:</span>
              <span class="value">{{ shiftType.start_time }} - {{ shiftType.end_time }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Rotation:</span>
              <span class="value">{{ formatRotationType(shiftType.rotation_type) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Cycle:</span>
              <span class="value">{{ shiftType.rotation_days }} days</span>
            </div>
            <div v-if="shiftType.description" class="detail-row">
              <span class="label">Description:</span>
              <span class="value">{{ shiftType.description }}</span>
            </div>
          </div>

          <div class="shift-type-stats">
            <div class="stat">
              <span class="stat-value">{{ getAssignedStaffCount(shiftType.id) }}</span>
              <span class="stat-label">Staff Assigned</span>
            </div>
            <div class="stat">
              <span
                class="stat-value"
                :class="{ active: shiftType.is_active, inactive: !shiftType.is_active }"
              >
                {{ shiftType.is_active ? 'Active' : 'Inactive' }}
              </span>
              <span class="stat-label">Status</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Shift Type Modal -->
    <BaseModal
      v-model="modalOpen"
      :title="editingShiftType ? 'Edit Shift Type' : 'Create New Shift Type'"
    >
      <ShiftTypeForm
        :initial-data="editingShiftType"
        :is-editing="!!editingShiftType"
        @submit="handleShiftTypeSubmit"
        @cancel="closeShiftModal"
      />
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import ShiftTypeForm from '@/components/ShiftTypeForm.vue'
import { useModal } from '@/composables/useModal'
import { usePorters } from '@/composables/usePorters'
import { ShiftManagementService } from '@/services/shiftManagementService'
import type { ShiftType, ShiftTypeFormData } from '@/types'

// Reactive state
const shiftTypes = ref<ShiftType[]>([])
const editingShiftType = ref<ShiftType | null>(null)

// Composables
const createShiftModal = useModal()
const editShiftModal = useModal()
const { porters } = usePorters()

// Computed properties
const activeShiftTypes = computed(() =>
  shiftTypes.value.filter((shift) => shift.is_active === true || shift.is_active === 1),
)

const modalOpen = computed({
  get: () => createShiftModal.isOpen.value || editShiftModal.isOpen.value,
  set: (value: boolean) => {
    if (!value) {
      closeShiftModal()
    }
  },
})

// Methods
const loadShiftTypes = async () => {
  try {
    shiftTypes.value = await ShiftManagementService.getAllShiftTypes()
  } catch (error) {
    console.error('Failed to load shift types:', error)
  }
}

const editShiftType = (shiftType: ShiftType) => {
  editingShiftType.value = shiftType
  editShiftModal.open()
}

const deleteShiftType = async (shiftTypeId: string) => {
  if (
    !confirm(
      'Are you sure you want to delete this shift type? This will remove all staff assignments.',
    )
  ) {
    return
  }

  try {
    await ShiftManagementService.deleteShiftType(shiftTypeId)
    await loadShiftTypes()
  } catch (error) {
    console.error('Failed to delete shift type:', error)
    alert('Failed to delete shift type. Please try again.')
  }
}

const handleShiftTypeSubmit = async (data: ShiftTypeFormData) => {
  try {
    if (editingShiftType.value) {
      await ShiftManagementService.updateShiftType(editingShiftType.value.id, data)
    } else {
      await ShiftManagementService.createShiftType(data)
    }

    await loadShiftTypes()
    closeShiftModal()
  } catch (error) {
    console.error('Failed to save shift type:', error)
    alert('Failed to save shift type. Please try again.')
  }
}

const closeShiftModal = () => {
  createShiftModal.close()
  editShiftModal.close()
  editingShiftType.value = null
}

const formatRotationType = (type: string): string => {
  const typeMap: Record<string, string> = {
    fixed: 'Fixed Schedule',
    alternating: 'Alternating Pattern',
    rotating: 'Rotating Shifts',
  }
  return typeMap[type] || type
}

const getAssignedStaffCount = (shiftTypeId: string): number => {
  const shiftType = shiftTypes.value.find((st) => st.id === shiftTypeId)
  if (!shiftType) return 0

  // Count porters assigned to this shift type
  return porters.value.filter(
    (porter) => porter.shift_group === shiftType.name || porter.shift_group === shiftType.id,
  ).length
}

// Lifecycle
onMounted(() => {
  loadShiftTypes()
})
</script>

<style scoped>
.shift-management-view {
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

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.view-toggle {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  overflow: hidden;
}

.toggle-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background: var(--color-background);
}

.toggle-btn.active {
  background: var(--color-primary);
  color: white;
}

.section-header {
  margin-bottom: var(--spacing-xl);
}

.section-header h2 {
  font-size: 1.5rem;
  margin: 0 0 var(--spacing-sm) 0;
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  background: var(--color-background);
  border-radius: var(--border-radius);
}

.shift-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--spacing-lg);
}

.shift-type-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.shift-type-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.shift-type-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.shift-type-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.shift-type-details {
  margin-bottom: var(--spacing-md);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.detail-row .label {
  font-weight: 500;
  color: var(--color-text-muted);
}

.shift-type-stats {
  display: flex;
  gap: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 600;
}

.stat-value.active {
  color: var(--color-success);
}

.stat-value.inactive {
  color: var(--color-text-muted);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.allocation-filters {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
}

.filter-select,
.search-input {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 1rem;
}

.search-input {
  flex: 1;
  min-width: 250px;
}

.allocations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.porter-allocation-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.porter-info {
  margin-bottom: var(--spacing-md);
}

.porter-info h4 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: 1.125rem;
}

.porter-type,
.employee-id {
  display: inline-block;
  margin-right: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-background);
  border-radius: var(--border-radius-sm);
  font-size: 0.875rem;
}

.current-allocation {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm);
  background: var(--color-background);
  border-radius: var(--border-radius);
}

.current-shift {
  font-weight: 500;
  color: var(--color-primary);
}

.no-shift {
  color: var(--color-text-muted);
  font-style: italic;
}

.shift-select {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 1rem;
  transition: all 0.2s ease;
}

.shift-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.shift-select.updating {
  border-color: var(--color-primary);
  background: var(--color-background);
}

@container (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .shift-types-grid,
  .allocations-grid {
    grid-template-columns: 1fr;
  }

  .allocation-filters {
    flex-direction: column;
  }

  .search-input {
    min-width: auto;
  }
}
</style>
