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
        v-for="(department, index) in departments"
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
              <strong>Type:</strong> {{ formatDepartmentType(department.department_type) }}
            </span>
            <span class="detail-item">
              <strong>Operating:</strong> {{ formatOperatingSchedule(department) }}
            </span>
            <span class="detail-item">
              <strong>Min Porters:</strong> {{ department.min_porters_required }}
            </span>
          </div>
        </div>
        <div class="department-actions">
          <button @click="assignPorters(department)" class="btn btn-sm btn-primary">
            Assign Porters
          </button>
          <button @click="editDepartment(department)" class="btn btn-sm btn-secondary">Edit</button>
          <button @click="deleteDepartment(department.id)" class="btn btn-sm btn-danger">
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="departments.length === 0" class="empty-state">
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

            <!-- Department Type Selection -->
            <div class="form-group">
              <label for="department-type">Department Type</label>
              <select
                id="department-type"
                v-model="departmentForm.department_type"
                class="form-input"
                @change="onDepartmentTypeChange"
              >
                <option value="standard_hours">Standard Hours</option>
                <option value="shift_rotation">Shift Rotation (4-on/4-off)</option>
                <option value="emergency_24h">Emergency 24h</option>
                <option value="relief">Relief</option>
                <option value="on_demand">On Demand</option>
              </select>
            </div>

            <!-- Operating Schedule Options -->
            <div class="form-group">
              <label>Operating Schedule</label>
              <div class="schedule-options">
                <label class="checkbox-option">
                  <input
                    type="radio"
                    name="schedule-type"
                    value="all-days"
                    :checked="scheduleType === 'all-days'"
                    @change="onScheduleTypeChange('all-days')"
                  />
                  <span>All Days</span>
                </label>
                <label class="checkbox-option">
                  <input
                    type="radio"
                    name="schedule-type"
                    value="24-hours"
                    :checked="scheduleType === '24-hours'"
                    @change="onScheduleTypeChange('24-hours')"
                  />
                  <span>24 Hours</span>
                </label>
                <label class="checkbox-option">
                  <input
                    type="radio"
                    name="schedule-type"
                    value="set-days-times"
                    :checked="scheduleType === 'set-days-times'"
                    @change="onScheduleTypeChange('set-days-times')"
                  />
                  <span>Set Days and Times</span>
                </label>
              </div>
            </div>

            <!-- Time Range (shown for All Days and Set Days and Times) -->
            <div v-if="scheduleType !== '24-hours'" class="form-group">
              <div class="time-range">
                <div class="time-input-group">
                  <label for="start-time">Start Time</label>
                  <input
                    id="start-time"
                    v-model="departmentForm.operating_schedule.start_time"
                    type="time"
                    class="form-input"
                  />
                </div>
                <div class="time-input-group">
                  <label for="end-time">End Time</label>
                  <input
                    id="end-time"
                    v-model="departmentForm.operating_schedule.end_time"
                    type="time"
                    class="form-input"
                  />
                </div>
              </div>
            </div>

            <!-- Days Selection (shown only for Set Days and Times) -->
            <div v-if="scheduleType === 'set-days-times'" class="form-group">
              <label>Operating Days</label>
              <div class="days-selection">
                <label v-for="(day, index) in dayNames" :key="index" class="day-checkbox">
                  <input
                    type="checkbox"
                    :value="index"
                    :checked="departmentForm.operating_schedule.days_of_week.includes(index)"
                    @change="toggleDay(index)"
                  />
                  <span>{{ day }}</span>
                </label>
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

    <!-- Porter Assignment Modal -->
    <div v-if="showPorterAssignmentModal" class="modal-overlay" @click="closePorterAssignmentModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Assign Porters</h2>
          <button @click="closePorterAssignmentModal" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <PorterAssignment
            v-if="selectedDepartment"
            :department="selectedDepartment"
            @updated="handlePorterAssignmentUpdate"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PorterAssignment from '@/components/PorterAssignment.vue'
import { DepartmentServiceAPI } from '@/services/departmentServiceAPI'
import type { Department, DepartmentFormData } from '@/types'

const departments = ref<Department[]>([])
const showAddModal = ref(false)
const editingDepartment = ref<Department | null>(null)
const draggedIndex = ref<number | null>(null)
const showPorterAssignmentModal = ref(false)
const selectedDepartment = ref<Department | null>(null)

// Schedule type for the modal
const scheduleType = ref<'all-days' | '24-hours' | 'set-days-times'>('all-days')

// Day names for the days selection
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const departmentForm = ref<DepartmentFormData>({
  name: '',
  min_porters_required: 1,
  department_type: 'standard_hours',
  operating_schedule: {
    days_of_week: [1, 2, 3, 4, 5], // Monday-Friday default
    start_time: '08:00',
    end_time: '17:00',
    is_24_hour: false,
    requires_shift_support: false,
  },
})

