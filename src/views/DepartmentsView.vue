<template>
  <div class="departments-view">
    <div class="page-header">
      <h1>Department Management</h1>
      <p>Manage departments and their requirements</p>
    </div>

    <!-- Add Department Button -->
    <div class="actions-bar">
      <button @click="showAddModal = true" class="btn btn-primary">Add Department</button>
      <button @click="initializeAllAssignments" class="btn btn-secondary">
        Initialize All Assignments
      </button>
      <button @click="reorganizeStaffCategories" class="btn btn-info">
        Reorganize Staff Categories
      </button>
    </div>

    <!-- Department List -->
    <div class="department-list">
      <div
        v-for="(department, index) in departmentsDisplay"
        :key="department.id"
        class="department-card"
        draggable="true"
        @dragstart="handleDragStart(index)"
        @dragover.prevent
        @drop="handleDrop(index)"
      >
        <div class="department-info">
          <div class="department-header">
            <h3>{{ department.name }}</h3>
            <span class="department-order">#{{ department.display_order }}</span>
          </div>
          <div class="department-details">
            <span class="detail-item">
              <strong>Operating:</strong> {{ formatOperatingSchedule(department) }}
            </span>
            <span class="detail-item">
              <strong>Min Porters:</strong> {{ department.min_porters_required }}
            </span>
          </div>
        </div>
        <div class="department-actions">
          <button @click="editDepartment(department)" class="btn btn-sm btn-secondary">Edit</button>
          <button @click="deleteDepartment(department.id)" class="btn btn-sm btn-danger">
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="departmentsDisplay.length === 0" class="empty-state">
      <h3>No Departments Found</h3>
      <p>Get started by adding your first department.</p>
      <button @click="showAddModal = true" class="btn btn-primary">Add Department</button>
    </div>

    <!-- Add/Edit Department Modal -->
    <div v-if="showAddModal || editingDepartment" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ editingDepartment ? 'Edit' : 'Add' }} Department</h2>
          <button @click="closeModal" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveDepartment">
            <div class="form-group">
              <label for="department-name">Department Name</label>
              <input
                id="department-name"
                v-model="departmentForm.name"
                type="text"
                required
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="min-porters">Minimum Porters Required</label>
              <input
                id="min-porters"
                v-model.number="departmentForm.min_porters_required"
                type="number"
                min="1"
                max="10"
                required
                class="form-input"
              />
            </div>

            <!-- Operating Schedule - Quick Options -->
            <div class="form-group">
              <label>Operating Schedule</label>
              <div class="schedule-quick-options">
                <label class="radio-option">
                  <input
                    type="radio"
                    name="schedule-preset"
                    value="custom"
                    :checked="schedulePreset === 'custom'"
                    @change="setSchedulePreset('custom')"
                  />
                  <span>Custom Schedule</span>
                </label>
                <label class="radio-option">
                  <input
                    type="radio"
                    name="schedule-preset"
                    value="24hours"
                    :checked="schedulePreset === '24hours'"
                    @change="setSchedulePreset('24hours')"
                  />
                  <span>24 Hours (All Days)</span>
                </label>
              </div>
            </div>

            <!-- Daily Schedule (shown only for custom) -->
            <div v-if="schedulePreset === 'custom'" class="form-group">
              <label>Daily Operating Hours</label>
              <div class="daily-schedule">
                <div v-for="(day, index) in dayNames" :key="index" class="day-schedule">
                  <div class="day-header">
                    <label class="day-checkbox">
                      <input
                        type="checkbox"
                        :checked="departmentForm.operating_hours[day.toLowerCase()]"
                        @change="toggleDayOperating(day.toLowerCase())"
                      />
                      <span class="day-name">{{ day }}</span>
                    </label>
                  </div>
                  <div v-if="departmentForm.operating_hours[day.toLowerCase()]" class="day-times">
                    <div class="time-input-group">
                      <label>Start</label>
                      <input
                        v-model="departmentForm.operating_hours[day.toLowerCase()].start"
                        type="time"
                        class="form-input time-input"
                      />
                    </div>
                    <div class="time-input-group">
                      <label>End</label>
                      <input
                        v-model="departmentForm.operating_hours[day.toLowerCase()].end"
                        type="time"
                        class="form-input time-input"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 24 Hours Summary (shown only for 24hours preset) -->
            <div v-if="schedulePreset === '24hours'" class="form-group">
              <div class="schedule-summary">
                <p class="schedule-info">
                  <strong>24-Hour Operation:</strong> This department operates continuously, 24
                  hours a day, 7 days a week.
                </p>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" @click="closeModal" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary">
                {{ editingDepartment ? 'Update' : 'Add' }} Department
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { DepartmentServiceAPI } from '@/services/departmentServiceAPI'
import type { Department } from '@/types'

