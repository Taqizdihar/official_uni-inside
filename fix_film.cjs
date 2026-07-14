const fs = require('fs');
const file = './src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const FilmFrame = ({ name }: { name: string }) => (',
  'const FilmFrame: React.FC<{ name: string }> = ({ name }) => ('
);

fs.writeFileSync(file, content);
