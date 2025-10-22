FROM ghcr.io/onecx/docker-spa-base:2.1.0

# Copy nginx configuration
COPY nginx/locations.conf $DIR_LOCATION/locations.conf
# Copy application build
COPY dist/onecx-shell-ui/ $DIR_HTML

# Optional extend list of application environments
ENV CONFIG_ENV_LIST BFF_URL,APP_BASE_HREF,CORS_ENABLED,APP_VERSION,APP_ID,PRODUCT_NAME,AUTH_SERVICE,AUTH_SERVICE_CUSTOM_URL,AUTH_SERVICE_CUSTOM_MODULE_NAME,AUTH_SERVICE_CUSTOM_BFF_URL,ONECX_PORTAL_SEARCH_BUTTONS_REVERSED,POLYFILL_SCOPE_MODE

# Application environments default values
ENV BFF_URL http://onecx-shell-bff:8080/
ENV APP_BASE_HREF /newShell/

# Definition for the custom AUTH. Default: keycloak
ENV AUTH_SERVICE keycloak
ENV AUTH_SERVICE_CUSTOM_URL ''
ENV AUTH_SERVICE_CUSTOM_MODULE_NAME ''
ENV AUTH_SERVICE_CUSTOM_BFF_URL ''
ENV ONECX_PORTAL_SEARCH_BUTTONS_REVERSED 'false'
ENV POLYFILL_SCOPE_MODE 'PERFORMANCE'

RUN chmod 775 -R "$DIR_HTML"/assets
USER 1001
