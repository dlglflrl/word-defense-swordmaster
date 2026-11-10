import { INK, MAX_LV } from './config.js';
import { UNIT_ORDER, UNITS, DECK_MAX, PITY_MAX, RARITY, TICKET_PRICE } from './data.js';
import { Save } from './save.js';
import { Sound } from './sound.js';
import { Art, drawPortrait } from './art.js';
import { Render } from './render.js';
import { abilityTags } from './ui-helpers.js';
import { $, rand, clamp } from './utils.js';

/* =========================================================
   GACHA — 캐릭터 뽑기
   ========================================================= */
const RCOL = { N:'#b8c2d6', R:'#4c8dff', SR:'#a35cff', UR:'#ffb300' };
const RORD = { N:0, R:1, SR:2, UR:3 };
// UI 알림 대상은 main.js에서 연결해 순환 import를 피한다.
let UI;

const Gacha = {
  init({ ui }){
    UI=ui;
  },
  pool(r){ return UNIT_ORDER.filter(k=>UNITS[k].gacha===r); },
  roll(){
    const D=Save.data; D.pity++;
    let r='N';
    if(D.pity>=PITY_MAX) r='UR';
    else { let x=Math.random()*100; for(const k of ['UR','SR','R','N']){ x-=RARITY[k].rate; if(x<0){ r=k; break; } } }
    if(r==='UR') D.pity=0;
    const pool=this.pool(r), key=pool[Math.floor(Math.random()*pool.length)], st=D.units[key];
    const res={key, r, isNew:!st.owned, lvFrom:st.lv, lvTo:st.lv, coins:0, deckAdded:false};
    if(!st.owned){ st.owned=true; if(D.deck.length<DECK_MAX){ D.deck.push(key); res.deckAdded=true; } }
    else if(st.lv<MAX_LV){ st.lv++; res.lvTo=st.lv; }
    else { res.coins=RARITY[r].dupCoins; D.coins+=res.coins; }
    D.totals.pulls++;
    return res;
  },
  pull(n){
    const D=Save.data;
    Sound.init();
    if(D.tickets<n){ UI.toast('🎟️','뽑기권이 부족해요! 스테이지를 클리어해 보세요'); Sound.play('wrong'); return; }
    D.tickets-=n; const res=[]; for(let i=0;i<n;i++) res.push(this.roll());
    Save.save(); UI.refreshCoins(); this.play(res);
  },
  buy(){
    const D=Save.data; Sound.init();
    if(D.coins<TICKET_PRICE){ UI.toast('💰','코인이 부족해요'); Sound.play('wrong'); return; }
    D.coins-=TICKET_PRICE; D.tickets++; Save.save(); Sound.play('coin'); UI.refreshCoins(); this.render();
  },
  render(){
    const D=Save.data;
    $('#g-pull1').disabled = D.tickets<1;
    $('#g-pull10').disabled = D.tickets<10;
    $('#g-buy').disabled = D.coins<TICKET_PRICE;
    $('#g-pity').textContent = `🌞 전설 확정까지 ${PITY_MAX-D.pity}회 (천장 ${D.pity}/${PITY_MAX})`;
    $('#g-pity-bar').style.width = (D.pity/PITY_MAX*100)+'%';
    const tb=$('#rate-table'); tb.innerHTML='';
    ['UR','SR','R','N'].forEach(r=>{
      const pool=this.pool(r), per=(RARITY[r].rate/pool.length).toFixed(1);
      const tr=document.createElement('tr');
      tr.innerHTML=`<td style="width:112px"><span class="rbadge r-${r}" style="margin:0">${'★'.repeat(RARITY[r].stars)} ${RARITY[r].name}</span></td>
        <td><div class="rate-chars">${pool.map(k=>`<span class="${D.units[k].owned?'':'own'}" title="${UNITS[k].desc}"><canvas width="60" height="52" data-k="${k}"></canvas>${UNITS[k].name} <small style="opacity:.6">${per}% · ⚡${UNITS[k].cost}</small>${D.units[k].owned?` ✔`:''}</span>`).join('')}</div></td>
        <td class="pct" style="color:${r==='UR'?'#e08a00':RCOL[r]}">${RARITY[r].rate}%</td>`;
      tb.appendChild(tr);
    });
    tb.querySelectorAll('canvas[data-k]').forEach(cv=>drawPortrait(cv,cv.dataset.k));
    this.machine();
  },
  /* --- 뽑기 기계 (대기 화면) --- */
  machine(){
    if(this._mLoop) return; this._mLoop=true;
    const cv=$('#gacha-machine'), c=cv.getContext('2d');
    const caps=Array.from({length:16},(_,i)=>({x:rand(-60,60),y:rand(-60,20),vx:rand(-40,40),vy:0,col:['#ff7aa8','#ffd23f','#4c8dff','#5ed38a','#a35cff','#ff9f43'][i%6]}));
    const loop=(now)=>{
      if(UI.screen!=='gacha'){ this._mLoop=false; return; }
      const T=now/1000, dpr=Math.min(2,window.devicePixelRatio||1), w=cv.clientWidth, h=cv.clientHeight;
      if(cv.width!==Math.floor(w*dpr)){ cv.width=Math.floor(w*dpr); cv.height=Math.floor(h*dpr); }
      c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,w,h);
      const s=h/300; c.save(); c.translate(w/2,h*0.42); c.scale(s,s);
      const shake = Save.data.tickets>0 ? Math.sin(T*3)*0.02 : 0; c.rotate(shake);
      Art.rr(c,-90,70,180,110,24,'#ff7aa8',INK,4);
      Art.rr(c,-30,100,60,44,12,'#2b2140',INK,3);
      Art.circ(c,0,122,10,'#ffd23f',INK,3);
      c.fillStyle='#fff'; c.font='22px "Do Hyeon", sans-serif'; c.textAlign='center'; c.fillText('GACHA',0,92);
      Art.rr(c,-14,150,28,20,6,'#ffd23f',INK,3);
      c.save(); c.beginPath(); c.arc(0,0,92,0,Math.PI*2); c.clip();
      c.fillStyle='rgba(220,245,255,.55)'; c.fillRect(-100,-100,200,200);
      for(const p of caps){
        p.vy+=300*(1/60); p.x+=p.vx/60; p.y+=p.vy/60;
        if(p.y>58){ p.y=58; p.vy=-rand(120,260)*(Save.data.tickets>0?1:0.3); }
        if(p.x<-70||p.x>70){ p.vx*=-1; p.x=clamp(p.x,-70,70); }
        c.save(); c.translate(p.x,p.y); c.rotate(p.x*0.05);
        c.beginPath(); c.arc(0,0,16,Math.PI,0); c.fillStyle=p.col; c.fill();
        c.beginPath(); c.arc(0,0,16,0,Math.PI); c.fillStyle='#fff'; c.fill();
        c.beginPath(); c.arc(0,0,16,0,7); c.lineWidth=2.5; c.strokeStyle=INK; c.stroke();
        c.restore();
      }
      c.restore();
      Art.circ(c,0,0,92,null,INK,5);
      Art.ell(c,-40,-44,14,26,'rgba(255,255,255,.6)',null,0,0.6);
      Art.rr(c,-30,-108,60,20,8,'#ffd23f',INK,4);
      c.restore();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },
  /* --- 뽑기 연출 --- */
  play(res){
    this.res=res; this.top=res.reduce((a,b)=>RORD[b.r]>RORD[a]?b.r:a,'N');
    this.dur={N:1.5,R:1.8,SR:2.3,UR:3.2}[this.top];
    this.t=0; this.revealed=false; this.cracked=false; this.lastTick=0; this.sparks=[]; this.active=true;
    const m=$('#modal-gacha'); m.classList.add('show'); $('#gacha-result').classList.remove('show'); $('#gacha-result').innerHTML=''; $('#gacha-skip').style.display='';
    m.onclick=(e)=>{ if(!this.revealed && e.target.tagName!=='BUTTON') this.t=Math.max(this.t,this.dur-0.35); };
    const cv=$('#gacha-cv'); let last=performance.now();
    const loop=(now)=>{
      if(!this.active) return;
      const dt=Math.min(0.05,(now-last)/1000); last=now; this.t+=dt;
      this.draw(cv,dt);
      if(!this.cracked && this.t>=this.dur-0.6){ this.cracked=true; Sound.play('crack'); }
      if(!this.revealed && this.t>=this.dur) this.reveal();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },
  draw(cv,dt){
    const dpr=Math.min(2,window.devicePixelRatio||1), w=cv.clientWidth, h=cv.clientHeight;
    if(cv.width!==Math.floor(w*dpr)||cv.height!==Math.floor(h*dpr)){ cv.width=Math.floor(w*dpr); cv.height=Math.floor(h*dpr); }
    const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
    const t=this.t, D=this.dur, top=this.top, cx=w/2, cy=h*0.48, s=Math.min(w,h)/600;
    const hintT=D*0.45, crackT=D-0.6;
    let col = t>hintT ? RCOL[top] : '#ffffff';
    if(top==='UR' && t>D*0.65) col = `hsl(${(t*360)%360},95%,62%)`;
    // 배경
    const g=c.createRadialGradient(cx,cy,10,cx,cy,Math.max(w,h)*0.7);
    g.addColorStop(0, t>hintT? col : '#3a2d63'); g.addColorStop(0.35,'#1d1631'); g.addColorStop(1,'#0b0716');
    c.globalAlpha=1; c.fillStyle=g; c.fillRect(0,0,w,h);
    // 광선
    if(t>hintT){
      const a=Math.min(1,(t-hintT)/0.5)*(t>crackT?1:0.35);
      c.save(); c.translate(cx,cy); c.rotate(t*0.6);
      const n = top==='UR'?24:16;
      for(let i=0;i<n;i++){ c.rotate(Math.PI*2/n); c.globalAlpha=a*0.35; c.fillStyle= top==='UR' ? `hsl(${(i*30+t*120)%360},95%,65%)` : col;
        c.beginPath(); c.moveTo(0,0); c.lineTo(-22*s,-900*s); c.lineTo(22*s,-900*s); c.closePath(); c.fill(); }
      c.restore(); c.globalAlpha=1;
    }
    // 스파크
    if(t>hintT && Math.random()<(top==='UR'?0.9:0.5)) this.sparks.push({x:cx+rand(-120,120)*s,y:cy+rand(-120,120)*s,vx:rand(-60,60),vy:rand(-120,-20),life:1,col:top==='UR'?`hsl(${rand(0,360)},95%,70%)`:col});
    for(const p of this.sparks){ p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; c.globalAlpha=Math.max(0,p.life); c.fillStyle=p.col; Render.star(c,p.x,p.y,6*s); }
    this.sparks=this.sparks.filter(p=>p.life>0); c.globalAlpha=1;
    if(this.revealed) return;
    // 알
    const drop = Math.min(1,t/0.35), ease=1-Math.pow(1-drop,3);
    const ey = cy - (1-ease)*400*s;
    let amp=0; if(t>0.35 && t<crackT){ const k=(t-0.35)/(crackT-0.35); amp=0.05+k*0.3; if(t-this.lastTick>0.2-k*0.12){ this.lastTick=t; Sound.play('tick'); } }
    const rot=Math.sin(t*38)*amp;
    const cp = t>crackT ? Math.min(1,(t-crackT)/0.45) : 0;
    c.save(); c.translate(cx,ey); c.scale(s*1.4,s*1.4); c.rotate(rot);
    if(t>hintT){ c.shadowColor=top==='UR'?'#ffd23f':col; c.shadowBlur=40+Math.sin(t*10)*15; }
    const eggPath=()=>{ c.beginPath(); c.ellipse(0,0,70,88,0,0,Math.PI*2); };
    const zig=(dir)=>{ c.beginPath(); c.moveTo(-90,dir*-200); c.lineTo(90,dir*-200); c.lineTo(90,-4); for(let i=0;i<=8;i++) c.lineTo(90-i*22.5, i%2? 10:-10); c.closePath(); };
    const drawEgg=()=>{
      eggPath(); const eg=c.createLinearGradient(0,-88,0,88); eg.addColorStop(0,'#ffffff'); eg.addColorStop(1,t>hintT?col:'#e6dcff'); c.fillStyle=eg; c.fill();
      c.shadowBlur=0; c.lineWidth=5; c.strokeStyle=INK; c.stroke();
      c.fillStyle=t>hintT?col:'#ff7aa8'; c.globalAlpha=0.55;
      c.beginPath(); for(let i=0;i<=8;i++) c.lineTo(-70+i*17.5, (i%2?10:-10)); for(let i=8;i>=0;i--) c.lineTo(-70+i*17.5, (i%2?10:-10)+16); c.closePath(); c.fill(); c.globalAlpha=1;
      Art.ell(c,-28,-44,10,20,'rgba(255,255,255,.75)',null,0,0.5);
      c.fillStyle=INK; c.font='34px "Do Hyeon", sans-serif'; c.textAlign='center'; c.fillText('?',4,-26);
    };
    if(cp===0) drawEgg();
    else {
      c.save(); c.translate(-cp*40,-cp*160); c.rotate(-cp*0.8); c.save(); zig(1); c.clip(); drawEgg(); c.restore(); c.restore();
      c.save(); c.translate(cp*30,cp*120); c.rotate(cp*0.4); c.save(); c.beginPath(); c.moveTo(-90,200); c.lineTo(90,200); c.lineTo(90,-4); for(let i=0;i<=8;i++) c.lineTo(90-i*22.5, i%2? 10:-10); c.closePath(); c.clip(); drawEgg(); c.restore(); c.restore();
    }
    c.restore();
    if(cp>0){ c.globalAlpha=Math.max(0,1-cp*1.2)*0.9 + (cp<0.15?0.1:0); c.fillStyle='#fff'; c.fillRect(0,0,w,h); c.globalAlpha=1; }
  },
  reveal(){
    this.revealed=true; $('#gacha-skip').style.display='none';
    Sound.play('reveal'+this.top);
    const box=$('#gacha-result'), D=Save.data, res=this.res;
    const info=r=> r.isNew ? `<div class="g-new">NEW!</div>` : '';
    const sub=r=> r.isNew ? (r.deckAdded?'편성에 자동 추가!':'상점에서 편성하세요') : r.coins? `최대 레벨! +${r.coins} 코인` : `중복! Lv.${r.lvFrom} → Lv.${r.lvTo}`;
    let html='';
    if(res.length===1){
      const r=res[0], d=UNITS[r.key];
      html=`<div class="g-card r-${r.r}">${info(r)}<canvas width="480" height="400"></canvas>
        <div class="stars">${'★'.repeat(RARITY[r.r].stars)}</div><span class="rbadge r-${r.r}" style="margin:0">${RARITY[r.r].name}</span>
        <h3>${d.name}</h3><div class="gdesc">${d.desc}</div>
        <div class="statline" style="justify-content:center"><span>❤️ ${d.hp}</span><span>⚔️ ${d.atk}</span><span>⚡ 소환 ${d.cost}</span>${abilityTags(d)}</div>
        <div class="g-dup">${sub(r)}</div></div>`;
    } else {
      html=`<div class="g-grid">${res.map((r,i)=>`<div class="g-mini r-${r.r}" style="animation-delay:${i*0.12}s">${info(r)}<canvas width="240" height="192" data-k="${r.key}"></canvas><span class="rbadge r-${r.r}" style="margin:0">${'★'.repeat(RARITY[r.r].stars)}</span><b>${UNITS[r.key].name}</b><small>${sub(r)}</small></div>`).join('')}</div>`;
    }
    const n=res.length;
    html+=`<div class="g-actions"><button class="btn white" id="g-ok">확인</button>${D.tickets>=n?`<button class="btn pink" id="g-again">🎟️ ${n}회 더 뽑기 (남은 ${D.tickets})</button>`:''}</div>`;
    box.innerHTML=html; box.classList.add('show');
    if(n===1) drawPortrait(box.querySelector('canvas'),res[0].key);
    else box.querySelectorAll('canvas[data-k]').forEach(cv=>drawPortrait(cv,cv.dataset.k));
    $('#g-ok').onclick=()=>this.close();
    const ag=$('#g-again'); if(ag) ag.onclick=()=>{ this.active=false; this.pull(n); };
    UI.checkAch();
  },
  close(){
    this.active=false; $('#modal-gacha').classList.remove('show'); Sound.play('click');
    UI.refreshCoins(); if(UI.screen==='gacha') this.render();
  },
};

export { Gacha };
