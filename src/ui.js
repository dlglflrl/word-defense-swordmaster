import { DEV_MODE, W, H, GROUND, ALLY_BASE_X, ALLY_NERF, MAX_LV, BASE_HP, lvMul } from './config.js';
import { UNIT_ORDER, DECK_MAX, RARITY, TRAITS, UNITS, ENEMIES, STAGES, ACHIEVEMENTS, upgCost } from './data.js';
import { WORD_DATA } from './words.js';
import { Save, POTATO } from './save.js';
import { Sound } from './sound.js';
import { Quiz, POS_KO } from './quiz.js';
import { Art, DRAWERS, drawPortrait } from './art.js';
import { Battle } from './battle.js';
import { Render } from './render.js';
import { Gacha } from './gacha.js';
import { abilityTags } from './ui-helpers.js';
import { $, fmt } from './utils.js';

/* =========================================================
   UI
   ========================================================= */
const UI = {
  screen:'menu',
  init(){
    document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{ Sound.init(); Sound.play('click'); this.go(b.dataset.go); }));
    $('#btn-pause').onclick=()=>this.pause(true);
    $('#btn-speed').onclick=()=>{ Battle.speed = Battle.speed===1?2:Battle.speed===2?3:1; $('#btn-speed').textContent='x'+Battle.speed; $('#btn-speed').classList.toggle('on',Battle.speed>1); Sound.play('click'); };
    $('#eup').onclick=()=>Battle.upgradeEnergy();
    $('#g-pull1').onclick=()=>Gacha.pull(1);
    $('#g-pull10').onclick=()=>Gacha.pull(10);
    $('#g-buy').onclick=()=>Gacha.buy();
    if(DEV_MODE){
      $('.foot-note').insertAdjacentHTML('afterbegin','<b style="color:#ffd23f">🧪 테스트 버전 (재화 무제한 · 실사용 저장과 분리됨)</b><br>');
      const b=document.createElement('button'); b.className='btn red'; b.style.gridColumn='1/-1'; b.textContent='🧪 테스트 재화 충전 (코인 +99,999 · 뽑기권 +100)';
      b.onclick=()=>{ Save.data.coins+=99999; Save.data.tickets+=100; Save.data.cleared=STAGES.length; Save.save(); this.refreshCoins(); this.toast('🧪','재화를 충전했어요!'); };
      $('.menu-buttons').appendChild(b);
    }
    $('#p-resume').onclick=()=>this.pause(false);
    $('#p-restart').onclick=()=>{ this.pause(false); this.startStage(Battle.si); };
    $('#p-quit').onclick=()=>{ this.pause(false); Battle.running=false; this.go('stages'); };
    $('#p-sound').onclick=()=>{ Save.data.settings.sound=!Save.data.settings.sound; Save.save(); this.syncSoundBtn(); };
    $('#p-potato').onclick=()=>{ this.setPotato(!POTATO()); };
    $('#tg-potato').onclick=()=>{ this.setPotato(!POTATO()); Sound.play('click'); this.renderSettings(); };
    $('#quiz-close').onclick=()=>this.closeQuiz();
    $('#tg-sound').onclick=()=>{ Save.data.settings.sound=!Save.data.settings.sound; Save.save(); Sound.init(); Sound.play('click'); this.renderSettings(); };
    $('#tg-quizpause').onclick=()=>{ Save.data.settings.quizPause=!Save.data.settings.quizPause; Save.save(); this.renderSettings(); };
    $('#btn-apply-words').onclick=()=>{
      const list=Quiz.parse($('#custom-words').value);
      if(list.length<4){ $('#words-info').textContent='⚠ 단어가 4개 이상 필요해요 (형식: 단어, 뜻)'; $('#words-info').style.color='#e0344f'; return; }
      Save.data.customWords=list; Save.save(); Quiz.init();
      $('#words-info').textContent=`✅ ${list.length}개 단어로 바뀌었어요!`; $('#words-info').style.color='#1fa557';
    };
    $('#btn-default-words').onclick=()=>{ Save.data.customWords=null; Save.save(); Quiz.init(); $('#custom-words').value=''; $('#words-info').textContent=`기본 단어 ${WORD_DATA.length}개를 사용해요.`; $('#words-info').style.color=''; };
    this.twoStep($('#btn-reset-all'),'정말 지울까요?',()=>{ Save.reset(); Quiz.init(); this.refreshCoins(); this.renderSettings(); this.toast('🧹','저장 데이터를 초기화했어요'); });
    this.twoStep($('#btn-reset-stats'),'정말 초기화?',()=>{ Save.data.stats={total:0,correct:0,wrong:0,words:{}}; Save.save(); this.renderStats(); });
    // 키보드
    window.addEventListener('keydown',e=>{
      if(this.screen!=='battle') return;
      if($('#modal-quiz').classList.contains('show')){
        if(['1','2','3','4'].includes(e.key)) this.answer(+e.key-1);
        if(e.key==='Escape') this.closeQuiz();
        return;
      }
      if($('#modal-result').classList.contains('show')) return;
      if(e.code==='Space'||e.key==='Escape'){ e.preventDefault(); this.pause(!Battle.paused); return; }
      if(Battle.paused) return;
      const n=parseInt(e.key,10); if(n>=1 && n<=Battle.deck.length) this.tryCard(Battle.deck[n-1].key);
      if(e.key==='q'||e.key==='Q') Battle.upgradeEnergy();
    });
    document.addEventListener('visibilitychange',()=>{ if(document.hidden && this.screen==='battle' && Battle.running && !Battle.over && !Battle.quizOpen) this.pause(true); });
    this.refreshCoins();
    this.menuHero();
  },
  twoStep(btn,confirmText,fn){
    const orig=btn.textContent; let armed=false, tm;
    btn.addEventListener('click',()=>{
      if(!armed){ armed=true; btn.textContent=confirmText; tm=setTimeout(()=>{armed=false;btn.textContent=orig;},2500); return; }
      clearTimeout(tm); armed=false; btn.textContent=orig; fn();
    });
  },
  go(name){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    $('#screen-'+name).classList.add('active'); this.screen=name;
    if(name!=='battle') Battle.running=false;
    this.refreshCoins();
    ({gacha:()=>Gacha.render(), stages:()=>this.renderStages(), shop:()=>this.renderShop(), stats:()=>this.renderStats(), achieve:()=>this.renderAch(), settings:()=>this.renderSettings()}[name]||(()=>{}))();
  },
  refreshCoins(){ document.querySelectorAll('.coin-val').forEach(e=>e.textContent=fmt(Save.data.coins)); document.querySelectorAll('.ticket-val').forEach(e=>e.textContent=Save.data.tickets); const dot=$('#gacha-dot'); if(dot){ dot.style.display=Save.data.tickets>0?'flex':'none'; dot.textContent=Save.data.tickets; } },
  toast(em,text){ const d=document.createElement('div'); d.className='toast'; d.innerHTML=`<span class="em">${em}</span><span>${text}</span>`; $('#toasts').appendChild(d); setTimeout(()=>d.remove(),3300); },
  banner(text,cls){ const b=$('#banner'); b.className=''; b.querySelector('.b-in').textContent=text; void b.offsetWidth; b.className='show '+(cls||''); },

  /* --- 메뉴 히어로 애니메이션 --- */
  menuHero(){
    const cv=$('#menu-hero'), c=cv.getContext('2d');
    const keys=['slime','knight','archer','golem','dragon'];
    const us=keys.map((k,i)=>({key:k,animT:i,state:'walk',atkP:0,seed:i*.37,hitT:0,portrait:false}));
    const loop=(now)=>{
      if(this.screen==='menu'){
        const T=now/1000, dpr=Math.min(2,window.devicePixelRatio||1);
        const w=cv.clientWidth, h=cv.clientHeight;
        if(cv.width!==Math.floor(w*dpr)){ cv.width=Math.floor(w*dpr); cv.height=Math.floor(h*dpr); }
        c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,w,h);
        c.fillStyle='rgba(43,33,64,.18)'; c.beginPath(); c.ellipse(w/2,h-10,w*.48,10,0,0,7); c.fill();
        us.forEach((u,i)=>{
          u.animT=T*0.9+i; u.atkP = ((T+i*0.7)%3)<0.4 ? ((T+i*0.7)%3)/0.4 : 0;
          const s={golem:.8,dragon:.85}[u.key]||1;
          c.save(); c.translate(w*(0.12+i*0.19), h-12); c.scale(s*h/130,s*h/130);
          if(u.key==='dragon'){ c.translate(0,10); }
          DRAWERS[u.key].call(Art,c,u,T); c.restore();
        });
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  /* --- 스테이지 선택 --- */
  renderStages(){
    $('#trait-guide').innerHTML = `<b class="jua" style="font-size:18px">📖 적 특성 안내</b> <span style="font-size:13px;opacity:.75">— 아군 카드의 🎯 표시는 그 특성의 적에게 1.8배 피해를 주고, 받는 피해는 40% 줄어요</span><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">${Object.values(TRAITS).map(t=>`<span style="background:${t.color}33;border:2px solid ${t.color};border-radius:10px;padding:3px 10px;font-size:13px"><b>${t.icon} ${t.name}</b> · ${t.desc}</span>`).join('')}</div>`;
    const g=$('#stage-grid'); g.innerHTML='';
    STAGES.forEach((st,i)=>{
      const locked = i>Save.data.cleared, cleared=i<Save.data.cleared, best=Save.data.stageBest[st.id]||0;
      const d=document.createElement('div'); d.className='stage-card'+(locked?' locked':'');
      const cv=document.createElement('canvas'); cv.width=440; cv.height=240;
      Render.prepareBg(st.theme, cv);
      const c=cv.getContext('2d'); const sc=cv.width/W;
      const ens=[...new Set(st.spawns.map(s=>s.t))]; if(st.boss) ens.push(st.boss.t);
      c.save(); c.scale(sc,cv.height/H);
      const nb=ens.filter(k=>!ENEMIES[k].boss).length; let jj=0; ens.forEach((k,j)=>{ const isB=!!ENEMIES[k].boss; c.save(); const x=W*(st.boss?0.38:0.5)+(jj-(nb-1)/2)*(st.boss?190:220); if(!isB) jj++; c.translate(isB?W*0.8:x,GROUND); const s=isB?1.5:2.2; c.scale(-s,s); DRAWERS[k].call(Art,c,{animT:0,state:'idle',atkP:0,seed:j,portrait:false},0.5); c.restore(); });
      c.restore();
      d.appendChild(cv);
      d.insertAdjacentHTML('beforeend',`<div class="info"><span class="num">STAGE ${st.id}</span><h3>${st.name}</h3><p>${st.desc}</p><div style="font-size:13px;font-weight:700;margin-top:2px">${[...new Set(ens.flatMap(k=>ENEMIES[k].traits||[]))].map(t=>`<span title="${TRAITS[t].desc}" style="background:${TRAITS[t].color}33;border:1.5px solid ${TRAITS[t].color};border-radius:8px;padding:0 6px;margin-right:4px">${TRAITS[t].icon} ${TRAITS[t].name}</span>`).join('')||'<span style="opacity:.5">특성 없음</span>'}</div>
        <div class="meta"><span><span class="coin" style="width:22px;height:22px;font-size:11px">C</span> ${cleared?Math.round(st.reward/2):st.reward} · 🎟️${cleared?1:3}</span>
        ${cleared?`<span class="badge-clear">${'★'.repeat(best)}${'☆'.repeat(3-best)} CLEAR</span>`:''}</div></div>`);
      if(locked) d.insertAdjacentHTML('beforeend','<div class="lock">🔒</div>');
      d.onclick=()=>{ if(locked){ Sound.play('wrong'); this.toast('🔒','이전 스테이지를 먼저 클리어하세요!'); return; } Sound.init(); Sound.play('open'); this.startStage(i); };
      g.appendChild(d);
    });
  },
  startStage(i){
    this.go('battle'); Battle.speed=1; $('#btn-speed').textContent='x1'; $('#btn-speed').classList.remove('on');
    $('#modal-result').classList.remove('show');
    Render.resize(); Battle.start(i);
  },

  /* --- 전투 HUD & 덱 --- */
  buildDeck(){
    const box=$('#cards'); box.innerHTML='';
    Battle.deck.forEach((card,i)=>{
      const d=UNITS[card.key], el=document.createElement('button'); el.className='card'+(d.gacha?' r-'+d.gacha:''); el.dataset.key=card.key;
      el.innerHTML=`<span class="key">${i+1}</span>${d.gacha?`<span class="rar r-${d.gacha}">${'★'.repeat(RARITY[d.gacha].stars)}</span>`:''}<canvas width="192" height="152"></canvas><span class="nm">${d.name}</span><span class="cost">⚡${d.cost}</span><div class="cdov"></div>`;
      drawPortrait(el.querySelector('canvas'),card.key);
      el.onclick=()=>this.tryCard(card.key);
      box.appendChild(el); card.el=el; card.ov=el.querySelector('.cdov');
    });
  },
  tryCard(key){
    Sound.init();
    if(!Battle.running||Battle.over||Battle.paused||Battle.quizOpen) return;
    const card=Battle.deck.find(c=>c.key===key);
    if(card.cd>0){ Sound.play('click'); return; }
    if(Battle.energy<UNITS[key].cost){ Sound.play('wrong'); Battle.floatText(ALLY_BASE_X+60,GROUND-200,'자원이 부족해요!','#ff8f8f',20); return; }
    this.openQuiz(key);
  },
  updateHud(force){
    const B=Battle;
    $('#ally-hp').style.width=(B.ally.hp/B.ally.maxHp*100)+'%'; $('#ally-hp-txt').textContent=`${fmt(B.ally.hp)} / ${fmt(B.ally.maxHp)}`;
    $('#enemy-hp').style.width=(B.enemy.hp/B.enemy.maxHp*100)+'%'; $('#enemy-hp-txt').textContent=`${fmt(B.enemy.hp)} / ${fmt(B.enemy.maxHp)}`;
    const t=Math.floor(B.time); $('#timer').textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
    $('#stage-tag').textContent=`STAGE ${B.stage.id} · ${B.stage.name}`;
    $('#energy-txt').textContent=fmt(B.energy); $('#energy-max').textContent=`/ ${fmt(B.maxEnergy)}  +${Math.round(B.rate)}/s`;
    $('#energy-bar').style.width=(B.energy/B.maxEnergy*100)+'%';
    const ec=B.eUpCost(); const eup=$('#eup');
    eup.innerHTML = ec===Infinity ? `자원 생산<br>MAX` : `자원 생산 Lv.${B.eLv} (Q)<br>⚡${ec}`;
    eup.classList.toggle('disabled', B.energy<ec);
    for(const card of B.deck){
      if(!card.el) continue;
      const d=UNITS[card.key], poor=B.energy<d.cost;
      card.el.classList.toggle('poor',poor);
      card.ov.style.height=Math.min(100,card.cd/d.cd*100)+'%';
      card.el.classList.toggle('ready',!poor && card.cd<=0);
    }
  },
  setCombo(n, pop){
    const el=$('#combo');
    if(n>=2){ el.textContent=`${n} COMBO!`+(n>=5?' 🔥':''); el.classList.add('show'); if(pop){ el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } }
    else el.classList.remove('show');
  },

  /* --- 퀴즈 --- */
  openQuiz(key){
    Battle.quizOpen = Save.data.settings.quizPause; this.quizKey=key; this.answered=false;
    const q=Quiz.next(); this.q=q;
    $('#quiz-unit').textContent=UNITS[key].name;
    drawPortrait($('#quiz-portrait'),key);
    $('#quiz-w').textContent=q.word.en.toUpperCase();
    const pos=POS_KO[q.word.pos]; $('#quiz-pos').textContent=pos||'단어';
    const box=$('#quiz-opts'); box.innerHTML='';
    q.options.forEach((o,i)=>{ const b=document.createElement('button'); b.className='opt'; b.innerHTML=`<span class="n">${'①②③④'[i]}</span><span>${o}</span>`; b.onclick=()=>this.answer(i); box.appendChild(b); });
    $('#quiz-fb').textContent=''; $('#quiz-fb').className='quiz-fb';
    const s=Battle.ses; $('#quiz-combo').textContent=`🔥 콤보 ${s.combo}`; $('#quiz-acc').textContent= s.total? `이번 전투 정답률 ${Math.round(s.correct/s.total*100)}% (${s.correct}/${s.total})` : '이번 전투 첫 문제!';
    $('#modal-quiz').classList.add('show'); Sound.play('open');
    Battle.quizAny=true;
  },
  closeQuiz(){ if(this.answered) return; $('#modal-quiz').classList.remove('show'); Battle.quizOpen=false; Battle.quizAny=false; },
  answer(i){
    if(this.answered || !$('#modal-quiz').classList.contains('show')) return;
    this.answered=true;
    const q=this.q, ok = i===q.answer, s=Battle.ses, btns=[...document.querySelectorAll('#quiz-opts .opt')];
    Quiz.record(q.word, ok); s.total++;
    btns.forEach((b,j)=>{ if(j===q.answer) b.classList.add('correct'); else if(j===i) b.classList.add('wrong'); else b.classList.add('dim'); });
    const fb=$('#quiz-fb'); const key=this.quizKey;
    if(ok){
      s.correct++; s.combo++; s.maxCombo=Math.max(s.maxCombo,s.combo); Save.data.totals.maxCombo=Math.max(Save.data.totals.maxCombo,s.combo);
      let bonus='';
      s.coins+=1;
      if(s.combo>=3){ const ref=Math.round(UNITS[key].cost*0.05*Math.min(4,s.combo-2)); bonus=` +⚡${ref} 콤보 보너스`; this._refund=ref; } else this._refund=0;
      fb.textContent='⭕ 정답! '+UNITS[key].name+' 출동!'+bonus; fb.className='quiz-fb ok';
      Sound.play('correct');
      setTimeout(()=>{
        $('#modal-quiz').classList.remove('show'); Battle.quizOpen=false; Battle.quizAny=false;
        if(Battle.running && !Battle.over && Battle.energy>=UNITS[key].cost){
          Battle.summon(key, s.combo>=5);
          if(this._refund) Battle.energy=Math.min(Battle.maxEnergy,Battle.energy+this._refund);
          Battle.floatText(ALLY_BASE_X+70,GROUND-120,'+1 코인','#ffd23f',16);
        }
        this.setCombo(s.combo,true);
        if(s.combo>0 && s.combo%5===0){ this.banner(`FEVER! ${s.combo} COMBO`,'fever'); Sound.play('fever'); Battle.energy=Math.min(Battle.maxEnergy,Battle.energy+120); Battle.floatText(ALLY_BASE_X+70,GROUND-160,'+⚡120 피버 보너스!','#ffd23f',22); }
      },650);
    } else {
      s.wrong++; s.combo=0; s.wrongWords.push(q.word);
      { const wc=Battle.deck.find(c=>c.key===key); if(wc) wc.cd=Math.max(wc.cd,4); }
      fb.innerHTML=`❌ 아쉬워요! <b style="color:#2b2140">${q.word.en}</b> = ${q.word.ko}`; fb.className='quiz-fb no';
      Sound.play('wrong');
      setTimeout(()=>{ $('#modal-quiz').classList.remove('show'); Battle.quizOpen=false; Battle.quizAny=false; this.setCombo(0); },1500);
    }
    Save.save();
  },

  /* --- 일시정지 --- */
  pause(on){
    if(!Battle.running||Battle.over) return;
    Battle.paused=on; $('#modal-pause').classList.toggle('show',on); this.syncSoundBtn();
  },
  syncSoundBtn(){ $('#p-sound').textContent = Save.data.settings.sound? '🔊 효과음 켜짐':'🔇 효과음 꺼짐'; $('#p-potato').textContent = POTATO()? '🥔 감자 모드 켜짐':'🥔 감자 모드 꺼짐'; $('#p-potato').classList.toggle('green',POTATO()); $('#p-potato').classList.toggle('white',!POTATO()); },
  setPotato(on){
    Save.data.settings.potato=on; Save.save(); Render.resize(); this.syncSoundBtn();
    this.toast('🥔', on? '감자 모드 켜짐: 가볍게 돌아가요' : '감자 모드 꺼짐: 고화질로 돌아가요');
  },

  /* --- 결과 --- */
  showResult(){
    const B=Battle, s=B.ses, st=B.stage, D=Save.data, win=B.win;
    $('#modal-quiz').classList.remove('show'); B.quizOpen=false;
    let stageCoins=0, stars=0, firstClear=false, tickets=0;
    if(win){
      firstClear = D.cleared < st.id;
      stageCoins = firstClear ? st.reward : Math.round(st.reward/2);
      const hpR=B.ally.hp/B.ally.maxHp; stars = hpR>0.7?3:hpR>0.35?2:1;
      if(firstClear) D.cleared=st.id;
      D.stageBest[st.id]=Math.max(D.stageBest[st.id]||0,stars);
      D.totals.wins++;
      tickets = (firstClear?3:1) + (stars===3?1:0); D.tickets += tickets;
    }
    const quizBonus = s.correct*2;          // 단어 정답 → 코인 성장
    const total = stageCoins + s.coins + quizBonus;
    D.coins += total; Save.save();
    $('#res-title').textContent = win? '승리!' : '패배…'; $('#res-title').className='result-title '+(win?'win':'lose');
    $('#res-stars').innerHTML = win? [0,1,2].map(i=>`<span class="${i<stars?'':'off'}">⭐</span>`).join('') : '<span style="font-size:20px;font-family:Do Hyeon">단어를 복습하고 다시 도전해 봐요!</span>';
    const acc = s.total? Math.round(s.correct/s.total*100) : 0;
    $('#res-battle').innerHTML = [
      ['⏱',`${Math.floor(B.time/60)}:${String(Math.floor(B.time%60)).padStart(2,'0')}`,'전투 시간'],
      ['⚔️',s.kills,'처치한 적'],
      ['🐾',s.summons,'소환 횟수'],
      ['💰','+'+total,`코인 (스테이지 ${stageCoins} · 처치 ${s.coins} · 단어 ${quizBonus})`],
    ].map(([e,v,l])=>`<div class="tile"><b>${v}</b><small>${e} ${l}</small></div>`).join('');
    $('#res-learn').innerHTML = [
      [s.total,'출제 단어'],[s.correct,'정답'],[s.wrong,'오답'],[s.total?acc+'%':'-','정답률'],
    ].map(([v,l],i)=>`<div class="tile" style="background:${['#eef4ff','#e6fbee','#ffecec','#fff6d6'][i]}"><b>${v}</b><small>📘 ${l}</small></div>`).join('');
    const uniq=[...new Map(s.wrongWords.map(w=>[w.en,w])).values()];
    $('#res-words').innerHTML = (tickets? `<div style="text-align:center;font-family:Do Hyeon;font-size:22px;color:#7a4ae0;margin-bottom:8px">🎟️ 뽑기권 +${tickets}장 획득!${stars===3?' (★3 보너스 포함)':''}</div>` : '') + `<h4>📝 이번 전투에서 틀린 단어 (최고 콤보 ${s.maxCombo})</h4>` + (uniq.length? uniq.map(w=>`<span class="chip">${w.en} <i>${w.ko}</i></span>`).join('') : '<div class="empty">틀린 단어가 없어요! 완벽해요 🎉</div>');
    const act=$('#res-actions'); act.innerHTML='';
    const mk=(txt,cls,fn)=>{ const b=document.createElement('button'); b.className='btn '+cls; b.textContent=txt; b.onclick=()=>{ Sound.play('click'); fn(); }; act.appendChild(b); };
    if(win && B.si<STAGES.length-1) mk('다음 스테이지 ▶','pink',()=>this.startStage(B.si+1));
    if(D.tickets>0) mk(`🎁 뽑기 하러 가기 (🎟️${D.tickets})`,'purple',()=>{ $('#modal-result').classList.remove('show'); this.go('gacha'); });
    mk('↻ 다시 하기','',()=>this.startStage(B.si));
    mk('🛒 강화하러 가기','green',()=>{ $('#modal-result').classList.remove('show'); this.go('shop'); });
    mk('스테이지 선택','white',()=>{ $('#modal-result').classList.remove('show'); this.go('stages'); });
    $('#modal-result').classList.add('show');
    if(win && firstClear){
      const nu = UNIT_ORDER.find(k=>UNITS[k].unlock && UNITS[k].unlock.stage===st.id && !D.units[k].owned);
      if(nu) setTimeout(()=>this.toast('🔓',`${UNITS[nu].name} 해금 가능! 상점에서 확인하세요`),600);
      if(st.id<STAGES.length) setTimeout(()=>this.toast('🗺️',`STAGE ${st.id+1} 이 열렸어요!`),300);
    }
    this.checkAch(s);
    this.refreshCoins();
  },
  checkAch(battleSes){
    const D=Save.data; let delay=900;
    for(const a of ACHIEVEMENTS){
      if(D.ach[a.id]) continue;
      if(a.check(D,battleSes)){ D.ach[a.id]=Date.now(); D.coins+=a.reward; setTimeout(()=>{ this.toast(a.icon,`업적 달성: ${a.name} (+${a.reward} 코인)`); Sound.play('fever'); },delay); delay+=700; }
    }
    Save.save(); this.refreshCoins();
  },

  /* --- 상점 --- */
  renderShop(){
    const D=Save.data, box=$('#shop-units'); box.innerHTML='';
    if(!this.selUnit || !UNITS[this.selUnit]) this.selUnit=D.deck[0]||'slime';
    const sel=this.selUnit;
    $('#deck-info').textContent=`출격 편성 ${D.deck.length} / ${DECK_MAX}`;
    let slots='<div class="slots">';
    for(let i=0;i<DECK_MAX;i++){ const k=D.deck[i];
      slots += k ? `<button class="slot full" data-rm="${k}" title="누르면 편성에서 빼요"><canvas width="144" height="116" data-pk="${k}"></canvas><span class="sn">${i+1}</span><span class="sc">⚡${UNITS[k].cost}</span></button>`
                 : `<div class="slot empty"><span>${i+1}</span></div>`; }
    slots+='</div>';
    let grid='<div class="ugrid">';
    UNIT_ORDER.forEach(k=>{ const d=UNITS[k], st=D.units[k];
      grid+=`<button class="ucard${k===sel?' sel':''}${st.owned?'':' lock'}${D.deck.includes(k)?' in':''}${d.gacha?' g-'+d.gacha:''}" data-pick="${k}"><canvas width="120" height="96" data-pk="${k}"></canvas><span class="un">${d.name}</span><span class="ul">${st.owned?(D.deck.includes(k)?'편성 중 · ':'')+'Lv.'+st.lv:'잠김'}</span></button>`; });
    grid+='</div>';
    const d=UNITS[sel], st=D.units[sel], m=lvMul(st.lv)*ALLY_NERF, hp=Math.round(d.hp*m), atk=Math.round(d.atk*m), dps=Math.round(atk/d.rate);
    const nm=lvMul(st.lv+1)*ALLY_NERF, inDeck=D.deck.includes(sel);
    const rb = d.gacha? `<span class="rbadge r-${d.gacha}">${RARITY[d.gacha].name}</span>` : '';
    let acts='';
    if(!st.owned){
      if(d.gacha) acts=`<button class="btn small purple" id="d-gacha">뽑기에서 획득 (${(RARITY[d.gacha].rate/UNIT_ORDER.filter(x=>UNITS[x].gacha===d.gacha).length).toFixed(1)}%)</button>`;
      else { const need=d.unlock, ok=D.cleared>=need.stage, can=ok && D.coins>=need.coins;
        acts=`<button class="btn small purple" id="d-unlock" ${can?'':'disabled'}>${ok?`해금 · C ${need.coins}`:`STAGE ${need.stage} 클리어 필요`}</button>`; }
    } else {
      const cost=upgCost(sel,st.lv);
      acts = (st.lv>=MAX_LV ? `<button class="btn small" disabled>MAX 레벨</button>` : `<button class="btn small ${D.coins>=cost?'green':''}" id="d-up" ${D.coins>=cost?'':'disabled'}>강화 Lv.${st.lv}→${st.lv+1} · C ${cost}</button>`)
        + `<button class="btn small ${inDeck?'white':'on-deck'}" id="d-deck">${inDeck?'편성에서 빼기':'출격 편성에 넣기'}</button>`;
    }
    const detail=`<canvas id="det-cv" width="240" height="192"${st.owned?'':' style="filter:brightness(0) opacity(.45)"'}></canvas>
      <h4>${d.name}${rb}${st.owned?`<span class="lv">Lv.${st.lv}</span>`:''}</h4><div class="desc">${d.desc}</div>
      <table class="dstats"><tr><td>체력</td><td>${hp}</td><td>공격력</td><td>${atk}</td></tr>
      <tr><td>사거리</td><td>${d.range>50?'원거리':'근접'}</td><td>공격 간격</td><td>${d.rate}초</td></tr>
      <tr><td>이동 속도</td><td>${d.speed}</td><td>초당 피해</td><td>${dps}</td></tr>
      <tr><td>소환 비용</td><td>⚡${d.cost}</td><td>재소환 대기</td><td>${d.cd}초</td></tr></table>
      ${st.owned && st.lv<MAX_LV?`<div class="next">다음 레벨 · 체력 ${Math.round(d.hp*nm)} · 공격력 ${Math.round(d.atk*nm)}</div>`:''}
      <div class="statline">${abilityTags(d)}</div><div class="btns">${acts}</div>`;
    box.innerHTML = slots + `<div class="ushop">${grid}<div class="udetail">${detail}</div></div>`;
    box.querySelectorAll('canvas[data-pk]').forEach(c=>{ drawPortrait(c,c.dataset.pk); if(!D.units[c.dataset.pk].owned) c.style.filter='brightness(0) opacity(.45)'; });
    drawPortrait($('#det-cv'),sel);
    box.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{ this.selUnit=b.dataset.pick; Sound.play('click'); this.renderShop(); });
    box.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{
      if(D.deck.length<=1){ this.toast('⚠️','최소 1마리는 편성해야 해요'); return; }
      const k=b.dataset.rm; D.deck.splice(D.deck.indexOf(k),1); this.selUnit=k; Save.save(); Sound.play('click'); this.renderShop(); });
    const bg=$('#d-gacha'); if(bg) bg.onclick=()=>this.go('gacha');
    const bd=$('#d-deck'); if(bd) bd.onclick=()=>{
      const i=D.deck.indexOf(sel);
      if(i>=0){ if(D.deck.length<=1){ this.toast('⚠️','최소 1마리는 편성해야 해요'); return; } D.deck.splice(i,1); }
      else { if(D.deck.length>=DECK_MAX){ this.toast('⚠️',`편성은 최대 ${DECK_MAX}마리예요. 슬롯의 캐릭터를 눌러 먼저 빼 주세요`); return; } D.deck.push(sel); }
      Save.save(); Sound.play('click'); this.renderShop(); };
    const bu=$('#d-unlock'); if(bu) bu.onclick=()=>{ D.coins-=UNITS[sel].unlock.coins; D.units[sel].owned=true; if(D.deck.length<DECK_MAX) D.deck.push(sel); Save.save(); Sound.play('fever'); this.toast('🎉',`${UNITS[sel].name} 해금!`); this.refreshCoins(); this.renderShop(); };
    const bl=$('#d-up'); if(bl) bl.onclick=()=>{ const cost=upgCost(sel,D.units[sel].lv); if(D.coins<cost) return; D.coins-=cost; D.units[sel].lv++; Save.save(); Sound.play('upgrade'); this.refreshCoins(); this.renderShop(); this.checkAch(); };
    const ups=[
      {k:'energy', name:'⚡ 자원 생산 속도', desc:'전투 중 초당 자원 증가량 +15%', base:100, fmtv:lv=>`${Math.round(40*(1+0.15*lv))}/s`},
      {k:'start',  name:'🎒 시작 자원',     desc:'전투 시작 시 자원 +60',         base:80,  fmtv:lv=>`${200+60*lv}`},
      {k:'base',   name:'🏰 기지 체력',     desc:'우리 기지 최대 체력 +15%',        base:90,  fmtv:lv=>`${Math.round(BASE_HP*(1+0.15*lv))}`},
    ];
    const ub=$('#shop-ups'); ub.innerHTML='';
    ups.forEach(u=>{
      const lv=D.up[u.k], max=5, cost=u.base*(lv+1), el=document.createElement('div'); el.className='up-row';
      el.innerHTML=`<h4>${u.name}</h4><p>${u.desc} · 현재 <b>${u.fmtv(lv)}</b></p><div class="pips">${Array.from({length:max},(_,i)=>`<i class="${i<lv?'on':''}"></i>`).join('')}</div>
        ${lv>=max?`<button class="btn small" disabled>MAX</button>`:`<button class="btn small ${D.coins>=cost?'green':''}" ${D.coins>=cost?'':'disabled'}>강화 · C ${cost}</button>`}`;
      const b=el.querySelector('button'); if(lv<max) b.onclick=()=>{ if(D.coins<cost) return; D.coins-=cost; D.up[u.k]++; Save.save(); Sound.play('upgrade'); this.refreshCoins(); this.renderShop(); };
      ub.appendChild(el);
    });
    ub.insertAdjacentHTML('beforeend',`<div class="up-row" style="background:#fff6d6"><h4>💡 코인 모으는 법</h4><p style="margin:0">스테이지 클리어 · 적 처치 · <b>단어 정답 1개당 +3코인</b> · 업적 달성</p></div>`);
  },

  /* --- 통계 --- */
  renderStats(){
    const s=Save.data.stats, acc=s.total?Math.round(s.correct/s.total*100):0;
    const learned=Object.values(s.words).filter(e=>e.c>0).length;
    $('#stat-tiles').innerHTML=[[s.total,'전체 출제'],[s.correct,'정답'],[s.wrong,'오답'],[s.total?acc+'%':'-','정답률'],[learned,'맞혀 본 단어']]
      .map(([v,l],i)=>`<div class="tile" style="background:${['#eef4ff','#e6fbee','#ffecec','#fff6d6','#f3ecff'][i]}"><b>${v}</b><small>${l}</small></div>`).join('');
    const ents=Object.entries(s.words).filter(([,e])=>e.w>0);
    const freq=ents.slice().sort((a,b)=>b[1].w-a[1].w || a[1].c-b[1].c).slice(0,10);
    $('#stat-freq').innerHTML = freq.length? `<table class="word-table"><tr><th>단어</th><th>뜻</th><th>오답</th><th>정답</th></tr>${freq.map(([en,e])=>`<tr><td class="en">${en}</td><td>${e.ko}</td><td class="cnt">${e.w}회</td><td>${e.c}회</td></tr>`).join('')}</table>` : '<div class="empty">아직 틀린 단어가 없어요!</div>';
    const rec=ents.slice().sort((a,b)=>b[1].last-a[1].last).slice(0,30);
    $('#stat-wrong').innerHTML = rec.length? rec.map(([en,e])=>`<span class="chip">${en} <i>${e.ko}</i></span>`).join('') : '<div class="empty">틀린 단어가 여기에 모여요.</div>';
  },
  renderAch(){
    const D=Save.data;
    $('#ach-grid').innerHTML=ACHIEVEMENTS.map(a=>`<div class="ach ${D.ach[a.id]?'done':''}"><div class="medal">${a.icon}</div><div><h4>${a.name}</h4><p>${a.desc}</p><div class="rw">${D.ach[a.id]?'✅ 달성!':'보상 '+a.reward+' 코인'}</div></div></div>`).join('');
  },
  renderSettings(){
    $('#tg-sound').classList.toggle('on',Save.data.settings.sound);
    $('#tg-quizpause').classList.toggle('on',Save.data.settings.quizPause);
    $('#tg-potato').classList.toggle('on',POTATO());
    const cw=Save.data.customWords;
    if(cw && !$('#custom-words').value) $('#custom-words').value=cw.map(w=>`${w.en}, ${w.ko}`).join('\n');
    $('#words-info').textContent = cw? `사용자 단어 ${cw.length}개 사용 중` : `기본 단어 ${WORD_DATA.length}개 사용 중`; $('#words-info').style.color='';
  },
};

export { UI };
