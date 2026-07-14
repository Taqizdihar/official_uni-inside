const fs = require('fs');
const file = './src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove bg from Hero
content = content.replace(
  '<div className="relative w-full h-[100vh] flex items-center pt-20 px-8 lg:px-12 z-10 bg-[#202121]">',
  '<div className="relative w-full h-[100vh] flex items-center pt-20 px-8 lg:px-12 z-10">'
);

// 2. Remove bg from About Us
content = content.replace(
  'className={`w-full flex flex-col z-10 bg-[#f0f0f0] ${isInAboutUs ? \'hide-cursor\' : \'\'}`}',
  'className={`w-full flex flex-col z-10 ${isInAboutUs ? \'hide-cursor\' : \'\'}`}'
);

// 3. Remove bg from OurTeamSection
content = content.replace(
  '<div ref={setRefs} className="w-full min-h-[300vh] relative z-10 flex flex-col items-center pt-32 overflow-hidden pb-40 bg-[#202121]">',
  '<div ref={setRefs} className="w-full min-h-[300vh] relative z-10 flex flex-col items-center pt-32 overflow-hidden pb-40">'
);

// 4. Remove Spacer 1
content = content.replace(
  '      {/* Spacer 1 */}\n      <motion.div ref={spacer1Ref} style={{ backgroundColor: spacer1Bg }} className="w-full min-h-[30vh]" />\n\n',
  ''
);

// 5. Replace Spacer 2 with simple div
content = content.replace(
  '      {/* Spacer 2 */}\n      <motion.div ref={spacer2Ref} style={{ backgroundColor: spacer2Bg }} className="w-full min-h-[30vh]" />',
  '      {/* Spacer for Breathing Room */}\n      <div className="w-full min-h-[20vh]" />'
);

// 6. Update PageContent signature to remove spacer props
content = content.replace(
  /  spacer1Ref\?: React\.RefObject<HTMLDivElement>,\n  spacer2Ref\?: React\.RefObject<HTMLDivElement>,\n  spacer1Bg\?: any,\n  spacer2Bg\?: any/,
  ''
);
content = content.replace(
  /  spacer1Ref,\n  spacer2Ref,\n  spacer1Bg,\n  spacer2Bg/,
  ''
);

// Update PageContent usage in App to remove spacer props
content = content.replace(
  /        spacer1Ref=\{spacer1Ref\}\n        spacer2Ref=\{spacer2Ref\}\n        spacer1Bg=\{spacer1Bg\}\n        spacer2Bg=\{spacer2Bg\}/g,
  ''
);

// 7. Remove spacer refs and progresses from App
content = content.replace(
  /  const spacer1Ref = useRef<HTMLDivElement>\(null\);\n  const spacer2Ref = useRef<HTMLDivElement>\(null\);\n\n  const \{ scrollYProgress: spacer1Progress \} = useScroll\(\{\n    target: spacer1Ref,\n    offset: \["start end", "end start"\]\n  \}\);\n\n  const \{ scrollYProgress: spacer2Progress \} = useScroll\(\{\n    target: spacer2Ref,\n    offset: \["start end", "end start"\]\n  \}\);\n\n  const spacer1Bg = useTransform\(spacer1Progress, \[0, 1\], \["#202121", "#f0f0f0"\]\);\n  const spacer2Bg = useTransform\(spacer2Progress, \[0, 1\], \["#f0f0f0", "#202121"\]\);/,
  ''
);

// 8. Re-add teamProgress with correct offset, and background color mapping
const replacement = `  const { scrollYProgress: teamProgress } = useScroll({
    target: teamRef,
    offset: ["start end", "start 20%"]
  });

  const combinedProgress = useTransform(() => aboutProgress.get() + teamProgress.get());
  
  const backgroundColor = useTransform(
    combinedProgress,
    [0, 1, 1, 2],
    ["#202121", "#f0f0f0", "#f0f0f0", "#202121"]
  );`;

content = content.replace(
  '  const combinedProgress = useTransform(() => aboutProgress.get() + spacer2Progress.get());',
  replacement
);

// 9. Add the global motion.div background back in
content = content.replace(
  '      {/* Fixed Navbar */}',
  '      {/* Dynamic Scroll Background */}\n      <motion.div \n        className="fixed inset-0 z-0 pointer-events-none"\n        style={{ backgroundColor }}\n      />\n\n      {/* Fixed Navbar */}'
);

fs.writeFileSync(file, content);
console.log("Revert patched!");
