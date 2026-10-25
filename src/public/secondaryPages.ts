import {usePublicContent} from './client';
import type {SecondaryName} from '../../backend/src/contracts/secondaryPages';
import {resolveSecondaryContent} from './secondaryPageModel';
export {footerEmail} from './secondaryPageModel';
export function useSecondaryContent(name:SecondaryName){const {site}=usePublicContent();return resolveSecondaryContent(name,site?.pages);}
