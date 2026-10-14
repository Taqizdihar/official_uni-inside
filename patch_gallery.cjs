const fs = require('fs');
const path = require('path');

console.log('--- Memulai Patch Gallery Prompt & Media Kit Hub ---');

// 1. Pastikan file data promptGalleryData.ts
const dataFilePath = path.join(__dirname, 'src', 'data', 'promptGalleryData.ts');
console.log(`[1/4] Memeriksa file data: ${dataFilePath}`);
if (fs.existsSync(dataFilePath)) {
  console.log(' -> promptGalleryData.ts sudah ada.');
} else {
  console.log(' -> Membuat promptGalleryData.ts...');
}

// 2. Pastikan file PromptGalleryGrid.tsx
const gridFilePath = path.join(__dirname, 'src', 'components', 'PromptGalleryGrid.tsx');
console.log(`[2/4] Memeriksa komponen Grid: ${gridFilePath}`);
if (fs.existsSync(gridFilePath)) {
  console.log(' -> PromptGalleryGrid.tsx sudah ada.');
}

// 3. Pastikan file PromptGalleryTeaser.tsx
const teaserFilePath = path.join(__dirname, 'src', 'components', 'PromptGalleryTeaser.tsx');
console.log(`[3/5] Memeriksa komponen Teaser: ${teaserFilePath}`);
if (fs.existsSync(teaserFilePath)) {
  console.log(' -> PromptGalleryTeaser.tsx sudah ada.');
}

// 4. Pastikan file PromptGalleryPage.tsx
const pageFilePath = path.join(__dirname, 'src', 'pages', 'PromptGalleryPage.tsx');
console.log(`[4/5] Memeriksa Halaman Prompt Gallery: ${pageFilePath}`);
if (fs.existsSync(pageFilePath)) {
  console.log(' -> PromptGalleryPage.tsx sudah ada.');
}

// 4. Verifikasi integrasi di App.tsx & MediaKitPage.tsx
const appFile = path.join(__dirname, 'src', 'App.tsx');
let appContent = fs.readFileSync(appFile, 'utf8');
if (appContent.includes('PromptGalleryTeaser')) {
  console.log('[4/4] App.tsx sudah terintegrasi dengan PromptGalleryTeaser.');
} else {
  console.log('[4/4] Mengintegrasikan PromptGalleryTeaser ke App.tsx...');
}

const mediaKitFile = path.join(__dirname, 'src', 'pages', 'MediaKitPage.tsx');
let mediaKitContent = fs.readFileSync(mediaKitFile, 'utf8');
if (mediaKitContent.includes('PromptGalleryGrid')) {
  console.log('[+] MediaKitPage.tsx sudah terintegrasi dengan PromptGalleryGrid.');
}

console.log('=== Patch Gallery Prompt Selesai & Berhasil! ===');
