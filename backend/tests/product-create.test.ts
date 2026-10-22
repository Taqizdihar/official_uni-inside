import {describe,it,expect} from 'vitest';
import type {Pool} from 'mysql2/promise';
import {createProductForm,productFormInput} from '../src/services/productCreate';
import {productSummary,sanitizeProductDescription} from '../src/utils/productDescription';
import {parseBody} from '../src/services/content';
import {resources} from '../src/schemas/resources';
import {publicDetail} from '../src/repositories/content';
const basic={action:'draft',product_type:'ready_made',name:'Lampu Studio',description:'<p>Desain <u>personal</u> &amp; rapi.</p>',currency_code:'IDR'};
function database(failChild=false,missingWhatsapp=false){
  const state={committed:false,rolledBack:false,records:[] as {table:string;data:Record<string,unknown>}[],calls:[] as string[],product:{} as Record<string,unknown>};
  const conn={beginTransaction:async()=>{},commit:async()=>{state.committed=true;},rollback:async()=>{state.rolledBack=true;},release:()=>{},execute:async(options:{sql:string},values:unknown[]=[])=>{
    const sql=options.sql;state.calls.push(sql);
    if(sql.startsWith('INSERT INTO `')){const match=sql.match(/INSERT INTO `([^`]+)` \(([^)]+)\)/)!;const table=match[1]!;const keys=match[2]!.split(',').map(key=>key.replace(/`/g,''));const data=Object.fromEntries(keys.map((key,index)=>[key,values[index]]));if(failChild&&table==='product_features')throw new Error('Child write failed');state.records.push({table,data});if(table==='products')state.product={id:42,...data};return [{insertId:42,affectedRows:1},[]];}
    if(sql.includes('FROM media_assets'))return [values.filter((id):id is number=>typeof id==='number'&&id!==999).map(id=>({id})),[]];
    if(sql.includes('FROM `product_categories`'))return [[{id:3,name:'Lampu'}],[]];
    if(sql.includes('FROM social_links a JOIN social_platforms p'))return [missingWhatsapp?[]:[{id:77,canonical_code:'whatsapp',url:'https://wa.me/628777777777',is_active:1}],[]];
    if(sql.includes('FROM social_links'))return [missingWhatsapp?[]:[{platform_code:'WhatsApp',url:'https://wa.me/628123456789'}],[]];
    if(sql.includes('FROM `products`'))return [[{...state.product}],[]];
    if(sql.startsWith('UPDATE `products`')){state.product.status='published';return [{affectedRows:1},[]];}
    if(sql.startsWith('UPDATE product_variants SET media_id=')){state.records.push({table:'variant_media_write',data:{media_id:values[0],id:values[1]}});return [{affectedRows:1},[]];}
    if(sql.startsWith('UPDATE product_purchase_links SET social_link_id=')){state.records.push({table:'whatsapp_reference_write',data:{social_link_id:values[0],id:values[1]}});return [{affectedRows:1},[]];}
    if(sql.includes('MAX(revision_number)'))return [[{next:1}],[]];
    return [{affectedRows:1},[]];
  }};
  return {db:{getConnection:async()=>conn} as unknown as Pool,state};
}
describe('product creation form',()=>{
  it('sanitizes full rich text, derives plain compatibility text, and keeps legacy formatting',()=>{
    const clean=sanitizeProductDescription('<h2>Judul</h2><p><b>Tebal</b> <u>garis</u> &amp; aman<img src="bad"/><iframe>embed</iframe><script>alert(1)</script></p>');
    expect(clean).toContain('<h2>Judul</h2>');expect(clean).toContain('<strong>Tebal</strong>');expect(clean).toContain('<u>garis</u>');expect(clean).not.toMatch(/img|iframe|script/);
    expect(productSummary(clean)).toBe('Judul Tebal garis & aman');
    expect(()=>sanitizeProductDescription('<a href="javascript:alert(1)">bad</a>',true)).toThrow();
    expect(sanitizeProductDescription('<a href="javascript:alert(1)">bad</a>')).not.toContain('javascript:');
    expect(productSummary('<p>'+ 'a'.repeat(600)+'</p>')).toHaveLength(500);
    expect(parseBody(resources.products!,{description:'<p>A &amp; B</p>'})).toMatchObject({short_description:'A & B'});
    expect(parseBody(resources.products!,{description:'<p>New</p>',short_description:'Legacy summary'})).toMatchObject({short_description:'Legacy summary'});
  });
  it('validates normalized fields without silently dropping schema gaps',()=>{
    expect(()=>productFormInput({...basic,variants:[{name:'A',price:10,stock_quantity:1,is_active:true,media_id:1}]})).toThrow(/Foto varian/);
    expect(()=>productFormInput({...basic,cover_media_id:1,gallery_media_ids:[1]})).toThrow();
    expect(()=>productFormInput({...basic,gallery_media_ids:Array.from({length:9},(_,index)=>index+1)})).toThrow();
    expect(()=>productFormInput({...basic,features:[{label:'Bahan',value_text:' '}]})).toThrow();
    expect(productFormInput({...basic,features:[{label:' ',value_text:''}]}).features).toEqual([]);
    expect(()=>productFormInput({...basic,platforms:[{platform:'shopee',url:'javascript:alert(1)'}]})).toThrow();
    expect(()=>productFormInput({...basic,platforms:[{platform:'whatsapp',url:'https://manual.test'}]})).toThrow();
    expect(()=>productFormInput({...basic,platforms:[{platform:'whatsapp'},{platform:'whatsapp'}]})).toThrow();
    expect(()=>productFormInput({...basic,additional_json:{ignored:true}})).toThrow();
  });
  it('saves ordered images, features, variants, and resolved WhatsApp in one transaction',async()=>{
    const {db,state}=database();
    const saved=await createProductForm(db,{...basic,category_id:3,cover_media_id:2,gallery_media_ids:[1],base_price:100,features:[{label:' Bahan ',value_text:' PLA '}],variants:[{name:'Besar',price:150,stock_quantity:4,is_active:true}],platforms:[{platform:'whatsapp'},{platform:'shopee',url:'https://shopee.co.id/product/1'}]},{id:7,permissions:new Set(['products.create'])},'test');
    expect(saved).toMatchObject({id:42,status:'draft',cover_media_id:2,short_description:'Desain personal & rapi.'});
    expect(state.committed).toBe(true);expect(state.rolledBack).toBe(false);
    expect(state.records.filter(row=>row.table==='product_images').map(row=>row.data)).toEqual([{product_id:42,media_id:2,is_cover:1,sort_order:0},{product_id:42,media_id:1,is_cover:0,sort_order:1}]);
    expect(state.records.find(row=>row.table==='product_variants')?.data).toMatchObject({name:'Besar',price_adjustment:50,sort_order:0});
    expect(state.records.filter(row=>row.table==='product_purchase_links').map(row=>row.data.url)).toEqual(['https://wa.me/628123456789','https://shopee.co.id/product/1']);
    expect(state.calls.some(sql=>/social_platforms|platform_id|social_link_id|product_variants SET media_id/.test(sql))).toBe(false);
  });
  it('requires create, update, and publish permissions before publishing',async()=>{
    const {db,state}=database();
    await expect(createProductForm(db,basic,{id:1,permissions:new Set()},'test')).rejects.toMatchObject({status:403});
    await expect(createProductForm(db,{...basic,action:'publish'},{id:1,permissions:new Set(['products.create'])},'test')).rejects.toMatchObject({status:403});
    const saved=await createProductForm(db,{...basic,action:'publish',category_id:3,cover_media_id:1,gallery_media_ids:[2],base_price:100,platforms:[{platform:'whatsapp'}]},{id:1,permissions:new Set(['products.create','products.update','products.publish'])},'test');
    expect(saved?.status).toBe('published');expect(state.committed).toBe(true);
  });
  it('saves an explicitly selected WhatsApp account and optional variant media only when both gates are ready',async()=>{
    const {db,state}=database();
    const caps={socialMediaV2:{enabled:true,reason:null},productVariantMedia:{enabled:true,reason:null}} as const;
    await createProductForm(db,{...basic,base_price:10,variants:[{name:'A',price:10,stock_quantity:1,is_active:true,media_id:3}],platforms:[{platform:'whatsapp',social_link_id:77},{platform:'shopee',url:'https://shopee.co.id/product'}]},{id:1,permissions:new Set(['products.create'])},'request',caps);
    expect(state.committed).toBe(true);
    expect(state.records.find(row=>row.table==='variant_media_write')?.data).toMatchObject({media_id:3});
    expect(state.records.find(row=>row.table==='whatsapp_reference_write')?.data).toMatchObject({social_link_id:77});
    expect(state.records.filter(row=>row.table==='product_purchase_links').map(row=>row.data.url)).toEqual(['https://wa.me/628777777777','https://shopee.co.id/product']);
    const missing=database(false,true);
    await expect(createProductForm(missing.db,{...basic,platforms:[{platform:'whatsapp',social_link_id:77}]},{id:1,permissions:new Set(['products.create'])},'request',caps)).rejects.toMatchObject({code:'INVALID_WHATSAPP_ACCOUNT'});
    expect(missing.state.rolledBack).toBe(true);
  });
  it('rolls back on a child write failure and rejects incomplete publication',async()=>{
    const {db,state}=database(true);
    await expect(createProductForm(db,{...basic,features:[{label:'Bahan',value_text:'PLA'}]},{id:1,permissions:new Set(['products.create'])},'test')).rejects.toThrow('Child write failed');
    expect(state.rolledBack).toBe(true);expect(state.committed).toBe(false);
    await expect(createProductForm(database().db,{...basic,action:'publish'},{id:1,permissions:new Set(['products.create','products.update','products.publish'])},'test')).rejects.toMatchObject({code:'PUBLISH_INCOMPLETE'});
  });
  it('rejects a missing WhatsApp setting or unavailable media before inserting any product',async()=>{
    const missing=database(false,true);
    await expect(createProductForm(missing.db,{...basic,platforms:[{platform:'whatsapp'}]},{id:1,permissions:new Set(['products.create'])},'test')).rejects.toMatchObject({code:'WHATSAPP_NOT_CONFIGURED'});
    expect(missing.state.records).toHaveLength(0);expect(missing.state.committed).toBe(false);
    const media=database();await expect(createProductForm(media.db,{...basic,cover_media_id:999},{id:1,permissions:new Set(['products.create'])},'test')).rejects.toMatchObject({code:'INVALID_MEDIA'});
    expect(media.state.records).toHaveLength(0);
  });
  it('uses the referenced WhatsApp URL on V2 Product detail without falling back to a global account',async()=>{
    const calls:string[]=[];
    const db={execute:async(options:{sql:string})=>{const sql=options.sql;calls.push(sql);if(sql.includes('FROM `products`'))return [[{id:1,description:'<p>Produk</p>',cover_media_id:null}],[]];if(sql.includes('FROM product_purchase_links l'))return [[{id:2,store_name:'WhatsApp',url:'https://old.test',social_link_id:77,account_url:'https://wa.me/628777777777',account_active:1}],[]];return [[],[]];}} as unknown as Pool;
    const detail=await publicDetail(db,resources.products!,'example',true);
    expect(detail?.purchaseLinks[0]?.url).toBe('https://wa.me/628777777777');
    expect(calls.some(sql=>sql.includes('SELECT platform_code,url FROM social_links'))).toBe(false);
  });
  it('reads legacy descriptions safely and uses current global WhatsApp on public detail',async()=>{
    const db={execute:async(options:{sql:string})=>{const sql=options.sql;if(sql.includes('FROM `products`'))return [[{id:1,description:'<p><u>Safe</u><img src="bad"/></p>',cover_media_id:null}],[]];if(sql.includes('FROM product_purchase_links'))return [[{id:2,store_name:'WhatsApp',url:'https://stale.test'}],[]];if(sql.includes('FROM social_links'))return [[{platform_code:'whatsapp',url:'https://wa.me/628111111'}],[]];return [[],[]];}} as unknown as Pool;
    const detail=await publicDetail(db,resources.products!,'legacy');expect(detail?.description).toBe('<p><u>Safe</u></p>');expect(detail?.purchaseLinks[0]?.url).toBe('https://wa.me/628111111');
  });
});
