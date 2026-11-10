import { WORD_DATA } from './words.js';
import { Save } from './save.js';
import { shuffle } from './utils.js';

/* ---------------- QUIZ ---------------- */
const POS_KO = { v:'동사', n:'명사', adj:'형용사', adv:'부사' };
const Quiz = {
  list:[], recent:[], pending:null,
  init(){
    const cw = Save.data.customWords;
    this.list = (Array.isArray(cw) && cw.length>=4) ? cw : WORD_DATA.slice();
    this.recent=[]; this.pending=null;
  },
  parse(text){
    const out=[], seen=new Set();
    text.split(/\r?\n/).forEach(line=>{
      const m = line.split(/\t|,|:|\s-\s|=/);
      if(m.length<2) return;
      const en=m[0].trim(), ko=m.slice(1).join(',').trim();
      if(!en||!ko||seen.has(en.toLowerCase())) return;
      seen.add(en.toLowerCase()); out.push({en, ko, pos:''});
    });
    return out;
  },
  next(){
    if(this.pending) return this.pending;           // 닫기로 건너뛴 문제는 다시 출제
    const n=this.list.length, block=Math.min(6, n-1);
    const recent=new Set(this.recent.slice(-block));
    const pool=this.list.filter(w=>!recent.has(w.en));
    const st=Save.data.stats.words;
    // 자주 틀린 단어일수록 더 자주 출제 (가중치)
    const weights=pool.map(w=>{ const e=st[w.en]; return e ? Math.max(0.4, 1 + Math.min(4, e.w*1.5) - Math.min(0.6, e.c*0.1)) : 1; });
    let r=Math.random()*weights.reduce((a,b)=>a+b,0), pick=pool[0];
    for(let i=0;i<pool.length;i++){ r-=weights[i]; if(r<=0){ pick=pool[i]; break; } }
    this.recent.push(pick.en); if(this.recent.length>30) this.recent.shift();
    // 오답 보기: 같은 품사 우선
    const others=this.list.filter(w=>w.ko!==pick.ko);
    let same=shuffle(others.filter(w=>pick.pos && w.pos===pick.pos)).map(w=>w.ko);
    let rest=shuffle(others.filter(w=>!(pick.pos && w.pos===pick.pos))).map(w=>w.ko);
    const ds=[]; for(const k of same.concat(rest)){ if(ds.length>=3) break; if(!ds.includes(k)) ds.push(k); }
    const options=shuffle([pick.ko, ...ds]);
    this.pending={ word:pick, options, answer:options.indexOf(pick.ko) };
    return this.pending;
  },
  record(word, ok){
    const s=Save.data.stats; s.total++; ok? s.correct++ : s.wrong++;
    const e = s.words[word.en] || (s.words[word.en]={ko:word.ko,c:0,w:0,last:0});
    e.ko=word.ko; ok? e.c++ : (e.w++, e.last=Date.now());
    this.pending=null;
  }
};

export { Quiz, POS_KO };
