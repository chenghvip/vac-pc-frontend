<script setup>
import {ref, reactive, onMounted } from 'vue'
import {useRouter} from 'vue-router'
import {authPost} from '../utils/api'
import {ElMessage} from 'element-plus'
import {setToken} from '../utils/token'
import {md5} from '@/assets/wasm-base64/web_crypto.js'
import { useI18n } from 'vue-i18n'
const { t, locale } = useI18n()

const router = useRouter()

// 初始化语言设置
onMounted(async() => {
  await authPost('/system/config/getLanguage', {"configKey":"defaultLanguage"}).then(res => {
    if (res && res.code === 0) {
      locale.value = res.data.systemDefaultLanguage.toLocaleLowerCase() || 'zh'
    }
  })
})

const loginForm = reactive({
  loginName: '',
  mami: '',
  grantType: 'password'
})
const loading = ref(false)
const handleLogin = async () => {
  if (!loginForm.loginName || !loginForm.mami) {
    ElMessage({
      message: t('login.nameAndPasswordRequired'),
      type: 'error',
      duration: 5000
    })
    return
  }
  loading.value = true
  try {
    // 创建一个登录表单副本
    const encryptedForm = {
      ...loginForm,
      mami: md5(loginForm.mami)
    }
    // 调用OAuth登录接口
    const res = await authPost('/user/oauth/login', encryptedForm)
    console.log("logininfo:", res.data)
    if (res && res.code === 0 && res.isSuccess) {
      // 登录成功后，将token信息缓存到localStorage
      setToken(res.data)

      // 根据用户设置的语言切换界面语言
      const userLang = res.data.defaultLanguage ? res.data.defaultLanguage.toLocaleLowerCase() : 'zh'
      locale.value = userLang
      // 跳转到首页
      router.push('/')

    } else {
      // 登录失败，显示错误信息
      ElMessage({
        message: res.message || t('login.loginFailed'),
        type: 'error',
        duration: 5000
      })
    }
  } finally {
    loading.value = false
  }
}

</script>

<template>
  <div class="facebook-login-container">
    <div class="login-content">
      <div class="left-section">
        <h1 class="logo">VAC-AI</h1>
        <h2 class="slogan">{{t('login.slogan')}}</h2>
      </div>
      <div class="right-section">
        <div class="login-card">
          <el-form>
            <el-form-item>
              <el-input v-model="loginForm.loginName" :placeholder="$t('login.placeholder.username')" size="default"/>
            </el-form-item>
            <el-form-item>
              <el-input v-model="loginForm.mami" :placeholder="$t('login.placeholder.password')" type="password" size="default" show-password
                        @keyup.enter="handleLogin"/>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="loading" @click="handleLogin" class="login-button" size="default">{{ $t('login.login') }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.facebook-login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
  /*padding: 20px;*/
}

.login-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 980px;
  margin: 0 auto;
}

@media (max-width: 900px) {
  .login-content {
    flex-direction: column;
    width: 100%;
  }
}

.left-section {
  flex: 1;
  padding-right: 32px;
}

.logo {
  color: #1877f2;
  font-size: 56px;
  font-weight: bold;
  margin-bottom: 10px;
}

.slogan {
  font-size: 28px;
  font-weight: normal;
  line-height: 32px;
  color: #1c1e21;
  width: 500px;
  margin-top: 0;
}

.right-section {
  width: 396px;
}

.login-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.login-button {
  width: 100%;
  font-weight: bold;
  background-color: #1877f2;
  border: none;
  height: 40px;
}

.login-button:hover {
  background-color: #166fe5;
}

:deep(.el-input__wrapper) {
  padding: 8px 12px;
}

:deep(.el-input__inner) {
  font-size: 16px;
}

:deep(.el-button.is-loading) {
  height: 40px;
}
</style>