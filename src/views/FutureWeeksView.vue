<template>
  <div class="future-weeks-view">
    <div class="page-header">
      <h1>Future Weeks</h1>
      <p>Manage shifts up to 12 months in advance</p>
    </div>

    <!-- Month Navigation -->
    <div class="month-navigation">
      <button @click="previousMonth" class="btn btn-secondary">
        ← Previous
      </button>
      <h2>{{ currentMonthYear }}</h2>
      <button @click="nextMonth" class="btn btn-secondary">
        Next →
      </button>
    </div>

    <!-- Calendar Grid -->
    <div class="calendar-container">
      <div class="calendar-header">
        <div class="day-header">Mon</div>
        <div class="day-header">Tue</div>
        <div class="day-header">Wed</div>
        <div class="day-header">Thu</div>
        <div class="day-header">Fri</div>
        <div class="day-header">Sat</div>
        <div class="day-header">Sun</div>
      </div>
      
      <div class="calendar-grid">
        <div
          v-for="day in calendarDays"
          :key="day.dateString"
          class="calendar-day"
          :class="{
            'other-month': !day.isCurrentMonth,
            'today': day.isToday,
            'selected': day.isSelected
          }"
          @click="selectDay(day)"
        >
          <div class="day-number">{{ day.dayNumber }}</div>
          <div class="shift-indicators">
            <div
              v-for="shift in day.shifts"
              :key="shift.shift_group"
              class="shift-indicator"
              :class="{
                'working': shift.is_working,
                'day-shift': shift.shift_type === 'day',
                'night-shift': shift.shift_type === 'night'
              }"
              :title="`${shift.shift_group}: ${shift.is_working ? 'Working' : 'Off'}`"
            >
              {{ getShiftAbbreviation(shift.shift_group) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Day Details -->
    <div v-if="selectedDay" class="day-details">
      <h3>{{ selectedDay.formattedDate }}</h3>
      
      <div class="shift-details">
        <div
          v-for="shift in selectedDay.shifts"
          :key="shift.shift_group"
          class="shift-detail-card"
          :class="{
            'working': shift.is_working,
            'off-duty': !shift.is_working
          }"
        >
          <div class="shift-header">
            <h4>{{ shift.shift_group }}</h4>
            <span class="shift-status">
              {{ shift.is_working ? 'Working' : 'Off Duty' }}
            </span>
          </div>
          <div class="shift-info">
            <span>Type: {{ shift.shift_type === 'day' ? 'Day' : 'Night' }}</span>
            <span>Cycle Day: {{ shift.cycle_day }}/8</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!selectedDay" class="empty-state">
      <h3>Select a Date</h3>
      <p>Click on a date in the calendar to view shift details and make assignments.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths,
  isToday,
  isSameMonth,
  parseISO
} from 'date-fns'
import { ShiftService } from '@/services/shiftService'

interface CalendarDay {
  date: Date
  dateString: string
  dayNumber: string
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  formattedDate: string
  shifts: any[]
}

const currentMonth = ref(new Date())
const selectedDay = ref<CalendarDay | null>(null)

const currentMonthYear = computed(() => {
  return format(currentMonth.value, 'MMMM yyyy')
})

const calendarDays = computed((): CalendarDay[] => {
  const monthStart = startOfMonth(currentMonth.value)
  const monthEnd = endOfMonth(currentMonth.value)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: CalendarDay[] = []
  let currentDate = calendarStart

  while (currentDate <= calendarEnd) {
    const dateString = format(currentDate, 'yyyy-MM-dd')
    const shifts = getShiftsForDate(dateString)
    
    days.push({
      date: new Date(currentDate),
      dateString,
      dayNumber: format(currentDate, 'd'),
      isCurrentMonth: isSameMonth(currentDate, currentMonth.value),
      isToday: isToday(currentDate),
      isSelected: selectedDay.value?.dateString === dateString,
      formattedDate: format(currentDate, 'EEEE, MMMM d, yyyy'),
      shifts
    })

    currentDate = addDays(currentDate, 1)
  }

  return days
})

