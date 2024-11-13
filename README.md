# OneCX Shell UI

- Prerequisites
    - See Readme in https://gitlab.com/1000kit/apps/onecx/tkit-dev-env
    - Create databases, start base services and start product backends


## Start the Shell UI
- `npm i`
- `npm run start`

## Start specific product in the shell ui
- start the required bff and svc containers of the product
- Before you can start a UI in the shell, please do Option 1 or Option 2 first and then you can
- start the ui on a port of your choice: `ng serve --port <port-number>`
- Example onecx-workspace-ui: `ng serve --port 4201`
- open with: http://localhost:4300/admin/workspace

