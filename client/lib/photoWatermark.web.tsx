/**
 * Web-specific implementation of PhotoWatermarkProcessor.
 * Uses HTML5 Canvas to composite the watermark directly onto the image,
 * since react-native-view-shot / captureRef does not work in web browsers.
 */
import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import * as Location from "expo-location";

export interface WatermarkData {
  timestamp: string;
  coordinates: string;
  lat?: number;
  lng?: number;
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "W" : "E";
  return `${Math.abs(lat).toFixed(6)}°${latDir} ${Math.abs(lng).toFixed(6)}°${lngDir}`;
}

export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch {
    return null;
  }
}

export function createWatermarkData(location: { lat: number; lng: number } | null): WatermarkData {
  const now = new Date();
  return {
    timestamp: formatDateTime(now),
    coordinates: location ? formatCoordinates(location.lat, location.lng) : "GPS não disponível",
    lat: location?.lat,
    lng: location?.lng,
  };
}

interface PhotoWatermarkProcessorProps {
  pendingPhoto: {
    id: string;
    uri: string;
    watermarkData: WatermarkData;
  } | null;
  onProcessed: (id: string, newUri: string) => void;
  onError: (id: string) => void;
}

async function applyWatermarkWithCanvas(
  imageUri: string,
  watermarkData: WatermarkData
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      const w = canvas.width;
      const h = canvas.height;
      const scale = Math.max(w / 1080, 1); // scale relative to ~1080px width

      // ─── TOP LEFT: EcoBrasil logo ─────────────────────────────────────
      const logoFontSize = Math.round(22 * scale);
      const logoPadX = Math.round(14 * scale);
      const logoPadY = Math.round(10 * scale);
      const logoX = Math.round(16 * scale);
      const logoY = Math.round(16 * scale);

      // Measure text
      ctx.font = `800 ${logoFontSize}px sans-serif`;
      const ecoWidth = ctx.measureText("Eco").width;
      ctx.font = `800 ${logoFontSize}px sans-serif`;
      const brasilWidth = ctx.measureText("Brasil").width;
      const totalTextWidth = ecoWidth + brasilWidth;

      // Badge background
      const badgeW = totalTextWidth + logoPadX * 2;
      const badgeH = logoFontSize + logoPadY * 2;

      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      roundRect(ctx, logoX, logoY, badgeW, badgeH, Math.round(6 * scale));

      // "Eco" in green
      ctx.font = `800 ${logoFontSize}px sans-serif`;
      ctx.fillStyle = "#4ADE80";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText("Eco", logoX + logoPadX, logoY + logoPadY + logoFontSize * 0.8);

      // "Brasil" in white
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("Brasil", logoX + logoPadX + ecoWidth, logoY + logoPadY + logoFontSize * 0.8);

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // ─── BOTTOM RIGHT: timestamp + coordinates ────────────────────────
      const tsFontSize = Math.round(14 * scale);
      const coordFontSize = Math.round(12 * scale);
      const tsPadX = Math.round(12 * scale);
      const tsPadY = Math.round(8 * scale);
      const lineSpacing = Math.round(5 * scale);

      ctx.font = `600 ${tsFontSize}px monospace`;
      const tsWidth = ctx.measureText(watermarkData.timestamp).width;
      ctx.font = `500 ${coordFontSize}px monospace`;
      const coordWidth = ctx.measureText(watermarkData.coordinates).width;

      const badgeTextW = Math.max(tsWidth, coordWidth) + tsPadX * 2;
      const badgeTsH = tsPadY * 2 + tsFontSize + lineSpacing + coordFontSize;

      const tsX = w - badgeTextW - Math.round(16 * scale);
      const tsY = h - badgeTsH - Math.round(16 * scale);

      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      roundRect(ctx, tsX, tsY, badgeTextW, badgeTsH, Math.round(4 * scale));

      // Timestamp line
      ctx.font = `600 ${tsFontSize}px monospace`;
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "right";
      ctx.fillText(watermarkData.timestamp, tsX + badgeTextW - tsPadX, tsY + tsPadY + tsFontSize * 0.85);

      // Coordinates line
      ctx.font = `500 ${coordFontSize}px monospace`;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(
        watermarkData.coordinates,
        tsX + badgeTextW - tsPadX,
        tsY + tsPadY + tsFontSize + lineSpacing + coordFontSize * 0.85
      );

      ctx.textAlign = "left";

      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUri;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

export function PhotoWatermarkProcessor({
  pendingPhoto,
  onProcessed,
  onError,
}: PhotoWatermarkProcessorProps) {
  const processingRef = useRef(false);

  useEffect(() => {
    if (!pendingPhoto || processingRef.current) return;
    processingRef.current = true;

    applyWatermarkWithCanvas(pendingPhoto.uri, pendingPhoto.watermarkData)
      .then((dataUrl) => {
        processingRef.current = false;
        onProcessed(pendingPhoto.id, dataUrl);
      })
      .catch((err) => {
        console.error("Web watermark error:", err);
        processingRef.current = false;
        onError(pendingPhoto.id);
      });
  }, [pendingPhoto?.id]);

  // Invisible on web — processing happens off-screen
  return <View style={{ position: "absolute", width: 0, height: 0 }} />;
}
