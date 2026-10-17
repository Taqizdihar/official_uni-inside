import {ExternalLink} from 'lucide-react';
import {FaGithub,FaInstagram,FaLinkedin,FaTiktok,FaYoutube,FaXTwitter} from 'react-icons/fa6';
import type {ComponentType} from 'react';
const icons:Record<string,ComponentType<{size?:number}>>={instagram:FaInstagram,tiktok:FaTiktok,linkedin:FaLinkedin,x:FaXTwitter,twitter:FaXTwitter,github:FaGithub,youtube:FaYoutube};
export function SocialIcon({platform,iconKey,size=19}:{platform:unknown;iconKey?:unknown;size?:number}){const key=String(platform||iconKey||'').toLowerCase().replace(/[^a-z]/g,'');const Icon=icons[key]||icons[String(iconKey||'').toLowerCase().replace(/[^a-z]/g,'')];return Icon?<Icon size={size} aria-hidden="true"/>:<ExternalLink size={size} aria-hidden="true"/>;}
