// News from publishers' RSS feeds (사용자 2026-11-22: "기사 전문은 없어도 요약 발췌문이 있다"). A feed gives the headline,
// the link, the time and a short excerpt (<description>); the body is never fetched. The excerpt is the publisher's own
// summary, shown under the headline as plain text and cut short (excerpt below).
//   NEWS_RSS_URLS  feed URLs, comma or newline separated; "언론사|https://…" names the publisher when the feed's own
//                  <title> is not the name to show
// No XML library: RSS 2.0 <item> and Atom <entry> are read with a small tolerant reader; a feed that is not either is
// refused (ProviderError 'shape'), never half-used.
import {ProviderError,type Ctx,type NewsItem,type NewsProvider} from '../ports';
import {need,request} from './http';
import {dedupeNews} from './vendors';

const ENT:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',middot:'·',hellip:'…',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”',ndash:'–',mdash:'—'};
export function decode(s:string){
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(m,e:string)=>e[0]==='#'?String.fromCodePoint(e[1]==='x'||e[1]==='X'?parseInt(e.slice(2),16):Number(e.slice(1))):ENT[e.toLowerCase()]??m);
}
const cdata=(s:string)=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1');
// the text of an excerpt: tags out (the feed's own HTML, images, "더보기" links), entities decoded, spaces collapsed,
// the publisher's trailing boilerplate (기자 이메일, 무단 전재) dropped, then cut at a sentence end within `max`
export function excerpt(raw:string|null|undefined,max=160):string|null{
  if(!raw)return null;
  // a feed often escapes its HTML (&lt;p&gt;): decode first, then take the tags out (block ones leave a space, inline
  // ones like <b> nothing, so words stay whole), then decode what the text itself escaped
  const strip=(s:string)=>s.replace(/<(script|style)[\s\S]*?<\/\1>/gi,' ').replace(/<\/?(p|br|div|li|ul|ol|h\d|tr|td|table|figure|figcaption)\b[^>]*>/gi,' ').replace(/<[^>]+>/g,'');
  let t=strip(decode(strip(cdata(raw))));
  t=decode(t).replace(/\s+/g,' ').trim();
  t=t.replace(/\s*(?:\[[^\]]*기자\]|[가-힣]{2,4}\s?기자\s?[\w.+-]+@[\w.-]+|[\w.+-]+@[\w.-]+\.\w+|ⓒ.*|©.*|무단\s?전재.*|저작권자.*)$/u,'').trim();
  if(t.length<8)return null;
  if(t.length<=max)return t;
  const cut=t.slice(0,max),end=Math.max(cut.lastIndexOf('다. '),cut.lastIndexOf('. '),cut.lastIndexOf('요. '));
  return end>max*0.5?cut.slice(0,end+1).trim():cut.replace(/\s+\S*$/,'').trim()+'…';
}
const tag=(block:string,name:string)=>{const m=block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`,'i'));return m?decode(cdata(m[1])).trim():null};
const attr=(block:string,name:string,a:string)=>{const m=block.match(new RegExp(`<${name}\\b[^>]*\\b${a}="([^"]*)"`,'i'));return m?decode(m[1]):null};
export type FeedItem={title:string;url:string;publishedAt:string;summary:string|null;publisher:string|null};
// RSS 2.0 items or Atom entries; items without a title, link or readable date are skipped
export function parseFeed(xml:string):{publisher:string|null;items:FeedItem[]}{
  const rss=/<rss[\s>]|<rdf:RDF[\s>]/i.test(xml),atom=/<feed[\s>]/i.test(xml);
  if(!rss&&!atom)throw new ProviderError('news','shape','not an RSS or Atom feed');
  const head=xml.split(/<item[\s>]|<entry[\s>]/i)[0];
  const publisher=tag(head,'title');
  const blocks=xml.match(rss?/<item[\s>][\s\S]*?<\/item>/gi:/<entry[\s>][\s\S]*?<\/entry>/gi)??[];
  const items:FeedItem[]=[];
  for(const b of blocks){
    const title=tag(b,'title'),url=rss?(tag(b,'link')??tag(b,'guid')):(attr(b,'link','href')??tag(b,'id'));
    const when=tag(b,'pubDate')??tag(b,'dc:date')??tag(b,'published')??tag(b,'updated'),t=when?Date.parse(when):NaN;
    if(!title||!url||!Number.isFinite(t))continue;
    items.push({title:decode(title).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(),url:url.trim(),publishedAt:new Date(t).toISOString(),
      summary:excerpt(tag(b,'description')??tag(b,'summary')??tag(b,'content:encoded')??tag(b,'content')),publisher:tag(b,'source')??tag(b,'author')});
  }
  return {publisher,items};
}
const feedsOf=(v:string)=>v.split(/[\n,]/).map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('|');return i>0&&!/^https?:/.test(x.slice(0,i))?{name:x.slice(0,i).trim(),url:x.slice(i+1).trim()}:{name:null,url:x}});
const idOf=(url:string)=>{let h=2166136261;for(const c of url){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return 'rss-'+(h>>>0).toString(36)};
// a story is about the entity when its name (or one of its other names) is in the headline or the excerpt
export function rssNews(ctx:Ctx,names:(entity:string)=>string[]=e=>[e]):NewsProvider{const P='news';return {id:'rss-news',
  async search({entity,since,until}){
    const feeds=feedsOf(need(ctx,P,'NEWS_RSS_URLS')),words=names(entity).filter(Boolean);
    const out:NewsItem[]=[];
    for(const f of feeds){
      const {publisher,items}=parseFeed(await request<string>(ctx,{provider:P,url:f.url,as:'text'}));
      for(const n of items){const day=n.publishedAt.slice(0,10);
        if(day<since||day>until||!words.some(w=>n.title.includes(w)||!!n.summary?.includes(w)))continue;
        out.push({id:idOf(n.url),title:n.title,publisher:f.name??n.publisher??publisher??'',publishedAt:n.publishedAt,updatedAt:null,url:n.url,
          usage:'metadata-only',entities:[entity],dupOf:null,summary:n.summary})}
    }
    return {items:dedupeNews(out),cursor:null}},
}}
