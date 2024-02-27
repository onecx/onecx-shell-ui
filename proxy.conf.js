/**
 * Used in local environment:
 *   Request proxy to rewrite URLs and prevent CORS errors
 */
const logFn = function (req, res) {
  console.log(
    new Date().toISOString() + `: bypassing ${req.method} ${req.url} `
  );
};
const bypassFn = function (req, res) {
  logFn(req, res);
  if (req.method.toUpperCase() === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, HEAD, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.send('');
  } else {
    if (req.url.startsWith('/shell-bff/routes')) {
      const routesResponseMock = {
        routes: [
          {
            url: '/admin/portal-mgmt/menu',
            remoteEntry:
              'http://localhost:4400/core/portal-mgmt/remoteEntry.js',
            type: 'ANGULAR',
            exposedModule: './MenuModule',
            remoteBaseUrl: 'http://localhost:4400/core/portal-mgmt/',
            displayName: 'Menu Management',
            appVersion: '',
          },
        ],
        remoteName: 'MenuModule',
      };
      res.end(
        JSON.stringify({
          routes: routesResponseMock.routes,
          remoteName: routesResponseMock.remoteName,
        })
      );
    } else if (req.url.startsWith('/shell-bff/components')) {
      const componentsResponse = {
        slotComponents: {
          menu: [
            {
              url: '/admin/portal-mgmt/menu',
              remoteEntry:
                'http://localhost:4400/core/portal-mgmt/remoteEntry.js',
              exposedModule: 'MenuComponent',
              remoteBaseUrl: 'http://localhost:4400/core/portal-mgmt/',
              displayName: 'Menu Management',
              appVersion: '',
            },
          ],
        },
      };
      res.end(
        JSON.stringify({
          slotComponents: componentsResponse.slotComponents,
        })
      );
    } else {
      return null;
    }
  }
};

const PROXY_CONFIG = {
  '/shell-bff': {
    target: 'http://shell-bff',
    pathRewrite: { '^.*/shell-bff': '' },
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    bypass: bypassFn,
  },
};

module.exports = PROXY_CONFIG;
