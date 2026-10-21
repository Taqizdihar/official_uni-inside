import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {categoryPath,categoryPayload,categoryResourceFor,categoryTabFor,categoryTabs,categoryUrl} from '../src/admin/categories/model';
import {resolveBreadcrumb} from '../src/admin/breadcrumbs';

test('each tab selects exactly its category resource and survives a URL refresh',()=>{
  assert.deepEqual(categoryTabs.map(tab=>tab.resource),['product-categories','service-categories','news-categories']);
  for(const tab of categoryTabs){
    const url=new URL(categoryUrl(tab),'https://cms.example');
    assert.equal(categoryTabFor(url.searchParams.get('tab')),tab);
    assert.equal(categoryResourceFor(tab.resource),tab);
    assert.equal(categoryPath(tab),`/admin/${tab.resource}`);
    assert.equal(categoryPath(tab,17),`/admin/${tab.resource}/17`);
    assert.equal(categoryUrl(tab,'create'),`/admin/content/categories?tab=${tab.key}&create=1`);
    assert.equal(categoryUrl(tab,'edit',17),`/admin/content/categories?tab=${tab.key}&edit=17`);
  }
});

test('the shared form sends only approved fields and validates lengths',()=>{
  assert.deepEqual(categoryPayload('  Desain Grafis  ','  Untuk visual  '),{data:{name:'Desain Grafis',description:'Untuk visual'}});
  assert.deepEqual(categoryPayload('Artikel',''),{data:{name:'Artikel',description:null}});
  assert.ok(categoryPayload('   ','').error);
  assert.ok(categoryPayload('x'.repeat(151),'').error);
  assert.ok(categoryPayload('Valid','x'.repeat(1001)).error);
});

test('unified category page has one stable breadcrumb',()=>{
  assert.deepEqual(resolveBreadcrumb('/admin/content/categories'),[{label:'Internal CMS',to:'/admin/dashboard'},{label:'Manajemen Kategori'}]);
});
