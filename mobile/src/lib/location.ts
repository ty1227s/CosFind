import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export type CosFindPosition = { latitude: number; longitude: number; accuracy: number };

export async function getCurrentLocation(): Promise<CosFindPosition> {
  if (Capacitor.isNativePlatform()) {
    const permission = await Geolocation.checkPermissions();
    if (permission.location !== "granted") await Geolocation.requestPermissions({ permissions: ["location"] });
    const { coords } = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
    return { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy };
  }
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
    reject,
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
  ));
}
