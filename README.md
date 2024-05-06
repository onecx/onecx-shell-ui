# Onecx Shell UI

- Prerequisites: https://gitlab.com/1000kit/demo-workshop/tkit-dev-env#1000kit-local-dev-setup
- Important to have DBs set up: https://gitlab.com/1000kit/demo-workshop/tkit-dev-env#create-users-and-databases

## Start base services
docker-compose up -d postgresdb traefik keycloak-app pgadmin

## Start bff and svc containers required for shell ui
- shell bff
- permission svc
- product svc
- tenant svc
- theme svc
- user-profile svc
- workspace svc
- How to start them: https://gitlab.com/1000kit/demo-workshop/tkit-dev-env#starting-services-of-a-specific-product

## Basic local database setup
- go to pgadmin and use the Query Tool and run the queries you can find here https://gitlab.com/1000kit/demo-workshop/tkit-dev-env/-/tree/master/db for the following DBs respectively:
- onecx-permission, oncx-product-store, onecx-theme, onecx-user-profile, onecx-workspace

> alternatively you can go to adminer and export the latest data

## Start the shell ui
- `npm i`
- `npm run start`

## Start specific product in the shell ui
- start the required bff and svc containers of the product
- Before you can start a UI in the shell, please do Option 1 or Option 2 first and then you can
- start the ui on a port of your choice: `ng serve --port <port-number>`
- Example onecx-workspace-ui: `ng serve --port 4201`
- open with: http://localhost:4300/admin/workspace

### Option 1
Configure proxy.conf.js
- add property to `const PROXY_CONFIG = {}` like in the example below with correct mappings
- Example for onecx-workspace-ui:
> you can find the other paths of other microfrontends by going to pgadmin to the table `microfrontend` of `onecx-product-store` in the column `remote_base_url`

```javascript
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
    return null;
  }
};

const PROXY_CONFIG = {
  '/shell-bff': {
    target: 'http://onecx-shell-bff',
    pathRewrite: { '^.*/shell-bff': '' },
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    bypass: bypassFn,
  },
  // example mapping for workspace
  '/mfe/workspace': {
    target: 'http://localhost:4201',
    pathRewrite: { '^.*/mfe/workspace': '' },
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    bypass: bypassFn,
  },
};

module.exports = PROXY_CONFIG;
```

### Option 2
Change it directly in the DB
- got to pgadmin to the table `microfrontend` of `onecx-product-store`
- edit the columns `remote_base_url` and `remote_entry` to the port which you start the specific UI
- Example for onecx-workspace-ui:

    | remote_base_url  | remote_entry |
    | ------------- | ------------- |
    | http://localhost:4201/  | http://localhost:4201/remoteEntry.js |