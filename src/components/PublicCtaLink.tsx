import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {trackEvent} from '../public/client';

export function PublicCtaLink({to,className,children,ariaLabel}:{to:string;className:string;children:ReactNode;ariaLabel?:string}){
  const external=(()=>{try{const url=new URL(to);return /^https?:\/\//i.test(to)&&['http:','https:'].includes(url.protocol)&&!url.username&&!url.password;}catch{return false;}})();
  const destination=to.startsWith('/')&&!to.startsWith('//')||external?to:'/';
  const props={className,'aria-label':ariaLabel,onClick:()=>trackEvent('cta_click',{linkDestination:destination})};
  return external?<a {...props} href={destination} target="_blank" rel="noopener noreferrer">{children}</a>:<Link {...props} to={destination}>{children}</Link>;
}
