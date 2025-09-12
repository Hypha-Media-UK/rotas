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
import { ShiftService } from '@/services/shiftService'
import { PorterService } from '@/services/porterService'
import { DepartmentServiceAPI } from '@/services/departmentServiceAPI'
import { calculateTotalHours } from '@/utils/timeUtils'
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

const assignments = ref<DailyAssignmentWithDetails[]>([])
const availableReliefPorters = ref<Porter[]>([])
const assignedPorters = ref<Porter[]>([])

const formattedDate = computed(() => {
  return format(parseISO(props.date), 'EEEE, MMMM d')
})

// Calculate table rows with porter assignments and absence status
const tableRows = computed((): DepartmentTableRow[] => {
  const rows: DepartmentTableRow[] = []

  // Get assigned porters for this department
  const deptAssignments = assignments.value.filter((a) => a.department_id === props.department.id)

  console.log(`🔍 Computing table rows for ${props.department.name}:`)
  console.log(`  - ${deptAssignments.length} daily assignments`)
  console.log(`  - ${assignedPorters.value.length} assigned porters`)

  if (deptAssignments.length === 0) {
    console.log(`  → Using assigned porters (no daily assignments)`)
    // If no assignments, show assigned porters from department
    assignedPorters.value.forEach((porter) => {
      if (porter.contracted_hours) {
        const totalHours = getPorterTotalHours(
          porter.contracted_hours,
          porter.break_duration_minutes,
        )
        const absenceInfo = getPorterAbsenceInfo(porter.id)

        rows.push({
          hours: porter.contracted_hours,
          total_hours: totalHours,
          allocated_porter: porter,
          cover_porter: undefined,
          is_porter_absent: absenceInfo.isAbsent,
          absence_type: absenceInfo.type,
          cover_porter_id: undefined,
        })
        console.log(`    + ${porter.name} (${porter.shift_group})`)
      }
    })
  } else {
    console.log(`  → Using daily assignments`)
    // Show actual daily assignments
    deptAssignments.forEach((assignment) => {
      if (assignment.porter) {
        const totalHours = getPorterTotalHours(
          assignment.porter.contracted_hours || '0800-2000',
          assignment.porter.break_duration_minutes,
        )
        const absenceInfo = getPorterAbsenceInfo(assignment.porter.id)

        rows.push({
          hours: assignment.porter.contracted_hours || '0800-2000',
          total_hours: totalHours,
          allocated_porter: assignment.porter,
          cover_porter: assignment.cover_porter,
          is_porter_absent: absenceInfo.isAbsent,
          absence_type: absenceInfo.type,
          cover_porter_id: assignment.cover_porter_id || undefined,
        })
        console.log(`    + ${assignment.porter.name} (${assignment.porter.shift_group})`)
      }
    })
  }

  console.log(`  → Final: ${rows.length} table rows`)
  return rows
})

// Use utility function for calculating total hours
const getPorterTotalHours = (contractedHours: string, breakMinutes: number): string => {
  return calculateTotalHours(contractedHours, breakMinutes)
}

// Check if porter is absent on the selected date
const getPorterAbsenceInfo = (porterId: number): { isAbsent: boolean; type?: AbsenceType } => {
  const absences = PorterService.getPorterAbsences(porterId, props.date, props.date)
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
    assignments.value = ShiftService.getDailyAssignments(props.date)
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
    availableReliefPorters.value = PorterService.getAvailablePorters(props.date, 'Relief')
    // TODO: Implement getAssignedPorters in API
    assignedPorters.value = [] // DepartmentServiceAPI.getAssignedPorters(props.department.id)
    console.log(
      `👥 Loaded ${assignedPorters.value.length} assigned porters for ${props.department.name}:`,
      assignedPorters.value.map((p) => p.name),
    )

    // Debug: Show permanent assignments for Ad-Hoc department
    if (props.department.name === 'Ad-Hoc') {
      // TODO: Implement getAllAssignments in API
      const allAssignments = [] // DepartmentServiceAPI.getAllAssignments()
      const adHocAssignments = allAssignments.filter((a) => a.department_id === props.department.id)
      console.log(`🔍 Ad-Hoc permanent assignments:`, adHocAssignments)
      console.log(`🔍 Ad-Hoc department ID:`, props.department.id)
    }
  } catch (error) {
    console.error('Failed to load porters:', error)
  }
}

// Watch for date changes
watch(
  () => props.date,
  () => {
    loadAssignments()
    loadAvailablePorters()
  },
)

onMounted(() => {
  loadAssignments()
  loadAvailablePorters()
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
