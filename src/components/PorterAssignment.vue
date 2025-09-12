<template>
  <div class="porter-assignment">
    <div class="assignment-header">
      <h4>Assign Porters to {{ department.name }}</h4>
      <div class="department-info">
        <span class="department-type">{{ formatDepartmentType(department.department_type) }}</span>
        <span class="operating-schedule">{{ formatOperatingSchedule(department) }}</span>
      </div>
      <p class="text-muted">Select porters to assign to this department</p>
    </div>

    <!-- Search Bar -->
    <div class="search-container">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search porters by name, type, or shift group..."
        class="search-input"
      />
      <span class="search-icon">🔍</span>
    </div>

    <!-- Bulk Actions -->
    <div class="bulk-actions">
      <button
        @click="selectAll"
        class="btn btn-sm btn-secondary"
        :disabled="filteredPorters.length === 0"
      >
        Select All
      </button>
      <button
        @click="deselectAll"
        class="btn btn-sm btn-secondary"
        :disabled="selectedPorterIds.size === 0"
      >
        Deselect All
      </button>
      <button @click="saveAssignments" class="btn btn-primary" :disabled="!hasChanges">
        Save Changes ({{ selectedPorterIds.size }} selected)
      </button>
    </div>

    <!-- Porter List -->
    <div class="porter-list">
      <div
        v-for="porter in filteredPorters"
        :key="porter.id"
        class="porter-item"
        :class="{ selected: selectedPorterIds.has(porter.id) }"
      >
        <label class="porter-checkbox">
          <input
            type="checkbox"
            :checked="selectedPorterIds.has(porter.id)"
            @change="togglePorter(porter.id)"
          />
          <span class="checkmark"></span>
        </label>

        <div class="porter-info">
          <div class="porter-name">{{ porter.name }}</div>
          <div class="porter-details">
            <span class="porter-type">{{ porter.type }}</span>
            <span v-if="porter.shift_group" class="shift-group">{{ porter.shift_group }}</span>
          </div>
        </div>

        <div class="assignment-status">
          <span v-if="isCurrentlyAssigned(porter.id)" class="status-badge assigned">
            Currently Assigned
          </span>
          <span v-else class="status-badge available"> Available </span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-if="filteredPorters.length === 0 && searchQuery === ''"
      title="No Porters Available"
      description="No porters found in the system"
      icon="👥"
    />
    <EmptyState
      v-else-if="filteredPorters.length === 0 && searchQuery !== ''"
      title="No Matching Porters"
      :description="`No porters match '${searchQuery}'`"
      icon="🔍"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import EmptyState from './EmptyState.vue'
import { PorterService } from '@/services/porterService'
import { DepartmentService } from '@/services/departmentService'
import { PorterAssignmentService } from '@/services/porterAssignmentService'
import type { Porter, Department } from '@/types'

interface Props {
  department: Department
}

