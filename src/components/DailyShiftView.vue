<template>
  <div class="daily-shift-view">
    <div class="shift-header">
      <h3>{{ formatDate(date, 'EEEE, MMMM d, yyyy') }}</h3>
      <p class="shift-subtitle">Department Coverage</p>
      <div class="debug-info" v-if="debugInfo.length > 0">
        <details>
          <summary>
            Debug: {{ displayDepartments.length }} of {{ props.departments.length }} departments
            shown
          </summary>
          <div class="debug-details">
            <div v-for="info in debugInfo" :key="info.name" class="debug-item">
              <span :class="{ shown: info.shown, hidden: !info.shown }">
                {{ info.name }}: {{ info.reason }}
              </span>
            </div>
          </div>
        </details>
      </div>
    </div>

    <!-- Simple departments grid -->
    <div class="departments-grid">
      <DepartmentTable
        v-for="department in displayDepartments"
        :key="department.id"
        :department="department"
        :date="date"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DepartmentTable from './DepartmentTable.vue'
import { ShiftService } from '@/services/shiftService'
import { DepartmentServiceAPI } from '@/services/departmentServiceAPI'
import { formatDate } from '@/utils/dateUtils'
import type { Department } from '@/types'

interface Props {
  date: string
  departments: Department[]
}

const props = defineProps<Props>()

// Calculate which shift groups are working for this date
const dayShiftInfo = computed(() => {
  return ShiftService.calculateShiftForDate(props.date, 'day')
})

const nightShiftInfo = computed(() => {
  return ShiftService.calculateShiftForDate(props.date, 'night')
})

// Debug info for department filtering
const debugInfo = computed(() => {
  const dateObj = new Date(props.date)
  const dayOfWeek = dateObj.getDay()
  const isDayShiftA = dayShiftInfo.value.working_shift_group === 'Day Shift A'
  const isNightShiftA = nightShiftInfo.value.working_shift_group === 'Night Shift A'
  const isPTSA = isDayShiftA

  return props.departments.map((dept) => {
    const schedule = dept.operating_schedule
    const operatesOnThisDay =
      schedule.days_of_week.length === 0 || schedule.days_of_week.includes(dayOfWeek)

    let reason = ''
    let shown = true

    if (!operatesOnThisDay) {
      reason = `Closed on ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]} (operates: ${schedule.days_of_week.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ') || 'All days'})`
      shown = false
    } else if (dept.department_type === 'shift_rotation') {
      if (dept.name === 'Day Shift A') {
        reason = isDayShiftA ? 'Active (Day Shift A working)' : 'Off duty (Day Shift B working)'
        shown = isDayShiftA
      } else if (dept.name === 'Day Shift B') {
        reason = !isDayShiftA ? 'Active (Day Shift B working)' : 'Off duty (Day Shift A working)'
        shown = !isDayShiftA
      } else if (dept.name === 'Night Shift A') {
        reason = isNightShiftA
          ? 'Active (Night Shift A working)'
          : 'Off duty (Night Shift B working)'
        shown = isNightShiftA
      } else if (dept.name === 'Night Shift B') {
        reason = !isNightShiftA
          ? 'Active (Night Shift B working)'
          : 'Off duty (Night Shift A working)'
        shown = !isNightShiftA
      } else if (dept.name === 'PTS A') {
        reason = isPTSA ? 'Active (follows Day Shift A)' : 'Off duty (follows Day Shift B)'
        shown = isPTSA
      } else if (dept.name === 'PTS B') {
        reason = !isPTSA ? 'Active (follows Day Shift B)' : 'Off duty (follows Day Shift A)'
        shown = !isPTSA
      } else {
        reason = 'Operating (shift rotation type)'
      }
    } else {
      reason = `Operating (${dept.department_type})`
    }

    return { name: dept.name, reason, shown }
  })
})

