<template>
  <div class="nav-tabs-container">
    <div class="nav-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="nav-tab"
        :class="{ active: activeTab === tab.key }"
        @click="$emit('update:activeTab', tab.key)"
      >
        {{ tab.label }}
        <span v-if="tab.count !== undefined" class="tab-count">({{ tab.count }})</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Tab {
  key: string
  label: string
  count?: number
}

interface Props {
  tabs: Tab[]
  activeTab: string
}

interface Emits {
  (e: 'update:activeTab', key: string): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.nav-tabs-container {
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--spacing-lg);
}

.nav-tabs {
  display: flex;
  gap: var(--spacing-xs);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.nav-tabs::-webkit-scrollbar {
  display: none;
}

.nav-tab {
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  background: none;
  color: var(--color-text-muted);
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.nav-tab:hover {
  color: var(--color-text);
  background: var(--color-background-soft);
}

.nav-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-count {
  font-size: 0.75rem;
  opacity: 0.7;
}

@container (max-width: 480px) {
  .nav-tab {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.875rem;
  }
}
</style>
