import type { CapacitorConfig } from "@capacitor/cli";

const devServerUrl = process.env.CAPACITOR_DEV_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "jp.cosfind.app",
  appName: "CosFind",
  webDir: "dist",
  backgroundColor: "#ffffff",
  android: { minWebViewVersion: 60, backgroundColor: "#ffffff", allowMixedContent: Boolean(devServerUrl) },
  ios: { backgroundColor: "#ffffff", contentInset: "automatic" },
  server: devServerUrl ? {
    url: devServerUrl,
    cleartext: devServerUrl.startsWith("http://")
  } : undefined,
  plugins: {
    SplashScreen: { launchShowDuration: 1200, backgroundColor: "#ffffff", showSpinner: false },
    StatusBar: { style: "LIGHT", backgroundColor: "#ffffff" }
  }
};

export default config;
