<template>
  <header class="app-header">
    <div class="header-content">
      <h1 class="app-title">Staff Rotas</h1>
      <nav class="main-nav">
        <RouterLink to="/" class="nav-link" :class="{ active: $route.name === 'home' }">
          Home
        </RouterLink>
        <RouterLink to="/staff" class="nav-link" :class="{ active: $route.name === 'staff' }">
          Staff
        </RouterLink>
        <RouterLink to="/departments" class="nav-link" :class="{ active: $route.name === 'departments' }">
          Departments
        </RouterLink>
        <RouterLink to="/future-weeks" class="nav-link" :class="{ active: $route.name === 'future-weeks' }">
          Future Weeks
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.app-header {
  background-color: var(--color-primary);
  color: white;
  box-shadow: var(--shadow-md);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.app-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: white;
}

.main-nav {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.nav-link {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  text-decoration: none;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-link.active {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 600;
}

@container (max-width: 640px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .main-nav {
    width: 100%;
    justify-content: flex-start;
  }
  
  .nav-link {
    flex: 1;
    text-align: center;
    min-width: 0;
  }
}
</style>
