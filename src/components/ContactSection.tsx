import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimation, useMotionValue, useDragControls } from 'motion/react';
import { FaWhatsapp, FaInstagram, FaTiktok, FaLinkedinIn } from 'react-icons/fa6';
import craftsLogo from '../assets/global/Uni-Inside Crafts.png';
import telephoneBody from '../assets/contact-us/Telephone Body.png';
import telephoneHandset from '../assets/contact-us/Telephone Handset.png';
import telephoneNote from '../assets/contact-us/Telephone Note.png';
import noteDetail from '../assets/contact-us/Note Detail.png';
import handImage from '../assets/contact-us/Hand.png';
import handPhoneImage from '../assets/contact-us/Hand Phone.png';
import paperPickSound from '../assets/audio/contact-us/Paper Pick.mp3';
import paperPutSound from '../assets/audio/contact-us/Paper Put.mp3';
import manTalking1 from '../assets/audio/contact-us/Man Talking 1.mp3';
import manTalking2 from '../assets/audio/contact-us/Man Talking 2.mp3';
import manTalking3 from '../assets/audio/contact-us/Man Talking 3.mp3';
import phonePickSound from '../assets/audio/contact-us/Phone Pick.mp3';
import phoneGrabSound from '../assets/audio/contact-us/Phone Grab.mp3';

const manTalkingSounds = [manTalking1, manTalking2, manTalking3];

const chatMessages = [
  "Wonderful service!",
  "Amazing designs!",
  "I love the souvenirs!",
  "Let's collaborate!",
  "Creativity of Coolness!",
  "Let's work together again soon!",
  "Love the theme!",
  "Successful studio soon!",
  "Keep up the good work!",
  "Nice Events!"
];

// Anchor on Hand Phone PNG at (23,316) → 1.13%, 11.7%
// Slots positioned to the upper-left outside Hand Phone.
// Rotation = atan2(anchorY - slotY, anchorX - slotX) so right side of bubble points to anchor.
const bubbleSlots = [
  { x: -48, y: -8,  rot: Math.round(Math.atan2(11.7 - (-8),  1.13 - (-48)) * (180 / Math.PI)), tailClass: '-right-[6px] top-1/2 -translate-y-1/2' },
  { x: -42, y: 8,   rot: Math.round(Math.atan2(11.7 - 8,     1.13 - (-42)) * (180 / Math.PI)), tailClass: '-right-[6px] top-[35%]' },
  { x: -35, y: -22, rot: Math.round(Math.atan2(11.7 - (-22),  1.13 - (-35)) * (180 / Math.PI)), tailClass: '-right-[6px] bottom-[25%]' },
];

interface ChatBubbleData {
  id: number;
  text: string;
  slotIdx: number;
}

const CustomCIcon = (props: any) => (
  <img 
    src={craftsLogo} 
    alt="Uni-Inside Crafts" 
    className={`${props.className} object-contain`} 
  />
);

const socials = [
  { id: 'whatsapp', name: 'WhatsApp', Icon: FaWhatsapp, url: 'https://wa.me/6281316556908' },
  { id: 'instagram', name: 'Instagram', Icon: FaInstagram, url: 'https://www.instagram.com/uniinside.studio?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==' },
  { id: 'tiktok', name: 'TikTok', Icon: FaTiktok, url: 'https://www.tiktok.com/@uniinside.studio?is_from_webapp=1&sender_device=pc' },
  { id: 'linkedin', name: 'LinkedIn', Icon: FaLinkedinIn, url: 'https://www.linkedin.com/company/uni-inside-studio' },
  { id: 'custom', name: 'Uni-Inside Crafts', Icon: CustomCIcon, url: 'https://www.instagram.com/uniinside.craft/?utm_source=ig_web_button_share_sheet' },
];


