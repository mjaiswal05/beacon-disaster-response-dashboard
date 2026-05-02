# Dockerfile

# ======================================================================
# STAGE 1: BUILDER - Compiles the React/Vite application
# ======================================================================
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install --force
COPY . .

# Build the React app (creates /dist folder)
RUN npm run build

# ======================================================================
# STAGE 2: PRODUCTION - Serves the built static files via Nginx
# ======================================================================
FROM nginx:alpine

# Copy the built files from build stage to nginx's serving directory
COPY --from=build /app/dist /usr/share/nginx/html

# CRITICAL FIX: Copy the custom nginx configuration file
# This file must contain the Content-Security-Policy (CSP) and buffer size fixes.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 (Cloud Run requires the container to listen on this port)
EXPOSE 8080

# Start nginx server
CMD ["nginx", "-g", "daemon off;"]
