import { ref, computed, type Ref } from 'vue'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface FieldValidation {
  value: Ref<any>
  rules: ValidationRule
  error: Ref<string>
  isValid: Ref<boolean>
}

export function useFormValidation() {
  const fields = ref<Record<string, FieldValidation>>({})

  const addField = (name: string, value: Ref<any>, rules: ValidationRule = {}) => {
    const error = ref('')
    
    const isValid = computed(() => {
      const validation = validateField(value.value, rules)
      error.value = validation
      return validation === ''
    })

    fields.value[name] = {
      value,
      rules,
      error,
      isValid
    }

    return { error, isValid }
  }

  const validateField = (value: any, rules: ValidationRule): string => {
    if (rules.required && (!value || value.toString().trim() === '')) {
      return 'This field is required'
    }

    if (value && rules.minLength && value.toString().length < rules.minLength) {
      return `Minimum length is ${rules.minLength} characters`
    }

    if (value && rules.maxLength && value.toString().length > rules.maxLength) {
      return `Maximum length is ${rules.maxLength} characters`
    }

    if (value && rules.pattern && !rules.pattern.test(value.toString())) {
      return 'Invalid format'
    }

    if (rules.custom) {
      const customError = rules.custom(value)
      if (customError) return customError
    }

    return ''
  }

  const validateAll = (): boolean => {
    let isFormValid = true
    
    Object.values(fields.value).forEach(field => {
      const validation = validateField(field.value.value, field.rules)
      field.error.value = validation
      if (validation !== '') {
        isFormValid = false
      }
    })

    return isFormValid
  }

  const resetValidation = () => {
    Object.values(fields.value).forEach(field => {
      field.error.value = ''
    })
  }

  const isFormValid = computed(() => {
    return Object.values(fields.value).every(field => field.isValid.value)
  })

  return {
    addField,
    validateAll,
    resetValidation,
    isFormValid
  }
}
