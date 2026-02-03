import * as Location from "expo-location";
import { Platform } from "react-native";

export interface UTMCoordinate {
  easting: number;
  northing: number;
  zone: number;
  zoneLetter: string;
}

export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.error("Error requesting location permission:", error);
    return false;
  }
}

export async function getCurrentLocation(): Promise<GPSCoordinate | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.error("Error getting current location:", error);
    return null;
  }
}

export function latLngToUTM(latitude: number, longitude: number): UTMCoordinate {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;

  const b = a * (1 - f);
  const e2 = (a * a - b * b) / (a * a);
  const e_prime2 = (a * a - b * b) / (b * b);

  const zone = Math.floor((longitude + 180) / 6) + 1;
  const lambda0 = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);

  const phi = latitude * (Math.PI / 180);
  const lambda = longitude * (Math.PI / 180);

  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) * Math.sin(phi));
  const T = Math.tan(phi) * Math.tan(phi);
  const C = e_prime2 * Math.cos(phi) * Math.cos(phi);
  const A = Math.cos(phi) * (lambda - lambda0);

  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * phi -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) *
        Math.sin(2 * phi) +
      ((15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024) * Math.sin(4 * phi) -
      ((35 * e2 * e2 * e2) / 3072) * Math.sin(6 * phi));

  const x =
    k0 *
    N *
    (A +
      ((1 - T + C) * A * A * A) / 6 +
      ((5 - 18 * T + T * T + 72 * C - 58 * e_prime2) * A * A * A * A * A) / 120);

  const y =
    k0 *
    (M +
      N *
        Math.tan(phi) *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A * A * A * A) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * e_prime2) *
            A *
            A *
            A *
            A *
            A *
            A) /
            720));

  let easting = x + 500000.0;
  let northing = y;

  if (latitude < 0) {
    northing += 10000000.0;
  }

  const zoneLetter = getUTMZoneLetter(latitude);

  return {
    easting: Math.round(easting * 100) / 100,
    northing: Math.round(northing * 100) / 100,
    zone,
    zoneLetter,
  };
}

function getUTMZoneLetter(latitude: number): string {
  const letters = "CDEFGHJKLMNPQRSTUVWXX";
  if (latitude >= -80 && latitude <= 84) {
    return letters[Math.floor((latitude + 80) / 8)];
  }
  return "Z";
}

export async function captureCurrentUTM(): Promise<UTMCoordinate | null> {
  const location = await getCurrentLocation();
  if (!location) {
    return null;
  }
  return latLngToUTM(location.latitude, location.longitude);
}
