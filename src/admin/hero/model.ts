export const heroCalloutLabels = [
  ['studio_lighting','Label Lampu Studio'],['studio_camera','Label Kamera'],['studio_microphone','Label Mikrofon'],['studio_monitor','Label Monitor'],['studio_drone','Label Drone'],
  ['craft_printer','Label 3D Printer'],['craft_filament','Label Rak Filamen'],['craft_products','Label Model 3D'],['craft_painting','Label Kuas Cat'],['craft_monitor','Label Monitor'],
] as const;
export type HeroEdit = {
  headingLine2:string;headingLine3?:string;descriptionLine1:string;descriptionLine2:string|null;
  trustSignals:{slot:number;numericValue:number|null;suffix:string|null;label:string}[];
  workspaces:{key:string;primaryLabel:string;primaryUrl:string;secondaryLabel:string|null;secondaryUrl:string|null}[];
  callouts:{key:string;label:string}[];
};
export type HeroResponse={edit:HeroEdit;headingLine3Enabled:boolean;calloutPrefixes:Record<string,string>};
export const characters=(value:string)=>Array.from(value).length;
export function heroUrlValid(value:string){
  if (/\s|\\|[\u0000-\u001f\u007f]/u.test(value))return false;
  if(value.startsWith('/')&&!value.startsWith('//'))return true;
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&Boolean(url.hostname);}catch{return false;}
}
export function validateHero(next:HeroEdit,old:HeroEdit,ready:boolean,prefixes:Record<string,string>){
  const errors:Record<string,string>={};
  const check=(path:string,value:string|null,prior:string|null,max:number,required:boolean)=>{
    if(required&&!value?.trim())errors[path]='Kolom ini wajib diisi.';
    else if(value===prior)return;
    else if(value!=null&&characters(value)>max)errors[path]=`Maksimal ${max} karakter.`;
    else if(value!=null&&/[<>\r\n]/u.test(value))errors[path]='Gunakan teks biasa tanpa markup atau baris baru.';
  };
  check('headingLine2',next.headingLine2,old.headingLine2,18,true);
  if(ready)check('headingLine3',next.headingLine3??'',old.headingLine3??'',18,true);
  check('descriptionLine1',next.descriptionLine1,old.descriptionLine1,50,true);
  check('descriptionLine2',next.descriptionLine2,old.descriptionLine2,50,false);
  next.trustSignals.forEach((item,i)=>{const prior=old.trustSignals[i];check(`trustSignals.${i}.label`,item.label,prior.label,14,true);if(item.numericValue===null||item.numericValue<0||!Number.isSafeInteger(item.numericValue))errors[`trustSignals.${i}.numericValue`]='Gunakan bilangan bulat tanpa nilai negatif.';else if(item.numericValue!==prior.numericValue&&item.numericValue>9999999)errors[`trustSignals.${i}.numericValue`]='Maksimal 9.999.999 untuk tampilan Hero.';if(item.suffix!==prior.suffix&&item.suffix!=null){if(characters(item.suffix)>16)errors[`trustSignals.${i}.suffix`]='Maksimal 16 karakter.';else if(/[<>\r\n]/u.test(item.suffix))errors[`trustSignals.${i}.suffix`]='Gunakan teks biasa.';}});
  next.workspaces.forEach((item,i)=>{const prior=old.workspaces[i];check(`workspaces.${i}.primaryLabel`,item.primaryLabel,prior.primaryLabel,25,true);check(`workspaces.${i}.secondaryLabel`,item.secondaryLabel,prior.secondaryLabel,25,item.secondaryLabel!==null||item.secondaryUrl!==null);for(const field of ['primaryUrl','secondaryUrl'] as const){const value=item[field];if(value!==prior[field]&&(!value||!heroUrlValid(value)))errors[`workspaces.${i}.${field}`]='Gunakan path internal /... atau URL HTTPS tanpa kredensial.';}if((item.secondaryLabel===null)!==(item.secondaryUrl===null))errors[`workspaces.${i}.secondaryLabel`]='Isi label dan URL tombol kedua bersama.';});
  next.callouts.forEach((item,i)=>{const prior=old.callouts[i];check(`callouts.${i}.label`,item.label,prior.label,30,true);if(item.label!==prior.label&&characters(`${prefixes[item.key]??''}${item.label}`)>60)errors[`callouts.${i}.label`]='Teks callout lengkap terlalu panjang.';});
  return errors;
}
