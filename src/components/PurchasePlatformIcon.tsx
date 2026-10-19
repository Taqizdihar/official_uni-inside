import {ExternalLink,MessageCircle,Music2,ShoppingBag,ShoppingCart,Store} from 'lucide-react';
export function PurchasePlatformIcon({platform,size=20}:{platform:string;size?:number}){
  const key=platform.toLowerCase().replace(/[^a-z]/g,'');
  const Icon=key==='shopee'?ShoppingBag:key==='tokopedia'?Store:key==='tiktok'||key==='tiktokshop'?Music2:key==='shopify'?ShoppingCart:key==='whatsapp'?MessageCircle:ExternalLink;
  return <Icon size={size} aria-hidden="true"/>;
}
