<template>
  <div v-if="modelValue" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button @click="close" class="modal-close" aria-label="Close modal">&times;</button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
      <div v-if="$slots.footer" class="modal-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title: string
  closeOnOverlay?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  closeOnOverlay: true
})

const emit = defineEmits<Emits>()

const close = () => {
  emit('update:modelValue', false)
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close()
  }
}
</script>

<style scoped>
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
  padding: var(--spacing-md);
}

.modal-content {
  background: var(--color-background);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  width: 100%;
  max-width: 500px;
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
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius);
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: var(--color-background-soft);
  color: var(--color-text);
}

.modal-body {
  padding: var(--spacing-lg);
}

.modal-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

@container (max-width: 480px) {
  .modal-content {
    margin: var(--spacing-sm);
    max-width: none;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: var(--spacing-md);
  }
}
</style>
