import axios from 'axios'
import router from '../router'
import {ElMessage} from 'element-plus'
import {createSignFields} from './signUtils';
import {removeToken, isTokenExpired} from './token'
import { ref } from 'vue';
import {encode, decode, initWasm} from './wasmBase64.js'

// 确保 WASM 已初始化
let wasmInitialized = false
async function ensureWasmInitialized() {
    if (!wasmInitialized) {
        await initWasm()
        wasmInitialized = true
    }
}

// 创建基础 axios 实例（用于业务接口）
const service = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json;charset=UTF-8'
    },
})

// 创建认证专用 axios 实例（用于登录接口）
const authservice = axios.create({
    baseURL: import.meta.env.VITE_AUTH_API_BASE_URL, // 认证服务地址
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json;charset=UTF-8',
    }
})

// 每个接口单独锁，用于防抖
const requestLocks = new Map();
const lockDuration = 1000; // ms

// 工具方法：生成唯一请求 key
function getRequestKey(config) {
    return `${config.method?.toUpperCase() || ''} ${config.url || ''}`;
}

// 请求拦截器
service.interceptors.request.use(
    async config => {
        await ensureWasmInitialized()

        // 登录相关接口不需要检查token
        const whiteList = ['/user/oauth/login'];
        const isAuthRequest = whiteList.some(url => config.url?.includes(url));

        // 检查token是否过期
        if (!isAuthRequest && isTokenExpired()) {
            ElMessage({
                message: '会话已过期，请重新登录',
                type: 'error',
                duration: 5 * 1000
            });


            // 清除本地存储的token等信息
            removeToken();
            // 保存当前路由信息
            if (router.currentRoute.value.name !== 'Login') {
                localStorage.setItem('intendedRoute', router.currentRoute.value.fullPath);
            }

            setTimeout(() => {
                router.push('/login');
            }, 1500);
            return Promise.reject(new Error('会话已过期，请重新登录'));
        }

        const key = getRequestKey(config);
        const now = Date.now();

        // —— 1. 如果上次锁已经过期，先清理它 ——
        const expireAt = requestLocks.get(key);
        if (expireAt && now >= expireAt) {
            requestLocks.delete(key);
        }

        if (requestLocks.has(key)) {
            ElMessage.warning('请求进行中，请勿重复点击');
            console.log("key:", key)
            // 直接中断请求，不发起网络调用，也不抛出错误
            return new Promise(() => {
            });
        }
        // —— 3. 设定新的锁，到期时间是 now + lockDuration ——
        requestLocks.set(key, now + lockDuration);

        // 从localStorage中获取token信息
        const accessToken = localStorage.getItem('accessToken')
        const headerPrefix = localStorage.getItem('headerPrefix')
        // 如果有token，添加到请求头中
        if (accessToken && headerPrefix) {
            config.headers['Authorization'] = headerPrefix + accessToken
        }
        // 不论 GET 还是其他，都将签名字段放到 body 中
        const urlParams = config.params ? { ...config.params } : {};
        const bodyParams = (config.data && typeof config.data === 'object') ? { ...config.data } : {};
        const result = createSignFields(urlParams, bodyParams)

        // Base64 编码
        // const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(result))));
        config.data = encode(JSON.stringify(result));

        return config
    },
    error => {
        console.error(error)
        return Promise.reject(error)
    }
)

