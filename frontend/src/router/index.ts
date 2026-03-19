import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/auth/RegisterView.vue'),
    },
    {
      path: '/profile/:id',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
    },
    {
      path: '/cabinet',
      name: 'cabinet',
      component: () => import('../views/CabinetView.vue'),
      meta: { requiresAuth: true },
    },
    // Новые маршруты для объявлений
    {
      path: '/listings/new',
      name: 'new-listing',
      component: () => import('../views/ListingFormView.vue'),
      meta: { requiresAuth: true, requiresTutor: true },
    },
    {
      path: '/listings/:id/edit',
      name: 'edit-listing',
      component: () => import('../views/ListingFormView.vue'),
      meta: { requiresAuth: true, requiresTutor: true },
    },
    {
      path: '/listings/:id',
      name: 'listing-detail',
      component: () => import('../views/ListingDetailView.vue'),
    },
    // 👇 Групповые маршруты
    {
      path: '/group-listings/new',
      name: 'new-group-listing',
      component: () => import('../views/ListingFormView.vue'),
      meta: { requiresAuth: true, requiresTutor: true },
    },
    {
      path: '/group-listings/:id/edit',
      name: 'edit-group-listing',
      component: () => import('../views/ListingFormView.vue'),
      meta: { requiresAuth: true, requiresTutor: true },
    },
    {
      path: '/group-listings/:id',
      name: 'group-listing-detail',
      component: () => import('../views/GroupListingDetailView.vue'),
    },
    {
      path: '/catalog',
      name: 'catalog',
      component: () => import('../views/CatalogView.vue'),
    },
  ],
})

// Защита роутов
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  // Проверка авторизации
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
    return
  }
  
  // Проверка роли репетитора
  if (to.meta.requiresTutor && !authStore.isTutor) {
    next('/')
    return
  }
  
  next()
})

export default router