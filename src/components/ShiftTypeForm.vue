<template>
  <BaseForm @submit="handleSubmit">
    <!-- Shift Type Name -->
    <FormField
      v-model="form.name"
      label="Shift Type Name"
      type="text"
      placeholder="e.g., Day Shift A, Night Shift B, PTS Morning"
      :error="errors.name"
      required
    />

    <!-- Description -->
    <FormField
      v-model="form.description"
      label="Description"
      type="textarea"
      placeholder="Optional description of this shift type..."
      :error="errors.description"
    />

    <!-- Time Schedule -->
    <div class="form-row">
      <FormField
        v-model="form.start_time"
        label="Start Time"
        type="text"
        placeholder="07:00"
        :error="errors.start_time"
        required
      />

      <FormField
        v-model="form.end_time"
        label="End Time"
        type="text"
        placeholder="19:00"
        :error="errors.end_time"
        required
      />
    </div>

    <!-- Rotation Configuration -->
    <FormField
      v-model="form.rotation_type"
      label="Rotation Type"
      type="select"
      placeholder="Select rotation type..."
      :options="[
        { value: 'fixed', label: 'Fixed Schedule (same days every week)' },
        { value: 'alternating', label: 'Alternating Pattern (A/B rotation)' },
        { value: 'rotating', label: 'Rotating Shifts (continuous cycle)' },
      ]"
      :error="errors.rotation_type"
      required
    />

    <!-- Rotation Days -->
    <FormField
      v-model="form.rotation_days"
      label="Rotation Cycle (Days)"
      type="number"
      placeholder="e.g., 4 for 4-on/4-off, 7 for weekly"
      :min="1"
      :max="365"
      :error="errors.rotation_days"
      required
    />
    <div class="field-help">
      <p v-if="form.rotation_type === 'alternating'">
        For 4-on/4-off shifts, use 8 days (4 working + 4 off)
      </p>
      <p v-else-if="form.rotation_type === 'rotating'">
        Number of days in the complete rotation cycle
      </p>
      <p v-else-if="form.rotation_type === 'fixed'">Use 7 for weekly fixed schedules</p>
    </div>

    <!-- Offset Days -->
    <FormField
      v-model="form.offset_days"
      label="Offset Days"
      type="number"
      placeholder="0"
      :min="0"
      :max="form.rotation_days - 1"
      :error="errors.offset_days"
    />
    <div class="field-help">
      <p>Days to offset this shift from the base pattern (0 = no offset)</p>
      <p v-if="form.rotation_type === 'alternating'">
        Use 0 for Group A, {{ Math.floor((form.rotation_days || 8) / 2) }} for Group B
      </p>
    </div>

    <!-- Active Status -->
    <div class="form-group">
      <label class="form-label">Status</label>
      <label class="checkbox-label">
        <input v-model="form.is_active" type="checkbox" class="form-checkbox" />
        <span class="checkmark"></span>
        Active (shift type is available for assignment)
      </label>
    </div>

    <!-- Preview Section -->
    <div v-if="isFormValid" class="shift-preview">
      <h4>Shift Preview</h4>
      <div class="preview-details">
        <div class="preview-row">
          <span class="label">Schedule:</span>
          <span class="value">{{ form.start_time }} - {{ form.end_time }}</span>
        </div>
        <div class="preview-row">
          <span class="label">Pattern:</span>
          <span class="value">{{ getPatternDescription() }}</span>
        </div>
        <div class="preview-row">
          <span class="label">Cycle:</span>
          <span class="value">{{ form.rotation_days }} days</span>
        </div>
        <div v-if="form.offset_days > 0" class="preview-row">
          <span class="label">Offset:</span>
          <span class="value">{{ form.offset_days }} days</span>
        </div>
      </div>
    </div>

    <!-- Form Actions -->
    <div class="form-actions">
      <button type="button" @click="$emit('cancel')" class="btn btn-secondary">Cancel</button>
      <button type="submit" class="btn btn-primary" :disabled="!isFormValid">
        {{ isEditing ? 'Update' : 'Create' }} Shift Type
      </button>
    </div>
  </BaseForm>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import BaseForm from './BaseForm.vue'
import FormField from './FormField.vue'
import type { ShiftTypeFormData } from '@/types'

interface Props {
  initialData?: Partial<ShiftTypeFormData>
  isEditing?: boolean
}

interface Emits {
  (e: 'submit', data: ShiftTypeFormData): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  isEditing: false,
})

const emit = defineEmits<Emits>()

// Form data
const form = ref<ShiftTypeFormData>({
  name: '',
  description: '',
  start_time: '07:00',
  end_time: '19:00',
  rotation_type: 'alternating',
  rotation_days: 8,
  offset_days: 0,
  is_active: true,
})

