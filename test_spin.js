const raw = 720;
const wrapped = 0;
for (let h = 0; h <= 1; h += 0.2) {
  console.log(`h=${h.toFixed(1)}, inverse=${raw * (1 - h) - wrapped}`);
}