// Handle department type changes
const onDepartmentTypeChange = () => {
  // Set default operating schedule based on department type
  const type = departmentForm.value.department_type

  switch (type) {
    case 'shift_rotation':
      scheduleType.value = 'all-days'
      departmentForm.value.operating_schedule = {
        days_of_week: [],
        start_time: '07:00',
        end_time: '19:00',
        is_24_hour: false,
        requires_shift_support: false,
      }
      break
    case 'emergency_24h':
      scheduleType.value = '24-hours'
      departmentForm.value.operating_schedule = {
        days_of_week: [],
        start_time: '00:00',
        end_time: '23:59',
        is_24_hour: true,
        requires_shift_support: true,
      }
      break
    case 'relief':
      scheduleType.value = '24-hours'
      departmentForm.value.operating_schedule = {
        days_of_week: [],
        start_time: '00:00',
        end_time: '23:59',
        is_24_hour: true,
        requires_shift_support: false,
      }
      break
    case 'standard_hours':
      scheduleType.value = 'set-days-times'
      departmentForm.value.operating_schedule = {
        days_of_week: [1, 2, 3, 4, 5], // Monday-Friday
        start_time: '08:00',
        end_time: '17:00',
        is_24_hour: false,
        requires_shift_support: false,
      }
      break
    case 'on_demand':
      scheduleType.value = 'all-days'
      departmentForm.value.operating_schedule = {
        days_of_week: [],
        start_time: '09:00',
        end_time: '17:00',
        is_24_hour: false,
        requires_shift_support: false,
      }
      break
  }
}

// Handle schedule type changes
const onScheduleTypeChange = (type: 'all-days' | '24-hours' | 'set-days-times') => {
  scheduleType.value = type

  switch (type) {
    case 'all-days':
      departmentForm.value.operating_schedule.days_of_week = []
      departmentForm.value.operating_schedule.is_24_hour = false
      break
    case '24-hours':
      departmentForm.value.operating_schedule.days_of_week = []
      departmentForm.value.operating_schedule.is_24_hour = true
      departmentForm.value.operating_schedule.start_time = '00:00'
      departmentForm.value.operating_schedule.end_time = '23:59'
      break
    case 'set-days-times':
      departmentForm.value.operating_schedule.is_24_hour = false
      // Keep existing days or set to weekdays if empty
      if (departmentForm.value.operating_schedule.days_of_week.length === 0) {
        departmentForm.value.operating_schedule.days_of_week = [1, 2, 3, 4, 5] // Monday-Friday
      }
      break
  }
}

// Toggle day selection
const toggleDay = (dayIndex: number) => {
  const days = departmentForm.value.operating_schedule.days_of_week
  const index = days.indexOf(dayIndex)

  if (index > -1) {
    days.splice(index, 1)
  } else {
    days.push(dayIndex)
  }

  // Sort the days array
  days.sort((a, b) => a - b)
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

    // Import PorterService to access porters
    const { PorterService } = await import('@/services/porterService')
    const porters = PorterService.getAllPorters()

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
      if (
        porter.name?.toLowerCase().includes('pts') ||
        porter.shift_group?.includes('PTS') ||
        porter.contracted_hours?.includes('PTS')
      ) {
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
    department_type: department.department_type,
    operating_schedule: { ...department.operating_schedule },
  }

  // Set the correct schedule type based on the department's operating schedule
  if (department.operating_schedule.is_24_hour) {
    scheduleType.value = '24-hours'
  } else if (department.operating_schedule.days_of_week.length === 0) {
    scheduleType.value = 'all-days'
  } else {
    scheduleType.value = 'set-days-times'
  }
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
      await DepartmentServiceAPI.updateDepartment(editingDepartment.value.id, departmentForm.value)
    } else {
      await DepartmentServiceAPI.createDepartment(departmentForm.value)
    }

    await loadDepartments()
    closeModal()
  } catch (error) {
    console.error('Failed to save department:', error)
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingDepartment.value = null
  scheduleType.value = 'set-days-times' // Reset to default
  departmentForm.value = {
    name: '',
    min_porters_required: 1,
    department_type: 'standard_hours',
    operating_schedule: {
      days_of_week: [1, 2, 3, 4, 5], // Monday-Friday default
      start_time: '08:00',
      end_time: '17:00',
      is_24_hour: false,
      requires_shift_support: false,
    },
  }
}

const assignPorters = (department: Department) => {
  selectedDepartment.value = department
  showPorterAssignmentModal.value = true
}

const closePorterAssignmentModal = () => {
  showPorterAssignmentModal.value = false
  selectedDepartment.value = null
}

const handlePorterAssignmentUpdate = () => {
  // Refresh departments if needed
  loadDepartments()
}

// Format department type for display
const formatDepartmentType = (type: string): string => {
  const typeMap: Record<string, string> = {
    shift_rotation: 'Shift Rotation',
    relief: 'Relief',
    emergency_24h: 'Emergency 24h',
    standard_hours: 'Standard Hours',
    on_demand: 'On Demand',
  }
  return typeMap[type] || type
}

// Format operating schedule for display
const formatOperatingSchedule = (department: Department): string => {
  // TODO: Implement formatOperatingSchedule in API or move to utils
  return '24/7' // Temporary placeholder
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