// Create display departments with correct A/B rotation and operating schedule filtering
const displayDepartments = computed(() => {
  // Get day of week (0=Sunday, 1=Monday, etc.)
  const dateObj = new Date(props.date)
  const dayOfWeek = dateObj.getDay()

  console.log(`🏥 Filtering departments for ${props.date} (day ${dayOfWeek})`)

  // Determine if it's A or B shift for this date
  const isDayShiftA = dayShiftInfo.value.working_shift_group === 'Day Shift A'
  const isNightShiftA = nightShiftInfo.value.working_shift_group === 'Night Shift A'
  const isPTSA = isDayShiftA // PTS follows day shift rotation

  console.log(`📅 Shift status: Day A=${isDayShiftA}, Night A=${isNightShiftA}, PTS A=${isPTSA}`)
  console.log(`🔍 Day shift working group: ${dayShiftInfo.value.working_shift_group}`)
  console.log(`🔍 Night shift working group: ${nightShiftInfo.value.working_shift_group}`)

  // Filter departments based on operating schedules and A/B rotation
  const filtered = props.departments.filter((dept) => {
    // First check if department operates on this day of week
    const schedule = dept.operating_schedule
    const operatesOnThisDay =
      schedule.days_of_week.length === 0 || schedule.days_of_week.includes(dayOfWeek)

    // If department doesn't operate on this day, don't show it
    if (!operatesOnThisDay) {
      console.log(`❌ ${dept.name}: doesn't operate on day ${dayOfWeek}`)
      return false
    }

    // For shift rotation departments (4-on/4-off), apply A/B logic
    if (dept.department_type === 'shift_rotation') {
      // For Day Shift - only show the active one
      if (dept.name === 'Day Shift A') {
        console.log(`${isDayShiftA ? '✅' : '❌'} ${dept.name}: Day Shift A (${isDayShiftA})`)
        return isDayShiftA
      }
      if (dept.name === 'Day Shift B') {
        console.log(`${!isDayShiftA ? '✅' : '❌'} ${dept.name}: Day Shift B (${!isDayShiftA})`)
        return !isDayShiftA
      }

      // For Night Shift - only show the active one
      if (dept.name === 'Night Shift A') {
        console.log(`${isNightShiftA ? '✅' : '❌'} ${dept.name}: Night Shift A (${isNightShiftA})`)
        return isNightShiftA
      }
      if (dept.name === 'Night Shift B') {
        console.log(
          `${!isNightShiftA ? '✅' : '❌'} ${dept.name}: Night Shift B (${!isNightShiftA})`,
        )
        return !isNightShiftA
      }

      // For PTS - only show the active one
      if (dept.name === 'PTS A') {
        console.log(`${isPTSA ? '✅' : '❌'} ${dept.name}: PTS A (${isPTSA})`)
        return isPTSA
      }
      if (dept.name === 'PTS B') {
        console.log(`${!isPTSA ? '✅' : '❌'} ${dept.name}: PTS B (${!isPTSA})`)
        return !isPTSA
      }
    }

    // For all other departments, show if they operate on this day
    console.log(`✅ ${dept.name}: operates on this day`)
    return true
  })

  console.log(
    `🎯 Showing ${filtered.length} departments: ${filtered.map((d) => d.name).join(', ')}`,
  )
  return filtered
})
</script>

<style scoped>
.daily-shift-view {
  max-width: var(--container-xl);
  margin: 0 auto;
}

.shift-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
}

.debug-info {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm);
  background: #f8f9fa;
  border-radius: var(--border-radius);
  font-size: 0.875rem;
}

.debug-details {
  margin-top: var(--spacing-sm);
}

.debug-item {
  margin: var(--spacing-xs) 0;
}

.debug-item .shown {
  color: #28a745;
  font-weight: 500;
}

.debug-item .hidden {
  color: #6c757d;
  text-decoration: line-through;
}

.shift-header h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 var(--spacing-sm) 0;
  color: var(--color-text);
}

.shift-subtitle {
  color: var(--color-text-muted);
  margin: 0;
}

.departments-grid {
  display: grid;
  gap: var(--spacing-lg);
  grid-template-columns: 1fr;
}

@container (min-width: 768px) {
  .departments-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
