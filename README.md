# Staff Rotas Application

A Vue.js application for managing hospital staff rotas with MySQL database backend.

## 🏗️ Architecture

- **Frontend**: Vue.js 3 + TypeScript + Vite (Port 5174)
- **Backend**: Node.js + Express.js + TypeScript (Port 3001)
- **Database**: MySQL 8.0 in Docker (Port 3308)
- **State Management**: Pinia

## 📋 Prerequisites

- **Node.js**: 20+ or 22+
- **Docker**: Latest version with Docker Compose
- **Package Manager**: npm (included with Node.js)

## 🚀 Quick Start Guide

### 1. Initial Setup (First Time Only)

```bash
# Clone or navigate to the project directory
cd /path/to/rotas

# Start MySQL database (will download image if needed)
docker-compose up -d

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

### 2. Start the Application

**Option A: Start Everything at Once (Recommended)**
```bash
npm run dev:full
```

**Option B: Start Services Individually**
```bash
# Terminal 1: Start backend API
npm run dev:backend

# Terminal 2: Start frontend
npm run dev
```

### 3. Access the Application

- **🌐 Frontend Application**: http://localhost:5174
- **🔌 Backend API**: http://localhost:3001/api
- **❤️ Health Check**: http://localhost:3001/health
- **📊 Database**: localhost:3308 (MySQL)

## 🛠️ Development Commands

### Frontend Commands
```bash
npm run dev          # Start frontend development server
npm run build        # Build frontend for production
npm run preview      # Preview production build
npm run type-check   # Run TypeScript type checking
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Backend Commands
```bash
npm run dev:backend     # Start backend development server
npm run build:backend   # Build backend for production
```

### Full Stack Commands
```bash
npm run dev:full     # Start both frontend and backend
npm run build:full   # Build both frontend and backend
```

## 🧪 Testing the Application

### 1. Verify Database Connection
```bash
# Check if MySQL container is running
docker ps

# Test database connection
docker exec rota-track-mysql mysql -u rota_user -prota_password rota_track -e "SELECT COUNT(*) FROM porters;"
```

### 2. Test API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Get all porters
curl http://localhost:3001/api/porters

# Get all departments
curl http://localhost:3001/api/departments

# Get shift patterns
curl http://localhost:3001/api/shift-patterns
```

### 3. Test Frontend Features
1. **Navigate to**: http://localhost:5174
2. **Check Console**: Open browser dev tools and verify no errors
3. **Test Navigation**: Click through different sections (Staff, Departments, etc.)
4. **Test Data Loading**: Verify porters and departments load from API
5. **Test CRUD Operations**: Try adding/editing porters or departments

## 📊 Database Information

### Connection Details
- **Host**: localhost
- **Port**: 3308
- **Database**: rota_track
- **Username**: rota_user
- **Password**: rota_password

### Sample Data Included
- **10 Porters**: Various shift types (Day Shift One/Two)
- **5 Departments**: A&E, Theatres, Wards, Outpatients, Mortuary
- **Shift Patterns**: Day/Night shifts with A/B/C rotations
- **Sample Assignments**: Porter-department relationships

### Database Management
```bash
# Connect to MySQL container
docker exec -it rota-track-mysql mysql -u rota_user -prota_password rota_track

# View all tables
SHOW TABLES;

# Check porter data
SELECT * FROM porters LIMIT 5;

# Check department data
SELECT * FROM departments;
```

## 🔧 Configuration

### Environment Variables

**Frontend (.env)**
```
VITE_API_URL=http://localhost:3001/api
```

**Backend (backend/.env)**
```
DB_HOST=localhost
DB_PORT=3308
DB_USER=rota_user
DB_PASSWORD=rota_password
DB_NAME=rota_track
PORT=3001
NODE_ENV=development
```

## 🚨 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Kill processes on specific ports
lsof -ti:3001 | xargs kill -9  # Backend port
lsof -ti:5174 | xargs kill -9  # Frontend port
lsof -ti:3308 | xargs kill -9  # Database port
```

**2. Database Connection Failed**
```bash
# Restart MySQL container
docker-compose down
docker-compose up -d

# Check container logs
docker logs rota-track-mysql
```

**3. API Not Responding**
```bash
# Check backend logs
npm run dev:backend

# Verify backend is running
curl http://localhost:3001/health
```

**4. Frontend Not Loading Data**
1. Check browser console for errors
2. Verify API is running: http://localhost:3001/health
3. Check network tab in browser dev tools
4. Restart frontend: `npm run dev`

### Reset Everything
```bash
# Stop all services
docker-compose down
pkill -f "npm run"

# Clean and restart
docker-compose up -d
npm run dev:full
```

## 📁 Project Structure

```
rotas/
├── src/                    # Frontend source
│   ├── components/         # Vue components
│   ├── services/          # API client & services
│   ├── stores/            # Pinia stores
│   ├── types/             # TypeScript types
│   └── views/             # Vue pages
├── backend/               # Backend source
│   ├── src/
│   │   ├── database.ts    # Database service
│   │   └── server.ts      # Express server
│   └── package.json       # Backend dependencies
├── database/              # Database setup
│   └── init/
│       └── 01-schema.sql  # Schema & sample data
├── docker-compose.yml     # Docker configuration
├── package.json           # Frontend dependencies
└── README.md             # This file
```

## 🎯 Key Features

- **Porter Management**: Add, edit, delete hospital porters
- **Department Management**: Manage departments and staffing requirements
- **Shift Patterns**: Complex shift rotations (Day/Night A/B/C, PTS)
- **Staff Assignments**: Assign porters to departments
- **Real-time Updates**: Live data through API
- **Responsive Design**: Mobile-first approach
- **Type Safety**: Full TypeScript support

## 📞 Support

If you encounter issues:
1. Check this README for troubleshooting steps
2. Verify all prerequisites are installed
3. Ensure Docker is running
4. Check console logs for specific error messages
