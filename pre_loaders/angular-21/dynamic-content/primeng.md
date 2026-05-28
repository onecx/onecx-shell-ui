# Primeng dynamic content handling

## Utilities used

- `document.body.appendChild` Shell overwrite
- `document.createOnecxElement` utility
- `document.createElementFromPrimeng` utility (legacy)
- `document.createOnecxDynamicContainer` utility

## Recommended solution

<!-- TODO: Replace X with version -->

Via `document.createOnecxDynamicContainer` utility each microfrontend bootstrapped with `@onecx/angular-webcomponents` starting from version X creates a dynamic container for the application. The element is going to be called `onecx-dynamic-APP_ELEMENT_NAME` where `APP_ELEMENT_NAME` is the name of the html tag of the microfrontend (set in the `bootstrapRemoteComponent` or `createEntrypoint` function).

<!-- TODO: Implement -->

This element will be available via the X injection token to be used in the application.

Recommended solution for primeng dynamic content is to use `appendTo` properties on the primeng components that support it for dynamic content generation. Below, example for PrimeNg tooltip can be found.

<!-- TODO: Create example -->

<!-- TODO: Document -->

## Solution when PrimeNg can be lower than Shell's

In case ..., Shell is already doing the below and you don't have to

<!-- TODO: Document -->

## Solution when application requires higher version of PrimeNg or additional patch that Shell is not providing

In case ..., overwrites have to be applied

### Create elements with context - document.createElement

- Search - `./pre_loaders/angular-21/node_modules/primeng`
- Replace - `document.createElement(`
- Replacement - `document.createOnecxElement({"this": this, "arguments": Array.from(arguments)},`

### Stop recreating primeng style sheets

- Search - `./pre_loaders/angular-21/node_modules/primeng`
- Replace - `Theme.setLoadedStyleName`
- Replacement - `function(_){})`

### Check body content

- Search - `./pre_loaders/angular-21/node_modules/primeng`
- Code search - `appendChild`

#### Validation flow

For each found item, complete below validation

##### Step 1: Can element be appended outside of the application scope?

Validate if appendChild method is used in context where it can lead to placing content outside of the application scope (e.g., document.body.appendChild).

No - Go to next item
Yes - Go to step 2

##### Step 2: Is element created with OneCX utilities containing context?

Validate if element that is being appended was created with one of OneCX utilities (e.g., document.createOnecxElement)

Yes - Go to next item
No - Go to step 3

##### Step 3: Implement additional overwrite

Implement appropriate overwrite to the source code and add this to a list for future patches that ensures proper element creation workflow in OneCX.
