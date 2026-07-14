const fs = require('fs');
const file = './src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix map
content = content.replace(
  '{duplicatedPartners.map((name, index) => (',
  '{duplicatedPartners.map((name: string, index: number) => ('
);

// Fix latest
content = content.replace(
  'const cardAngle = useTransform(scrollYProgress, (latest) => (index - 4) * (10 + latest * 30));',
  'const cardAngle = useTransform(scrollYProgress, (latest: any) => (index - 4) * (10 + (latest as number) * 30));'
);

fs.writeFileSync(file, content);
