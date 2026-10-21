import type {IconType} from 'react-icons';
import {SiDiscord,SiFacebook,SiGithub,SiInstagram,SiPinterest,SiTelegram,SiThreads,SiTiktok,SiWhatsapp,SiX,SiYoutube} from 'react-icons/si';
import {FaLinkedinIn} from 'react-icons/fa6';
import {platformCodes,platformNames,type PlatformCode} from './model';

export const platformIcons:Record<PlatformCode,IconType>={instagram:SiInstagram,whatsapp:SiWhatsapp,youtube:SiYoutube,linkedin:FaLinkedinIn,tiktok:SiTiktok,facebook:SiFacebook,x:SiX,github:SiGithub,pinterest:SiPinterest,threads:SiThreads,discord:SiDiscord,telegram:SiTelegram};
export const platformCatalog=platformCodes.map(platform_code=>({platform_code,name:platformNames[platform_code],Icon:platformIcons[platform_code]}));
export function PlatformIcon({code,size=20}:{code:PlatformCode;size?:number}){const Icon=platformIcons[code];return <Icon size={size} aria-hidden="true"/>;}