const departments = ref<Department[]>([])
const showAddModal = ref(false)
const editingDepartment = ref<Department | null>(null)
const draggedIndex = ref<number | null>(null)

// Day names for the schedule
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Schedule preset mode
const schedulePreset = ref<'custom' | '24hours'>('custom')

// Computed property to get display data for departments, considering active edits
const departmentsDisplay = computed(() => {
  return departments.value.map((department) => {
    // If this department is being edited, use the form data for display
    if (editingDepartment.value && editingDepartment.value.id === department.id) {
      return {
        ...department,
        name: departmentForm.value.name,
        min_porters_required: departmentForm.value.min_porters_required,
        operating_hours: departmentForm.value.operating_hours,
      }
    }
    // Otherwise use the original department data
    return department
  })
})

// Form data structure matching the database schema
const departmentForm = ref({
  name: '',
  min_porters_required: 1,
  operating_hours: {
    sunday: null,
    monday: { start: '08:00', end: '17:00' },
    tuesday: { start: '08:00', end: '17:00' },
    wednesday: { start: '08:00', end: '17:00' },
    thursday: { start: '08:00', end: '17:00' },
    friday: { start: '08:00', end: '17:00' },
    saturday: null,
  },
})

// Set schedule preset and update operating hours accordingly
const setSchedulePreset = (preset: 'custom' | '24hours') => {
  schedulePreset.value = preset

  if (preset === '24hours') {
    // Set all days to 24-hour operation
    departmentForm.value.operating_hours = {
      sunday: { start: '00:00', end: '23:59' },
      monday: { start: '00:00', end: '23:59' },
      tuesday: { start: '00:00', end: '23:59' },
      wednesday: { start: '00:00', end: '23:59' },
      thursday: { start: '00:00', end: '23:59' },
      friday: { start: '00:00', end: '23:59' },
      saturday: { start: '00:00', end: '23:59' },
    }
  }
  // For 'custom', keep existing hours as they are
}

// Toggle day operating status
const toggleDayOperating = (day: string) => {
  if (departmentForm.value.operating_hours[day]) {
    // Day is currently operating, disable it
    departmentForm.value.operating_hours[day] = null
  } else {
    // Day is not operating, enable it with default times
    departmentForm.value.operating_hours[day] = {
      start: '08:00',
      end: '17:00',
    }
  }
}

const loadDepartments = async () => {
  try {
    departments.value = await DepartmentServiceAPI.getAllDepartments()
    console.log('Loaded departments:', departments.value.length, departments.value)
  } catch (error) {
    console.error('Failed to load departments:', error)
  }
}

const initializeAllAssignments = async () => {
  try {
    console.log('🔧 Manually initializing all assignments...')
    // TODO: Implement autoAssignPortersBasedOnShiftGroups in API
    const count = 0 // DepartmentServiceAPI.autoAssignPortersBasedOnShiftGroups()
    alert(
      `Successfully created ${count} assignments! Check the Home screen to see porters in departments.`,
    )
    console.log(`✅ Created ${count} assignments`)
  } catch (error) {
    console.error('Failed to initialize assignments:', error)
    alert('Failed to initialize assignments. Check console for details.')
  }
}

