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
    if (req.url.startsWith('/shell-bff/workspaceConfig')) {
      const routesResponseMock = {
        routes: [
          {
            url: '/admin/portal-mgmt/menu',
            remoteEntryUrl:
              'http://localhost:4400/core/portal-mgmt/remoteEntry.js',
            technology: 'Angular',
            exposedModule: 'MenuModule',
            baseUrl: 'http://localhost:4400/core/portal-mgmt/',
            productName: 'Menu Management',
          },
        ],
        theme: {
          name: 'CapGemini',
          properties: {
            font: {
              'font-family': null,
              'font-size': null,
            },
            topbar: {
              'topbar-bg-color': ' rgb(18, 171, 219)',
              'topbar-item-text-color': ' #ffffff',
              'topbar-text-color': ' #ffffff',
              'topbar-left-bg-color': ' #ececec',
              'topbar-item-text-hover-bg-color': ' rgba(255, 255, 255, 0.12)',
              'topbar-menu-button-bg-color': ' rgb(255, 0, 68)',
              'logo-color': ' rgb(18, 171, 219)',
            },
            general: {
              'primary-color': ' rgb(18, 171, 219)',
              'secondary-color': ' #ee4400',
              'text-color': ' rgba(0, 0, 0, 0.87)',
              'text-secondary-color': ' rgba(0, 0, 0, 0.6)',
              'body-bg-color': ' #f7f7f7',
              'content-bg-color': ' #ffffff',
              'content-alt-bg-colorr': '',
              'overlay-content-bg-color': ' #ffffff',
              'hover-bg-color': ' rgba(0, 0, 0, 0.04)',
              'solid-surface-text-color': ' #ffffff',
              'divider-color': ' #e4e4e4',
              'button-hover-bg': null,
              'danger-button-bg': null,
              'info-message-bg': null,
              'success-message-bg': null,
              'warning-message-bg': null,
              'error-message-bg': null,
            },
            sidebar: {
              'menu-text-color': ' #657380',
              'menu-bg-color': ' #fdfeff',
              'menu-item-text-color': ' #515c66',
              'menu-item-hover-bg-color': ' rgba(0, 0, 0, 0.04)',
              'menu-active-item-text-color': null,
              'menu-active-item-bg-color': null,
              'inline-menu-border-color': ' #e4e4e4',
            },
          },
        },
        remoteComponents: [
          {
            name: 'PortalMenu',
            baseUrl: 'http://localhost:4400/core/portal-mgmt/',
            remoteEntryUrl:
              'http://localhost:4400/core/portal-mgmt/remoteEntry.js',
            appId: 'appId',
            productName: 'PortalMgmt',
            bffUrl: 'http://localhost:4400/core/portal-mgmt/api/',
            exposedModule: 'MenuComponent',
            remoteBaseUrl: 'http://localhost:4400/core/portal-mgmt/',
          },
        ],
        shellRemoteComponents: [
          {
            slotName: 'menu',
            remoteComponent: 'PortalMenu',
          },
        ],
      };
      res.end(JSON.stringify(routesResponseMock));
    } else if (req.url.startsWith('/shell-bff/components')) {
      const componentsResponse = {
        slotComponents: {
          menu: [
            {
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
    } else if (req.url.startsWith('/shell-bff/userProfile')) {
      const profileResponse = {
        userProfile: {
          userId: 'userId',
          person: {},
          accountSettings: {
            version: null,
            creationDate: '2023-07-17T09:17:50.723706Z',
            creationUser: null,
            modificationDate: '2024-02-15T08:45:57.281799Z',
            modificationUser: null,
            id: '4092c9fa-2fbf-4500-a74a-665fc6959684',
            privacySettings: {
              hideMyProfile: true,
            },
            localeAndTimeSettings: {
              locale: 'en',
              timezone: 'Asia/Riyadh',
            },
            notificationSettings: null,
            layoutAndThemeSettings: {
              menuMode: 'SLIM',
              colorScheme: 'LIGHT',
            },
          },
        },
      };
      res.end(JSON.stringify(profileResponse));
    } else if (req.url.startsWith('/shell-bff/permissions')) {
      const permissionsResponse = {
        permissions: [],
      };
      res.end(JSON.stringify(permissionsResponse));
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
