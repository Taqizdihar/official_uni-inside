const fs = require('fs');
const file = './src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update PageContent props
content = content.replace(
  'teamRef?: React.RefObject<HTMLDivElement>',
  'teamRef?: React.RefObject<HTMLDivElement>,\n  spacerRef?: React.RefObject<HTMLDivElement>'
);
content = content.replace(
  'aboutRef,\n  teamRef\n}: {',
  'aboutRef,\n  teamRef,\n  spacerRef\n}: {'
);

// Add Spacer in PageContent
content = content.replace(
  '        <FilmRollSection />\n      </div>\n\n      {/* Our Team Section */}\n      <OurTeamSection ref={teamRef} />',
  '        <FilmRollSection />\n      </div>\n\n      {/* Spacer for Background Transition */}\n      <div ref={spacerRef} className="w-full min-h-[50vh]" />\n\n      {/* Our Team Section */}\n      <OurTeamSection ref={teamRef} />'
);

// Update App component variables
// 1. Add spacerRef and spacerProgress
content = content.replace(
  '  const teamRef = useRef<HTMLDivElement>(null);\n\n  const { scrollYProgress: aboutProgress } = useScroll({\n    target: aboutRef,\n    offset: ["start end", "start start"]\n  });\n\n  const { scrollYProgress: teamProgress } = useScroll({\n    target: teamRef,\n    offset: ["start 50%", "start start"]\n  });',
  '  const teamRef = useRef<HTMLDivElement>(null);\n  const spacerRef = useRef<HTMLDivElement>(null);\n\n  const { scrollYProgress: aboutProgress } = useScroll({\n    target: aboutRef,\n    offset: ["start end", "start start"]\n  });\n\n  const { scrollYProgress: spacerProgress } = useScroll({\n    target: spacerRef,\n    offset: ["start end", "end start"]\n  });'
);

// 2. Pass spacerRef to PageContent
content = content.replace(
  '        aboutRef={aboutRef}\n        teamRef={teamRef}\n      />',
  '        aboutRef={aboutRef}\n        teamRef={teamRef}\n        spacerRef={spacerRef}\n      />'
);

// 3. Replace teamProgress with spacerProgress
content = content.replace(
  '  const combinedProgress = useTransform(() => aboutProgress.get() + teamProgress.get());',
  '  const combinedProgress = useTransform(() => aboutProgress.get() + spacerProgress.get());'
);
content = content.replace(
  '  const stop0 = useTransform(() => -100 + (teamProgress.get() * 200));\n  const stop1 = useTransform(() => -100 + (aboutProgress.get() * 200) + (teamProgress.get() * 200));\n  const stop2 = useTransform(() => 0 + (aboutProgress.get() * 200) + (teamProgress.get() * 200));',
  '  const stop0 = useTransform(() => -100 + (spacerProgress.get() * 200));\n  const stop1 = useTransform(() => -100 + (aboutProgress.get() * 200) + (spacerProgress.get() * 200));\n  const stop2 = useTransform(() => 0 + (aboutProgress.get() * 200) + (spacerProgress.get() * 200));'
);

fs.writeFileSync(file, content);
console.log("Patched spacer");
