<template>
  <BaseForm @submit="handleSubmit">
    <FormField v-model="form.name" label="Name" type="text" required :error="errors.name" />

    <FormField
      v-model="form.type"
      label="Employment Type"
      type="select"
      required
      :options="porterTypeOptions"
      hint="Regular = standard staff, Relief = cover absences, Supervisor = management"
      :error="errors.type"
    />

    <FormField
      v-model="assignedDepartmentId"
      label="Assign to Department"
      type="select"
      :options="departmentOptions"
      placeholder="Select department (optional)"
      hint="Assign this porter to a specific department - they will appear in that department's table"
      :error="errors.assigned_department_id"
    />

    <!-- Contracted Hours Section -->
    <div class="contracted-hours-section">
      <h4>Contracted Hours</h4>
      <p class="section-hint">Set the porter's working hours for each day of the week</p>

      <div class="days-grid">
        <div v-for="day in daysOfWeek" :key="day" class="day-row">
          <div class="day-header">
            <label class="day-checkbox">
              <input
                type="checkbox"
                :checked="form.contracted_hours && form.contracted_hours[day.toLowerCase()]"
                @change="toggleDay(day.toLowerCase())"
              />
              <span class="day-name">{{ day }}</span>
            </label>
          </div>
          <div
            v-if="form.contracted_hours && form.contracted_hours[day.toLowerCase()]"
            class="day-times"
          >
            <div class="time-input-group">
              <label>Start</label>
              <input
                v-model="form.contracted_hours[day.toLowerCase()].start"
                type="time"
                class="form-input time-input"
              />
            </div>
            <div class="time-input-group">
              <label>End</label>
              <input
                v-model="form.contracted_hours[day.toLowerCase()].end"
                type="time"
                class="form-input time-input"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <FormField
      v-model="form.break_duration_minutes"
      label="Break Duration (minutes)"
      type="number"
      :min="0"
      :max="120"
      :error="errors.break_duration_minutes"
    />

    <!-- Move Tabs Section -->
    <div class="move-tabs-section">
      <h4>Staff Management</h4>
      <FormField
        v-if="form.type !== 'Supervisor'"
        v-model="form.shift_group"
        label="Move Tabs?"
        type="select"
        :options="getShiftGroupOptionsForType(form.type)"
        placeholder="Select tab category (optional)"
        hint="Choose which staff management tab this porter should appear in"
        :error="errors.shift_group"
      />
    </div>

    <div class="form-actions">
      <button type="button" @click="$emit('cancel')" class="btn btn-secondary">Cancel</button>
      <button type="submit" class="btn btn-primary" :disabled="!isFormValid">
        {{ isEditing ? 'Update' : 'Create' }} Porter
      </button>
    </div>
  </BaseForm>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import BaseForm from './BaseForm.vue'
import FormField from './FormField.vue'
import { useFormValidation } from '@/composables/useFormValidation'
import { DepartmentServiceAPI } from '@/services/departmentServiceAPI'
import type { PorterFormData, PorterType, Department } from '@/types'

interface Props {
  initialData?: Partial<PorterFormData>
  isEditing?: boolean
}

interface Emits {
  (e: 'submit', data: PorterFormData): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  isEditing: false,
})

const emit = defineEmits<Emits>()

const form = ref<PorterFormData>({
  name: '',
  type: 'Regular',
  contracted_hours: {},
  break_duration_minutes: 60,
  shift_group: undefined,
  department_assignments: [],
})

// Add assigned_department_id for the form
const assignedDepartmentId = ref<number | undefined>(undefined)

// Days of the week for contracted hours
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Toggle day function for contracted hours
const toggleDay = (day: string) => {
  if (!form.value.contracted_hours) {
    form.value.contracted_hours = {}
  }

  if (form.value.contracted_hours[day]) {
    delete form.value.contracted_hours[day]
  } else {
    form.value.contracted_hours[day] = {
      start: '08:00',
      end: '17:00',
    }
  }
}

const errors = ref({
  name: '',
  type: '',
  contracted_hours: '',
  break_duration_minutes: '',
  shift_group: '',
  assigned_department_id: '',
})

// Department options
const departments = ref<Department[]>([])
const departmentOptions = computed(() => [
  { value: undefined, label: 'No department assignment' },
  ...departments.value.map((dept) => ({
    value: dept.id,
    label: dept.name,
  })),
])

