<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import { onMounted } from 'vue'
import { ShiftService } from './services/shiftService'

// Initialize shift patterns on app startup
onMounted(() => {
  try {
    ShiftService.initializeShiftPatterns()
  } catch (error) {
    console.error('Failed to initialize shift patterns:', error)
  }
})
</script>

<template>
  <div id="app">
    <AppHeader />
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
main {
  flex: 1;
  padding: var(--spacing-md);
}

@container (min-width: 768px) {
  main {
    padding: var(--spacing-xl);
  }
}
</style>