const reorganizeStaffCategories = async () => {
  try {
    console.log('🔧 Reorganizing staff categories...')

    // Use PorterServiceAPI to access porters
    const { PorterServiceAPI } = await import('@/services/porterServiceAPI')
    const porters = await PorterServiceAPI.getAllPorters()

    let updatedCount = 0

    porters.forEach((porter) => {
      let shouldUpdate = false
      let newType = porter.type
      let newShiftGroup = porter.shift_group

      // 1. Update shift group naming convention
      if (porter.shift_group) {
        const oldToNewMapping: Record<string, string> = {
          'Day Shift One': 'Day Shift A',
          'Day Shift Two': 'Day Shift B',
          'Night Shift One': 'Night Shift A',
          'Night Shift Two': 'Night Shift B',
        }

        if (oldToNewMapping[porter.shift_group]) {
          newShiftGroup = oldToNewMapping[porter.shift_group]
          shouldUpdate = true
          console.log(
            `🔄 Updating ${porter.name} shift group: ${porter.shift_group} → ${newShiftGroup}`,
          )
        }
      }

      // 2. Move Relief staff to Departmental (change type from Relief to Regular)
      if (porter.type === 'Relief') {
        newType = 'Regular'
        newShiftGroup = undefined // Remove shift group so they appear in Departmental
        shouldUpdate = true
        console.log(`📋 Moving ${porter.name} from Relief to Departmental`)
      }

      // 3. Move PTS staff to PTS category (ensure they have PTS identifier)
      if (porter.name?.toLowerCase().includes('pts') || porter.shift_group?.includes('PTS')) {
        // Already identified as PTS, ensure they're Regular type
        if (porter.type !== 'Regular') {
          newType = 'Regular'
          shouldUpdate = true
        }
        console.log(`🚐 Ensuring ${porter.name} is properly categorized as PTS`)
      }

      // 4. Assign "Departmental" work assignment to porters that should be in Departmental tab
      if (
        porter.type === 'Regular' &&
        !porter.shift_group &&
        !porter.name?.toLowerCase().includes('pts') &&
        !porter.shift_group?.includes('PTS') &&
        !porter.shift_group?.includes('Day Shift') &&
        !porter.shift_group?.includes('Night Shift')
      ) {
        newShiftGroup = 'Departmental'
        shouldUpdate = true
        console.log(`🏢 Assigning ${porter.name} to Departmental work assignment`)
      }

      // Update the porter if changes are needed
      if (shouldUpdate) {
        PorterService.updatePorter(porter.id, {
          ...porter,
          type: newType,
          shift_group: newShiftGroup,
        })
        updatedCount++
      }
    })

    alert(
      `Successfully reorganized ${updatedCount} staff members! Updated shift group naming (A/B), moved Relief staff to Departmental, organized PTS staff properly, and assigned Departmental work assignments.`,
    )
    console.log(`✅ Reorganized ${updatedCount} staff members`)
  } catch (error) {
    console.error('Failed to reorganize staff categories:', error)
    alert('Failed to reorganize staff categories. Check console for details.')
  }
}

const editDepartment = (department: Department) => {
  editingDepartment.value = department
  departmentForm.value = {
    name: department.name,
    min_porters_required: department.min_porters_required,
    operating_hours: department.operating_hours
      ? { ...department.operating_hours }
      : {
          sunday: null,
          monday: { start: '08:00', end: '17:00' },
          tuesday: { start: '08:00', end: '17:00' },
          wednesday: { start: '08:00', end: '17:00' },
          thursday: { start: '08:00', end: '17:00' },
          friday: { start: '08:00', end: '17:00' },
          saturday: null,
        },
  }

  // Detect if this is a 24-hour schedule
  const is24Hours =
    department.operating_hours &&
    Object.values(department.operating_hours).every(
      (hours) => hours && hours.start === '00:00' && hours.end === '23:59',
    )

  schedulePreset.value = is24Hours ? '24hours' : 'custom'
  showAddModal.value = true
}

const deleteDepartment = async (departmentId: number) => {
  if (
    confirm(
      'Are you sure you want to delete this department? This will remove all related assignments.',
    )
  ) {
    try {
      await DepartmentServiceAPI.deleteDepartment(departmentId)
      await loadDepartments()
    } catch (error) {
      console.error('Failed to delete department:', error)
    }
  }
}

