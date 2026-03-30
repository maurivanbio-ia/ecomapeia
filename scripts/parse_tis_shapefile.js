/**
 * Parse Terra Indígena shapefile (SHP + DBF) and output a lightweight JSON
 * with centroids for distance calculations.
 * 
 * Usage: node scripts/parse_tis_shapefile.js
 */

const fs = require('fs');
const path = require('path');

const SHP_PATH = path.join(__dirname, '../attached_assets/tis_poligonais_1774890143908.shp');
const DBF_PATH = path.join(__dirname, '../attached_assets/tis_poligonais_1774890143908.dbf');
const OUTPUT_PATH = path.join(__dirname, '../server/data/tis_brasil.json');

// ─── SHP Parser ──────────────────────────────────────────────────────────────

function parseShp(buf) {
  const features = [];
  let offset = 100; // skip 100-byte file header

  while (offset < buf.length) {
    if (offset + 8 > buf.length) break;

    // Record header (big-endian)
    const recNum = buf.readInt32BE(offset);
    const contentLen = buf.readInt32BE(offset + 4) * 2; // in bytes
    offset += 8;

    if (offset + contentLen > buf.length) break;

    const shapeType = buf.readInt32LE(offset);

    if (shapeType === 5 || shapeType === 15 || shapeType === 25) {
      // Polygon / PolygonZ / PolygonM
      const bboxXmin = buf.readDoubleLE(offset + 4);
      const bboxYmin = buf.readDoubleLE(offset + 12);
      const bboxXmax = buf.readDoubleLE(offset + 20);
      const bboxYmax = buf.readDoubleLE(offset + 28);

      const centroidLon = (bboxXmin + bboxXmax) / 2;
      const centroidLat = (bboxYmin + bboxYmax) / 2;

      features.push({
        recNum,
        centroidLat,
        centroidLon,
        bbox: [bboxXmin, bboxYmin, bboxXmax, bboxYmax],
      });
    }

    offset += contentLen;
  }

  return features;
}

// ─── DBF Parser ──────────────────────────────────────────────────────────────

function parseDbf(buf) {
  // DBF header
  const numRecords = buf.readUInt32LE(4);
  const headerSize = buf.readUInt16LE(8);
  const recordSize = buf.readUInt16LE(10);

  // Parse field descriptors (32 bytes each, starts at offset 32, ends at headerSize)
  const fields = [];
  let pos = 32;
  while (pos < headerSize - 1) {
    const name = buf.slice(pos, pos + 11).toString('latin1').replace(/\0/g, '').trim();
    const type = buf.slice(pos + 11, pos + 12).toString('ascii');
    const length = buf.readUInt8(pos + 16);
    fields.push({ name, type, length });
    pos += 32;
  }

  // Parse records
  const records = [];
  let recordOffset = headerSize;
  for (let i = 0; i < numRecords; i++) {
    const deleted = buf.readUInt8(recordOffset);
    if (deleted === 0x2A) { // '*' = deleted
      recordOffset += recordSize;
      continue;
    }
    recordOffset += 1; // skip deletion flag

    const record = {};
    for (const field of fields) {
      const raw = buf.slice(recordOffset, recordOffset + field.length)
        .toString('latin1').trim();
      record[field.name] = raw;
      recordOffset += field.length;
    }
    records.push(record);
  }

  return records;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('Reading SHP file...');
const shpBuf = fs.readFileSync(SHP_PATH);
console.log(`SHP size: ${(shpBuf.length / 1024 / 1024).toFixed(1)} MB`);

console.log('Parsing SHP...');
const features = parseShp(shpBuf);
console.log(`Found ${features.length} polygon records`);

console.log('Reading DBF file...');
const dbfBuf = fs.readFileSync(DBF_PATH);

console.log('Parsing DBF...');
const records = parseDbf(dbfBuf);
console.log(`Found ${records.length} DBF records`);

// Print first record fields to understand structure
if (records.length > 0) {
  console.log('DBF fields:', Object.keys(records[0]));
  console.log('First record:', records[0]);
}

// ─── Combine SHP + DBF ────────────────────────────────────────────────────────

const tis = features.map((f, i) => {
  const rec = records[i] || {};
  return {
    nome: rec['terrai_nom'] || rec['TERRAI_NOM'] || rec['nome'] || rec['NOME'] || rec['TI_NOME'] || `TI ${f.recNum}`,
    etnia: rec['etnia_nome'] || rec['ETNIA_NOME'] || rec['etnia'] || '',
    municipio: rec['municipio_'] || rec['MUNICIPIO_'] || rec['municipio'] || '',
    uf: rec['uf_sigla'] || rec['UF_SIGLA'] || rec['uf'] || '',
    fase: rec['fase_ti'] || rec['FASE_TI'] || rec['fase'] || '',
    area_ha: parseFloat(rec['area_ha'] || rec['AREA_HA'] || '0') || 0,
    centroidLat: f.centroidLat,
    centroidLon: f.centroidLon,
  };
}).filter(t => t.centroidLat !== 0 && t.centroidLon !== 0);

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(tis, null, 2));
console.log(`\nOutput: ${OUTPUT_PATH}`);
console.log(`Total TIs: ${tis.length}`);
console.log(`File size: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1)} KB`);
console.log('\nSample entry:');
console.log(JSON.stringify(tis[0], null, 2));
