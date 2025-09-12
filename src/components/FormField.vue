<template>
  <div class="form-group">
    <label v-if="label" :for="fieldId" class="form-label">
      {{ label }}
      <span v-if="required" class="required-indicator">*</span>
    </label>

    <!-- Text Input -->
    <input
      v-if="type === 'text' || type === 'email' || type === 'password'"
      :id="fieldId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      class="form-input"
      @input="updateValue"
    />

    <!-- Number Input -->
    <input
      v-else-if="type === 'number'"
      :id="fieldId"
      type="number"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :min="min"
      :max="max"
      :step="step"
      class="form-input"
      @input="updateValue"
    />

    <!-- Select -->
    <select
      v-else-if="type === 'select'"
      :id="fieldId"
      :value="modelValue"
      :required="required"
      :disabled="disabled"
      class="form-select"
      @change="updateValue"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <!-- Textarea -->
    <textarea
      v-else-if="type === 'textarea'"
      :id="fieldId"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :rows="rows"
      class="form-textarea"
      @input="updateValue"
    />

    <div v-if="error" class="form-error">{{ error }}</div>
    <div v-if="hint" class="form-hint">{{ hint }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Option {
  value: string | number
  label: string
}

interface Props {
  modelValue: string | number | undefined
  type?: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea'
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
  options?: Option[]
  min?: number
  max?: number
  step?: number
  rows?: number
}

interface Emits {
  (e: 'update:modelValue', value: string | number): void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  rows: 3,
})

const emit = defineEmits<Emits>()

const fieldId = computed(() => {
  return `field-${Math.random().toString(36).substr(2, 9)}`
})

const updateValue = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  let value: string | number = target.value

  // Convert to number for number inputs
  if (props.type === 'number') {
    value = Number(target.value)
  }
  // For select fields, check if the original option value was a number
  else if (props.type === 'select' && props.options) {
    const selectedOption = props.options.find((opt) => String(opt.value) === target.value)
    if (selectedOption && typeof selectedOption.value === 'number') {
      value = selectedOption.value
    }
  }

  emit('update:modelValue', value)
}
</script>

<style scoped>
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

.required-indicator {
  color: var(--color-danger);
  margin-left: 2px;
}

.form-input,
.form-select,
.form-textarea {
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  background: var(--color-background);
  color: var(--color-text);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-alpha);
}

.form-input:disabled,
.form-select:disabled,
.form-textarea:disabled {
  background: var(--color-background-muted);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-error {
  color: var(--color-danger);
  font-size: 0.75rem;
  margin-top: var(--spacing-xs);
}

.form-hint {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  margin-top: var(--spacing-xs);
}
</style>