interface Emits {
  (e: 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const allPorters = ref<Porter[]>([])
const assignedPorters = ref<Porter[]>([])
const searchQuery = ref('')
const selectedPorterIds = ref<Set<number>>(new Set())

// All porters with search filtering
const filteredPorters = computed(() => {
  if (!searchQuery.value.trim()) {
    return allPorters.value
  }

  const query = searchQuery.value.toLowerCase().trim()
  return allPorters.value.filter(
    (porter) =>
      porter.name.toLowerCase().includes(query) ||
      porter.type.toLowerCase().includes(query) ||
      (porter.shift_group && porter.shift_group.toLowerCase().includes(query)),
  )
})

// Check if porter is currently assigned to this department
const isCurrentlyAssigned = (porterId: number): boolean => {
  return assignedPorters.value.some((p) => p.id === porterId)
}

// Check if there are any changes to save
const hasChanges = computed(() => {
  const currentlyAssignedIds = new Set(assignedPorters.value.map((p) => p.id))

  // Check if any selected porter is not currently assigned
  for (const id of selectedPorterIds.value) {
    if (!currentlyAssignedIds.has(id)) {
      return true
    }
  }

  // Check if any currently assigned porter is not selected
  for (const id of currentlyAssignedIds) {
    if (!selectedPorterIds.value.has(id)) {
      return true
    }
  }

  return false
})

const loadPorters = () => {
  // Use smart assignment service to get department-appropriate porters
  allPorters.value = PorterAssignmentService.getAvailablePortersForDepartment(
    props.department.id,
    new Date().toISOString().split('T')[0], // Today's date
  )

  assignedPorters.value = DepartmentService.getAssignedPorters(props.department.id)

  // Add assigned porters to the all porters list if they're not already there
  // (This handles cases where assigned porters might not be in the "available" list)
  const allPorterIds = new Set(allPorters.value.map((p) => p.id))
  assignedPorters.value.forEach((porter) => {
    if (!allPorterIds.has(porter.id)) {
      allPorters.value.push(porter)
    }
  })

  // Initialize selected porters with currently assigned ones
  selectedPorterIds.value = new Set(assignedPorters.value.map((p) => p.id))
}

// Toggle porter selection
const togglePorter = (porterId: number) => {
  if (selectedPorterIds.value.has(porterId)) {
    selectedPorterIds.value.delete(porterId)
  } else {
    selectedPorterIds.value.add(porterId)
  }
}

// Select all filtered porters
const selectAll = () => {
  filteredPorters.value.forEach((porter) => {
    selectedPorterIds.value.add(porter.id)
  })
}

// Deselect all porters
const deselectAll = () => {
  selectedPorterIds.value.clear()
}

// Save assignment changes
const saveAssignments = () => {
  const currentlyAssignedIds = new Set(assignedPorters.value.map((p) => p.id))

  // Remove porters that are currently assigned but not selected
  for (const porterId of currentlyAssignedIds) {
    if (!selectedPorterIds.value.has(porterId)) {
      DepartmentService.removePorterFromDepartment(porterId, props.department.id)
    }
  }

  // Add porters that are selected but not currently assigned
  for (const porterId of selectedPorterIds.value) {
    if (!currentlyAssignedIds.has(porterId)) {
      console.log(
        `🏢 PorterAssignment: Assigning porter ${porterId} to department ${props.department.id}`,
      )
      console.log(
        `🏢 PorterAssignment: Porter ID type: ${typeof porterId}, Department ID type: ${typeof props.department.id}`,
      )
      const success = DepartmentService.assignPorterToDepartment(porterId, props.department.id)
      console.log(`🏢 PorterAssignment: Assignment result: ${success}`)
    }
  }

  // Reload data and emit events
  loadPorters()
  emit('updated')
}

// Format department type for display
const formatDepartmentType = (type: string): string => {
  const typeMap: Record<string, string> = {
    shift_rotation: 'Shift Rotation',
    relief: 'Relief',
    emergency_24h: 'Emergency 24h',
    standard_hours: 'Standard Hours',
    on_demand: 'On Demand',
  }
  return typeMap[type] || type
}

// Format operating schedule for display
const formatOperatingSchedule = (department: Department): string => {
  return DepartmentService.formatOperatingSchedule(department)
}

onMounted(() => {
  loadPorters()
})
</script>

<style scoped>
.porter-assignment {
  padding: var(--spacing-lg);
}

.assignment-header {
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.assignment-header h4 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.department-info {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  justify-content: center;
  flex-wrap: wrap;
}

.department-type {
  background: var(--color-primary);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  font-size: 0.75rem;
  font-weight: 500;
}

.operating-schedule {
  background: var(--color-background-soft);
  color: var(--color-text-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  font-size: 0.75rem;
  border: 1px solid var(--color-border);
}

.text-muted {
  color: var(--color-text-muted);
  margin: 0;
}

.bulk-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin: var(--spacing-lg) 0;
  padding: var(--spacing-md);
  background: var(--color-background);
  border-radius: var(--border-radius);
  border: 1px solid var(--color-border);
}

.search-container {
  position: relative;
  margin: var(--spacing-lg) 0;
}

.search-input {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg) var(--spacing-md) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  font-size: 1rem;
  background: white;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.search-icon {
  position: absolute;
  right: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.porter-list {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: white;
}

.porter-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.2s ease;
}

.porter-item:last-child {
  border-bottom: none;
}

.porter-item:hover {
  background: var(--color-background);
}

.porter-item.selected {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.porter-checkbox {
  display: flex;
  align-items: center;
  margin-right: var(--spacing-md);
  cursor: pointer;
}

.porter-checkbox input[type='checkbox'] {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.porter-checkbox input[type='checkbox']:checked + .checkmark {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.porter-checkbox input[type='checkbox']:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.porter-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.porter-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 1rem;
}

.porter-details {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.porter-type {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  background: var(--color-background);
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

.shift-group {
  font-size: 0.75rem;
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

.assignment-status {
  margin-left: var(--spacing-md);
}

.status-badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.assigned {
  background: var(--color-success-light);
  color: var(--color-success);
}

.status-badge.available {
  background: var(--color-background);
  color: var(--color-text-muted);
}
</style>
