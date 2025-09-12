import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { PorterServiceAPI } from './services/porterServiceAPI'
import { DepartmentServiceAPI } from './services/departmentServiceAPI'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Initialize application with API backend
async function initializeApp() {
  try {
    console.log('🚀 Initializing application with API backend...')

    // Test API connection by fetching data
    const porters = await PorterServiceAPI.getAllPorters()
    const departments = await DepartmentServiceAPI.getAllDepartments()

    console.log(
      `📊 Loaded ${porters.length} porters and ${departments.length} departments from API`,
    )
    console.log('✅ Application initialized successfully with API backend')
  } catch (error) {
    console.error('❌ Failed to initialize application:', error)
    console.log('⚠️  Application will continue but may have limited functionality')
  }
}

// Initialize app and mount
initializeApp()
  .then(() => {
    app.mount('#app')
  })
  .catch((error) => {
    console.error('Failed to initialize app:', error)
    // Mount anyway to show error state
    app.mount('#app')
  })
