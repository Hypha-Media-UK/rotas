<template>
  <div class="mysql-test-view">
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold mb-8">MySQL Database Test</h1>
      
      <!-- Connection Status -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Connection Status</h2>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center space-x-2">
            <div :class="connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'" 
                 class="w-3 h-3 rounded-full"></div>
            <span :class="connectionStatus.connected ? 'text-green-700' : 'text-red-700'" 
                  class="font-medium">
              {{ connectionStatus.connected ? 'Connected' : 'Disconnected' }}
            </span>
          </div>
          <p class="text-gray-600 mt-2">{{ connectionStatus.message }}</p>
        </div>
      </div>

      <!-- Data Summary -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Data Summary</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-medium text-gray-900">Porters</h3>
            <p class="text-3xl font-bold text-blue-600">{{ dataSummary.porters }}</p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-medium text-gray-900">Departments</h3>
            <p class="text-3xl font-bold text-green-600">{{ dataSummary.departments }}</p>
          </div>
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-medium text-gray-900">Assignments</h3>
            <p class="text-3xl font-bold text-purple-600">{{ dataSummary.assignments }}</p>
          </div>
        </div>
      </div>

      <!-- Test Operations -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Test Operations</h2>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="space-y-4">
            <button @click="testConnection" 
                    :disabled="loading"
                    class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded">
              {{ loading ? 'Testing...' : 'Test Connection' }}
            </button>
            
            <button @click="loadData" 
                    :disabled="loading"
                    class="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded ml-2">
              {{ loading ? 'Loading...' : 'Load Data' }}
            </button>
            
            <button @click="testCRUD" 
                    :disabled="loading"
                    class="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded ml-2">
              {{ loading ? 'Testing...' : 'Test CRUD Operations' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Test Results -->
      <div v-if="testResults.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Test Results</h2>
        <div class="bg-white rounded-lg shadow p-6">
          <div class="space-y-2">
            <div v-for="(result, index) in testResults" :key="index" 
                 class="flex items-center space-x-2">
              <div :class="result.success ? 'bg-green-500' : 'bg-red-500'" 
                   class="w-2 h-2 rounded-full"></div>
              <span :class="result.success ? 'text-green-700' : 'text-red-700'">
                {{ result.message }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sample Data -->
      <div v-if="sampleData.porters.length > 0">
        <h2 class="text-xl font-semibold mb-4">Sample Data</h2>
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-medium mb-2">Porters</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full table-auto">
              <thead>
                <tr class="bg-gray-50">
                  <th class="px-4 py-2 text-left">ID</th>
                  <th class="px-4 py-2 text-left">Name</th>
                  <th class="px-4 py-2 text-left">Type</th>
                  <th class="px-4 py-2 text-left">Shift Group</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="porter in sampleData.porters.slice(0, 5)" :key="porter.id" 
                    class="border-t">
                  <td class="px-4 py-2">{{ porter.id }}</td>
                  <td class="px-4 py-2">{{ porter.name }}</td>
                  <td class="px-4 py-2">{{ porter.type }}</td>
                  <td class="px-4 py-2">{{ porter.shift_group || 'N/A' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MySQLDatabaseService } from '@/services/mysqlDatabase'
import { PorterServiceMySQL } from '@/services/porterServiceMySQL'
import { DepartmentServiceMySQL } from '@/services/departmentServiceMySQL'
import type { Porter, Department, PorterDepartmentAssignment } from '@/types'

// Reactive state
const loading = ref(false)
const connectionStatus = ref({
  connected: false,
  message: 'Not tested'
})

const dataSummary = ref({
  porters: 0,
  departments: 0,
  assignments: 0
})

const testResults = ref<Array<{ success: boolean; message: string }>>([])

const sampleData = ref({
  porters: [] as Porter[],
  departments: [] as Department[],
  assignments: [] as PorterDepartmentAssignment[]
})

// Test connection
const testConnection = async () => {
  loading.value = true
  testResults.value = []
  
  try {
    await MySQLDatabaseService.connect()
    connectionStatus.value = {
      connected: true,
      message: 'Successfully connected to MySQL database'
    }
    addTestResult(true, 'Database connection successful')
  } catch (error) {
    connectionStatus.value = {
      connected: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
    addTestResult(false, `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    loading.value = false
  }
}

// Load data
const loadData = async () => {
  loading.value = true
  
  try {
    const [porters, departments, assignments] = await Promise.all([
      PorterServiceMySQL.getAllPorters(),
      DepartmentServiceMySQL.getAllDepartments(),
      MySQLDatabaseService.getAssignments()
    ])
    
    sampleData.value = { porters, departments, assignments }
    dataSummary.value = {
      porters: porters.length,
      departments: departments.length,
      assignments: assignments.length
    }
    
    addTestResult(true, `Loaded ${porters.length} porters, ${departments.length} departments, ${assignments.length} assignments`)
  } catch (error) {
    addTestResult(false, `Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    loading.value = false
  }
}

// Test CRUD operations
const testCRUD = async () => {
  loading.value = true
  
  try {
    // Test creating a porter
    const testPorter = await PorterServiceMySQL.createPorter({
      name: 'Test Porter MySQL',
      type: 'Regular',
      break_duration_minutes: 30,
      department_assignments: []
    })
    addTestResult(true, `Created test porter with ID: ${testPorter.id}`)
    
    // Test updating the porter
    await PorterServiceMySQL.updatePorter(testPorter.id, { name: 'Updated Test Porter' })
    addTestResult(true, 'Updated test porter successfully')
    
    // Test deleting the porter
    await PorterServiceMySQL.deletePorter(testPorter.id)
    addTestResult(true, 'Deleted test porter successfully')
    
    addTestResult(true, 'All CRUD operations completed successfully')
  } catch (error) {
    addTestResult(false, `CRUD test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    loading.value = false
  }
}

// Helper function to add test results
const addTestResult = (success: boolean, message: string) => {
  testResults.value.push({ success, message })
}

// Initialize on mount
onMounted(async () => {
  await testConnection()
  if (connectionStatus.value.connected) {
    await loadData()
  }
})
</script>

<style scoped>
.mysql-test-view {
  min-height: 100vh;
  background-color: #f3f4f6;
}
</style>
