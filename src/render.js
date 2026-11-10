import { W, H, GROUND, INK } from './config.js';
import { TRAITS } from './data.js';
import { POTATO } from './save.js';
import { Battle } from './battle.js';
import { Art, DRAWERS, star } from './art.js';
import { $, rand } from './utils.js';

/* =========================================================
   RENDER — 캔버스 렌더링
   ========================================================= */
const THEMES = [
  { sky:['#7fd3ff','#e3f7ff'], far:'#a8e6a3', near:'#79c977', ground:'#8bd36a', dirt:'#c99560', deco:'tree',    cloud:'rgba(255,255,255,.9)' },
  { sky:['#2f2757','#7b69ad'], far:'#463b6e', near:'#574a86', ground:'#6d6396', dirt:'#463c66', deco:'crystal', cloud:'rgba(200,180,255,.25)' },
  { sky:['#264538','#8dbb9f'], far:'#3d6d52', near:'#2f5a42', ground:'#4f8a5a', dirt:'#5a4030', deco:'pine',    cloud:'rgba(230,255,240,.35)' },
  { sky:['#ff9f5c','#ffe2b3'], far:'#e8a066', near:'#cc7f4a', ground:'#e3b373', dirt:'#a8683a', deco:'rock',    cloud:'rgba(255,240,220,.7)' },
  { sky:['#1d0a22','#7a2c4a'], far:'#3a1636', near:'#531f3d', ground:'#4a2a3a', dirt:'#2e1622', deco:'spike',   cloud:'rgba(255,120,150,.15)' },
  { sky:['#0f2a2a','#4f7d6e'], far:'#20403a', near:'#2b5246', ground:'#3d6b55', dirt:'#2a3a30', deco:'tomb',    cloud:'rgba(200,255,220,.18)' },
  { sky:['#3a3540','#8a7f78'], far:'#57504c', near:'#6b625a', ground:'#8a7a66', dirt:'#4e4338', deco:'mine',    cloud:'rgba(220,210,200,.25)' },
  { sky:['#05051a','#2a2a6e'], far:'#1d1d4a', near:'#2a2a5e', ground:'#4a4a7a', dirt:'#24244a', deco:'planet',  cloud:'rgba(180,160,255,.15)' },
];
/* 감자 모드용 스프라이트 캐시: 유닛 동작을 몇 장의 그림으로 미리 그려 두고 찍기만 함 */
const SpriteCache = {
  m:new Map(), SC:0.6,
  box(key){ return (key==='boss'||key==='ufo') ? [-120,-250,260,270] : [-95,-180,210,200]; },
  frame(u){
    if(u.atkP>0) return 'a'+Math.min(5,Math.floor(u.atkP*6));
    return (u.state==='walk'?'w':'i')+(Math.floor(u.animT*8)%6);
  },
  draw(c,u){
    const f=this.frame(u), id=u.key+'|'+f; let cv=this.m.get(id);
    const [x,y,w,h]=this.box(u.key);
    if(!cv){
      cv=document.createElement('canvas'); cv.width=Math.ceil(w*this.SC); cv.height=Math.ceil(h*this.SC);
      const g=cv.getContext('2d'); g.scale(this.SC,this.SC); g.translate(-x,-y);
      const n=+f.slice(1), t=n/8;
      const fake={ key:u.key, def:u.def, state:f[0]==='w'?'walk':'attack', animT:t, atkP:f[0]==='a'?(n+0.5)/6:0, seed:0.3, hitT:0, portrait:false };
      DRAWERS[u.key].call(Art,g,fake,t);
      this.m.set(id,cv);
    }
    c.drawImage(cv,x,y,w,h);
  }
};
const Render = {
  cv:null, c:null, scale:1, bg:null, theme:0, clouds:[],
  init(){
    this.cv=$('#field'); this.c=this.cv.getContext('2d');
    // 감자 모드: 무거운 그림자 번짐(shadowBlur)과 필터(filter)를 이 캔버스에서만 무시
    const proto=CanvasRenderingContext2D.prototype;
    for(const prop of ['shadowBlur','filter']){
      const d=Object.getOwnPropertyDescriptor(proto,prop); if(!d||!d.set) continue;
      Object.defineProperty(this.c,prop,{ configurable:true, get(){ return d.get.call(this); },
        set(v){ if(POTATO() && v!==0 && v!=='none') return; d.set.call(this,v); } });
    }
    this.clouds=Array.from({length:7},(_,i)=>({x:rand(0,W),y:rand(30,170),s:rand(.6,1.4),v:rand(6,18)}));
    window.addEventListener('resize',()=>this.resize());
  },
  resize(){
    const wrap=$('#field-wrap'); if(!wrap.clientWidth) return;
    const dpr = POTATO() ? 0.75 : Math.min(2,window.devicePixelRatio||1);   // 감자 모드: 픽셀 수를 크게 줄임
    const s=Math.min(wrap.clientWidth/W, wrap.clientHeight/H);
    this.cv.style.width=Math.floor(W*s)+'px'; this.cv.style.height=Math.floor(H*s)+'px';
    if(POTATO()){ this.c.shadowBlur=0; this.c.filter='none'; }
    this.cv.width=Math.floor(W*s*dpr); this.cv.height=Math.floor(H*s*dpr);
    this.scale=s*dpr;
  },
  prepareBg(theme, target){
    const th=THEMES[theme]; const cv=target||document.createElement('canvas');
    if(!target){ cv.width=W; cv.height=H; }
    const c=cv.getContext('2d'); const sx=cv.width/W, sy=cv.height/H;
    c.save(); c.scale(sx,sy);
    const g=c.createLinearGradient(0,0,0,GROUND); g.addColorStop(0,th.sky[0]); g.addColorStop(1,th.sky[1]); c.fillStyle=g; c.fillRect(0,0,W,H);
    if(theme===1||theme===4||theme===5||theme===7){ for(let i=0;i<(theme===7?120:40);i++){ c.fillStyle=`rgba(255,255,255,${rand(.2,.7)})`; c.beginPath(); c.arc(rand(0,W),rand(0,250),rand(.8,2),0,7); c.fill(); } }
    if(theme===0||theme===3){ c.fillStyle=theme===0?'#fff6b0':'#fff1c9'; c.beginPath(); c.arc(1000,90,46,0,7); c.fill(); }
    if(theme===4){ c.fillStyle='#ffd0d8'; c.beginPath(); c.arc(980,95,40,0,7); c.fill(); c.fillStyle=th.sky[0]; c.beginPath(); c.arc(995,85,36,0,7); c.fill(); }
    // 먼 언덕
    c.fillStyle=th.far; c.beginPath(); c.moveTo(0,GROUND);
    for(let x=0;x<=W;x+=40) c.lineTo(x, GROUND-110-Math.sin(x/170)*40-Math.sin(x/63)*14);
    c.lineTo(W,GROUND); c.fill();
    // 장식
    let seed=theme*97+13; const R=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
    for(let i=0;i<16;i++){
      const x=R()*W, y=GROUND-40-R()*30, s=0.6+R()*0.7;
      c.save(); c.translate(x,y); c.scale(s,s);
      if(th.deco==='tree'){ c.fillStyle='#8a5a2b'; c.fillRect(-5,-10,10,40); c.fillStyle='#5fbf5a'; c.beginPath(); c.arc(0,-24,24,0,7); c.arc(-16,-12,16,0,7); c.arc(16,-12,16,0,7); c.fill(); }
      else if(th.deco==='pine'){ c.fillStyle='#24493a'; for(let k=0;k<3;k++){ c.beginPath(); c.moveTo(-26+k*5,10-k*20); c.lineTo(0,-30-k*20); c.lineTo(26-k*5,10-k*20); c.fill(); } }
      else if(th.deco==='crystal'){ c.fillStyle='rgba(199,125,255,.6)'; c.beginPath(); c.moveTo(-10,30); c.lineTo(0,-30); c.lineTo(10,30); c.fill(); c.beginPath(); c.moveTo(6,30); c.lineTo(18,-6); c.lineTo(24,30); c.fill(); }
      else if(th.deco==='rock'){ c.fillStyle='#b8733f'; c.beginPath(); c.moveTo(-30,30); c.lineTo(-20,-20); c.lineTo(10,-34); c.lineTo(30,30); c.fill(); }
      else if(th.deco==='tomb'){ c.fillStyle='#5f7f78'; c.beginPath(); c.roundRect(-14,-24,28,54,[14,14,2,2]); c.fill(); c.fillStyle='#3e5a54'; c.fillRect(-2,-14,4,18); c.fillRect(-8,-8,16,4); }
      else if(th.deco==='mine'){ c.fillStyle='#5a4a3a'; c.fillRect(-26,-30,8,60); c.fillRect(18,-30,8,60); c.fillRect(-30,-36,60,10); c.fillStyle='#c0c6d6'; c.beginPath(); c.moveTo(-6,10); c.lineTo(0,-6); c.lineTo(6,10); c.fill(); }
      else if(th.deco==='planet'){ c.fillStyle='rgba(199,125,255,.35)'; c.beginPath(); c.arc(0,-230,22,0,7); c.fill(); c.strokeStyle='rgba(255,210,63,.4)'; c.lineWidth=3; c.beginPath(); c.ellipse(0,-230,34,8,-0.3,0,7); c.stroke(); }
      else { c.fillStyle='#2a1020'; c.beginPath(); c.moveTo(-14,30); c.lineTo(-4,-50); c.lineTo(4,-20); c.lineTo(10,-60); c.lineTo(16,30); c.fill(); }
      c.restore();
    }
    // 가까운 언덕
    c.fillStyle=th.near; c.beginPath(); c.moveTo(0,GROUND);
    for(let x=0;x<=W;x+=30) c.lineTo(x, GROUND-36-Math.sin(x/120+1)*14);
    c.lineTo(W,GROUND); c.fill();
    // 땅
    c.fillStyle=th.ground; c.fillRect(0,GROUND-8,W,24);
    c.fillStyle=th.dirt; c.fillRect(0,GROUND+14,W,H-GROUND);
    c.strokeStyle=INK; c.lineWidth=3; c.beginPath(); c.moveTo(0,GROUND+14); c.lineTo(W,GROUND+14); c.stroke();
    c.fillStyle='rgba(0,0,0,.12)';
    for(let i=0;i<40;i++){ c.beginPath(); c.ellipse(R()*W, GROUND+30+R()*(H-GROUND-36), 6+R()*10, 3+R()*3, 0,0,7); c.fill(); }
    c.fillStyle='rgba(255,255,255,.18)';
    for(let x=0;x<W;x+=18){ c.beginPath(); c.moveTo(x,GROUND-8); c.lineTo(x+4,GROUND-16); c.lineTo(x+8,GROUND-8); c.fill(); }
    c.restore();
    if(!target){ this.bg=cv; this.theme=theme; }
    return cv;
  },
  draw(T, dtReal){
    const c=this.c, B=Battle; if(!c||!this.bg) return;
    c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,this.cv.width,this.cv.height);
    c.setTransform(this.scale,0,0,this.scale,0,0);
    if(B.shakeT>0){ const m=Math.min(1,B.shakeT)*8; c.translate(rand(-m,m),rand(-m,m)); }
    c.drawImage(this.bg,0,0,W,H);
    // 구름
    const th=THEMES[this.theme];
    if(!POTATO()) for(const cl of this.clouds){
      if(!B.paused && !B.quizOpen) cl.x+=cl.v*dtReal; if(cl.x>W+120) cl.x=-120;
      c.fillStyle=th.cloud; c.beginPath(); c.ellipse(cl.x,cl.y,50*cl.s,18*cl.s,0,0,7); c.ellipse(cl.x+30*cl.s,cl.y-10*cl.s,30*cl.s,20*cl.s,0,0,7); c.ellipse(cl.x-26*cl.s,cl.y-4*cl.s,24*cl.s,14*cl.s,0,0,7); c.fill();
    }
    Art.allyBase(c,B.ally,T); Art.enemyBase(c,B.enemy,T);
    // 지면 충격파
    for(const s of B.slams){ const p=1-s.life/s.max; c.strokeStyle=`rgba(255,122,245,${1-p})`; c.lineWidth=6; c.beginPath(); c.ellipse(s.x,GROUND+4,30+p*110,8+p*14,0,0,7); c.stroke(); }
    // 유닛 (뒤에서 앞으로)
    const list=B.units.slice().sort((a,b)=>a.lane-b.lane);
    for(const u of list) this.drawUnit(c,u,T);
    // 투사체
    for(const p of B.projs){
      c.save(); c.translate(p.x,p.y); c.rotate(p.ang);
      if(p.type==='arrow'){ c.strokeStyle=INK; c.lineWidth=3; c.beginPath(); c.moveTo(-16,0); c.lineTo(8,0); c.stroke(); c.fillStyle='#ddd'; c.beginPath(); c.moveTo(8,-4); c.lineTo(15,0); c.lineTo(8,4); c.fill(); c.stroke(); c.fillStyle='#ff5d7a'; c.fillRect(-18,-4,6,8); }
      else if(p.type==='acorn'){ c.rotate(T*12); Art.ell(c,0,1,6,7,'#a0642e',INK,2); Art.ell(c,0,-4,7,3.5,'#5e3b1a',INK,1.5); }
      else if(p.type==='holy'){ c.shadowColor='#fff6b0'; c.shadowBlur=16; Art.circ(c,0,0,8,'#fff6b0','#ffd23f',2); }
      else if(p.type==='laser'){ c.shadowColor='#ff7af5'; c.shadowBlur=14; Art.rr(c,-22,-3,30,6,3,'#ff7af5',null); Art.rr(c,-18,-1.5,24,3,1.5,'#fff',null); }
      else if(p.type==='feather'){ Art.ell(c,0,0,12,4,'#f0dcb8',INK,1.5); c.beginPath(); c.moveTo(-12,0); c.lineTo(12,0); Art.path(c,null,INK,1); }
      else if(p.type==='clock'){ c.shadowColor='#bff4ff'; c.shadowBlur=20; Art.circ(c,0,0,14,'#fff8ec','#5b43c9',3); c.rotate(-p.ang); c.beginPath(); c.moveTo(0,0); c.lineTo(0,-9); c.moveTo(0,0); c.lineTo(6,2); Art.path(c,null,INK,2); }
      else if(p.type==='ice'){ c.shadowColor='#7fe0ff'; c.shadowBlur=14; c.beginPath(); c.moveTo(12,0); c.lineTo(0,-6); c.lineTo(-12,0); c.lineTo(0,6); c.closePath(); Art.path(c,'#bff4ff',INK,2); }
      else if(p.type==='cannon'){ Art.circ(c,0,0,9,'#3a3f52',INK,2.5); Art.circ(c,-3,-3,3,'rgba(255,255,255,.6)',null); }
      else if(p.type==='sun'){ c.shadowColor='#ffb347'; c.shadowBlur=30; Art.circ(c,0,0,17,'#ff8a3c','#c2410c',3); Art.circ(c,2,-2,9,'#ffd23f',null); Art.circ(c,3,-3,4,'#fffbe0',null); }
      else { c.shadowColor='#ff9a3c'; c.shadowBlur=20; Art.circ(c,0,0,11,'#ffb347','#d9480f',3); Art.circ(c,2,-2,5,'#fff3b0',null); }
      c.restore();
    }
    // 링
    for(const r of B.rings){ c.globalAlpha=r.life/r.max; c.strokeStyle=r.color; c.lineWidth=5; c.beginPath(); c.ellipse(r.x,r.y,r.r,r.r*0.45,0,0,7); c.stroke(); }
    c.globalAlpha=1;
    // 파티클
    for(const p of B.parts){
      c.globalAlpha=Math.max(0,p.life/p.max); c.fillStyle=p.color;
      if(p.star){ this.star(c,p.x,p.y,p.r*1.6); } else { c.beginPath(); c.arc(p.x,p.y,p.r,0,7); c.fill(); }
    }
    c.globalAlpha=1;
    // 데미지 숫자
    c.textAlign='center'; c.lineJoin='round';
    for(const t of B.texts){
      const p=1-t.life/t.max, s=p<0.15? 1+(0.15-p)*4 : 1;
      c.globalAlpha=Math.min(1,t.life/0.3);
      c.font=`${Math.round(t.size*s)}px "Do Hyeon", sans-serif`;
      c.lineWidth=4; c.strokeStyle=INK; c.strokeText(t.text,t.x,t.y); c.fillStyle=t.color; c.fillText(t.text,t.x,t.y);
    }
    c.globalAlpha=1;
  },
  star,
  drawUnit(c,u,T){
    const big=u.def.boss;
    c.save(); c.translate(u.x, u.y+u.lane*0.6);
    // 그림자
    const shW = u.w*1.1;
    c.fillStyle='rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0,2,shW,shW*0.22,0,0,7); c.fill();
    if(u.dying){ const p=u.dieT/0.7; c.globalAlpha=Math.max(0,1-p); c.translate(0,-p*30); c.rotate((u.team==='ally'?-1:1)*p*0.8); c.scale(1+p*.2,1-p*.4); }
    if(u.spawnT>0){ const p=1-u.spawnT/0.45; const e=p<1? 1-Math.pow(1-p,3):1; c.translate(0,-(1-e)*80); c.scale(0.4+e*0.6,0.4+e*0.6+(p>0.8?Math.sin((p-0.8)*15)*0.1:0)); }
    if(u.power){ c.save(); c.shadowColor='#ffd23f'; c.shadowBlur=20; c.fillStyle='rgba(255,210,63,.25)'; c.beginPath(); c.ellipse(0,-30,u.w*1.4,40,0,0,7); c.fill(); c.restore(); }
    if(u.team==='enemy') c.scale(-1,1);
    if(big) c.scale(1.05,1.05);
    if(u.hitT>0){ if(POTATO()) c.globalAlpha*=0.55; else c.filter='brightness(2.2) saturate(.4)'; }
    if(POTATO()) SpriteCache.draw(c,u); else DRAWERS[u.key].call(Art,c,u,T);
    c.filter='none';
    if(u.freezeT>0 && !u.dying){ const fy=u.def.fly?-66:0, hh=u.def.boss?170:70; c.fillStyle='rgba(190,240,255,.45)'; c.strokeStyle='rgba(255,255,255,.9)'; c.lineWidth=2; c.beginPath(); c.roundRect(-u.w*1.2,fy-hh,u.w*2.4,hh,6); c.fill(); c.stroke(); }
    if(u.shield>0 && !u.dying){ const fy=u.def.fly?(u.def.boss?-96:-66):0, r=u.def.boss?95:34; c.strokeStyle='rgba(199,125,255,.85)'; c.fillStyle='rgba(199,125,255,.15)'; c.lineWidth=3; c.beginPath(); c.ellipse(0,fy-r*0.8,r*0.9+Math.sin(T*6)*1.5,r,0,0,7); c.fill(); c.stroke(); }
    if(u.slowT>0 && !u.dying){ const fy=u.def.fly?-66:0; c.fillStyle='rgba(150,225,255,.35)'; c.beginPath(); c.ellipse(0,fy-26,u.w*1.3,32,0,0,7); c.fill(); c.fillStyle='#e6fbff'; Render.star(c,-u.w*0.8,fy-50+Math.sin(T*4)*3,5); Render.star(c,u.w*0.6,fy-12,4); }
    c.restore();
    // 체력바
    const top = (u.def.boss? GROUND-(u.key==='ufo'?200:210) : u.def.fly ? GROUND-({dragon:140,phoenix:160,owl:130,ghost:116}[u.key]||110) : GROUND-({golem:102,mushroom:84,snowmage:104,turtle:96,robot:96,frog:70,duck:72,zombie:86}[u.key]||86));
    if(!u.dying && u.team==='enemy' && u.def.traits){ c.font='15px sans-serif'; c.textAlign='center'; c.fillText(u.def.traits.map(t=>TRAITS[t].icon).join(''), u.x, top-6+u.lane*0.6); }
    if(!u.dying && u.shield>0){ const bw=u.def.boss?110:42, x=u.x-bw/2, y=top+u.lane*0.6+(u.def.boss?13:9); c.fillStyle=INK; c.fillRect(x-2,y-1,bw+4,6); c.fillStyle='#c77dff'; c.fillRect(x,y,bw*u.shield/u.maxShield,4); }
    if(!u.dying && u.hp<u.maxHp){
      const bw = big?110:42, x=u.x-bw/2, y=top+u.lane*0.6;
      c.fillStyle=INK; c.beginPath(); c.roundRect(x-2,y-2,bw+4,big?12:8,4); c.fill();
      c.fillStyle=u.team==='ally'?'#5ed38a':'#ff5d5d'; c.beginPath(); c.roundRect(x,y,bw*Math.max(0,u.hp/u.maxHp),big?8:4,2); c.fill();
    }
  },
};

export { Render };