// 响应拦截器
service.interceptors.response.use(
    async response => {
        const config = response.config;
        await ensureWasmInitialized()
        const key = getRequestKey(config);
        requestLocks.delete(key);
        const res = response.data

        let dataObj
        // 3. 解析成对象
        try {
            dataObj = JSON.parse(decode(res))
        } catch (e) {
            // 如果Base64解码和JSON解析失败，尝试直接使用响应数据
            try {
                // 检查res是否已经是有效的对象
                if (res && typeof res === 'object') {
                    dataObj = res
                } else if (typeof res === 'string') {
                    // 如果是字符串，尝试直接JSON解析
                    dataObj = JSON.parse(res)
                }
            } catch (innerError) {
                ElMessage({
                    message: '返回数据解析错误',
                    type: 'error',
                    duration: 5 * 1000
                })
                return Promise.reject(new Error('数据解析失败: 首次解析错误 - ' + e.message + '; 备用解析错误 - ' + innerError.message))
            }
        }

        // token相关错误码统一处理（都重新登录）
        const TOKEN_ERROR_CODES = [10001, 10002, 10003, 10004, 10005, 10006];
        const TOKEN_ERROR_MESSAGES = {
            10001: '会话超时，请重新登录',
            10002: 'Token验证未通过，请重新登录',
            10003: '不合法的token，请重新登录',
            10004: '缺少token参数，请重新登录',
            10005: '生成token失败，请重新登录',
            10006: '解析用户身份错误，请重新登录'
        };
        // 统一处理所有token错误
        if (TOKEN_ERROR_CODES.includes(dataObj.code)) {
            const errorMessage = TOKEN_ERROR_MESSAGES[dataObj.code] || '登录状态异常，请重新登录';
            ElMessage({
                message: errorMessage,
                type: 'error',
                duration: 5 * 1000
            });
            // 清除本地存储的token等信息
            removeToken();
            if (router.currentRoute.value.name !== 'Login') {
                localStorage.setItem('intendedRoute', router.currentRoute.value.fullPath);
            }
            setTimeout(() => {
                router.push('/login');
            }, 1500);
            return Promise.reject(new Error("token无效"))
        }
        return dataObj
    },
    error => {
        const config = error.config || {};
        const key = getRequestKey(config);
        requestLocks.delete(key);
        console.error('请求错误', error)
        const res = error.response.data
        let dataObj
        // 3. 解析成对象
        try {
            dataObj = JSON.parse(decode(res))
        } catch (e) {
            // 如果Base64解码和JSON解析失败，尝试直接使用响应数据
            try {
                // 检查res是否已经是有效的对象
                if (res && typeof res === 'object') {
                    dataObj = res
                } else if (typeof res === 'string') {
                    // 如果是字符串，尝试直接JSON解析
                    dataObj = JSON.parse(res)
                }
            } catch (innerError) {
                ElMessage({
                    message: '返回数据解析错误',
                    type: 'error',
                    duration: 5 * 1000
                })
                return Promise.reject(new Error('数据解析失败: 首次解析错误 - ' + e.message + '; 备用解析错误 - ' + innerError.message))
            }
        }
        console.log("dataObj:", dataObj)
        ElMessage({
            message: `${dataObj.message || error.message}`,
            type: 'error',
            duration: 5 * 1000
        })
        return Promise.reject(error)
    }
)

// 为认证实例添加请求拦截器
authservice.interceptors.request.use(
    async config => {
        // 认证接口的签名处理
        const urlParams = config.params ? { ...config.params } : {};
        const bodyParams = (config.data && typeof config.data === 'object') ? { ...config.data } : {};
        const result = createSignFields(urlParams, bodyParams)
        config.data = encode(JSON.stringify(result));

        return config
    },
    error => {
        console.error(error)
        return Promise.reject(error)
    }
)

// 为认证实例添加响应拦截器
authservice.interceptors.response.use(
    async response => {
        const res = response.data
        let dataObj
        try {
            dataObj = JSON.parse(decode(res))
        } catch (e) {
            try {
                if (res && typeof res === 'object') {
                    dataObj = res
                } else if (typeof res === 'string') {
                    dataObj = JSON.parse(res)
                }
            } catch (innerError) {
                ElMessage({
                    message: '返回数据解析错误',
                    type: 'error',
                    duration: 5 * 1000
                })
                return Promise.reject(new Error('数据解析失败: 首次解析错误 - ' + e.message + '; 备用解析错误 - ' + innerError.message))
            }
        }

        // 处理认证相关的错误码
        if ([10001, 10002, 10003, 10004, 10005, 10006].includes(dataObj.code)) {
            const TOKEN_ERROR_MESSAGES = {
                10001: '会话超时，请重新登录',
                10002: 'Token验证未通过，请重新登录',
                10003: '不合法的token，请重新登录',
                10004: '缺少token参数，请重新登录',
                10005: '生成token失败，请重新登录',
                10006: '解析用户身份错误，请重新登录'
            };

            const errorMessage = TOKEN_ERROR_MESSAGES[dataObj.code] || '登录状态异常，请重新登录';
            ElMessage({
                message: errorMessage,
                type: 'error',
                duration: 5 * 1000
            });

            removeToken();
            if (router.currentRoute.value.name !== 'Login') {
                localStorage.setItem('intendedRoute', router.currentRoute.value.fullPath);
            }
            setTimeout(() => {
                router.push('/login');
            }, 1500);
            return Promise.reject(new Error("token无效"))
        }

        return dataObj
    },
    error => {
        console.error('请求错误', error)
        // 错误处理...
        ElMessage({
            message: error.message,
            type: 'error',
            duration: 5 * 1000
        })
        return Promise.reject(error)
    }
)

export { service as default, authservice }
