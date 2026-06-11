import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginPage from '../views/Login.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/login',
    name: 'login',
    component: LoginPage
  }
]

const router = createRouter({
  history: createWebHistory('ai'),
  routes
})

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  const accessToken = localStorage.getItem('accessToken')
  const expiration = localStorage.getItem('expiration')
  const now = Date.now()

  // 检查登录状态
  const isLoggedIn = accessToken && expiration && now < expiration;

  // 1. 如果是登录页
  if (to.name === 'login') {
    if (isLoggedIn) {
      // 已登录用户访问登录页，重定向到首页
      return next({ path: '/' })
    } else {
      // 未登录用户访问登录页，直接放行
      return next()
    }
  }

  // 2. 非登录页，检查登录状态
  if (!isLoggedIn) {
    // 重定向到登录页
    return next({ path: '/login' })
  }

  // 3. 已登录且访问非登录页，正常放行
  return next()
})

export default router