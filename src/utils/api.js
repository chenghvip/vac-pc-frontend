import service, { authservice } from './request'
import {createSignFields} from "./signUtils";
import {decode, encode} from "./wasmBase64";
// GET请求
export function get(url, params) {
  return service({
    url,
    method: 'get',
    params
  })
}

// POST请求
export function post(url, data) {
  return service({
    url,
    method: 'post',
    data
  })
}

export function sendMessagePost(url, data = {}, options = {}) {
  const baseURL = import.meta.env.VITE_API_BASE_URL || '';
  const fullURL = baseURL + url;
  const result = createSignFields(data);
  // 从localStorage中获取token信息
  const accessToken = localStorage.getItem('accessToken');
  const headerPrefix = localStorage.getItem('headerPrefix');
  let authorization;
  // 如果有token，添加到请求头中
  if (accessToken && headerPrefix) {
    authorization = headerPrefix + accessToken;
  }
  // 构建请求配置
  const config = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authorization,
    },
    body: JSON.stringify(encode(JSON.stringify(result))),
  };
  // 如果提供了信号（用于取消请求），添加到配置中
  if (options.signal) {
    config.signal = options.signal;
  }

  return fetch(fullURL, config)
      .then(response => {
        // 首先检查HTTP状态码
        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }
        return response.json();  // 解析 JSON 响应
      }).then(data => {
        // 解码加密数据
        let dataObj;
        try {
          dataObj = JSON.parse(decode(data));
        } catch (error) {
          console.error('解码失败：', error);
          throw new Error('响应数据解码失败');
        }
        // 返回处理后的数据
        return dataObj;
      }).catch(error => {
        if (error.name === 'AbortError') {
          console.log('请求被取消');
          throw error;  // 重新抛出取消错误
        }
        console.error('请求失败：', error);
        throw error;
      });
}

// PUT请求
export function put(url, data) {
  return service({
    url,
    method: 'put',
    data
  })
}

// DELETE请求
export function del(url, params) {
  return service({
    url,
    method: 'delete',
    params
  })
}

// 认证专用GET请求
export function authGet(url, params) {
  return authservice({
    url,
    method: 'get',
    params
  })
}

// 认证专用POST请求
export function authPost(url, data) {
  return authservice({
    url,
    method: 'post',
    data
  })
}