const saveDepartment = async () => {
  try {
    if (editingDepartment.value) {
      // Update the department via API
      await DepartmentServiceAPI.updateDepartment(editingDepartment.value.id, departmentForm.value)

      // Update the local departments array immediately for better UX
      const index = departments.value.findIndex((d) => d.id === editingDepartment.value!.id)
      if (index !== -1) {
        departments.value[index] = {
          ...departments.value[index],
          name: departmentForm.value.name,
          min_porters_required: departmentForm.value.min_porters_required,
          operating_hours: departmentForm.value.operating_hours,
        }
      }
    } else {
      // Create new department
      const newDepartment = await DepartmentServiceAPI.createDepartment(departmentForm.value)
      departments.value.push(newDepartment)
    }

    closeModal()
    // Reload to ensure consistency with backend
    await loadDepartments()
  } catch (error) {
    console.error('Failed to save department:', error)
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingDepartment.value = null
  schedulePreset.value = 'custom'
  departmentForm.value = {
    name: '',
    min_porters_required: 1,
    operating_hours: {
      sunday: null,
      monday: { start: '08:00', end: '17:00' },
      tuesday: { start: '08:00', end: '17:00' },
      wednesday: { start: '08:00', end: '17:00' },
      thursday: { start: '08:00', end: '17:00' },
      friday: { start: '08:00', end: '17:00' },
      saturday: null,
    },
  }
}

// Format operating schedule for display
const formatOperatingSchedule = (department: Department): string => {
  if (!department.operating_hours) return 'Not set'

  // Valid day names to filter out old format fields
  const validDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  const operatingDays = Object.entries(department.operating_hours).filter(([day, hours]) => {
    // Only process valid day names with proper hour objects
    return (
      validDays.includes(day.toLowerCase()) &&
      hours !== null &&
      typeof hours === 'object' &&
      hours.start &&
      hours.end
    )
  })

  if (operatingDays.length === 0) return 'Not set'

  // Check if it's 24/7 operation
  const is24Hours =
    operatingDays.length === 7 &&
    operatingDays.every(([_, hours]) => hours.start === '00:00' && hours.end === '23:59')

  if (is24Hours) return '24/7'

  // Show number of operating days
  const dayCount = operatingDays.length
  return dayCount === 1 ? '1 Day' : `${dayCount} Days`
}

// Drag and drop for reordering
const handleDragStart = (index: number) => {
  draggedIndex.value = index
}

const handleDrop = async (dropIndex: number) => {
  if (draggedIndex.value === null || draggedIndex.value === dropIndex) return

  const reorderedDepartments = [...departments.value]
  const draggedDepartment = reorderedDepartments.splice(draggedIndex.value, 1)[0]
  reorderedDepartments.splice(dropIndex, 0, draggedDepartment)

  // Update display order
  const departmentIds = reorderedDepartments.map((dept) => dept.id)

  try {
    // TODO: Implement reorderDepartments in API
    // DepartmentServiceAPI.reorderDepartments(departmentIds)
    await loadDepartments()
  } catch (error) {
    console.error('Failed to reorder departments:', error)
  }

  draggedIndex.value = null
}

onMounted(() => {
  loadDepartments()
})
</script>

<style scoped>
.departments-view {
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

.actions-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--spacing-lg);
}

.department-list {
  display: grid;
  gap: var(--spacing-md);
}

.department-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  box-shadow: var(--shadow-sm);
  cursor: move;
  transition: all 0.2s ease;
}

.department-card:hover {
  box-shadow: var(--shadow-md);
}

.department-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.department-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.department-order {
  background: var(--color-surface);
  color: var(--color-text-muted);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  font-size: 0.75rem;
  font-weight: 600;
}

.department-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.detail-item {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.department-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: var(--spacing-2xl);
  background: var(--color-surface);
  border-radius: var(--border-radius-lg);
  border: 1px solid var(--color-border);
}

.empty-state h3 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--color-text-muted);
}

.empty-state p {
  margin: 0 0 var(--spacing-lg) 0;
  color: var(--color-text-muted);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: var(--border-radius-lg);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-muted);
}

.modal-body {
  padding: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-weight: 500;
  color: var(--color-text);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 0.875rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
}

/* Schedule Options */
.schedule-options {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  margin-top: var(--spacing-sm);
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  transition: all 0.2s ease;
}

.checkbox-option:hover {
  background: var(--color-background-soft);
  border-color: var(--color-primary);
}

.checkbox-option input[type='radio'] {
  margin: 0;
}

/* Time Range */
.time-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.time-input-group {
  display: flex;
  flex-direction: column;
}

.time-input-group label {
  margin-bottom: var(--spacing-xs);
  font-size: 0.875rem;
}

/* Schedule Quick Options */
.schedule-quick-options {
  display: flex;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.radio-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  transition: all 0.2s ease;
}

.radio-option:hover {
  background: var(--color-background-soft);
  border-color: var(--color-primary);
}

.radio-option input[type='radio']:checked + span {
  font-weight: 600;
  color: var(--color-primary);
}

.radio-option input[type='radio'] {
  margin: 0;
}

/* Schedule Summary */
.schedule-summary {
  padding: var(--spacing-md);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  margin-top: var(--spacing-sm);
}

.schedule-info {
  margin: 0;
  color: var(--color-text-secondary);
}

/* Daily Schedule */
.daily-schedule {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.day-schedule {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
}

.day-header {
  min-width: 120px;
}

.day-name {
  font-weight: 500;
  margin-left: var(--spacing-xs);
}

.day-times {
  display: flex;
  gap: var(--spacing-lg);
  flex: 1;
  align-items: center;
}

.time-input-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.time-input-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.time-input {
  width: 120px;
  min-width: 120px;
}

/* Days Selection */
.days-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.day-checkbox {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  transition: all 0.2s ease;
}

.day-checkbox:hover {
  background: var(--color-background-soft);
  border-color: var(--color-primary);
}

.day-checkbox input[type='checkbox']:checked + span {
  font-weight: 600;
  color: var(--color-primary);
}

.day-checkbox input[type='checkbox'] {
  margin: 0;
}
</style>
