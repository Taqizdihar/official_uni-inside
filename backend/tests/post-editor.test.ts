import {describe,expect,it} from 'vitest';
import type {Pool} from 'mysql2/promise';
import {getPostEditor,savePostEditor} from '../src/services/postEditor';
import type {CmsCapabilities} from '../src/services/capabilities';

const caps={socialMediaV2:{enabled:false,reason:null},productVariantMedia:{enabled:false,reason:null}} as CmsCapabilities;
type Kind='products'|'services'|'news';
function fake(kind:Kind,fail=false){
 const table=kind==='news'?'news_articles':kind;
 const parent:Record<string,unknown>={id:7,status:'draft',category_id:3,cover_media_id:kind==='news'?11:null,base_price:100,currency_code:'IDR',product_type:'ready_made',author_user_id:kind==='news'?5:null,meta_title:'Stored metadata',slug:'existing-url'};
 const calls:{sql:string;values:unknown[]}[]=[];let committed=false,rolledBack=false;
 const media=[{id:11,secure_url:'https://images.example/cover.jpg',alt_text:'Cover',caption:'Cover caption'},{id:12,secure_url:'https://images.example/gallery.jpg',alt_text:'Gallery',caption:'Asset caption'}];
 const conn={beginTransaction:async()=>{},commit:async()=>{committed=true;},rollback:async()=>{rolledBack=true;},release:()=>{},execute:async(options:{sql:string},values:unknown[]=[])=>{
  const sql=options.sql;calls.push({sql,values});
  if(sql.includes(`FROM \`${table}\``))return [[{...parent}],[]];
  if(sql.includes('FROM media_assets'))return [media.filter(row=>values.includes(row.id)),[]];
  if(sql.includes('FROM product_images'))return [[],[]];
  if(sql.includes('FROM product_features'))return [[{id:8,product_id:7,label:'Material',value_text:'PLA',sort_order:0}],[]];
  if(sql.includes('FROM product_variants'))return [[{id:9,product_id:7,name:'Large',price_adjustment:40,stock_quantity:4,is_active:1,sort_order:0}],[]];
  if(sql.includes('FROM product_purchase_links'))return [[{id:10,product_id:7,store_name:'Shopee',button_label:'Buy this',url:'https://shop.example/item',is_active:1,is_primary:1,sort_order:0}],[]];
  if(sql.includes('FROM service_images'))return [[],[]];
  if(sql.includes('FROM service_list_items'))return [[{id:21,service_id:7,item_type:'deliverable',label:'Video',sort_order:0}],[]];
  if(sql.includes('FROM service_process_steps'))return [[{id:22,service_id:7,title:'Planning',description:'Discuss',sort_order:0}],[]];
  if(sql.includes('FROM news_images'))return [[{id:31,article_id:7,media_id:12,alt_text:'Original alt',caption:'Original caption',sort_order:0}],[]];
  if(sql.includes('MAX(revision_number)'))return [[{next:2}],[]];
  if(sql.startsWith('UPDATE '+table+' SET ')){const fields=sql.slice(sql.indexOf(' SET ')+5,sql.indexOf(' WHERE ')).split(',').map(item=>item.split('=')[0]!);fields.forEach((field,index)=>parent[field]=values[index]);}
  if(fail&&sql.startsWith('UPDATE service_process_steps'))throw new Error('child write failed');
  return [{affectedRows:1},[]];
 }};
 return {db:{getConnection:async()=>conn,execute:conn.execute} as unknown as Pool,calls,state:()=>({committed,rolledBack}),parent};
}
const actor=(kind:Kind,publish=false)=>({id:4,permissions:new Set([`${kind}.update`,...(publish?[`${kind}.publish`]:[])])});

