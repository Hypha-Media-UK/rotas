import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/staff',
      name: 'staff',
      component: () => import('../views/StaffView.vue'),
    },
    {
      path: '/departments',
      name: 'departments',
      component: () => import('../views/DepartmentsView.vue'),
    },
    {
      path: '/future-weeks',
      name: 'future-weeks',
      component: () => import('../views/FutureWeeksView.vue'),
    },
    {
      path: '/shift-management',
      name: 'shift-management',
      component: () => import('../views/ShiftManagementView.vue'),
    },
    {
      path: '/mysql-test',
      name: 'mysql-test',
      component: () => import('../views/MySQLTestView.vue'),
    },
  ],
})

export default router
