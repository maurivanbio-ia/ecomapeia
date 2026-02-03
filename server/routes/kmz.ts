import { Router, Request, Response } from "express";
import * as archiver from "archiver";
import { storage } from "../storage";

const router = Router();

interface TrackPoint {
  lat: number;
  lon: number;
  alt?: number;
  acc?: number;
  ts?: number;
}

function utmToLatLon(e: number, n: number, zone: number = 23, hemisphere: string = "S"): { lat: number; lon: number } {
  const k0 = 0.9996;
  const a = 6378137;
  const e1sq = 0.006739497;
  const ecc = 0.081819191;
  
  const lonOrigin = (zone - 1) * 6 - 180 + 3;
  const eccPrimeSquared = e1sq;
  
  let y = n;
  if (hemisphere === "S") {
    y = 10000000 - n;
  }
  const x = e - 500000;
  
  const M = y / k0;
  const mu = M / (a * (1 - ecc * ecc / 4 - 3 * ecc * ecc * ecc * ecc / 64));
  
  const e1 = (1 - Math.sqrt(1 - ecc * ecc)) / (1 + Math.sqrt(1 - ecc * ecc));
  const phi1 = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
    + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
    + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);
  
  const N1 = a / Math.sqrt(1 - ecc * ecc * Math.sin(phi1) * Math.sin(phi1));
  const T1 = Math.tan(phi1) * Math.tan(phi1);
  const C1 = eccPrimeSquared * Math.cos(phi1) * Math.cos(phi1);
  const R1 = a * (1 - ecc * ecc) / Math.pow(1 - ecc * ecc * Math.sin(phi1) * Math.sin(phi1), 1.5);
  const D = x / (N1 * k0);
  
  let lat = phi1 - (N1 * Math.tan(phi1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eccPrimeSquared) * D * D * D * D / 24);
  let lon = (D - (1 + 2 * T1 + C1) * D * D * D / 6) / Math.cos(phi1);
  
  lat = lat * 180 / Math.PI;
  lon = lon * 180 / Math.PI + lonOrigin;
  
  if (hemisphere === "S") {
    lat = -lat;
  }
  
  return { lat, lon };
}

function generateKML(
  vistoriaId: string,
  proprietario: string,
  dataVistoria: string,
  polygonCoords: Array<{ lat: number; lon: number }>,
  trackPoints: TrackPoint[]
): string {
  const polygonCoordStr = polygonCoords
    .map(c => `${c.lon},${c.lat},0`)
    .join(" ");
  
  const closePolygon = polygonCoords.length > 0
    ? `${polygonCoords[0].lon},${polygonCoords[0].lat},0`
    : "";
  
  const trackCoordStr = trackPoints
    .map(p => `${p.lon},${p.lat},${p.alt || 0}`)
    .join(" ");
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name>Vistoria ${vistoriaId}</name>
    <description>Vistoria Ambiental - ${proprietario} - ${dataVistoria}</description>
    
    <Style id="polygonStyle">
      <LineStyle>
        <color>ff00ff00</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>4000ff00</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>
    
    <Style id="trackStyle">
      <LineStyle>
        <color>ff006bff</color>
        <width>4</width>
      </LineStyle>
    </Style>
    
    <Style id="startMarker">
      <IconStyle>
        <color>ff006bff</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/go.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <Style id="endMarker">
      <IconStyle>
        <color>ff0000ff</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/stop.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    <Folder>
      <name>Área da Propriedade</name>
      <description>Polígono delimitando a área inspecionada</description>
      ${polygonCoords.length > 2 ? `
      <Placemark>
        <name>Limite da Propriedade</name>
        <description>Proprietário: ${proprietario}</description>
        <styleUrl>#polygonStyle</styleUrl>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${polygonCoordStr} ${closePolygon}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>
      ` : ""}
    </Folder>
    
    <Folder>
      <name>Trajeto do Inspetor</name>
      <description>Caminho percorrido durante a vistoria</description>
      ${trackPoints.length > 0 ? `
      <Placemark>
        <name>Início do Trajeto</name>
        <description>Ponto inicial da vistoria</description>
        <styleUrl>#startMarker</styleUrl>
        <Point>
          <coordinates>${trackPoints[0].lon},${trackPoints[0].lat},${trackPoints[0].alt || 0}</coordinates>
        </Point>
      </Placemark>
      
      <Placemark>
        <name>Trajeto</name>
        <description>Caminho percorrido pelo inspetor</description>
        <styleUrl>#trackStyle</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <altitudeMode>clampToGround</altitudeMode>
          <coordinates>${trackCoordStr}</coordinates>
        </LineString>
      </Placemark>
      
      <Placemark>
        <name>Fim do Trajeto</name>
        <description>Ponto final da vistoria</description>
        <styleUrl>#endMarker</styleUrl>
        <Point>
          <coordinates>${trackPoints[trackPoints.length - 1].lon},${trackPoints[trackPoints.length - 1].lat},${trackPoints[trackPoints.length - 1].alt || 0}</coordinates>
        </Point>
      </Placemark>
      ` : ""}
    </Folder>
    
  </Document>
</kml>`;
}

router.get("/export/:vistoriaId", async (req: Request, res: Response) => {
  try {
    const vistoriaId = Array.isArray(req.params.vistoriaId) 
      ? req.params.vistoriaId[0] 
      : req.params.vistoriaId;
    const format = Array.isArray(req.query.format) 
      ? req.query.format[0] 
      : (req.query.format as string) || "kmz";
    
    const vistoria = await storage.getVistoria(vistoriaId);
    if (!vistoria) {
      return res.status(404).json({ error: "Vistoria não encontrada" });
    }
    
    const coordenadas = await storage.getCoordenadas(vistoriaId);
    
    const zone = vistoria.zona_utm ? parseInt(vistoria.zona_utm.replace(/[^0-9]/g, "")) : 23;
    const hemisphere = vistoria.zona_utm?.includes("N") ? "N" : "S";
    
    const polygonCoords: Array<{ lat: number; lon: number }> = [];
    for (const coord of coordenadas) {
      if (coord.latitude && coord.longitude) {
        polygonCoords.push({
          lat: parseFloat(coord.latitude.toString()),
          lon: parseFloat(coord.longitude.toString()),
        });
      }
    }
    
    const trackPoints: TrackPoint[] = Array.isArray(vistoria.track_points)
      ? (vistoria.track_points as TrackPoint[])
      : [];
    
    const dataVistoria = vistoria.data_vistoria
      ? new Date(vistoria.data_vistoria).toLocaleDateString("pt-BR")
      : "N/A";
    
    const kmlContent = generateKML(
      vistoriaId,
      vistoria.proprietario || "Não informado",
      dataVistoria,
      polygonCoords,
      trackPoints
    );
    
    if (format === "kml") {
      res.setHeader("Content-Type", "application/vnd.google-earth.kml+xml");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="vistoria_${vistoriaId}.kml"`
      );
      return res.send(kmlContent);
    }
    
    const archive = archiver.default("zip", { zlib: { level: 9 } });
    
    res.setHeader("Content-Type", "application/vnd.google-earth.kmz");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="vistoria_${vistoriaId}.kmz"`
    );
    
    archive.pipe(res);
    archive.append(kmlContent, { name: "doc.kml" });
    await archive.finalize();
    
  } catch (error) {
    console.error("Error exporting KMZ:", error);
    return res.status(500).json({ error: "Erro ao exportar arquivo KMZ" });
  }
});

export default router;
