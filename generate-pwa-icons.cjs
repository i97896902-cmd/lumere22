const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate icon.svg
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0c10"/>
      <stop offset="100%" stop-color="#141824"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#1e1b4b" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background Card -->
  <rect width="512" height="512" rx="108" fill="url(#bgGrad)"/>
  <rect x="8" y="8" width="496" height="496" rx="100" fill="none" stroke="#262c40" stroke-width="4"/>
  
  <!-- Ambient Glow -->
  <circle cx="256" cy="256" r="180" fill="url(#glowGrad)"/>

  <!-- Geometric LUMÉRÉ 'L' Monogram & Prism Motif -->
  <g transform="translate(256, 256)">
    <!-- Tech Diamond Grid Accent -->
    <path d="M0 -150 L130 0 L0 150 L-130 0 Z" fill="none" stroke="#1d283a" stroke-width="8"/>
    <path d="M0 -110 L95 0 L0 110 L-95 0 Z" fill="none" stroke="#2563eb" stroke-opacity="0.4" stroke-width="4"/>

    <!-- Central 'L' Glyph & Modern Geometric Bar -->
    <!-- Vertical pillar -->
    <rect x="-80" y="-120" width="48" height="230" rx="24" fill="url(#accentGrad)"/>
    <!-- Horizontal base -->
    <rect x="-80" y="62" width="160" height="48" rx="24" fill="url(#accentGrad)"/>
    
    <!-- Top accent dot/core -->
    <circle cx="70" cy="-60" r="22" fill="#38bdf8"/>
    <circle cx="25" cy="-20" r="14" fill="#60a5fa" fill-opacity="0.8"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon, 'utf-8');
console.log('Created public/icon.svg');

// PNG encoder helper using zlib
function createPNG(width, height, drawFn) {
  const rowSize = width * 4;
  const rawData = Buffer.alloc((rowSize + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowSize + 1);
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = calcCRC(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  function calcCRC(buf) {
    let c = 0xffffffff;
    for (let n = 0; n < buf.length; n++) {
      c = crcTable[(c ^ buf[n]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflated),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Distance to rounded rectangle helper
function distToRoundedRect(px, py, rx, ry, rw, rh, radius) {
  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  const dx = Math.abs(px - cx) - (rw / 2 - radius);
  const dy = Math.abs(py - cy) - (rh / 2 - radius);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(dx, dy), 0) - radius;
}

// Draw function for LUMÉRÉ Icon
function renderLumereIcon(x, y, w, h, isMaskable = false) {
  // Normalize coords: -1 to 1
  const scale = isMaskable ? 0.72 : 0.88;
  const cx = w / 2;
  const cy = h / 2;
  const nx = (x - cx) / (cx * scale);
  const ny = (y - cy) / (cy * scale);

  // Background is deep dark #0b0c10
  let r = 11;
  let g = 12;
  let b = 16;
  let a = 255;

  if (!isMaskable) {
    // Corner rounding for standard app icon
    const cornerDist = distToRoundedRect(x, y, 0, 0, w, h, w * 0.22);
    if (cornerDist > 1) {
      return [0, 0, 0, 0];
    }
  }

  // Radial subtle background glow
  const distFromCenter = Math.hypot(nx, ny);
  if (distFromCenter < 1.2) {
    const glow = (1.2 - distFromCenter) / 1.2;
    r = Math.min(255, Math.round(r + glow * 15));
    g = Math.min(255, Math.round(g + glow * 25));
    b = Math.min(255, Math.round(b + glow * 60));
  }

  // Diamond frame
  const diamondDist = Math.abs(nx) + Math.abs(ny);
  if (Math.abs(diamondDist - 0.75) < 0.04) {
    return [37, 99, 235, 180];
  }

  // Monogram 'L':
  // Vertical stem: nx in [-0.35, -0.15], ny in [-0.55, 0.45]
  // Horizontal arm: nx in [-0.35, 0.35], ny in [0.25, 0.45]
  const inStem = nx >= -0.36 && nx <= -0.16 && ny >= -0.55 && ny <= 0.45;
  const inArm = nx >= -0.36 && nx <= 0.35 && ny >= 0.25 && ny <= 0.45;

  if (inStem || inArm) {
    // Gradient from sky blue (top/left) to royal blue (bottom/right)
    const factor = (ny + 0.55) / 1.0;
    const ir = Math.round(56 * (1 - factor) + 37 * factor);
    const ig = Math.round(189 * (1 - factor) + 99 * factor);
    const ib = Math.round(248 * (1 - factor) + 235 * factor);
    return [ir, ig, ib, 255];
  }

  // Accent circles (top right)
  const dot1Dist = Math.hypot(nx - 0.25, ny - (-0.28));
  if (dot1Dist <= 0.11) {
    return [56, 189, 248, 255];
  }
  const dot2Dist = Math.hypot(nx - 0.08, ny - (-0.1));
  if (dot2Dist <= 0.07) {
    return [96, 165, 250, 200];
  }

  return [r, g, b, a];
}

// Generate files
const sizes = [
  { name: 'pwa-192x192.png', size: 192, maskable: false },
  { name: 'pwa-512x512.png', size: 512, maskable: false },
  { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'favicon.ico', size: 64, maskable: false },
];

for (const s of sizes) {
  const buf = createPNG(s.size, s.size, (x, y, w, h) => renderLumereIcon(x, y, w, h, s.maskable));
  fs.writeFileSync(path.join(publicDir, s.name), buf);
  console.log(`Generated public/${s.name} (${s.size}x${s.size})`);
}

console.log('All PWA assets generated successfully.');
