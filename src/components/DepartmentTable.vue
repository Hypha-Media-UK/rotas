<template>
  <div class="department-table-container">
    <div class="department-header">
      <h3>{{ department.name }}</h3>
      <span class="min-porters">Min: {{ department.min_porters_required }}</span>
    </div>

    <table class="department-table">
      <thead>
        <tr>
          <th>Hours</th>
          <th>Total Hours</th>
          <th>Allocated Porter</th>
          <th>Cover</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in tableRows" :key="index">
          <td>{{ row.hours }}</td>
          <td>{{ row.total_hours }}</td>
          <td
            :class="{
              'porter-sick': row.is_porter_absent && row.absence_type === 'sick',
              'porter-annual-leave': row.is_porter_absent && row.absence_type === 'annual_leave',
            }"
          >
            {{ row.allocated_porter?.name || '-' }}
          </td>
          <td>
            <select
              v-model="row.cover_porter_id"
              @change="updateCoverPorter(index, row.cover_porter_id)"
              class="cover-select"
            >
              <option value="">No Cover</option>
              <option v-for="porter in availableReliefPorters" :key="porter.id" :value="porter.id">
                {{ porter.name }}
              </option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Empty state for no assignments -->
    <div v-if="tableRows.length === 0" class="empty-assignments">
      <p>No assignments for this department on {{ formattedDate }}</p>
      <button @click="createDefaultAssignments" class="btn btn-sm btn-primary">
        Create Default Assignments
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'vue-router'
import { ShiftService } from '@/services/shiftService'
import { PorterServiceAPI } from '@/services/porterServiceAPI'
import { DepartmentServiceAPI } from '@/services/departmentServiceAPI'
import { ApiClient } from '@/services/apiClient'
import { calculateTotalHours } from '@/utils/timeUtils'
import { getPortersAssignedToDepartment } from '@/utils/assignmentUtils'
import type {
  Department,
  Porter,
  DailyAssignmentWithDetails,
  DepartmentTableRow,
  AbsenceType,
} from '@/types'

interface Props {
  department: Department
  date: string
}

const props = defineProps<Props>()
const router = useRouter()

const assignments = ref<DailyAssignmentWithDetails[]>([])
const availableReliefPorters = ref<Porter[]>([])
const assignedPorters = ref<Porter[]>([])

const formattedDate = computed(() => {
  return format(parseISO(props.date), 'EEEE, MMMM d')
})

// Calculate table rows based on porter availability and department operating hours
const tableRows = computed((): DepartmentTableRow[] => {
  const rows: DepartmentTableRow[] = []

  // Get the day of week for the selected date
  const dateObj = new Date(props.date)
  const dayOfWeek = dateObj.getDay()
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    dayOfWeek
  ]

  // Check if department operates on this day
  const departmentHours = props.department.operating_hours?.[dayName]
  if (!departmentHours) {
    console.log(`🚫 ${props.department.name} is closed on ${dayName}`)
    return rows
  }

  console.log(`🔍 Computing table rows for ${props.department.name} on ${dayName}:`)
  console.log(`  - Department hours: ${departmentHours.start} - ${departmentHours.end}`)

  // Find porters whose contracted hours overlap with department operating hours
  const availablePorters = assignedPorters.value.filter((porter) => {
    if (!porter.contracted_hours || !porter.is_active) return false

    const porterHours = porter.contracted_hours[dayName]
    if (!porterHours) {
      console.log(`  ❌ ${porter.name}: not working on ${dayName}`)
      return false
    }

    // Check if porter's hours overlap with department hours
    const porterStart = porterHours.start
    const porterEnd = porterHours.end
    const deptStart = departmentHours.start
    const deptEnd = departmentHours.end

    // Simple overlap check (assuming no midnight crossover for now)
    const hasOverlap = porterStart < deptEnd && porterEnd > deptStart

    if (hasOverlap) {
      console.log(
        `  ✅ ${porter.name}: ${porterStart}-${porterEnd} overlaps with ${deptStart}-${deptEnd}`,
      )
      return true
    } else {
      console.log(
        `  ❌ ${porter.name}: ${porterStart}-${porterEnd} no overlap with ${deptStart}-${deptEnd}`,
      )
      return false
    }
  })

  console.log(`  → Found ${availablePorters.length} available porters`)

  // Create rows for available porters
  availablePorters.forEach((porter) => {
    const porterHours = porter.contracted_hours![dayName]!
    const totalHours = calculatePorterDailyHours(porterHours, porter.break_duration_minutes)
    const absenceInfo = getPorterAbsenceInfo(porter.id)

    rows.push({
      hours: `${porterHours.start} - ${porterHours.end}`,
      total_hours: totalHours,
      allocated_porter: porter,
      cover_porter: undefined,
      is_porter_absent: absenceInfo.isAbsent,
      absence_type: absenceInfo.type,
      cover_porter_id: undefined,
    })
    console.log(`    + ${porter.name}: ${porterHours.start}-${porterHours.end} (${totalHours}h)`)
  })

  // If no porters available, show empty row for minimum required staff
  if (rows.length === 0) {
    for (let i = 0; i < props.department.min_porters_required; i++) {
      rows.push({
        hours: `${departmentHours.start} - ${departmentHours.end}`,
        total_hours: calculateDepartmentDailyHours(departmentHours),
        allocated_porter: undefined,
        cover_porter: undefined,
        is_porter_absent: false,
        cover_porter_id: undefined,
      })
    }
    console.log(`  → Added ${props.department.min_porters_required} empty slots`)
  }

  console.log(`  → Final: ${rows.length} table rows`)
  return rows
})

