import { useState, useEffect, useRef, useCallback } from "react";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";

export interface TrackPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  timestamp: number;
}

interface UseGPSTrackingResult {
  isTracking: boolean;
  trackPoints: TrackPoint[];
  currentLocation: TrackPoint | null;
  startTracking: () => Promise<boolean>;
  stopTracking: () => void;
  clearTrack: () => void;
  totalDistance: number;
  elapsedTime: number;
  error: string | null;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function useGPSTracking(): UseGPSTrackingResult {
  const [isTracking, setIsTracking] = useState(false);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<TrackPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTrackingRef = useRef(false);

  const totalDistance = trackPoints.reduce((acc, point, index) => {
    if (index === 0) return 0;
    const prev = trackPoints[index - 1];
    return acc + calculateDistance(prev.latitude, prev.longitude, point.latitude, point.longitude);
  }, 0);

  const safeRemoveSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.remove();
      } catch (e) {
        // expo-location removeSubscription may not be available on web
      }
      subscriptionRef.current = null;
    }
  }, []);

  const stopTracking = useCallback(() => {
    safeRemoveSubscription();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    isTrackingRef.current = false;
    setIsTracking(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [safeRemoveSubscription]);

  const startTracking = useCallback(async (): Promise<boolean> => {
    if (isTrackingRef.current) return false;

    try {
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permissão de localização negada. Ative o GPS nas configurações.");
        return false;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const initialPoint: TrackPoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        timestamp: Date.now(),
      };

      setTrackPoints([initialPoint]);
      setCurrentLocation(initialPoint);
      setStartTime(Date.now());
      isTrackingRef.current = true;
      setIsTracking(true);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 8000,
          distanceInterval: 5,
        },
        (newLocation) => {
          const newPoint: TrackPoint = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            altitude: newLocation.coords.altitude,
            accuracy: newLocation.coords.accuracy,
            timestamp: Date.now(),
          };

          setCurrentLocation(newPoint);
          setTrackPoints((prev) => {
            if (prev.length > 0) {
              const lastPoint = prev[prev.length - 1];
              const distance = calculateDistance(
                lastPoint.latitude,
                lastPoint.longitude,
                newPoint.latitude,
                newPoint.longitude
              );
              if (distance < 3) {
                return prev;
              }
            }
            return [...prev, newPoint];
          });
        }
      );

      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err) {
      setError("Erro ao iniciar rastreamento. Verifique se o GPS está ativado.");
      console.error("GPS Tracking error:", err);
      isTrackingRef.current = false;
      setIsTracking(false);
      return false;
    }
  }, []);

  const clearTrack = useCallback(() => {
    setTrackPoints([]);
    setCurrentLocation(null);
    setStartTime(null);
    setElapsedTime(0);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.remove();
        } catch (e) {
          // expo-location removeSubscription may not be available on web
        }
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      isTrackingRef.current = false;
    };
  }, []);

  return {
    isTracking,
    trackPoints,
    currentLocation,
    startTracking,
    stopTracking,
    clearTrack,
    totalDistance,
    elapsedTime,
    error,
  };
}