describe('complete post editing',()=>{
 it('loads existing IDs, fields, and media into the Product edit contract',async()=>{
  const test=fake('products');const result=await getPostEditor(test.db,'products',7,caps);
  expect(result.record).toMatchObject({id:7,meta_title:'Stored metadata'});
  expect(result.features).toMatchObject([{id:8,label:'Material'}]);
  expect(result.variants).toMatchObject([{id:9,final_price:140}]);
  expect(result.purchaseLinks).toMatchObject([{id:10,button_label:'Buy this'}]);
 });
 it('updates a Product and retains nested IDs, custom link text, slug, and stored SEO',async()=>{
  const test=fake('products');
  const result=await savePostEditor(test.db,'products',7,{action:'draft',name:'New product name',category_id:3,product_type:'ready_made',description:'<p>Updated</p>',cover_media_id:null,gallery_media_ids:[],base_price:100,currency_code:'IDR',availability_label:null,price_note:null,lead_time_text:null,minimum_order_quantity:null,features:[{id:8,label:'Material',value_text:'PLA'}],variants:[{id:9,name:'Large',price:140,stock_quantity:4,is_active:true}],platforms:[{id:10,platform:'shopee',url:'https://shop.example/item'}]},actor('products'),'request',caps,'uni-inside');
  expect(result).toMatchObject({id:7,name:'New product name',slug:'existing-url',meta_title:'Stored metadata'});
  expect(test.state()).toEqual({committed:true,rolledBack:false});
  expect(test.calls.filter(call=>call.sql.startsWith('INSERT INTO products'))).toHaveLength(0);
  expect(test.calls.some(call=>call.sql.startsWith('UPDATE product_variants SET')&&call.values.includes(9))).toBe(true);
  expect(test.calls.some(call=>call.sql.startsWith('UPDATE product_purchase_links SET')&&call.values.includes('Buy this'))).toBe(true);
  expect(test.calls.find(call=>call.sql.startsWith('UPDATE products SET'))?.sql).not.toMatch(/meta_title|meta_description|slug/);
  expect(test.calls.some(call=>call.sql.startsWith('INSERT INTO audit_logs'))).toBe(true);
  expect(test.calls.some(call=>call.sql.startsWith('INSERT INTO content_revisions'))).toBe(true);
 });
 it('rolls back a Service edit when a nested step fails',async()=>{
  const test=fake('services',true);
  await expect(savePostEditor(test.db,'services',7,{status:'draft',name:'Service',category_id:3,description:'<p>Service</p>',cover_media_id:null,gallery_media_ids:[],pricing_type:'contact',starting_price:null,currency_code:'IDR',price_note:'',estimated_duration:'',items:[{id:21,item_type:'deliverable',label:'Video'}],process_steps:[{id:22,title:'Planning',description:'Discuss'}],primary_cta_label:'',primary_cta_url:''},actor('services'),'request',caps,'uni-inside')).rejects.toThrow('child write failed');
  expect(test.state()).toEqual({committed:false,rolledBack:true});
  expect(test.calls.some(call=>call.sql.startsWith('INSERT INTO services'))).toBe(false);
 });
 it('keeps article gallery ID and its original caption when updating other fields',async()=>{
  const test=fake('news');
  const result=await savePostEditor(test.db,'news',7,{action:'draft',title:'New title',content_type:'article',category_id:3,excerpt:'Summary',body:'<p>Body</p>',cover_media_id:11,gallery_media_ids:[12],author:{source:'user',id:5},reading_time_minutes:5},actor('news'),'request',caps,'uni-inside');
  expect(result).toMatchObject({id:7,title:'New title'});
  expect(test.calls.some(call=>call.sql.startsWith('UPDATE news_images SET')&&call.values.includes(31)&&call.values.includes('Original caption'))).toBe(true);
  expect(test.calls.some(call=>call.sql.startsWith('INSERT INTO news_articles'))).toBe(false);
 });
 it('rejects cross-parent child IDs and missing permissions without committing',async()=>{
  const test=fake('products');
  const payload={action:'draft',name:'Product',description:'',features:[{id:999,label:'Material',value_text:'PLA'}],variants:[],platforms:[]};
  await expect(savePostEditor(test.db,'products',7,payload,actor('products'),'request',caps,'uni-inside')).rejects.toMatchObject({status:409});
  expect(test.state()).toEqual({committed:false,rolledBack:true});
  await expect(savePostEditor(test.db,'products',7,payload,{id:4,permissions:new Set()},'request',caps,'uni-inside')).rejects.toMatchObject({status:403});
 });
 it('requires publish permission and deactivates removed purchase links without deleting rows',async()=>{
  const test=fake('products');
  const payload={action:'draft',name:'Product',category_id:3,product_type:'ready_made',description:'<p>Product</p>',cover_media_id:null,gallery_media_ids:[],base_price:100,currency_code:'IDR',features:[{id:8,label:'Material',value_text:'PLA'}],variants:[{id:9,name:'Large',price:140,stock_quantity:4,is_active:true}],platforms:[]};
  await expect(savePostEditor(test.db,'products',7,{...payload,action:'publish'},actor('products'),'request',caps,'uni-inside')).rejects.toMatchObject({status:403});
  await savePostEditor(test.db,'products',7,payload,actor('products'),'request',caps,'uni-inside');
  expect(test.calls.some(call=>call.sql.startsWith('UPDATE product_purchase_links SET is_active=0'))).toBe(true);
  expect(test.calls.some(call=>call.sql.startsWith('DELETE FROM product_purchase_links'))).toBe(false);
 });
});
