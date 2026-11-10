import { ALLY_BASE_X, ENEMY_BASE_X, BASE_W, BASE_HP, GROUND, ALLY_NERF, lvMul } from './config.js';
import { STAGES, UNITS, ENEMIES, DECK_MAX, STRONG_MUL, STRONG_DEF } from './data.js';
import { Save, POTATO } from './save.js';
import { Sound } from './sound.js';
import { $, rand, clamp } from './utils.js';

/* =========================================================
   BATTLE — 전투 시뮬레이션
   ========================================================= */
const PROJ_SPEED = { arrow:640, fire:420, ice:560, cannon:470, sun:400, acorn:520, holy:480, laser:900, feather:620, clock:420 };
const PROJ_SOUND = { arrow:'arrow', fire:'fire', ice:'ice', cannon:'cannon', sun:'fire', acorn:'arrow', holy:'ice', laser:'laser', feather:'arrow', clock:'clock' };
const PROJ_TRAIL = { fire:['#ff9a3c','#ffd23f'], sun:['#ffd23f','#ff5d3c'], ice:['#bff4ff','#ffffff'], holy:['#fff6b0','#ffffff'], clock:['#bff4ff','#ffd23f'] };
const hasT = (d,t)=> !!(d.traits && d.traits.includes(t));
// 화면 모듈은 main.js에서 연결한다. 전투 모듈이 UI를 다시 import하지 않게 한다.
let Render, UI;

