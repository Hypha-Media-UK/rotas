<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { format } from 'date-fns'
import WeekNavigation from '@/components/WeekNavigation.vue'
import DailyShiftView from '@/components/DailyShiftView.vue'
import { DepartmentServiceAPI } from '@/services/departmentServiceAPI'
import { formatDate } from '@/utils/dateUtils'
import type { Department } from '@/types'

const selectedDate = ref(new Date())
const departments = ref<Department[]>([])

const selectedDateFormatted = computed(() => {
  return formatDate(selectedDate.value.toISOString(), 'EEEE, MMMM d, yyyy')
})

const loadDepartments = async () => {
  try {
    departments.value = await DepartmentServiceAPI.getAllDepartments()
  } catch (error) {
    console.error('Failed to load departments:', error)
  }
}

onMounted(() => {
  loadDepartments()
})
</script>

<template>
  <div class="home-view">
    <div class="page-header">
      <h1>Staff Rotas</h1>
      <p class="current-date">{{ selectedDateFormatted }}</p>
    </div>

    <!-- Week Navigation -->
    <WeekNavigation :selected-date="selectedDate" @update:selected-date="selectedDate = $event" />

    <!-- Daily Shift View -->
    <DailyShiftView :date="format(selectedDate, 'yyyy-MM-dd')" :departments="departments" />

    <!-- Empty state -->
    <div v-if="departments.length === 0" class="empty-state">
      <h3>No Departments Found</h3>
      <p>Get started by adding departments in the Departments section.</p>
      <RouterLink to="/departments" class="btn btn-primary"> Manage Departments </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.home-view {
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
  color: var(--color-text);
}

.current-date {
  font-size: 1.125rem;
  color: var(--color-text-muted);
  margin: 0;
}

.week-navigation {
  margin-bottom: var(--spacing-xl);
}

.nav-tabs {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.nav-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 60px;
}

.nav-tab:hover {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.nav-tab.active {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  font-weight: 600;
}

.nav-tab.today {
  border-color: var(--color-warning);
  background-color: rgba(217, 119, 6, 0.1);
}

.nav-tab.today.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.day-name {
  font-size: 0.75rem;
  font-weight: 500;
}

.day-number {
  font-size: 1.125rem;
  font-weight: 600;
}

.departments-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-lg);
}

@container (min-width: 768px) {
  .departments-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.department-card {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
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
</style>