const RopeSimulation = ({ startRef, endRef, altEndRef, useAltEnd }: { startRef: React.RefObject<HTMLDivElement>, endRef: React.RefObject<HTMLDivElement>, altEndRef: React.RefObject<HTMLDivElement>, useAltEnd: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const useAltEndRef = useRef(useAltEnd);

  useEffect(() => {
    useAltEndRef.current = useAltEnd;
  }, [useAltEnd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const NUM_POINTS = 20;
    const SEGMENT_LENGTH = window.innerWidth < 600 ? 12 : 18;

    let points: any[] = [];
    let sticks: any[] = [];

    for (let i = 0; i < NUM_POINTS; i++) {
      points.push({ x: 0, y: 0, oldX: 0, oldY: 0, pinned: false });
    }
    for (let i = 0; i < NUM_POINTS - 1; i++) {
      sticks.push({ p1: points[i], p2: points[i+1], length: SEGMENT_LENGTH });
    }

    let animationFrameId: number;
    let isInitialized = false;

    const update = () => {
      // Use altEndRef if its element exists, otherwise fall back to endRef
      const activeEndRef = useAltEndRef.current ? altEndRef : endRef;
      if (!startRef.current || !activeEndRef.current) {
        animationFrameId = requestAnimationFrame(update);
        return;
      }
      
      const startRect = startRef.current.getBoundingClientRect();
      const endRect = activeEndRef.current.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();

      const sx = startRect.left - canvasRect.left + startRect.width / 2;
      const sy = startRect.top - canvasRect.top + startRect.height / 2;
      
      const ex = endRect.left - canvasRect.left + endRect.width / 2;
      const ey = endRect.top - canvasRect.top + endRect.height / 2;

      if (!isInitialized || isNaN(sx) || isNaN(ey)) {
        if (!isNaN(sx) && !isNaN(ey)) {
          for (let i = 0; i < NUM_POINTS; i++) {
            const t = i / (NUM_POINTS - 1);
            points[i].x = points[i].oldX = sx + (ex - sx) * t;
            points[i].y = points[i].oldY = sy + (ey - sy) * t;
          }
          isInitialized = true;
        }
      }

      points[0].x = sx; points[0].y = sy; points[0].pinned = true;
      points[NUM_POINTS - 1].x = ex; points[NUM_POINTS - 1].y = ey; points[NUM_POINTS - 1].pinned = true;

      for (let p of points) {
        if (!p.pinned) {
          const vx = (p.x - p.oldX) * 0.95;
          const vy = (p.y - p.oldY) * 0.95;
          p.oldX = p.x; p.oldY = p.y;
          p.x += vx; p.y += vy + 1.2;
        }
      }

      for (let i = 0; i < 20; i++) {
        for (let s of sticks) {
          const dx = s.p2.x - s.p1.x;
          const dy = s.p2.y - s.p1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const difference = s.length - distance;
          const percent = (distance === 0) ? 0 : (difference / distance / 2);
          const offsetX = dx * percent;
          const offsetY = dy * percent;

          if (!s.p1.pinned) { s.p1.x -= offsetX; s.p1.y -= offsetY; }
          if (!s.p2.pinned) { s.p2.x += offsetX; s.p2.y += offsetY; }
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = '#202121';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < NUM_POINTS - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[NUM_POINTS - 1].x, points[NUM_POINTS - 1].y);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(update);
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
    update();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

export const ContactSection = () => {
  const [hoveredSocial, setHoveredSocial] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hideSmallNote, setHideSmallNote] = useState(false);
  
  const handsetControls = useAnimation();
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const dragRotate = useMotionValue(0);
  const dragControls = useDragControls();
  
  const [hasHandAppeared, setHasHandAppeared] = useState(false);
  const [isHandHoldingPhone, setIsHandHoldingPhone] = useState(false);
  const [isPickedUp, setIsPickedUp] = useState(false);
  const [isDropped, setIsDropped] = useState(false);
  const handsetAttachmentRef = useRef<HTMLDivElement>(null);
  const bodyAttachmentRef = useRef<HTMLDivElement>(null);
  const handsetWrapperRef = useRef<HTMLDivElement>(null);
  const pointerDownTimeRef = useRef<number>(0);
  const handsetDragRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const physicsRef = useRef<number | null>(null);
  const handImageRef = useRef<HTMLImageElement>(null);
  const handPhoneAttachmentRef = useRef<HTMLDivElement>(null);

  const [chatBubbles, setChatBubbles] = useState<ChatBubbleData[]>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let slotCounter = 0;
    const recentIndices: number[] = [];

    if (isHandHoldingPhone) {
      interval = setInterval(() => {
        let idx: number;
        do {
          idx = Math.floor(Math.random() * chatMessages.length);
        } while (recentIndices.includes(idx));

        recentIndices.push(idx);
        if (recentIndices.length > 3) {
          recentIndices.shift();
        }

        const text = chatMessages[idx];
        const slotIdx = slotCounter % bubbleSlots.length;
        slotCounter++;

        const newBubble: ChatBubbleData = { id: Date.now(), text, slotIdx };

        setChatBubbles(prev => {
          const next = [...prev, newBubble];
          return next.length > 3 ? next.slice(next.length - 3) : next;
        });

        setTimeout(() => {
          setChatBubbles(prev => prev.filter(b => b.id !== newBubble.id));
        }, 3500);
      }, 2000);
    } else {
      setChatBubbles([]);
    }
    return () => clearInterval(interval);
  }, [isHandHoldingPhone]);

  useEffect(() => {
    if (!isHandHoldingPhone) return;

    let isCancelled = false;
    let currentAudio: HTMLAudioElement | null = null;
    let playlist: number[] = [];

    const shuffleIndices = () => {
      const arr = [0, 1, 2];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const playNext = () => {
      if (isCancelled) return;
      if (playlist.length === 0) {
        playlist = shuffleIndices();
      }
      const nextIdx = playlist.pop()!;
      const audio = new Audio(manTalkingSounds[nextIdx]);
      currentAudio = audio;

      audio.onended = () => {
        if (!isCancelled) {
          playNext();
        }
      };

      audio.play().catch(() => {});
    };

    const grabAudio = new Audio(phoneGrabSound);
    currentAudio = grabAudio;
    grabAudio.onended = () => {
      if (!isCancelled) {
        playNext();
      }
    };
    grabAudio.play().catch(() => {
      if (!isCancelled) {
        playNext();
      }
    });

    return () => {
      isCancelled = true;
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [isHandHoldingPhone]);
  

  const ringingAnimation = {
    rotate: [0, -4, 4, -4, 4, -3, 3, -2, 2, 0, 0, 0, 0, 0, 0],
    y: [0, -3, 1, -3, 1, -2, 1, -1, 0, 0, 0, 0, 0, 0, 0]
  };
  const isInViewportRef = useRef(false);

  const startRinging = (force = false) => {
    if (force || (!isPickedUp && !isDropped)) {
      handsetControls.start({
        ...ringingAnimation,
        transition: { repeat: Infinity, duration: 2.6, ease: "easeInOut" }
      });
    }
  };

  const stopPhysics = () => {
    if (physicsRef.current) {
      cancelAnimationFrame(physicsRef.current);
      physicsRef.current = null;
    }
  };

  const resetHandset = () => {
    const audio = new Audio(phonePickSound);
    audio.play().catch(() => {});
    stopPhysics();
    setIsDropped(false);
    setIsPickedUp(false);
    setHasHandAppeared(false);
    dragX.set(0);
    dragY.set(0);
    dragRotate.set(0);
    handsetControls.start({
      x: 0, y: 0, rotate: 0,
      transition: { type: 'spring', stiffness: 300, damping: 22 }
    }).then(() => {
      setIsDropped(false);
      if (isInViewportRef.current) startRinging(true);
    });
  };

  const startFallPhysics = (velX: number, velY: number, rotVel: number) => {
    stopPhysics();

    const GRAVITY = 1800; // px/s²
    const BOUNCE_DAMPING = 0.3;
    const FRICTION = 0.88;
    const ROT_FRICTION = 0.85;
    const REST_THRESHOLD_VY = 2;
    const REST_THRESHOLD_VX = 0.5;

    let x = dragX.get();
    let y = dragY.get();
    let vx = velX;
    let vy = velY;
    let angle = dragRotate.get();
    let angularVel = rotVel;
    let lastTime = performance.now();

    const getFloorY = (currentAngle: number): number => {
      // Find the footer's top edge in screen coords
      const footer = document.querySelector('footer');
      const wrapper = handsetWrapperRef.current;
      const dragEl = handsetDragRef.current;
      if (!footer || !wrapper || !dragEl) return 600;

      const footerRect = footer.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      
      const w = dragEl.offsetWidth || 300;
      const h = dragEl.offsetHeight || 150;
      
      // Calculate effective height of the rotated bounding box's bottom half
      const angleRad = currentAngle * (Math.PI / 180);
      const rotatedHeight = w * Math.abs(Math.sin(angleRad)) + h * Math.abs(Math.cos(angleRad));
      const effectiveHeight = (h / 2) + (rotatedHeight / 2);

      return footerRect.top - wrapperRect.top - effectiveHeight;
    };

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Gravity
      vy += GRAVITY * dt;

      // Position update
      x += vx * dt;
      y += vy * dt;

      // Rotation
      angle += angularVel * dt;
      angularVel *= ROT_FRICTION;

      // Floor collision
      const floorY = getFloorY(angle);
      if (y >= floorY) {
        y = floorY;
        if (Math.abs(vy) > REST_THRESHOLD_VY) {
          vy = -vy * BOUNCE_DAMPING;
          vx *= FRICTION;
          angularVel = -angularVel * 0.4 + vx * 0.05;
        } else {
          vy = 0;
          vx *= 0.9;
          angularVel *= 0.5;
        }
      }

      // Viewport boundary clamping
      const wrapper = handsetWrapperRef.current;
      const dragEl = handsetDragRef.current;
      if (wrapper && dragEl) {
        const wRect = wrapper.getBoundingClientRect();
        const elW = dragEl.offsetWidth;
        const elH = dragEl.offsetHeight;
        const minX = -(wRect.left + elW * 0.5);
        const maxX = window.innerWidth - wRect.left - elW * 0.5;
        const minY = -(wRect.top);
        if (x < minX) { x = minX; vx = -vx * 0.3; }
        if (x > maxX) { x = maxX; vx = -vx * 0.3; }
        if (y < minY) { y = minY; vy = -vy * 0.3; }
      }

      // Apply directly to motion values for perfect sync with Framer Motion
      dragX.set(x);
      dragY.set(y);
      dragRotate.set(angle);

      // Check if settled
      const isOnFloor = y >= floorY - 1;
      const isSettled = isOnFloor && Math.abs(vy) < REST_THRESHOLD_VY && Math.abs(vx) < REST_THRESHOLD_VX;

      if (!isSettled) {
        physicsRef.current = requestAnimationFrame(tick);
      }
    };

    physicsRef.current = requestAnimationFrame(tick);
  };

  const handleDragEnd = (_e: any, info: any) => {
    // Check if dropped over body cradle area → snap back
    const bodyEl = bodyRef.current;
    if (bodyEl) {
      const bodyRect = bodyEl.getBoundingClientRect();
      const dropX = info.point.x;
      const dropY = info.point.y;

      const bodyTop = bodyRect.top + window.scrollY;
      const bodyLeft = bodyRect.left + window.scrollX;

      const isOverBody = (
        dropX >= bodyLeft &&
        dropX <= bodyLeft + bodyRect.width &&
        dropY >= bodyTop &&
        dropY <= bodyTop + bodyRect.height * 0.5
      );

      if (isOverBody) {
        setIsPickedUp(false);
        resetHandset();
        return;
      }
    }

    // Check if dropped over Hand area → switch to Hand Phone
    const handEl = handImageRef.current;
    if (handEl && hasHandAppeared) {
      const handRect = handEl.getBoundingClientRect();
      const dropX = info.point.x;
      const dropY = info.point.y;

      const handTop = handRect.top + window.scrollY;
      const handBottom = handRect.bottom + window.scrollY;
      const handLeft = handRect.left + window.scrollX;
      const handRight = handRect.right + window.scrollX;

      const isOverHand = (
        dropX >= handLeft &&
        dropX <= handRight &&
        dropY >= handTop &&
        dropY <= handBottom
      );

      // Prevent snapping back to hand if it was just clicked (no significant movement)
      const wasDragged = Math.abs(info.offset.x) > 3 || Math.abs(info.offset.y) > 3;

      if (isOverHand && wasDragged) {
        setIsHandHoldingPhone(true);
        setIsPickedUp(false);
        setIsDropped(false);
        return;
      }
    }

    setIsPickedUp(false);
    setIsDropped(true);

    // Stop framer-motion animation control — we take over with manual physics
    handsetControls.stop();

    // Start realistic fall physics
    startFallPhysics(
      info.velocity.x * 0.5,
      info.velocity.y * 0.5,
      info.velocity.x * 0.12
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPhysics();
  }, []);

  // Default to whatsapp if nothing is hovered
  const activeSocial = hoveredSocial || 'whatsapp';

  return (
    <div className="w-full flex-grow flex flex-col items-center justify-between px-8 lg:px-24">
      <div className="text-center z-20 flex flex-col items-center mt-auto mb-auto">
        <motion.h2 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-[60px] sm:text-[90px] lg:text-[140px] font-black uppercase text-[#202121] leading-none tracking-tight drop-shadow-sm"
        >
          CONTACT US
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-[24px] sm:text-[36px] text-[#202121] font-medium mt-4 sm:mt-2"
        >
          Let's get <span className="font-black">connected</span>
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-3 mt-10 h-14"
        >
          {socials.map((social) => {
            const isExpanded = activeSocial === social.id;
            
            return (
              <motion.a
                key={social.id}
                href={social.url}
                target="_blank"
                rel="noreferrer"
                onMouseEnter={() => setHoveredSocial(social.id)}
                onMouseLeave={() => setHoveredSocial(null)}
                layout
                initial={false}
                animate={{
                  paddingLeft: isExpanded ? "8px" : "0px",
                  paddingRight: isExpanded ? "24px" : "0px",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`flex items-center h-[52px] rounded-full overflow-hidden will-change-transform cursor-pointer ${
                  social.id === 'whatsapp'
                    ? 'bg-[#58d374] text-white border-[2.5px] border-transparent'
                    : 'bg-transparent text-[#202121] border-[2.5px] border-[#202121]'
                }`}
              >
                <motion.div 
                  layout 
                  className="flex-shrink-0 w-[48px] h-[48px] flex items-center justify-center"
                >
                  <social.Icon className="w-6 h-6" />
                </motion.div>
                
                <AnimatePresence mode="wait">
                  {isExpanded && (
                    <motion.div
                      key="text"
                      layout
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`overflow-hidden whitespace-nowrap font-black ${
                        social.id === 'custom' ? 'text-xs tracking-wide' : 'text-lg'
                      }`}
                    >
                      <span className="pl-1">{social.name}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.a>
            );
          })}
        </motion.div>
      </div>

      <div className="w-full flex justify-center relative pointer-events-none mt-32">
        <RopeSimulation startRef={bodyAttachmentRef} endRef={handsetAttachmentRef} altEndRef={handPhoneAttachmentRef} useAltEnd={isHandHoldingPhone} />
        <div className="relative w-[300px] md:w-[420px] flex justify-center">
          
          {/* Telephone Handset — draggable, dynamic z-index */}
          <div 
            ref={handsetWrapperRef}
            className="absolute w-[98%] left-1/2 -translate-x-1/2 -top-[12%] flex justify-center" 
            style={{ zIndex: isPickedUp || isDropped ? 80 : 10 }}
          >
            <motion.div
              ref={handsetDragRef}
              drag
              dragControls={dragControls}
              dragMomentum={false}
              dragConstraints={{
                top: -(handsetWrapperRef.current?.getBoundingClientRect().top ?? 0),
                left: -(handsetWrapperRef.current?.getBoundingClientRect().left ?? 0),
                right: window.innerWidth - (handsetWrapperRef.current?.getBoundingClientRect().right ?? window.innerWidth),
                bottom: (() => {
                  const footer = document.querySelector('footer');
                  const wrapper = handsetWrapperRef.current;
                  const dragEl = handsetDragRef.current;
                  if (!footer || !wrapper || !dragEl) return 400;
                  return footer.getBoundingClientRect().top - wrapper.getBoundingClientRect().top - dragEl.offsetHeight;
                })()
              }}
              dragElastic={0}
              onDragStart={() => {
                if (!isDropped && !hasHandAppeared) {
                  const audio = new Audio(phonePickSound);
                  audio.play().catch(() => {});
                }
                stopPhysics();
                setIsPickedUp(true);
                setIsDropped(false);
                setHasHandAppeared(true);
                handsetControls.stop();
                dragRotate.set(0);
              }}
              onDrag={(_e, info) => {
                const angle = Math.max(Math.min(info.velocity.x * 0.04, 35), -35);
                dragRotate.set(angle);
              }}
              onDragEnd={handleDragEnd}
              animate={isDropped ? undefined : handsetControls}
              onViewportEnter={() => {
                isInViewportRef.current = true;
                startRinging();
              }}
              onViewportLeave={() => {
                isInViewportRef.current = false;
              }}
              viewport={{ once: false }}
              className="relative w-full cursor-grab active:cursor-grabbing"
              style={{ 
                x: dragX, y: dragY, rotate: dragRotate,
                opacity: isHandHoldingPhone ? 0 : 1,
                pointerEvents: isHandHoldingPhone ? 'none' : 'auto'
              }}
            >
              <img src={telephoneHandset} alt="Telephone Handset" className="w-full h-auto object-contain drop-shadow-lg pointer-events-none select-none" draggable={false} />
              {/* Handset Attachment Point */}
              <div ref={handsetAttachmentRef} className="absolute left-[8%] bottom-[20%] w-1 h-1" />
            </motion.div>
          </div>

          {/* Telephone Body — front layer (z-20), 20% smaller */}
          <div ref={bodyRef} className="relative z-20 w-[80%]">
            <img 
              src={telephoneBody} 
              alt="Telephone Body"
              className="w-full object-contain drop-shadow-2xl pointer-events-auto"
            />
            {/* Body Attachment Point */}
            <div ref={bodyAttachmentRef} className="absolute left-[13%] bottom-[12%] w-1 h-1" />
          </div>

          {/* Telephone Note — sticky note at bottom-right (z-50, above footer), swaying at -30deg */}
          {!hideSmallNote && (
            <motion.img 
              src={telephoneNote} 
              alt="Telephone Note"
              animate={{ rotate: [-33, -27, -33] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              onClick={() => {
                const pickAudio = new Audio(paperPickSound);
                pickAudio.play().catch(() => {});
                setHideSmallNote(true);
                setIsModalOpen(true);
              }}
              className="absolute z-50 w-[35%] -bottom-[8%] right-[8%] object-contain drop-shadow-lg cursor-pointer pointer-events-auto"
              style={{ transformOrigin: 'top center' }}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {hasHandAppeared && (
          <motion.div
            initial={{ x: '100%', rotate: 0 }}
            animate={{ 
              x: '10%', 
              rotate: [0, -5, 0, 5, 0] 
            }}
            exit={{ x: '100%', transition: { type: 'spring', stiffness: 45, damping: 15 } }}
            transition={{ 
              x: { type: 'spring', stiffness: 45, damping: 15 },
              rotate: { repeat: Infinity, duration: 4, ease: 'easeInOut' }
            }}
            style={{ transformOrigin: 'right center' }}
            className={`absolute z-[70] pointer-events-none drop-shadow-2xl ${
              isHandHoldingPhone 
                ? 'w-[181px] md:w-[316px] top-[35%] -right-8 md:-right-[50px]' 
                : 'w-[240px] md:w-[420px] top-[40%] right-0'
            }`}
          >
            {/* Preloaded Hand Images to eliminate decode flicker */}
            <img 
              ref={handImageRef}
              src={handImage} 
              alt="Hand"
              className={`w-full h-auto pointer-events-auto select-none ${isHandHoldingPhone ? 'hidden' : 'block'}`}
              draggable={false}
            />
            <img 
              src={handPhoneImage} 
              alt="Hand holding phone"
              className={`w-full h-auto pointer-events-auto select-none cursor-grab ${isHandHoldingPhone ? 'block' : 'hidden'}`}
              draggable={false}
              onPointerDown={(e) => {
                if (isHandHoldingPhone) {
                  pointerDownTimeRef.current = Date.now();
                  setIsHandHoldingPhone(false);
                  setIsPickedUp(true);
                  dragControls.start(e);

                  const handleUp = () => {
                    window.removeEventListener('pointerup', handleUp);
                    if (Date.now() - pointerDownTimeRef.current < 250) {
                      setTimeout(() => {
                        setIsPickedUp(false);
                        setIsDropped(true);
                        startFallPhysics(0, 0, 0);
                      }, 50);
                    }
                  };
                  window.addEventListener('pointerup', handleUp);
                }
              }}
            />
            {/* Hand Phone cable attachment point at relative position (529/imgW, 2356/imgH) */}
            {isHandHoldingPhone && (
              <div ref={handPhoneAttachmentRef} className="absolute" style={{ left: '26.03%', top: '87.26%', width: '4px', height: '4px' }} />
            )}

            {/* Chat Bubbles — slide in/out left */}
            <AnimatePresence>
              {isHandHoldingPhone && chatBubbles.map((bubble) => {
                const slot = bubbleSlots[bubble.slotIdx];
                return (
                  <div
                    key={bubble.id}
                    className="absolute z-[60] pointer-events-none"
                    style={{
                      left: `${slot.x}%`,
                      top: `${slot.y}%`,
                      rotate: `${slot.rot}deg`,
                      transformOrigin: 'right center'
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: 45 }}
                      animate={{ 
                        opacity: [0, 1, 1, 0], 
                        x: [45, 0, -55] 
                      }}
                      transition={{
                        opacity: { duration: 3.5, times: [0, 0.15, 0.8, 1], ease: 'linear' },
                        x: { duration: 3.5, times: [0, 0.35, 1], ease: ["easeOut", "easeIn"] }
                      }}
                      className="relative bg-white border-[2px] border-black rounded-lg px-4 py-2 font-semibold text-black text-xs md:text-sm max-w-[165px] text-center leading-tight shadow-[3px_3px_0_rgba(0,0,0,1)]"
                    >
                      {bubble.text}
                      {/* Dynamic Tail pointing along the rotated local axis towards top-left corner (23, 316) */}
                      <div className={`absolute w-3 h-3 bg-white border-t-[2px] border-r-[2px] border-black rotate-45 ${slot.tailClass}`} />
                    </motion.div>
                  </div>
                );
              })}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Note Detail Modal Portaled to Body to cover Navbar and entire viewport */}
      {createPortal(
        <AnimatePresence onExitComplete={() => {
          setHideSmallNote(false);
          const putAudio = new Audio(paperPutSound);
          putAudio.play().catch(() => {});
        }}>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="fixed inset-0 bg-black/70 z-[99999] flex items-center justify-center pointer-events-auto"
              onClick={() => setIsModalOpen(false)}
            >
              <motion.div
                initial={{ y: "100vh" }}
                animate={{ y: 0 }}
                exit={{ y: "100vh" }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open('https://maps.google.com/?q=Gedung+Selaru+Telkom+University+Bandung', '_blank');
                }}
                className="cursor-pointer max-w-md w-[88%] sm:w-[450px] drop-shadow-2xl z-[100000]"
              >
                <motion.img
                  src={noteDetail}
                  alt="Note Detail"
                  animate={{ rotate: [-2, 2, -2] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="w-full h-auto object-contain"
                  style={{ transformOrigin: 'top center' }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
