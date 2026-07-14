const fs = require('fs');
const file = './src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add React import if not there
if (!content.includes("import React, {")) {
  content = content.replace("import { useState", "import React, { useState");
}

// Fix CardItem definition to use React.FC
content = content.replace(
  `const CardItem = ({ 
  index, 
  activeCard, 
  handleCardClick, 
  isFlipped, 
  scrollYProgress, 
  deckRotation 
}: {`,
  `const CardItem: React.FC<{`
);
content = content.replace(
  `  deckRotation: any;
}) => {`,
  `  deckRotation: any;
}> = ({
  index, 
  activeCard, 
  handleCardClick, 
  isFlipped, 
  scrollYProgress, 
  deckRotation 
}) => {`
);

fs.writeFileSync(file, content);
console.log("Fixed TS errors");
