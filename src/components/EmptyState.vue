<template>
  <div class="empty-state">
    <div v-if="icon" class="empty-icon">{{ icon }}</div>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-description">{{ description }}</p>
    <div v-if="$slots.actions" class="empty-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  description?: string
  icon?: string
}

defineProps<Props>()
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
  opacity: 0.5;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--color-text);
}

.empty-description {
  margin: 0 0 var(--spacing-lg) 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.empty-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  flex-wrap: wrap;
}

@container (max-width: 480px) {
  .empty-state {
    padding: var(--spacing-lg);
  }
  
  .empty-title {
    font-size: 1.125rem;
  }
  
  .empty-description {
    font-size: 0.875rem;
  }
}
</style>