const Battle = {
  init({ render, ui }){
    Render=render;
    UI=ui;
  },
  running:false, paused:false, quizOpen:false, speed:1, uid:0,
  start(si){
    const st=STAGES[si], up=Save.data.up;
    this.si=si; this.stage=st; this.time=0; this.over=false; this.endT=0; this.win=false;
    this.units=[]; this.projs=[]; this.parts=[]; this.texts=[]; this.rings=[]; this.slams=[];
    const bh=Math.round(BASE_HP*(1+0.15*up.base));
    this.ally={x:ALLY_BASE_X,w:BASE_W,hp:bh,maxHp:bh,shake:0,isBase:true,team:'ally'};
    this.enemy={x:ENEMY_BASE_X,w:BASE_W,hp:st.baseHp,maxHp:st.baseHp,shake:0,isBase:true,team:'enemy'};
    this.energy=200+60*up.start; this.eLv=1; this.maxEnergy=1500; this.baseRate=40*(1+0.15*up.energy);
    this.spawns=st.spawns.map(s=>({...s,timer:s.start}));
    this.bossSpawned=false; this.shakeT=0;
    this.deck=Save.data.deck.filter(k=>UNITS[k]&&Save.data.units[k].owned).slice(0,DECK_MAX).map(k=>({key:k,cd:0}));
    if(!this.deck.length) this.deck=[{key:'slime',cd:0}];
    this.ses={total:0,correct:0,wrong:0,wrongWords:[],kills:0,coins:0,combo:0,maxCombo:0,summons:0};
    this.paused=false; this.quizOpen=false; this.running=true;
    Render.prepareBg(st.theme);
    UI.buildDeck(); UI.updateHud(true);
    $('#boss-vignette').classList.remove('on'); UI.setCombo(0);
    UI.banner(`STAGE ${st.id} · ${st.name}`,'start');
  },
  get rate(){ return this.baseRate + (this.eLv-1)*13; },
  eUpCost(){ return this.eLv>=8 ? Infinity : 100 + this.eLv*110; },
  upgradeEnergy(){
    const cost=this.eUpCost();
    if(!this.running||this.over||this.energy<cost) return;
    this.energy-=cost; this.eLv++; this.maxEnergy=1500+500*(this.eLv-1); Sound.play('upgrade');
    this.floatText(ALLY_BASE_X, GROUND-240, `자원 생산 Lv.${this.eLv}!`, '#ffd23f', 22);
    UI.updateHud();
  },
  stats(key){ const d=UNITS[key], lv=Save.data.units[key].lv, m=lvMul(lv)*ALLY_NERF; return {hp:Math.round(d.hp*m), atk:Math.round(d.atk*m)}; },
  canSummon(key){ const card=this.deck.find(d=>d.key===key); return card && card.cd<=0 && this.energy>=UNITS[key].cost && !this.over; },
  makeUnit(team,key,def,hp,atk){
    return { id:++this.uid, team, key, def, x:0, y:GROUND, lane:rand(-10,10), hp, maxHp:hp, atk, w:def.w, atkTimer:0.2, atkP:0, pending:null,
      state:'walk', animT:rand(0,3), seed:Math.random(), hitT:0, dying:false, dieT:0, kbv:0, spawnT:0, power:false };
  },
  summon(key, power){
    const d=UNITS[key], s=this.stats(key), card=this.deck.find(c=>c.key===key);
    this.energy-=d.cost; card.cd=d.cd;
    const u=this.makeUnit('ally',key,d,s.hp,Math.round(s.atk*(power?1.2:1)));
    u.power=!!power; u.x=ALLY_BASE_X+BASE_W+16+rand(0,14); u.spawnT=0.45;
    this.units.push(u);
    this.rings.push({x:u.x,y:GROUND-20,r:6,life:0.5,max:0.5,color:power?'#ffd23f':'#7ff5d0'});
    for(let i=0;i<14;i++) this.parts.push({x:u.x,y:GROUND-30,vx:rand(-160,160),vy:rand(-300,-80),r:rand(2,5),life:rand(.4,.8),max:.8,color:['#fff27a','#7ff5d0','#ff9fd0','#fff'][i%4],g:500,star:true});
    Sound.play('summon');
    this.ses.summons++; Save.data.totals.summons++;
    if(key==='dragon') Save.data.totals.dragons++;
  },
  spawnEnemy(key){
    const d=ENEMIES[key], m=this.stage.hpMul*(1+Math.min(0.6,this.time/400));
    const u=this.makeUnit('enemy',key,d,Math.round(d.hp*m),Math.round(d.atk*(1+(this.stage.hpMul-1)*0.6)));
    u.x=ENEMY_BASE_X-BASE_W-12-rand(0,10); u.spawnT=0.25;
    if(hasT(d,'alien')){ u.shield=u.maxShield=Math.round(u.maxHp*0.6); }
    if(d.boss){ u.lane=0; u.x=ENEMY_BASE_X-BASE_W-30; }
    this.units.push(u);
    return u;
  },
  update(dt){
    if(!this.running) return;
    if(this.over){ this.endT+=dt; this.updateFx(dt); if(this.endT>1.8 && !this.resultShown){ this.resultShown=true; UI.showResult(); } return; }
    this.time+=dt;
    this.energy=Math.min(this.maxEnergy, this.energy+this.rate*dt);
    for(const c of this.deck) if(c.cd>0) c.cd=Math.max(0,c.cd-dt);
    // 적 생성
    const press=Math.min(2.2,1+this.time/200);
    for(const s of this.spawns){ s.timer-=dt; if(s.timer<=0){ this.spawnEnemy(s.t); s.timer=s.every/press*rand(0.85,1.15); } }
    const bs=this.stage.boss;
    if(bs && !this.bossSpawned && (this.time>=bs.at || this.enemy.hp<=this.enemy.maxHp*bs.hpTrigger)){
      this.bossSpawned=true; this.spawnEnemy(bs.t); this.spawnEnemy('skeleton'); this.spawnEnemy('wolf');
      UI.banner(`⚠ 보스 등장! ${ENEMIES[bs.t].name} ⚠`,'boss'); Sound.play('boss'); this.shakeT=1.2;
      $('#boss-vignette').classList.add('on');
    }
    // 유닛
    const allies=[], enemies=[];
    for(const u of this.units) if(!u.dying) (u.team==='ally'?allies:enemies).push(u);
    for(const u of this.units) this.updateUnit(u,dt,u.team==='ally'?enemies:allies);
    this.units=this.units.filter(u=>!(u.dying && u.dieT>0.7));
    if(this.bossSpawned && !this.units.some(u=>u.def.boss && !u.dying)) $('#boss-vignette').classList.remove('on');
    // 투사체
    for(const p of this.projs){
      const tx = p.target && (p.target.isBase || !p.target.dying) ? (p.target.isBase ? p.target.x - p.dir*p.target.w : p.target.x) : p.lastX;
      p.lastX=tx;
      const ty = p.target && !p.target.isBase && p.target.def.fly ? GROUND-60 : GROUND-30;
      const dx=tx-p.x, dy=ty-p.y, dist=Math.hypot(dx,dy);
      if(dist<14){ p.done=true; this.impact(p); continue; }
      p.x+=dx/dist*p.speed*dt; p.y+=dy/dist*p.speed*dt; p.ang=Math.atan2(dy,dx);
      if(PROJ_TRAIL[p.type]) this.parts.push({x:p.x,y:p.y,vx:rand(-30,30),vy:rand(-40,10),r:rand(3,7),life:.35,max:.35,color:PROJ_TRAIL[p.type][Math.random()<.5?0:1],g:0});
    }
    this.projs=this.projs.filter(p=>!p.done);
    for(const b of [this.ally,this.enemy]) if(b.shake>0) b.shake-=dt;
    if(this.shakeT>0) this.shakeT-=dt;
    this.updateFx(dt);
    // 승패
    if(this.enemy.hp<=0) this.finish(true);
    else if(this.ally.hp<=0) this.finish(false);
  },
  updateUnit(u,dt,foes){
    u.animT+=dt; if(u.hitT>0) u.hitT-=dt; if(u.spawnT>0) u.spawnT-=dt; if(u.slowT>0) u.slowT-=dt;
    const slowM = u.slowT>0 ? 0.5 : 1;
    if(u.dying){ u.dieT+=dt; return; }
    const dir=u.team==='ally'?1:-1;
    if(u.freezeT>0){ u.freezeT-=dt; return; }
    if(u.kbv>0){ u.x-=dir*u.kbv*dt; u.kbv=Math.max(0,u.kbv-900*dt); u.x=clamp(u.x,ALLY_BASE_X+BASE_W+u.w,ENEMY_BASE_X-BASE_W-u.w); return; }
    if(u.spawnT>0.15) return;
    // 가장 가까운 앞쪽 적 찾기 (충돌 판정)
    let best=null, bd=Infinity;
    for(const f of foes){
      const d = dir===1 ? (f.x-f.w)-(u.x+u.w) : (u.x-u.w)-(f.x+f.w);
      if(d < -(f.w+u.w)*1.2) continue;          // 이미 지나간 적
      if(d<bd){ bd=d; best=f; }
    }
    const base = dir===1 ? this.enemy : this.ally;
    const bdist = dir===1 ? (base.x-base.w)-(u.x+u.w) : (u.x-u.w)-(base.x+base.w);
    if(bdist<bd){ bd=bdist; best=base; }
    // 공격 진행
    if(u.atkP>0){
      u.atkP+=dt*slowM/0.38;
      if(u.pending && u.atkP>=0.5){ const tg=u.pending; u.pending=null; this.attack(u,tg); }
      if(u.atkP>=1) u.atkP=0;
      return;
    }
    if(bd<=u.def.range){
      u.state='attack'; u.atkTimer-=dt*slowM;
      if(u.atkTimer<=0){ u.atkTimer=u.def.rate; u.atkP=0.001; u.pending=best; }
    } else {
      u.state='walk';
      const mv=Math.min(u.def.speed*slowM*dt, Math.max(0, bd-u.def.range+0.5));
      u.x+=dir*mv;
    }
  },
  attack(u,tg){
    const dir=u.team==='ally'?1:-1;
    if(!tg || (!tg.isBase && tg.dying)) return;
    const dmg=Math.round(u.atk*rand(0.9,1.1));
    if(u.def.ranged){
      const fly=u.def.fly;
      const ty=u.def.ranged;
      this.projs.push({type:ty, x:u.x+dir*(u.w+(fly?26:ty==='cannon'?30:10)), y:GROUND-(fly?96:ty==='cannon'?24:30), target:tg, lastX:tg.x, dir, dmg, team:u.team, aoe:u.def.aoe||0, slow:!!u.def.slow, speed:PROJ_SPEED[ty]||600, ang:0, src:u});
      Sound.play(PROJ_SOUND[ty]||'arrow');
    } else if(u.def.aoe){
      const cx=u.x+dir*(u.w+40);
      this.area(u.team,cx,u.def.aoe,dmg,u.def.kb||0,u);
      this.slams.push({x:cx,life:.5,max:.5});
      for(let i=0;i<24;i++) this.parts.push({x:cx+rand(-40,40),y:GROUND-4,vx:rand(-220,220),vy:rand(-320,-80),r:rand(3,7),life:rand(.4,.8),max:.8,color:['#7a5a3a','#a0805a','#ff7af5'][i%3],g:800});
      this.shakeT=Math.max(this.shakeT,0.35); Sound.play('boom');
    } else {
      const crit = u.def.crit && Math.random()<u.def.crit;
      this.damage(tg, crit?Math.round(dmg*2.5):dmg, {team:u.team, crit, u});
      if(u.def.kb && !tg.isBase && !tg.dying && !tg.def.boss && !tg.def.noKb){ tg.kbv=u.def.kb; tg.atkP=0; tg.pending=null; }
    }
  },
  impact(p){
    if(p.aoe){
      this.area(p.team,p.x,p.aoe,p.dmg,0,p.src);
      if(p.type==='clock'){ this.rings.push({x:p.x,y:GROUND-30,r:20,life:.6,max:.6,color:'#bff4ff'}); }
      const cols = p.type==='cannon' ? ['#555a6e','#ffd23f','#e8e8f0'] : p.type==='sun' ? ['#ffd23f','#fff3b0','#ff5d3c'] : ['#ff9a3c','#ffd23f','#ff5d5d'];
      this.rings.push({x:p.x,y:p.y,r:10,life:.35,max:.35,color:cols[1]});
      if(p.type==='sun') this.rings.push({x:p.x,y:GROUND-4,r:20,life:.5,max:.5,color:'#ff8a3c'});
      for(let i=0;i<(p.type==='sun'?30:18);i++) this.parts.push({x:p.x,y:p.y,vx:rand(-220,220),vy:rand(-240,60),r:rand(3,8),life:rand(.3,.7),max:.7,color:cols[i%3],g:300});
      if(p.type==='sun') this.shakeT=Math.max(this.shakeT,0.25);
      Sound.play('boom');
    } else if(p.target && (p.target.isBase || !p.target.dying)){
      this.damage(p.target,p.dmg,{team:p.team, u:p.src});
      if(p.slow && !p.target.isBase){ p.target.slowT=2.5; for(let i=0;i<8;i++) this.parts.push({x:p.x,y:p.y,vx:rand(-120,120),vy:rand(-150,20),r:rand(2,4),life:.5,max:.5,color:'#bff4ff',g:200,star:true}); }
    }
  },
  area(team,cx,rad,dmg,kb,srcU){
    const foes=this.units.filter(u=>!u.dying && u.team!==team && Math.abs(u.x-cx)<=rad+u.w);
    for(const f of foes){ this.damage(f,dmg,{team, u:srcU}); if(kb && !f.def.boss && !f.def.noKb && !f.dying){ f.kbv=kb; f.atkP=0; f.pending=null; } }
    const base = team==='ally'?this.enemy:this.ally;
    if(Math.abs(base.x-cx)<=rad+base.w) this.damage(base,dmg,{team});
  },
  damage(tg,dmg,src){
    if(tg.isBase){
      tg.hp=Math.max(0,tg.hp-dmg); tg.shake=0.2;
      this.floatText(tg.x+rand(-20,20), GROUND-170, '-'+dmg, tg.team==='ally'?'#ff5d5d':'#fff', 20);
      for(let i=0;i<6;i++) this.parts.push({x:tg.x-(tg.team==='ally'?-1:1)*tg.w*0.6,y:GROUND-rand(20,120),vx:rand(-120,120),vy:rand(-200,-40),r:rand(2,5),life:.5,max:.5,color:tg.team==='ally'?'#ffe4c4':'#8e6cff',g:600});
      Sound.play('base'); return;
    }
    const a = src.u ? src.u.def : null;
    const hy = tg.def.fly ? GROUND-90 : GROUND-(tg.def.boss?150:58);
    let d=dmg, strong=false;
    // 상성: 아군이 강한 특성의 적을 때리면 1.8배, 그 적이 때리면 0.6배
    if(a && tg.team==='enemy' && a.strong && (tg.def.traits||[]).some(t=>a.strong.includes(t))){ d*=STRONG_MUL; strong=true; }
    if(a && tg.team==='ally' && tg.def.strong && (a.traits||[]).some(t=>tg.def.strong.includes(t))) d*=STRONG_DEF;
    // 멈춤
    if(a && a.freeze && tg.team==='enemy' && !tg.def.boss){ tg.freezeT=a.freeze; tg.atkP=0; tg.pending=null; }
    else if(a && a.freeze && tg.def.boss){ tg.freezeT=a.freeze*0.4; }
    // 외계 보호막
    if(tg.shield>0){
      if(a && a.shieldBreak){ tg.shield=0; this.floatText(tg.x, hy-24, '🛡️ 보호막 파괴!', '#c77dff', 20); this.rings.push({x:tg.x,y:hy+16,r:14,life:.4,max:.4,color:'#c77dff'}); }
      else { tg.shield-=d; tg.hitT=0.1;
        if(tg.shield>0){ this.floatText(tg.x+rand(-8,8), hy, '🛡️'+Math.round(d), '#d9a6ff', 16); Sound.play('hit'); return; }
        d=-tg.shield; tg.shield=0; this.floatText(tg.x, hy-24, '보호막 깨짐!', '#c77dff', 18); }
    }
    // 강철: 일반 공격은 1만 (치명타·강철 파괴는 통함)
    const metal = hasT(tg.def,'metal') && !src.crit && !(a && a.metalBreak);
    const real = metal ? 1 : Math.max(1,Math.round(d*(1-(tg.def.def||0))));
    tg.hp-=real; tg.hitT=0.16;
    if(tg.hp>0 && !tg.def.noKb){
      const steps=tg.def.boss?6:3, crossed=Math.floor((1-tg.hp/tg.maxHp)*steps);
      if(crossed>(tg.kbDone||0)){
        tg.kbDone=crossed; tg.kbv=tg.def.boss?170:320; tg.atkP=0; tg.pending=null; tg.atkTimer=Math.max(tg.atkTimer,0.4);
        for(let i=0;i<7;i++) this.parts.push({x:tg.x,y:GROUND-4,vx:rand(-90,90),vy:rand(-120,-20),r:rand(2,5),life:.35,max:.35,color:'#e8dcc0',g:400});
      }
    }
    if(strong && !src.crit) this.floatText(tg.x+rand(-8,8), hy-22, '상성!', '#ffd23f', 14);
    if(src.crit){ this.floatText(tg.x+rand(-8,8), hy-6, '⚡'+real+'!', '#ffe14d', 26); Sound.play('crit'); for(let i=0;i<8;i++) this.parts.push({x:tg.x,y:hy+20,vx:rand(-220,220),vy:rand(-220,0),r:rand(2,4),life:.3,max:.3,color:'#ffe14d',g:0}); }
    else this.floatText(tg.x+rand(-8,8), hy, String(real), src.team==='ally'?'#fff':'#ff8f8f', tg.def.boss?24:18);
    for(let i=0;i<5;i++) this.parts.push({x:tg.x,y:hy+20,vx:rand(-150,150),vy:rand(-180,-30),r:rand(2,4),life:.35,max:.35,color:'#fff6b0',g:400});
    Sound.play('hit');
    if(tg.hp<=0) this.kill(tg, src);
  },
  kill(u, src){
    // 언데드: 한 번 되살아남. 정화(purify) 공격으로 쓰러지면 부활하지 못함
    if(u.team==='enemy' && hasT(u.def,'undead') && !u.revived && !this.over){
      if(src && src.u && src.u.def.purify){ this.floatText(u.x, GROUND-110, '✨ 정화!', '#fff6b0', 20); for(let i=0;i<14;i++) this.parts.push({x:u.x,y:GROUND-50,vx:rand(-120,120),vy:rand(-220,-60),r:rand(2,5),life:.7,max:.7,color:'#fff6b0',g:0,star:true}); }
      else { u.revived=true; u.kbDone=1; u.hp=Math.round(u.maxHp*0.5); u.hitT=0; u.kbv=0; u.freezeT=0.6;
        this.floatText(u.x, GROUND-110, '💀 되살아남!', '#9be55a', 20); this.rings.push({x:u.x,y:GROUND-30,r:8,life:.5,max:.5,color:'#9be55a'}); Sound.play('die'); return; }
    }
    if(u.def.revive && !u.revived && !this.over){
      u.revived=true; u.kbDone=1; u.hp=Math.round(u.maxHp*0.6); u.hitT=0; u.kbv=0;
      const cy=GROUND-90;
      this.rings.push({x:u.x,y:cy,r:10,life:.7,max:.7,color:'#ffd23f'}); this.rings.push({x:u.x,y:cy,r:2,life:.9,max:.9,color:'#ff5d3c'});
      for(let i=0;i<30;i++) this.parts.push({x:u.x,y:cy,vx:rand(-200,200),vy:rand(-300,-60),r:rand(3,7),life:rand(.5,1),max:1,color:['#ffd23f','#ff8a3c','#fff3b0'][i%3],g:200,star:i%2===0});
      this.floatText(u.x, cy-50, '🔥 부활!', '#ffd23f', 28); Sound.play('revive');
      return;
    }
    u.dying=true; u.dieT=0; u.hp=0;
    const cy = u.def.fly? GROUND-70 : GROUND-30;
    for(let i=0;i<16;i++) this.parts.push({x:u.x,y:cy,vx:rand(-180,180),vy:rand(-260,-40),r:rand(3,6),life:rand(.4,.8),max:.8,color:u.team==='ally'?['#7ff5d0','#fff'][i%2]:['#c77dff','#ff8ad8','#fff'][i%3],g:500});
    Sound.play('die');
    if(u.team==='enemy'){
      const r=u.def.reward; this.ses.kills++; this.ses.coins+=r; Save.data.totals.kills++;
      this.energy=Math.min(this.maxEnergy,this.energy+r*8);
      this.floatText(u.x, cy-30, `+${r} 코인`, '#ffd23f', 16);
      Sound.play('coin');
    }
  },
  finish(win){
    this.over=true; this.win=win; this.endT=0; this.resultShown=false;
    const b = win?this.enemy:this.ally;
    for(let i=0;i<60;i++) this.parts.push({x:b.x+rand(-50,50),y:GROUND-rand(0,200),vx:rand(-300,300),vy:rand(-400,-50),r:rand(3,9),life:rand(.6,1.4),max:1.4,color:win?['#8e6cff','#c77dff','#ffd23f','#fff'][i%4]:['#ffe4c4','#ff7aa8','#fff'][i%3],g:600});
    this.shakeT=1; Sound.play('boom');
    for(const u of this.units) if(!u.dying && u.team===(win?'enemy':'ally')) this.kill(u);
    $('#boss-vignette').classList.remove('on');
    setTimeout(()=>Sound.play(win?'win':'lose'),500);
  },
  floatText(x,y,text,color,size){ this.texts.push({x,y,text,color,size:size||18,life:0.9,max:0.9}); },
  updateFx(dt){
    for(const p of this.parts){ p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=(p.g||0)*dt; if(p.y>GROUND+6 && p.g){ p.y=GROUND+6; p.vy*=-0.3; p.vx*=0.6; } }
    this.parts=this.parts.filter(p=>p.life>0);
    const pmax=POTATO()?60:600; if(this.parts.length>pmax) this.parts.splice(0,this.parts.length-pmax);
    for(const t of this.texts){ t.life-=dt; t.y-=40*dt; }
    this.texts=this.texts.filter(t=>t.life>0);
    if(POTATO() && this.texts.length>12) this.texts.splice(0,this.texts.length-12);
    for(const r of this.rings){ r.life-=dt; r.r+=220*dt; }
    this.rings=this.rings.filter(r=>r.life>0);
    for(const s of this.slams) s.life-=dt;
    this.slams=this.slams.filter(s=>s.life>0);
  },
};

export { Battle };
