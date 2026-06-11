
export function removeToken() {
  // 清除过期的token信息
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('tokenType')
  localStorage.removeItem('headerPrefix')
  localStorage.removeItem('userId')
  localStorage.removeItem('userName')
  localStorage.removeItem('nickName')
  localStorage.removeItem('expiration')
  localStorage.removeItem('refreshExpiration')
  localStorage.removeItem('permissions')
  localStorage.removeItem('traceOpen')
  localStorage.removeItem('userLocale')
}

export function getToken() {
  return {
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    tokenType: localStorage.getItem('tokenType'),
    headerPrefix: localStorage.getItem('headerPrefix'),
    userId: localStorage.getItem('userId'),
    userName: localStorage.getItem('userName'),
    nickName: localStorage.getItem('nickName'),
    expiration: localStorage.getItem('expiration'),
    refreshExpiration: localStorage.getItem('refreshExpiration'),
    permissions: localStorage.getItem('permissions'),
    traceOpen: localStorage.getItem('traceOpen'),
    userLocale: localStorage.getItem('userLocale')
  }
}

export function setToken(data) {
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  localStorage.setItem('tokenType', data.tokenType)
  localStorage.setItem('headerPrefix', data.headerPrefix)
  localStorage.setItem('userId', data.userId)
  localStorage.setItem('userName', data.username)
  localStorage.setItem('nickName', data.nickname)
  localStorage.setItem('expiration', data.expiration)
  localStorage.setItem('refreshExpiration', data.refreshExpiration)
  localStorage.setItem('permissions', data.permissions)
  localStorage.setItem('traceOpen', data.traceOpen)
  localStorage.setItem('userLocale', data.defaultLanguage ? data.defaultLanguage.toLocaleLowerCase() : 'zh')
}

export function isTokenExpired() {
  // 检查是否有访问令牌，如果没有则认为未登录，不算是"过期"
  const accessToken = localStorage.getItem('accessToken');
  const expiration = localStorage.getItem('expiration');
  // console.log("accessToken:", accessToken)
  // 如果没有访问令牌，说明用户未登录
  if (!accessToken) return true;

  //  认为过期(当前实现)
  if (!expiration) return true;

  const expirationTime = parseInt(expiration, 10);
  if (isNaN(expirationTime)) return true;

  const currentTime = Date.now();
  return currentTime >= expirationTime;
}

