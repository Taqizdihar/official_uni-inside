import type {ReactNode} from 'react';
import {CmsModal} from '../components/Ui';
export function ProductModal({title,onClose,children,className=''}:{title:string;onClose:()=>void;children:ReactNode;className?:string}){
  return <CmsModal title={title} onClose={onClose} className={`cms-product-modal ${className}`}>{children}</CmsModal>;
}
