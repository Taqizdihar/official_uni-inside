import {aboutEditFallback,aboutPreviewDefaults,safeExternalUrl,safeMemberProfile,memberSocialColumns,type AboutEdit,type AboutPreview,type PrincipleSlot} from '../../backend/src/contracts/aboutTeam';

type RecordValue=Record<string,unknown>;
type AboutSource={about?:RecordValue|null;aboutWorkspaces?:RecordValue[];aboutPrinciples?:RecordValue[];sections?:RecordValue[];aboutEditorial?:AboutPreview};
const stored=(value:unknown,fallback:string)=>typeof value==='string'?value:fallback;
export function resolveAboutContent(source:AboutSource|null|undefined):{edit:AboutEdit;editorial:AboutPreview}{
  const about=source?.about,fallback=aboutEditFallback;
  return {edit:{
    intro:{subtitle:stored(about?.lead_text,fallback.intro.subtitle),description:stored(about?.body_text,fallback.intro.description)},
    ecosystem:{heading:stored(about?.workspaces_heading,fallback.ecosystem.heading),workspaces:fallback.ecosystem.workspaces.map(item=>{const row=source?.aboutWorkspaces?.find(row=>row.workspace_key===item.key&&row.is_visible!==0);return {key:item.key,subtitle:stored(row?.short_label,item.subtitle),description:stored(row?.description,item.description)};})},
    guides:{heading:stored(about?.principles_heading,fallback.guides.heading),principles:fallback.guides.principles.map(item=>{const row=source?.aboutPrinciples?.find(row=>Number(row.slot)===item.slot&&row.is_visible!==0);return {slot:item.slot as PrincipleSlot,heading:stored(row?.title,item.heading),description:stored(row?.description,item.description)};})},
    partnersHeading:stored(source?.sections?.find(row=>row.section_key==='partners')?.heading,fallback.partnersHeading),
  },editorial:source?.aboutEditorial??aboutPreviewDefaults};
}
/** A published first record never replaces the static collection without activation. */
export function selectManagedItems<T>(enabled:boolean,records:T[]|null|undefined,fallback:T[]):T[]{return enabled&&records!==null&&records!==undefined?records:fallback;}
export function memberIndexForSlot(slot:number,count:number):number|null{return count>0?((slot+Math.floor((count-1)/2))%count+count)%count:null;}
export function ringMemberAngle(index:number,count:number){return count>0?index*(360/count):0;}
export function memberProfileLinks(record:RecordValue){return memberSocialColumns.flatMap(column=>{const url=record[column];return typeof url==='string'&&safeMemberProfile(url,column)?[{column,url}]:[];});}
export function partnerHref(value:unknown){return typeof value==='string'&&safeExternalUrl(value,false)?value:null;}
