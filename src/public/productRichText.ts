import DOMPurify from 'dompurify';
// Keep headings and quotes readable for legacy descriptions; the create toolbar is smaller.
export function cleanProductHtml(value:string){return DOMPurify.sanitize(value,{ALLOWED_TAGS:['p','br','strong','em','b','i','u','ul','ol','li','h2','h3','blockquote','a'],ALLOWED_ATTR:['href','title','target','rel'],ALLOW_UNKNOWN_PROTOCOLS:false});}