// Form validation
const errors = ref({
  name: '',
  start_time: '',
  end_time: '',
  rotation_type: '',
  rotation_days: '',
  offset_days: '',
})

const isFormValid = computed(() => {
  return Object.values(errors.value).every((error) => error === '')
})

// Validation rules
const validationRules = {
  name: (value: string) => {
    if (!value.trim()) return 'Shift type name is required'
    if (value.length < 3) return 'Name must be at least 3 characters'
    if (value.length > 50) return 'Name must be less than 50 characters'
    return null
  },
  start_time: (value: string) => {
    if (!value) return 'Start time is required'
    return null
  },
  end_time: (value: string) => {
    if (!value) return 'End time is required'
    if (value === form.value.start_time) return 'End time must be different from start time'
    return null
  },
  rotation_type: (value: string) => {
    if (!value) return 'Rotation type is required'
    if (!['fixed', 'alternating', 'rotating'].includes(value)) {
      return 'Invalid rotation type'
    }
    return null
  },
  rotation_days: (value: number) => {
    if (!value || value < 1) return 'Rotation days must be at least 1'
    if (value > 365) return 'Rotation days cannot exceed 365'
    return null
  },
  offset_days: (value: number) => {
    if (value < 0) return 'Offset days cannot be negative'
    if (value >= form.value.rotation_days) {
      return 'Offset days must be less than rotation days'
    }
    return null
  },
}

// Watch form fields for validation
watch(
  () => form.value.name,
  (value) => {
    errors.value.name = validationRules.name(value) || ''
  },
)
watch(
  () => form.value.start_time,
  (value) => {
    errors.value.start_time = validationRules.start_time(value) || ''
  },
)
watch(
  () => form.value.end_time,
  (value) => {
    errors.value.end_time = validationRules.end_time(value) || ''
  },
)
watch(
  () => form.value.rotation_type,
  (value) => {
    errors.value.rotation_type = validationRules.rotation_type(value) || ''
  },
)
watch(
  () => form.value.rotation_days,
  (value) => {
    errors.value.rotation_days = validationRules.rotation_days(value) || ''
  },
)
watch(
  () => form.value.offset_days,
  (value) => {
    errors.value.offset_days = validationRules.offset_days(value) || ''
  },
)

// Auto-adjust rotation days based on rotation type
watch(
  () => form.value.rotation_type,
  (newType) => {
    if (newType === 'alternating' && form.value.rotation_days !== 8) {
      form.value.rotation_days = 8
    } else if (newType === 'fixed' && form.value.rotation_days !== 7) {
      form.value.rotation_days = 7
    }
  },
)

// Auto-suggest offset for alternating shifts
watch(
  () => [form.value.rotation_type, form.value.rotation_days],
  ([newType, newDays]) => {
    if (newType === 'alternating' && form.value.offset_days === 0 && props.isEditing === false) {
      // Suggest offset for Group B
      form.value.offset_days = Math.floor((newDays as number) / 2)
    }
  },
)

// Methods
const getPatternDescription = (): string => {
  const type = form.value.rotation_type
  const days = form.value.rotation_days

  switch (type) {
    case 'fixed':
      return 'Same schedule every week'
    case 'alternating':
      return `${days / 2} days on, ${days / 2} days off`
    case 'rotating':
      return `${days}-day rotating cycle`
    default:
      return 'Custom pattern'
  }
}

const handleSubmit = () => {
  // Validate all fields
  Object.entries(validationRules).forEach(([field, rule]) => {
    const value = (form.value as any)[field]
    const error = rule(value)
    ;(errors.value as any)[field] = error || ''
  })

  // Check if form is valid (no errors)
  const hasErrors = Object.values(errors.value).some((error) => error !== '')

  if (!hasErrors) {
    emit('submit', { ...form.value })
  }
}

// Initialize form with props data
onMounted(() => {
  if (props.initialData) {
    Object.assign(form.value, props.initialData)
  }
})
</script>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.field-help {
  margin-top: var(--spacing-xs);
}

.field-help p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-weight: 500;
}

.form-checkbox {
  margin: 0;
}

.checkmark {
  font-size: 1rem;
}

.shift-preview {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-lg);
  background: var(--color-background);
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.shift-preview h4 {
  margin: 0 0 var(--spacing-md) 0;
  color: var(--color-primary);
}

.preview-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-row .label {
  font-weight: 500;
  color: var(--color-text-muted);
}

.preview-row .value {
  font-weight: 600;
}

.form-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-label {
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.875rem;
}

@container (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .preview-row {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
}
</style>
