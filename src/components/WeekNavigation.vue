<template>
  <div class="week-navigation">
    <div class="week-selector">
      <h3>Select Week</h3>
      <div class="week-links">
        <button
          v-for="week in upcomingWeeks"
          :key="week.startDate"
          class="week-link"
          :class="{ active: isCurrentWeek(week.startDate) }"
          @click="selectWeek(week.startDate)"
        >
          {{ week.label }}
        </button>
      </div>
    </div>

    <div class="day-selector">
      <h4>{{ selectedWeekLabel }}</h4>
      <div class="day-tabs">
        <button
          v-for="day in currentWeekDays"
          :key="day.dateString"
          class="day-tab"
          :class="{
            active: day.isSelected,
            today: day.isToday,
          }"
          @click="selectDate(day.date)"
        >
          <span class="day-name">{{ day.dayShort }}</span>
          <span class="day-number">{{ day.dayNumber }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { format, startOfWeek, addWeeks, isSameWeek } from 'date-fns'
import { getWeekDays } from '@/utils/dateUtils'

interface Props {
  selectedDate: Date
}

interface Emits {
  (e: 'update:selectedDate', date: Date): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Generate upcoming weeks (current week + next 8 weeks)
const upcomingWeeks = computed(() => {
  const weeks = []
  const today = new Date()
  
  for (let i = 0; i < 9; i++) {
    const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 }) // Monday
    weeks.push({
      startDate: weekStart,
      label: format(weekStart, 'MMMM d')
    })
  }
  
  return weeks
})

const currentWeekDays = computed(() => {
  return getWeekDays(props.selectedDate)
})

const selectedWeekLabel = computed(() => {
  const weekStart = startOfWeek(props.selectedDate, { weekStartsOn: 1 })
  const weekEnd = addWeeks(weekStart, 1)
  return `Week of ${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}`
})

const isCurrentWeek = (weekStart: Date): boolean => {
  return isSameWeek(weekStart, props.selectedDate, { weekStartsOn: 1 })
}

const selectWeek = (weekStart: Date) => {
  // Select the Monday of the chosen week
  emit('update:selectedDate', weekStart)
}

const selectDate = (date: Date) => {
  emit('update:selectedDate', date)
}
</script>

<style scoped>
.week-navigation {
  margin-bottom: var(--spacing-xl);
}

.week-selector {
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.week-selector h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.week-links {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  flex-wrap: wrap;
}

.week-link {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: white;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  font-weight: 500;
}

.week-link:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.week-link.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.day-selector {
  text-align: center;
}

.day-selector h4 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
}

.day-tabs {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.day-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 60px;
}

.day-tab:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.day-tab.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.day-tab.today {
  border-color: var(--color-success);
  background: var(--color-success-light);
}

.day-tab.today.active {
  background: var(--color-success);
  border-color: var(--color-success);
}

.day-name {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.day-number {
  font-size: 1.125rem;
  font-weight: 700;
  margin-top: 2px;
}

@container (max-width: 768px) {
  .week-links {
    gap: var(--spacing-xs);
  }
  
  .week-link {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 0.8rem;
  }
  
  .day-tabs {
    gap: 4px;
  }
  
  .day-tab {
    min-width: 50px;
    padding: var(--spacing-xs);
  }
  
  .day-name {
    font-size: 0.7rem;
  }
  
  .day-number {
    font-size: 1rem;
  }
}
</style>
