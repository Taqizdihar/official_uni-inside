const fs = require('fs');
const buf = fs.readFileSync('src/assets/global/Logo - Dark Theme.png');
// PNG width/height are at bytes 16..24
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
console.log(`Dimensions: ${width}x${height}`);
