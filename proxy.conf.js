/**
 * Used in local environment:
 *   Request proxy to rewrite URLs and prevent CORS errors
 */
const logFn = function (req, res) {
  //console.log(new Date().toISOString() + `: bypassing ${req.method} ${req.url} `)
}
const onProxyRes = function (proxyRes, req, res) {
  logFn(req, res)
  if (req.method.toUpperCase() === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, HEAD, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    return res.send('')
  }
}

const PROXY_CONFIG = {
  '/shell-bff': {
    target: 'http://onecx-shell-bff',
    secure: false,
    pathRewrite: {
      '^.*/shell-bff': ''
    },
    changeOrigin: true,
    logLevel: 'debug',
    onProxyRes: onProxyRes
  },
  '/onecx-shell': {
    target: 'http://localhost:4300/',
    secure: false,
    pathRewrite: {
      '^.*/onecx-shell': ''
    },
    changeOrigin: true,
    logLevel: 'debug',
    onProxyRes: onProxyRes
  },
  '/mfe': {
    target: 'http://local-proxy/mfe',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    onProxyRes: onProxyRes
  }
}

module.exports = PROXY_CONFIG