const getShiftsForDate = (dateString: string) => {
  const shiftGroups = ['Day Shift One', 'Day Shift Two', 'Night Shift One', 'Night Shift Two']
  
  return shiftGroups.map(group => {
    try {
      const shiftStatus = ShiftService.calculateShiftStatus(group, dateString)
      return {
        shift_group: group,
        is_working: shiftStatus.is_working,
        shift_type: shiftStatus.shift_type,
        cycle_day: shiftStatus.cycle_day
      }
    } catch (error) {
      return {
        shift_group: group,
        is_working: false,
        shift_type: 'day',
        cycle_day: 1
      }
    }
  })
}

const getShiftAbbreviation = (shiftGroup: string): string => {
  const abbreviations: { [key: string]: string } = {
    'Day Shift One': 'D1',
    'Day Shift Two': 'D2',
    'Night Shift One': 'N1',
    'Night Shift Two': 'N2'
  }
  return abbreviations[shiftGroup] || 'XX'
}

const selectDay = (day: CalendarDay) => {
  selectedDay.value = day
}

const previousMonth = () => {
  currentMonth.value = subMonths(currentMonth.value, 1)
  selectedDay.value = null
}

const nextMonth = () => {
  currentMonth.value = addMonths(currentMonth.value, 1)
  selectedDay.value = null
}

onMounted(() => {
  // Initialize shift patterns if not already done
  try {
    ShiftService.initializeShiftPatterns()
  } catch (error) {
    console.error('Failed to initialize shift patterns:', error)
  }
})
</script>

<style scoped>
.future-weeks-view {
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
}

.page-header p {
  color: var(--color-text-muted);
  margin: 0;
}

.month-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  padding: 0 var(--spacing-md);
}

.month-navigation h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.calendar-container {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  margin-bottom: var(--spacing-xl);
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.day-header {
  padding: var(--spacing-md);
  text-align: center;
  font-weight: 600;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-day {
  min-height: 120px;
  padding: var(--spacing-sm);
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  flex-direction: column;
}

.calendar-day:hover {
  background-color: var(--color-surface);
}

.calendar-day.other-month {
  color: var(--color-text-muted);
  background-color: rgba(0, 0, 0, 0.02);
}

.calendar-day.today {
  background-color: rgba(37, 99, 235, 0.1);
  border: 2px solid var(--color-primary);
}

.calendar-day.selected {
  background-color: var(--color-primary);
  color: white;
}

.day-number {
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.shift-indicators {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  flex: 1;
}

.shift-indicator {
  font-size: 0.625rem;
  padding: 2px 4px;
  border-radius: 3px;
  text-align: center;
  font-weight: 600;
  background: var(--color-border);
  color: var(--color-text-muted);
}

.shift-indicator.working {
  background: var(--color-success);
  color: white;
}

.shift-indicator.day-shift.working {
  background: var(--color-warning);
  color: white;
}

.shift-indicator.night-shift.working {
  background: var(--color-primary);
  color: white;
}

.day-details {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
}

.day-details h3 {
  margin: 0 0 var(--spacing-lg) 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.shift-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-md);
}

.shift-detail-card {
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
}

.shift-detail-card.working {
  border-color: var(--color-success);
  background: rgba(5, 150, 105, 0.05);
}

.shift-detail-card.off-duty {
  border-color: var(--color-border);
  background: var(--color-surface);
}

.shift-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.shift-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.shift-status {
  font-size: 0.75rem;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  font-weight: 600;
}

.shift-detail-card.working .shift-status {
  background: var(--color-success);
  color: white;
}

.shift-detail-card.off-duty .shift-status {
  background: var(--color-border);
  color: var(--color-text-muted);
}

.shift-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: 0.875rem;
  color: var(--color-text-muted);
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
  margin: 0;
  color: var(--color-text-muted);
}

@container (max-width: 768px) {
  .calendar-day {
    min-height: 80px;
  }
  
  .shift-indicators {
    grid-template-columns: 1fr;
  }
  
  .shift-details {
    grid-template-columns: 1fr;
  }
}
</style>