// Helper function to calculate daily hours for a porter
const calculatePorterDailyHours = (
  hours: { start: string; end: string },
  breakMinutes: number,
): number => {
  const [startHour, startMin] = hours.start.split(':').map(Number)
  const [endHour, endMin] = hours.end.split(':').map(Number)

  let totalMinutes
  if (endHour < startHour) {
    // Night shift crossing midnight
    totalMinutes = 24 * 60 - (startHour * 60 + startMin) + (endHour * 60 + endMin)
  } else {
    totalMinutes = endHour * 60 + endMin - (startHour * 60 + startMin)
  }

  const workingMinutes = totalMinutes - breakMinutes
  return Math.max(0, workingMinutes / 60)
}

// Helper function to calculate department daily hours
const calculateDepartmentDailyHours = (hours: { start: string; end: string }): number => {
  const [startHour, startMin] = hours.start.split(':').map(Number)
  const [endHour, endMin] = hours.end.split(':').map(Number)

  let totalMinutes
  if (endHour < startHour) {
    // 24-hour operation crossing midnight
    totalMinutes = 24 * 60 - (startHour * 60 + startMin) + (endHour * 60 + endMin)
  } else {
    totalMinutes = endHour * 60 + endMin - (startHour * 60 + startMin)
  }

  return totalMinutes / 60
}

// Check if porter is absent on the selected date
const getPorterAbsenceInfo = (porterId: number): { isAbsent: boolean; type?: AbsenceType } => {
  // TODO: Implement getPorterAbsences in API - for now return no absences
  // const absences = PorterServiceAPI.getPorterAbsences(porterId, props.date, props.date)
  const absences: any[] = [] // Temporary until API is implemented
  if (absences.length > 0) {
    return { isAbsent: true, type: absences[0].type }
  }
  return { isAbsent: false }
}

// Update cover porter assignment
const updateCoverPorter = async (rowIndex: number, coverPorterId: string | undefined) => {
  const row = tableRows.value[rowIndex]
  if (!row.allocated_porter) return

  try {
    // Find existing assignment or create new one
    const existingAssignment = assignments.value.find(
      (a) => a.department_id === props.department.id && a.porter_id === row.allocated_porter?.id,
    )

    if (existingAssignment) {
      // Update existing assignment
      await ShiftService.setDailyAssignment(
        props.date,
        props.department.id,
        existingAssignment.porter_id,
        coverPorterId ? parseInt(coverPorterId) : undefined,
        'day', // Default to day shift for now
      )
    } else {
      // Create new assignment
      await ShiftService.setDailyAssignment(
        props.date,
        props.department.id,
        row.allocated_porter.id,
        coverPorterId ? parseInt(coverPorterId) : undefined,
        'day',
      )
    }

    // Reload assignments
    await loadAssignments()
  } catch (error) {
    console.error('Failed to update cover porter:', error)
  }
}

