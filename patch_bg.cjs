const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

// 1. Update PageContent signature
content = content.replace(
  'const PageContent = ({ \n  iconIndex, \n  setIsInAboutUs,\n  isInAboutUs,\n  aboutRef,\n  teamRef,\n  spacerRef\n}: { \n  iconIndex: number, \n  setIsInAboutUs?: (v: boolean) => void,\n  isInAboutUs?: boolean,\n  aboutRef?: React.RefObject<HTMLDivElement>,\n  teamRef?: React.RefObject<HTMLDivElement>,\n  spacerRef?: React.RefObject<HTMLDivElement>\n}) => {',
  `const PageContent = ({ 
  iconIndex, 
  setIsInAboutUs,
  isInAboutUs,
  aboutRef,
  teamRef,
  spacer1Ref,
  spacer2Ref,
  spacer1Bg,
  spacer2Bg
}: { 
  iconIndex: number, 
  setIsInAboutUs?: (v: boolean) => void,
  isInAboutUs?: boolean,
  aboutRef?: React.RefObject<HTMLDivElement>,
  teamRef?: React.RefObject<HTMLDivElement>,
  spacer1Ref?: React.RefObject<HTMLDivElement>,
  spacer2Ref?: React.RefObject<HTMLDivElement>,
  spacer1Bg?: any,
  spacer2Bg?: any
}) => {`
);

// 2. Add bg-[#202121] to Hero
content = content.replace(
  '<div className="relative w-full h-[100vh] flex items-center pt-20 px-8 lg:px-12 z-10">',
  '<div className="relative w-full h-[100vh] flex items-center pt-20 px-8 lg:px-12 z-10 bg-[#202121]">'
);

// 3. Add bg-[#f0f0f0] to About Us
content = content.replace(
  'className={`w-full flex flex-col z-10 ${isInAboutUs ? \'hide-cursor\' : \'\'}`}',
  'className={`w-full flex flex-col z-10 bg-[#f0f0f0] ${isInAboutUs ? \'hide-cursor\' : \'\'}`}'
);

// 4. Replace spacer in PageContent
content = content.replace(
  '      {/* About Us Section */}',
  '      {/* Spacer 1 */}\n      <motion.div ref={spacer1Ref} style={{ backgroundColor: spacer1Bg }} className="w-full min-h-[30vh]" />\n\n      {/* About Us Section */}'
);

content = content.replace(
  '      {/* Spacer for Background Transition */}\n      <div ref={spacerRef} className="w-full min-h-[50vh]" />',
  '      {/* Spacer 2 */}\n      <motion.div ref={spacer2Ref} style={{ backgroundColor: spacer2Bg }} className="w-full min-h-[30vh]" />'
);

// 5. Add bg-[#202121] to OurTeamSection
content = content.replace(
  '<div ref={setRefs} className="w-full min-h-[300vh] relative z-10 flex flex-col items-center pt-32 overflow-hidden pb-40">',
  '<div ref={setRefs} className="w-full min-h-[300vh] relative z-10 flex flex-col items-center pt-32 overflow-hidden pb-40 bg-[#202121]">'
);

// 6. Update App component variables
// First, find the exact string to replace
const oldAppVars = `  const { scrollYProgress: spacerProgress } = useScroll({
    target: spacerRef,
    offset: ["start end", "end start"]
  });`;

const newAppVars = `  const spacer1Ref = useRef<HTMLDivElement>(null);
  const spacer2Ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress: spacer1Progress } = useScroll({
    target: spacer1Ref,
    offset: ["start end", "end start"]
  });

  const { scrollYProgress: spacer2Progress } = useScroll({
    target: spacer2Ref,
    offset: ["start end", "end start"]
  });

  const spacer1Bg = useTransform(spacer1Progress, [0, 1], ["#202121", "#f0f0f0"]);
  const spacer2Bg = useTransform(spacer2Progress, [0, 1], ["#f0f0f0", "#202121"]);`;

content = content.replace(
  '  const spacerRef = useRef<HTMLDivElement>(null);\n\n  const { scrollYProgress: aboutProgress }',
  '  const { scrollYProgress: aboutProgress }'
);
content = content.replace(oldAppVars, newAppVars);

// Update PageContent usage in App
content = content.replace(
  '        spacerRef={spacerRef}',
  '        spacer1Ref={spacer1Ref}\n        spacer2Ref={spacer2Ref}\n        spacer1Bg={spacer1Bg}\n        spacer2Bg={spacer2Bg}'
);
content = content.replace(
  '        spacerRef={spacerRef}',
  '        spacer1Ref={spacer1Ref}\n        spacer2Ref={spacer2Ref}\n        spacer1Bg={spacer1Bg}\n        spacer2Bg={spacer2Bg}'
); // Just in case there are two instances (one in main, one in glass)

// 7. Update combined progress and remove global background
content = content.replace(
  '  const combinedProgress = useTransform(() => aboutProgress.get() + spacerProgress.get());',
  '  const combinedProgress = useTransform(() => aboutProgress.get() + spacer2Progress.get());'
);
content = content.replace(
  /  \/\/ Dynamic Multi-Wipe Background[\s\S]*?const background = useMotionTemplate[^;]+;/g,
  ''
);

// 8. Remove the global motion.div background
content = content.replace(
  /      \{\/\* Dynamic Scroll Background \*\/\}[\s\S]*?      <motion\.div [\s\S]*?        style=\{\{ background \}\}[\s\S]*?      \/>/g,
  ''
);

// 9. Update the glass cursor to NOT use background, since PageContent handles it!
content = content.replace(
  '                  transformOrigin: magTransformOrigin,\n                  scale: 1.5,\n                  background\n                }}',
  '                  transformOrigin: magTransformOrigin,\n                  scale: 1.5\n                }}'
);


fs.writeFileSync('./src/App.tsx', content);
console.log("Patched!");
