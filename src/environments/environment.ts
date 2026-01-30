export const environment = {
  KEYCLOAK_CLIENT_ID: 'onecx-shell-ui-client',
  KEYCLOAK_URL: 'http://keycloak-app/',
  KEYCLOAK_REALM: 'onecx',
  skipRemoteConfigLoad: true,
  production: false,
  APP_VERSION: 'Local Shell Version',
  ONECX_KEYBOARD_FOCUSABLE_SELECTOR: [
    '[role="listbox"]',
    '.p-multiselect',
    '.p-checkbox',
    '.p-radiobutton',
    '.p-inputswitch',
    '.p-dropdown',
    '.p-treeselect',
    '.p-cascadeselect'
  ]
}
