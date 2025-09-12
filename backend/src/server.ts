import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { DatabaseService } from './database.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Porter routes
app.get('/api/porters', async (req, res) => {
  try {
    const porters = await DatabaseService.getPorters()
    res.json(porters)
  } catch (error) {
    console.error('Error fetching porters:', error)
    res.status(500).json({ error: 'Failed to fetch porters' })
  }
})

app.get('/api/porters/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const porter = await DatabaseService.getPorterById(id)
    if (!porter) {
      return res.status(404).json({ error: 'Porter not found' })
    }
    res.json(porter)
  } catch (error) {
    console.error('Error fetching porter:', error)
    res.status(500).json({ error: 'Failed to fetch porter' })
  }
})

app.post('/api/porters', async (req, res) => {
  try {
    const { name, employee_id, email, phone, role, qualifications } = req.body

    if (!name || !employee_id || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const porter = await DatabaseService.createPorter({
      name,
      employee_id,
      email,
      phone,
      role,
      qualifications,
    })

    res.status(201).json(porter)
  } catch (error) {
    console.error('Error creating porter:', error)
    res.status(500).json({ error: 'Failed to create porter' })
  }
})

app.put('/api/porters/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const updates = req.body

    await DatabaseService.updatePorter(id, updates)
    res.json({ message: 'Porter updated successfully' })
  } catch (error) {
    console.error('Error updating porter:', error)
    res.status(500).json({ error: 'Failed to update porter' })
  }
})

app.delete('/api/porters/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    await DatabaseService.deletePorter(id)
    res.json({ message: 'Porter deleted successfully' })
  } catch (error) {
    console.error('Error deleting porter:', error)
    res.status(500).json({ error: 'Failed to delete porter' })
  }
})

// Department routes
app.get('/api/departments', async (req, res) => {
  try {
    const departments = await DatabaseService.getDepartments()
    res.json(departments)
  } catch (error) {
    console.error('Error fetching departments:', error)
    res.status(500).json({ error: 'Failed to fetch departments' })
  }
})

app.get('/api/departments/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const department = await DatabaseService.getDepartmentById(id)
    if (!department) {
      return res.status(404).json({ error: 'Department not found' })
    }
    res.json(department)
  } catch (error) {
    console.error('Error fetching department:', error)
    res.status(500).json({ error: 'Failed to fetch department' })
  }
})

app.post('/api/departments', async (req, res) => {
  try {
    const { name, code, operating_hours, required_staff } = req.body

    if (!name || !code || !operating_hours || required_staff === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const department = await DatabaseService.createDepartment({
      name,
      code,
      operating_hours,
      required_staff,
    })

    res.status(201).json(department)
  } catch (error) {
    console.error('Error creating department:', error)
    res.status(500).json({ error: 'Failed to create department' })
  }
})

app.put('/api/departments/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const updates = req.body

    await DatabaseService.updateDepartment(id, updates)
    res.json({ message: 'Department updated successfully' })
  } catch (error) {
    console.error('Error updating department:', error)
    res.status(500).json({ error: 'Failed to update department' })
  }
})

app.delete('/api/departments/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    await DatabaseService.deleteDepartment(id)
    res.json({ message: 'Department deleted successfully' })
  } catch (error) {
    console.error('Error deleting department:', error)
    res.status(500).json({ error: 'Failed to delete department' })
  }
})

// Shift pattern routes
app.get('/api/shift-patterns', async (req, res) => {
  try {
    const shiftPatterns = await DatabaseService.getShiftPatterns()
    res.json(shiftPatterns)
  } catch (error) {
    console.error('Error fetching shift patterns:', error)
    res.status(500).json({ error: 'Failed to fetch shift patterns' })
  }
})

app.get('/api/shift-patterns/:id', async (req, res) => {
  try {
    const id = req.params.id
    const shiftPattern = await DatabaseService.getShiftPatternById(id)
    if (!shiftPattern) {
      return res.status(404).json({ error: 'Shift pattern not found' })
    }
    res.json(shiftPattern)
  } catch (error) {
    console.error('Error fetching shift pattern:', error)
    res.status(500).json({ error: 'Failed to fetch shift pattern' })
  }
})

app.post('/api/shift-patterns', async (req, res) => {
  try {
    const {
      id,
      name,
      description,
      start_time,
      end_time,
      rotation_type,
      rotation_days,
      offset_days,
      is_active,
    } = req.body

    if (
      !id ||
      !name ||
      !start_time ||
      !end_time ||
      !rotation_type ||
      rotation_days === undefined ||
      offset_days === undefined
    ) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const shiftPattern = await DatabaseService.createShiftPattern({
      id,
      name,
      description,
      start_time,
      end_time,
      rotation_type,
      rotation_days,
      offset_days,
      is_active,
    })

    res.status(201).json(shiftPattern)
  } catch (error) {
    console.error('Error creating shift pattern:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'Shift pattern with this ID already exists' })
    } else {
      res.status(500).json({ error: 'Failed to create shift pattern' })
    }
  }
})

app.put('/api/shift-patterns/:id', async (req, res) => {
  try {
    const id = req.params.id
    const updates = req.body

    await DatabaseService.updateShiftPattern(id, updates)
    res.json({ message: 'Shift pattern updated successfully' })
  } catch (error) {
    console.error('Error updating shift pattern:', error)
    res.status(500).json({ error: 'Failed to update shift pattern' })
  }
})

app.delete('/api/shift-patterns/:id', async (req, res) => {
  try {
    const id = req.params.id
    await DatabaseService.deleteShiftPattern(id)
    res.json({ message: 'Shift pattern deleted successfully' })
  } catch (error) {
    console.error('Error deleting shift pattern:', error)
    res.status(500).json({ error: 'Failed to delete shift pattern' })
  }
})

// Assignment routes
app.get('/api/assignments', async (req, res) => {
  try {
    const assignments = await DatabaseService.getAssignments()
    res.json(assignments)
  } catch (error) {
    console.error('Error fetching assignments:', error)
    res.status(500).json({ error: 'Failed to fetch assignments' })
  }
})

app.post('/api/assignments', async (req, res) => {
  try {
    const { porter_id, department_id, shift_pattern_id, start_date, end_date, is_permanent } =
      req.body

    if (
      !porter_id ||
      !department_id ||
      !shift_pattern_id ||
      !start_date ||
      is_permanent === undefined
    ) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const assignment = await DatabaseService.createAssignment({
      porter_id,
      department_id,
      shift_pattern_id,
      start_date,
      end_date,
      is_permanent,
    })

    res.status(201).json(assignment)
  } catch (error) {
    console.error('Error creating assignment:', error)
    res.status(500).json({ error: 'Failed to create assignment' })
  }
})

// Initialize database connection and start server
async function startServer() {
  try {
    console.log('🚀 Starting Rotas API server...')

    // Connect to database
    await DatabaseService.connect()
    console.log('✅ Database connected')

    // Start server
    app.listen(PORT, () => {
      console.log(`🌟 Server running on http://localhost:${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`📋 API endpoints: http://localhost:${PORT}/api/`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...')
  await DatabaseService.disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...')
  await DatabaseService.disconnect()
  process.exit(0)
})

startServer()