const { validateAll, isFormValid } = useFormValidation()

const porterTypeOptions = [
  { value: 'Regular', label: 'Regular' },
  { value: 'Relief', label: 'Relief' },
  { value: 'Supervisor', label: 'Supervisor' },
]

const shiftGroupOptions = [
  { value: 'Day Shift A', label: 'Day Shift A' },
  { value: 'Day Shift B', label: 'Day Shift B' },
  { value: 'Night Shift A', label: 'Night Shift A' },
  { value: 'Night Shift B', label: 'Night Shift B' },
  { value: 'PTS A', label: 'PTS A' },
  { value: 'PTS B', label: 'PTS B' },
  { value: 'Relief', label: 'Relief' },
  { value: 'Departmental', label: 'Departmental (Permanently assigned to specific departments)' },
]

// Get appropriate shift group options based on porter type
const getShiftGroupOptionsForType = (type: string) => {
  switch (type) {
    case 'Regular':
      // Regular porters can be assigned to any shift group
      return shiftGroupOptions
    case 'Relief':
      // Relief porters typically work Relief shifts but can cover others
      return shiftGroupOptions
    case 'Supervisor':
      // Supervisors don't typically have shift groups
      return []
    default:
      return shiftGroupOptions
  }
}

// Load departments on mount
onMounted(async () => {
  try {
    departments.value = await DepartmentServiceAPI.getAllDepartments()
  } catch (error) {
    console.error('Failed to load departments:', error)
  }
})

// Initialize form with provided data
watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      console.log(`📝 PorterForm initializing with data for: ${newData.name}`)
      Object.assign(form.value, newData)

      // Set assigned department if porter has department assignments
      if (newData.department_assignments && newData.department_assignments.length > 0) {
        assignedDepartmentId.value = newData.department_assignments[0].department_id
        console.log(`📝 PorterForm: Set department assignment to ${assignedDepartmentId.value}`)
      } else {
        assignedDepartmentId.value = undefined
        console.log(`📝 PorterForm: No department assignments found`)
      }
    }
  },
  { immediate: true },
)

// Clear shift group when type changes to Supervisor (they don't have shift groups)
watch(
  () => form.value.type,
  (newType) => {
    if (newType === 'Supervisor') {
      form.value.shift_group = undefined
    }
  },
)

const validateForm = (): boolean => {
  // Reset errors
  Object.keys(errors.value).forEach((key) => {
    errors.value[key as keyof typeof errors.value] = ''
  })

  let isValid = true

  // Name validation
  if (!form.value.name.trim()) {
    errors.value.name = 'Name is required'
    isValid = false
  }

  // Type validation
  if (!form.value.type) {
    errors.value.type = 'Porter type is required'
    isValid = false
  }

  // Contracted hours validation
  if (form.value.contracted_hours) {
    const timePattern = /^\d{4}-\d{4}$/
    if (!timePattern.test(form.value.contracted_hours)) {
      errors.value.contracted_hours = 'Invalid format. Use HHMM-HHMM (e.g., 0800-2000)'
      isValid = false
    }
  }

  // Break duration validation
  if (form.value.break_duration_minutes < 0 || form.value.break_duration_minutes > 120) {
    errors.value.break_duration_minutes = 'Break duration must be between 0 and 120 minutes'
    isValid = false
  }

  // Shift group validation - now optional for all types
  // No validation needed as shift groups are optional

  return isValid
}

const handleSubmit = () => {
  if (validateForm()) {
    // Prepare form data with department assignment
    const formData = {
      ...form.value,
      assigned_department_id: assignedDepartmentId.value,
    }
    emit('submit', formData)
  }
}
</script>

<style scoped>
.move-tabs-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.move-tabs-section h4 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

@container (max-width: 480px) {
  .form-actions {
    flex-direction: column;
  }
}

/* Contracted Hours Section */
.contracted-hours-section {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.contracted-hours-section h4 {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 600;
}

.section-hint {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.days-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.day-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.day-header {
  display: flex;
  align-items: center;
}

.day-checkbox {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-weight: 500;
}

.day-checkbox input[type='checkbox'] {
  margin: 0;
}

.day-name {
  min-width: 80px;
  color: var(--color-text-primary);
}

.day-times {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-left: var(--spacing-lg);
  padding-left: var(--spacing-md);
  border-left: 2px solid var(--color-border);
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
</style>
