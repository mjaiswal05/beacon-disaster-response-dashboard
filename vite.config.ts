import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const iamServiceUrl = env.VITE_IAM_SERVICE_URL || "https://beacon-tcd.tech";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: iamServiceUrl,
          changeOrigin: true,
          secure: false,
          // NO rewrite - /api/core/v1/... passes through as-is to beacon-tcd.tech/api/core/v1/...
        },
        "/api/support-bot": {
          target: iamServiceUrl, // https://beacon-tcd.tech
          changeOrigin: true,
          secure: false,
          // /api/support-bot/v1/... passes through as-is
        },
        "/v1": {
          target: iamServiceUrl,
          changeOrigin: true,
          secure: false,
          // FMS/Vault API: /v1/vault/... passes through as-is
        },
      },
    },
  };
});