// Create default assignments for this department
const createDefaultAssignments = async () => {
  try {
    for (const porter of assignedPorters.value) {
      await ShiftService.setDailyAssignment(
        props.date,
        props.department.id,
        porter.id,
        undefined,
        'day',
      )
    }
    await loadAssignments()
  } catch (error) {
    console.error('Failed to create default assignments:', error)
  }
}

// Load data
const loadAssignments = async () => {
  try {
    console.log(
      `🔄 Loading assignments for ${props.department.name} (ID: ${props.department.id}) on ${props.date}`,
    )
    assignments.value = await ShiftService.getDailyAssignments(props.date)
    console.log(`📋 Loaded ${assignments.value.length} assignments for ${props.date}`)

    // Filter for this department
    const deptAssignments = assignments.value.filter((a) => a.department_id === props.department.id)
    console.log(`🎯 Found ${deptAssignments.length} assignments for ${props.department.name}`)

    // Debug: Show all assignments for Ad-Hoc department
    if (props.department.name === 'Ad-Hoc') {
      console.log(`🔍 Ad-Hoc department assignments:`, deptAssignments)
      console.log(
        `🔍 All assignments for debugging:`,
        assignments.value.map((a) => ({
          porter_id: a.porter_id,
          department_id: a.department_id,
          department_name: a.department_name || 'Unknown',
        })),
      )
    }
  } catch (error) {
    console.error('Failed to load assignments:', error)
  }
}

const loadAvailablePorters = async () => {
  try {
    // Get all porters and assignments
    const [allPorters, allAssignments] = await Promise.all([
      PorterServiceAPI.getAllPorters(),
      ApiClient.getAssignments(), // Get all assignments
    ])

    // Filter relief porters for cover options
    availableReliefPorters.value = allPorters.filter((p) => p.type === 'Relief' && p.is_active)

    // Find porters assigned to this department using MOST RECENT assignment logic
    const assignedPorterIds = getPortersAssignedToDepartment(allAssignments, props.department.id)

    assignedPorters.value = allPorters.filter(
      (p) => assignedPorterIds.includes(p.id) && p.is_active,
    )

    console.log(
      `👥 Loaded ${assignedPorters.value.length} assigned porters for ${props.department.name}:`,
      assignedPorters.value.map((p) => p.name),
    )
    console.log(`🔄 Loaded ${availableReliefPorters.value.length} relief porters for cover`)
  } catch (error) {
    console.error('Failed to load porters:', error)
    // Fallback: use all active porters if assignment loading fails
    try {
      const allPorters = await PorterServiceAPI.getAllPorters()
      assignedPorters.value = allPorters.filter((p) => p.is_active)
      availableReliefPorters.value = allPorters.filter((p) => p.type === 'Relief' && p.is_active)
    } catch (fallbackError) {
      console.error('Failed to load fallback porters:', fallbackError)
    }
  }
}

// Refresh all data
const refreshData = async () => {
  console.log(`🔄 Refreshing data for ${props.department.name}`)
  await Promise.all([loadAssignments(), loadAvailablePorters()])
}

// Watch for date changes
watch(
  () => props.date,
  () => {
    refreshData()
  },
)

// Watch for route changes to refresh data when navigating back to home
watch(
  () => router.currentRoute.value.path,
  (newPath, oldPath) => {
    // If we're navigating to the home page from another page, refresh data
    if (newPath === '/' && oldPath !== '/') {
      console.log(`🔄 Navigated back to home from ${oldPath}, refreshing data`)
      setTimeout(() => refreshData(), 100) // Small delay to ensure component is ready
    }
  },
)

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.department-table-container {
  width: 100%;
}

.department-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.department-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.min-porters {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  background: var(--color-surface);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.department-table {
  width: 100%;
  border-collapse: collapse;
}

.department-table th {
  background-color: var(--color-surface);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding: var(--spacing-sm);
  text-align: left;
  border-bottom: 2px solid var(--color-border);
}

.department-table td {
  padding: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.cover-select {
  width: 100%;
  padding: var(--spacing-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 0.875rem;
  background: white;
}

.cover-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.empty-assignments {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}

.empty-assignments p {
  margin: 0 0 var(--spacing-md) 0;
}

/* Absence indicators */
.porter-sick {
  background-color: var(--color-sick) !important;
  color: white !important;
  font-weight: 600;
}

.porter-annual-leave {
  background-color: var(--color-annual-leave) !important;
  color: white !important;
  font-weight: 600;
}
</style>
