import CryptoJS from 'crypto-js';
import { vacSign } from '@/assets/wasm-base64/web_crypto.js'


// ================== Apifox REST 签名脚本 (严格匹配Java逻辑) ==================
// 完全复制 Java RestUtils 的 isSignValue 逻辑

// ---------- 配置区域 ----------
// 直接读取相应模式的环境变量
const { VITE_APP_APP_KEY, VITE_APP_APP_SECRET } = import.meta.env;
const APP_KEY = VITE_APP_APP_KEY;
const APP_SECRET = VITE_APP_APP_SECRET;
const AUTO_GENERATE_PARAMS = true; // 自动生成缺失的签名参数
const NONCE_LENGTH = 16; // 随机串长度

// ---------- 核心工具方法 ----------
// 生成带校验位的有效时间戳
function generateValidTimestamp() {
    // 1. 获取当前毫秒时间戳（13位）
    const milliTimestamp = new Date().getTime();
    const timestampStr = String(milliTimestamp);

    // 2. 确保时间戳为13位（不足则补0）
    if (timestampStr.length > 13) {
        return generateValidTimestamp(); // 重试避免过长
    }
    const paddedTimestamp = timestampStr.padStart(13, '0');

    // 3. 提取前12位（时间主体）
    const timeBody = paddedTimestamp.substring(0, 12);

    // 4. 计算校验位（按原始需求规则）
    let cumulativeSum = 0;
    for (let i = 0; i < timeBody.length; i++) {
        const digit = parseInt(timeBody[i]);
        cumulativeSum = (cumulativeSum + digit) % 10;
    }

    // 5. 生成最终时间戳（带校验位）
    return parseInt(timeBody + cumulativeSum);
}

// 安全随机字符串
function generateSecureNonce() {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < NONCE_LENGTH; i++) {
        nonce += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return nonce;
}

// MD5签名 (32位小写)
function signMD5(text) {
    return CryptoJS.MD5(text).toString(CryptoJS.enc.Hex).toLowerCase();
}

// 严格复制Java的isSignValue逻辑
function isSignValue(value) {
    // 1. 空值检查
    if (value === null || value === undefined) {
        return false;
    }

    // 2. 数值类型检查
    if (typeof value === 'number') {
        return true;
    }

    // 3. 类型名称检查
    const className = value.constructor.name;
    switch (className) {
        case 'String':
        case 'Integer':
        case 'Boolean':
        case 'Long':
        case 'Short':
        case 'Float':
        case 'Double':
        case 'Character':
        case 'Byte':
            // 检查是否为空字符串 (对String类型)
            return className !== 'String' || value !== '';
        default:
            return false;
    }
}

// 过滤有效签名参数 (完全匹配Java的RestUtils.jsonToMap逻辑)
function filterSignParams(params) {
    const result = {};
    for (const [key, value] of Object.entries(params)) {
        if (key === 'sign') continue;
        if (isSignValue(value)) {
            result[key] = value.toString();
        }
    }
    return result;
}

// 构造待签名字符串
function buildSignString(params, appSecret) {
    const keys = Object.keys(params).sort();
    let signString = '';
    for (const key of keys) {
        const value = params[key];
        signString += signString ? `&${key}=${value}` : `${key}=${value}`;
    }
    return signString + appSecret;
}

/**
 * 根据所有请求参数生成签名字段
 * @param {Object} urlParams URL 查询参数
 * @param {Object} bodyParams 请求体参数
 * @returns {Object} 包含 appKey、timestamp、nonce、sign 的对象
 */
export function createSignFields(urlParams = {}, bodyParams = {}) {
    // 合并参数
    const allParams = { ...urlParams, ...bodyParams };
    // console.log('allParams:', allParams);
    // // 处理BaseDTO
    // const baseDTO = {
    //     appKey: AUTO_GENERATE_PARAMS ? (allParams.appKey || APP_KEY) : allParams.appKey,
    //     timestamp: AUTO_GENERATE_PARAMS ? (allParams.timestamp || generateValidTimestamp()) : allParams.timestamp,
    //     nonce: AUTO_GENERATE_PARAMS ? (allParams.nonce || generateSecureNonce()) : allParams.nonce
    // };
    // if (!baseDTO.appKey) throw new Error('appKey不能为空');
    // if (!baseDTO.timestamp) throw new Error('timestamp不能为空');
    // if (!baseDTO.nonce) throw new Error('nonce不能为空');
    //
    // // 过滤签名参数并加入 BaseDTO
    // const signParams = filterSignParams(allParams);
    // console.log('signParams:', signParams);
    // Object.assign(signParams, baseDTO);
    // // 构造签名字符串并 MD5
    // const signString = buildSignString(signParams, APP_SECRET);
    // const sign = signMD5(signString);
    const baseDTO = {
    };
    const result = vacSign(allParams);
    baseDTO.sign = result.signature;
    baseDTO.appKey = result.appKey;
    baseDTO.timestamp = result.timestamp + '';
    baseDTO.nonce = result.nonce;
    baseDTO.bfp = result.bfp;
    // 构建最终请求体
    return {
        ...allParams,
        ...baseDTO
    };
}