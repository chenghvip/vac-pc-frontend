import { createApp } from 'vue'
import './assets/main.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import directive from './directive/index.js';
import { ElMessage } from 'element-plus';
import { removeToken, isTokenExpired } from './utils/token'
import i18n from './i18n'

import '@fortawesome/fontawesome-free/css/all.min.css'

const app = createApp(App)
app.use(router)
app.use(ElementPlus)
app.use(i18n)
directive(app)

import { initWasm } from './utils/wasmBase64.js'

async function initApp() {
    try {
        // 应用启动时初始化 WASM
        await initWasm()
        console.log('WASM initialized successfully')
    } catch (error) {
        console.error('WASM initialization failed:', error)
    }

    // 创建并挂载 Vue 应用
    app.mount('#app')

    // // 添加全局点击监听器
    // let tokenCheckTimeout = null;
    // document.addEventListener('click', () => {
    //     // 防抖处理
    //     if (tokenCheckTimeout) {
    //         clearTimeout(tokenCheckTimeout);
    //     }
    //
    //     tokenCheckTimeout = setTimeout(() => {
    //         // 只在非登录页面检查token
    //         if (router.currentRoute.value.name !== 'Login') {
    //             if (isTokenExpired()) {
    //                 ElMessage({
    //                     message: '会话已过期，请重新登录',
    //                     type: 'error',
    //                     duration: 5 * 1000
    //                 });
    //
    //                 removeToken();
    //                 localStorage.setItem('intendedRoute', JSON.stringify(router.currentRoute.value));
    //
    //                 // 先提示，延迟1.5秒后再跳转
    //                 setTimeout(() => {
    //                     router.push('/login');
    //                 }, 1500);
    //             }
    //         }
    //     }, 300);
    // });

}

initApp()


