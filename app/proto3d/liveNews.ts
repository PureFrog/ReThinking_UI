// The real-news hook for the 통신기 뉴스 탭 and the 뉴스 표지판: asks the news-feed server function once per set of
// stocks while the screen is open; null until it answers or when it cannot (the screen then shows its 모의 기사).
import {useEffect,useState} from 'react';
import type {LiveNews} from '../core/content/live/naver';
import {liveNews} from './supabase';
export function useLiveNews(stocks:{code:string;name:string}[],on=true):Record<string,LiveNews[]>|null{
  const key=stocks.map(s=>`${s.code}:${s.name}`).sort().join(',');
  const [live,setLive]=useState<{key:string;news:Record<string,LiveNews[]>|null}|null>(null);
  useEffect(()=>{if(!on||!key)return;let stop=false;
    void liveNews(stocks).then(news=>{if(!stop)setLive({key,news})});
    return()=>{stop=true}},[key,on]);// eslint-disable-line react-hooks/exhaustive-deps
  return live?.key===key?live.news:null;
}
