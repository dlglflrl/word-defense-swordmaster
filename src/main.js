import { WORD_DATA } from './words.js';

'use strict';
/* =========================================================
   모듈 구성
   CONFIG  : 월드 크기 / 상수
   DATA    : 아군·적군 유닛, 스테이지, 업적 정의
   Save    : LocalStorage 저장/불러오기
   Sound   : WebAudio 효과음 합성
   Quiz    : 단어 출제 · 기록
   Art     : 캐릭터/기지/배경 그리기 (모두 직접 만든 벡터 아트)
   Battle  : 전투 시뮬레이션
   Render  : 캔버스 렌더링 / 이펙트
   UI      : 화면 전환, HUD, 상점, 통계, 모달
   ========================================================= */

/* ---------------- CONFIG ---------------- */
/* ★ 빌드 설정: true = 기능 확인용 테스트 버전 (재화 넉넉, 모든 스테이지 열림, 별도 저장) */
const DEV_MODE = false;
const W = 1280, H = 520, GROUND = 448;
const ALLY_BASE_X = 92, ENEMY_BASE_X = 1188, BASE_W = 56;
const INK = '#2b2140';
const rand = (a,b)=>a+Math.random()*(b-a);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const $ = s=>document.querySelector(s);
const fmt = n=>Math.floor(n).toLocaleString();

/* ---------------- DATA ---------------- */
const UNIT_ORDER = ['slime','knight','archer','golem','dragon','bee','mushroom','squirrel','duck','snowmage','penguin','frog','sheep','robot','fox','astronaut','owl','phoenix','turtle'];
const DECK_MAX = 6;
/* 뽑기 등급: rate = 등급 전체 확률(%) */
const RARITY = {
  N:  { name:'노말', stars:1, rate:56, dupCoins:30 },
  R:  { name:'레어', stars:2, rate:30, dupCoins:80 },
  SR: { name:'에픽', stars:3, rate:12, dupCoins:200 },
  UR: { name:'전설', stars:4, rate:2,  dupCoins:500 },
};
const PITY_MAX = 30;          // 30회 안에 전설이 안 나오면 전설 확정
const TICKET_PRICE = 250;
/* 등급(색) 표시용: 기본 유닛도 등급 색을 가짐 */
const BASE_GRADE = { slime:'N', knight:'N', archer:'N', golem:'R', dragon:'SR' };
const gradeOf = k => UNITS[k].gacha || BASE_GRADE[k] || 'N';
/* 필드 동시 출전 제한: 강한 유닛을 한꺼번에 몰아 쓰지 못하게 */
const FIELD_CAP = { UR:1, SR:2 };
const fieldCap = k => UNITS[k].max || FIELD_CAP[gradeOf(k)] || 99;
/* 적 특성 — 아군의 '강함(strong)' 대상이 되면 1.8배 피해를 주고, 그 적에게서 받는 피해는 40% 줄어요 */
const TRAITS = {
  float:  { name:'떠다님', icon:'🪽', color:'#7fd3ff', desc:'하늘을 떠다니는 적' },
  beast:  { name:'야수',   icon:'🐾', color:'#ff9f43', desc:'빠르고 사나운 짐승' },
  undead: { name:'언데드', icon:'💀', color:'#9be55a', desc:'쓰러지면 한 번 되살아남 (✨정화 공격으로 막을 수 있음)' },
  metal:  { name:'강철',   icon:'🔩', color:'#c0c6d6', desc:'일반 공격은 1만 들어감 (⚡치명타·🧲강철 파괴는 통함)' },
  alien:  { name:'외계',   icon:'👽', color:'#c77dff', desc:'보호막이 있어 먼저 깨야 함 (🛡️보호막 파괴로 한 번에)' },
};
const STRONG_MUL = 1.8, STRONG_DEF = 0.6;
const UNITS = {
  slime:  { name:'말랑 슬라임', desc:'싸고 빠르게 뽑는 기본 전투 유닛', cost:75,  hp:110,  atk:14,  speed:72, rate:0.9, range:12,  w:20, cd:2,  upg:40 },
  knight: { name:'곰돌이 기사',   desc:'칼과 방패를 든 든든한 근접 유닛', cost:180, hp:320, atk:38, speed:52, rate:1.0, range:14,  w:22, cd:4,  upg:60, strong:['beast'] },
  archer: { name:'토끼 궁수',   desc:'멀리서 화살을 쏘는 원거리 유닛 (체력 낮음)', cost:240, hp:130, atk:30, speed:46, rate:1.4, range:230, w:18, cd:5, ranged:'arrow', upg:70, strong:['float'] },
  golem:  { name:'코뿔소 수호대',   desc:'느리지만 단단한 방패 유닛 (피해 35% 감소)', cost:550, hp:1600, atk:45, speed:22, rate:1.8, range:14, w:34, cd:16, def:0.35, noKb:true, max:3, upg:100, unlock:{coins:300, stage:1} },
  dragon: { name:'악어 드래곤', desc:'화염구로 범위 공격하는 하늘의 지배자', cost:1400, hp:900, atk:110, speed:38, rate:2.4, range:180, w:30, cd:35, ranged:'fire', aoe:75, fly:true, strong:['float'], upg:150, unlock:{coins:900, stage:3} },
  /* ----- 뽑기 전용 캐릭터 ----- */
  bee:      { gacha:'N',  name:'꿀벌 돌격대',     desc:'붕붕 날아가 침으로 콕콕! 공격 속도가 빨라요', cost:120, hp:150, atk:22, speed:95, rate:0.6, range:18, w:18, cd:3, upg:50 },
  mushroom: { gacha:'N',  name:'하마 방패병',   desc:'싸고 튼튼한 방패 유닛 (피해 40% 감소)', cost:150, hp:560, atk:12, speed:40, rate:1.2, range:12, w:22, cd:4, def:0.4, upg:50 },
  snowmage: { gacha:'R',  name:'일각고래 얼음술사', desc:'얼음 결정을 쏴서 맞은 적을 느리게 만들어요', cost:480, hp:240, atk:42, speed:40, rate:1.5, range:220, w:18, cd:12, ranged:'ice', slow:true, upg:90 },
  penguin:  { gacha:'R',  name:'대포 펭귄',     desc:'아주 먼 곳까지 대포알을 쏘는 범위 공격수', cost:650, hp:320, atk:90, speed:32, rate:2.6, range:290, w:22, cd:15, ranged:'cannon', aoe:60, strong:['alien'], upg:110 },
  squirrel: { gacha:'N',  name:'병아리 새총수', desc:'새총으로 도토리를 쏘는 값싼 원거리 유닛. 야수에게 강해요', cost:140, hp:120, atk:26, speed:60, rate:1.1, range:170, w:18, cd:4, ranged:'acorn', strong:['beast'], upg:50 },
  duck:     { gacha:'N',  name:'오리 방패병', desc:'아주 싸고 넉백되지 않는 벽. 공격력은 약해요', cost:90, hp:420, atk:6, speed:50, rate:1.5, range:12, w:20, cd:3, noKb:true, upg:45 },
  frog:     { gacha:'R',  name:'개구리 사냥꾼', desc:'긴 혀로 적을 뒤로 날려 버려요. 야수·떠다니는 적에게 강해요', cost:420, hp:380, atk:55, speed:60, rate:1.2, range:42, w:22, cd:12, kb:200, strong:['beast','float'], upg:90 },
  sheep:    { gacha:'R',  name:'염소 성직자',     desc:'빛 구슬로 언데드를 정화해 되살아나지 못하게 해요', cost:520, hp:300, atk:45, speed:40, rate:1.6, range:200, w:20, cd:14, ranged:'holy', purify:true, strong:['undead'], upg:90 },
  robot:    { gacha:'R',  name:'자석 로봇',     desc:'자석 주먹으로 강철 적에게도 제대로 된 피해를 줘요', cost:600, hp:650, atk:60, speed:35, rate:1.4, range:16, w:26, cd:15, metalBreak:true, strong:['metal'], upg:110 },
  fox:      { gacha:'SR', name:'늑대 닌자', desc:'번개처럼 빠른 칼질! 30% 확률로 2.5배 치명타', cost:1100, hp:750, atk:100, speed:115, rate:0.55, range:16, w:22, cd:28, crit:0.3, upg:160 },
  astronaut:{ gacha:'SR', name:'원숭이 우주비행사', desc:'광선총으로 외계 보호막을 한 번에 깨요. 외계에 강해요', cost:1000, hp:650, atk:95, speed:50, rate:1.0, range:190, w:22, cd:28, ranged:'laser', shieldBreak:true, strong:['alien'], upg:160 },
  owl:      { gacha:'SR', name:'유령 사냥 올빼미', desc:'하늘에서 깃털을 쏘며 언데드를 정화해요. 언데드·떠다니는 적에게 강해요', cost:950, hp:600, atk:85, speed:55, rate:0.9, range:150, w:24, cd:28, ranged:'feather', fly:true, purify:true, strong:['undead','float'], upg:160 },
  phoenix:  { gacha:'UR', name:'태양 앵무 피닉스',   desc:'태양 불꽃으로 넓은 범위를 태우고, 쓰러지면 한 번 부활해요', cost:2600, hp:2000, atk:220, speed:45, rate:2.0, range:210, w:32, cd:60, ranged:'sun', aoe:120, fly:true, revive:true, purify:true, strong:['undead'], upg:250 },
  turtle:   { gacha:'UR', name:'시간의 나무늘보 현자', desc:'시계 마법으로 넓은 범위의 적을 1.5초 동안 멈춰요 (같은 적은 3초 동안 다시 멈추지 않음). 넉백되지 않아요', cost:2800, hp:3400, atk:120, speed:22, rate:3.2, range:200, w:34, cd:65, ranged:'clock', aoe:140, freeze:1.5, noKb:true, upg:250 },
};
const ENEMIES = {
  eslime:   { name:'꼬마 슬라임', hp:90,   atk:10,  speed:44,  rate:1.0, range:12, w:18, reward:2 },
  bat:      { name:'박쥐',       hp:70,   atk:9,   speed:115, rate:0.7, range:12, w:18, fly:true, reward:3, traits:['float'] },
  wolf:     { name:'날쌘 생쥐',       hp:230,  atk:24,  speed:96,  rate:0.9, range:14, w:28, reward:4, traits:['beast'] },
  skeleton: { name:'좀비 전사',   hp:650,  atk:34,  speed:34,  rate:1.3, range:16, w:22, def:0.2, reward:6, traits:['undead'] },
  ghost:    { name:'장난꾸러기 유령', hp:170, atk:18, speed:58,  rate:0.9, range:12, w:18, fly:true, reward:5, traits:['float','undead'] },
  zombie:   { name:'꼬마 좀비', hp:420,  atk:24,  speed:24,  rate:1.4, range:14, w:22, reward:5, traits:['undead'] },
  boar:     { name:'가시 돌격병', hp:460,  atk:40,  speed:88,  rate:1.1, range:14, w:30, reward:6, traits:['beast'] },
  metalslime:{ name:'강철 블록', hp:24,   atk:26,  speed:42,  rate:1.0, range:12, w:18, reward:15, traits:['metal'] },
  alien:    { name:'외계 꼬마', hp:520,  atk:30,  speed:36,  rate:1.2, range:14, w:22, reward:8, traits:['alien'] },
  boss:     { name:'고철 대왕', hp:6000, atk:110, speed:16,  rate:2.6, range:30, w:62, aoe:120, kb:300, reward:80, boss:true },
  ufo:      { name:'외계 함대장', hp:6500, atk:115, speed:18,  rate:2.6, range:40, w:62, aoe:120, kb:260, reward:100, boss:true, fly:true, traits:['alien','float'] },
};
const STAGES = [
  { id:1, name:'햇살 초원',   desc:'꼬마 슬라임들이 몰려와요. 기본기를 익혀요!', theme:0, baseHp:2500, reward:120,
    spawns:[ {t:'eslime', every:4.5, start:3} ], hpMul:1 },
  { id:2, name:'박쥐 동굴',   desc:'날쌘 박쥐가 등장! 빠른 적을 조심하세요.', theme:1, baseHp:3500, reward:160,
    spawns:[ {t:'eslime', every:5.5, start:3}, {t:'bat', every:4, start:6} ], hpMul:1.1 },
  { id:3, name:'으스스한 숲', desc:'튼튼한 좀비 전사와 날쌘 생쥐가 숲을 지켜요.', theme:2, baseHp:4500, reward:220,
    spawns:[ {t:'eslime', every:6, start:3}, {t:'skeleton', every:11, start:10}, {t:'wolf', every:10, start:18} ], hpMul:1.15 },
  { id:4, name:'혼돈의 계곡', desc:'모든 종류의 적이 한꺼번에 몰려와요!', theme:3, baseHp:6000, reward:280,
    spawns:[ {t:'eslime', every:4.5, start:2}, {t:'bat', every:5.5, start:5}, {t:'wolf', every:8, start:10}, {t:'skeleton', every:12, start:15}, {t:'boar', every:14, start:25} ], hpMul:1.25 },
  { id:5, name:'그림자 성',   desc:'최종 보스 고철 대왕이 깨어납니다…!', theme:4, baseHp:8000, reward:450,
    spawns:[ {t:'eslime', every:5, start:2}, {t:'bat', every:6.5, start:6}, {t:'wolf', every:9, start:12}, {t:'skeleton', every:13, start:16}, {t:'ghost', every:11, start:20} ], hpMul:1.3,
    boss:{ t:'boss', at:40, hpTrigger:0.7 } },
  { id:6, name:'유령 묘지',   desc:'쓰러져도 일어나는 언데드 무리! 정화 능력이 필요해요.', theme:5, baseHp:9000, reward:520,
    spawns:[ {t:'zombie', every:6, start:2}, {t:'ghost', every:5.5, start:5}, {t:'skeleton', every:11, start:12}, {t:'bat', every:7, start:8} ], hpMul:1.4 },
  { id:7, name:'강철 광산',   desc:'공격이 잘 안 먹히는 강철 블록과 가시 돌격병 떼!', theme:6, baseHp:10000, reward:600,
    spawns:[ {t:'metalslime', every:7, start:4}, {t:'boar', every:8, start:6}, {t:'eslime', every:4, start:2}, {t:'wolf', every:9, start:12} ], hpMul:1.45 },
  { id:8, name:'외계 침공',   desc:'보호막을 두른 외계 꼬마들과 함대장이 내려와요!', theme:7, baseHp:12000, reward:800,
    spawns:[ {t:'alien', every:6, start:3}, {t:'metalslime', every:10, start:8}, {t:'ghost', every:8, start:10}, {t:'boar', every:12, start:15} ], hpMul:1.5,
    boss:{ t:'ufo', at:45, hpTrigger:0.65 } },
];
const ACHIEVEMENTS = [
  { id:'first_win',  icon:'🎉', name:'첫 승리',       desc:'스테이지를 처음으로 클리어', reward:50,  check:s=>s.totals.wins>=1 },
  { id:'all_clear',  icon:'👑', name:'그림자 정복자', desc:'Stage 5 보스를 물리치기',    reward:300, check:s=>s.cleared>=5 },
  { id:'space_clear', icon:'🛸', name:'지구 수호자', desc:'Stage 8 외계 함대장을 물리치기', reward:500, check:s=>s.cleared>=8 },
  { id:'combo5',     icon:'🔥', name:'불타는 콤보',   desc:'5연속 정답 달성',            reward:40,  check:s=>s.totals.maxCombo>=5 },
  { id:'combo15',    icon:'⚡', name:'단어 폭주기관차', desc:'15연속 정답 달성',         reward:150, check:s=>s.totals.maxCombo>=15 },
  { id:'correct50',  icon:'📘', name:'단어 수집가',   desc:'누적 정답 50개',             reward:60,  check:s=>s.stats.correct>=50 },
  { id:'correct300', icon:'📚', name:'S\'word Master', desc:'누적 정답 300개',           reward:300, check:s=>s.stats.correct>=300 },
  { id:'kills100',   icon:'⚔️', name:'백전노장',      desc:'적 100마리 처치',            reward:80,  check:s=>s.totals.kills>=100 },
  { id:'dragon',     icon:'🐉', name:'드래곤 라이더', desc:'드래곤을 처음 소환',          reward:60,  check:s=>s.totals.dragons>=1 },
  { id:'sharp',      icon:'🎯', name:'명사수',        desc:'한 전투에서 정답률 90% 이상 (10문제 이상)', reward:100, check:(s,b)=>b&&b.total>=10&&b.correct/b.total>=0.9 },
  { id:'first_pull', icon:'🎁', name:'두근두근 첫 뽑기', desc:'캐릭터 뽑기 1회',         reward:30,  check:s=>s.totals.pulls>=1 },
  { id:'legend',     icon:'🌞', name:'전설의 주인',     desc:'전설 등급 캐릭터 획득',     reward:200, check:s=>UNIT_ORDER.some(k=>UNITS[k].gacha==='UR'&&s.units[k].owned) },
  { id:'collector',  icon:'🗂️', name:'몬스터 도감',     desc:'뽑기 캐릭터 모두 모으기', reward:300, check:s=>UNIT_ORDER.filter(k=>UNITS[k].gacha).every(k=>s.units[k].owned) },
  { id:'rich',       icon:'💰', name:'부자 몬스터',   desc:'코인 1,000개 모으기',        reward:50,  check:s=>s.coins>=1000 },
];

/* ---------------- SAVE ---------------- */
const SAVE_KEY = DEV_MODE ? 'swordmaster_word_defense_TEST' : 'swordmaster_word_defense_v1';
const Save = {
  data:null,
  defaults(){
    return {
      coins:0, cleared:0,
      units:Object.fromEntries(UNIT_ORDER.map(k=>[k,{owned:['slime','knight','archer'].includes(k),lv:1}])),
      freeDay:'', deck:['slime','knight','archer'], decks:[['slime','knight','archer'],['slime','knight','archer'],['slime','knight','archer']], deckIdx:0, tickets:1, pity:0,
      up:{ energy:0, start:0, base:0 },
      stats:{ total:0, correct:0, wrong:0, words:{} },
      ach:{}, totals:{ kills:0, wins:0, maxCombo:0, dragons:0, summons:0, pulls:0 },
      stageBest:{},
      settings:{ sound:true, quizPause:true, potato:false },
      customWords:null,
      ...(DEV_MODE ? { coins:99999, tickets:100, cleared:STAGES.length } : {}),
    };
  },
  load(){
    let d=null;
    try{ d = JSON.parse(localStorage.getItem(SAVE_KEY)); }catch(e){}
    const hadDeck = d && Array.isArray(d.deck), hadDecks = d && Array.isArray(d.decks);
    this.data = d ? merge(this.defaults(), d) : this.defaults();
    if(!hadDeck) this.data.deck = UNIT_ORDER.filter(k=>this.data.units[k].owned).slice(0,DECK_MAX);   // 이전 버전 저장 데이터 변환
    if(!hadDecks && d) this.data.decks = [this.data.deck.slice(), this.data.deck.slice(), this.data.deck.slice()];
    // 오답 노트 변환: 예전 기록에서 틀린 적 있는 단어는 오답 노트로
    for(const e of Object.values(this.data.stats.words)){ if(e.nb===undefined) e.nb = e.w>0; if(e.rs===undefined) e.rs=0; }
    this.fixDecks();
  },
  fixDecks(){
    const D=this.data;
    if(!Array.isArray(D.decks) || D.decks.length<3) D.decks=[0,1,2].map(i=>(D.decks&&D.decks[i])||D.deck.slice());
    D.decks = D.decks.map(dk=>dk.filter(k=>UNITS[k] && D.units[k].owned).slice(0,DECK_MAX));
    D.deckIdx = clamp(D.deckIdx|0,0,2);
    if(!D.decks[D.deckIdx].length) D.decks[D.deckIdx].push('slime');
    D.deck = D.decks[D.deckIdx];          // 현재 편성 (같은 배열을 가리킴)
  },
  save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); }catch(e){} },
  reset(){ this.data = this.defaults(); this.fixDecks(); this.save(); },
};
function merge(a,b){
  for(const k in b){
    if(b[k] && typeof b[k]==='object' && !Array.isArray(b[k]) && a[k] && typeof a[k]==='object' && !Array.isArray(a[k])) a[k]=merge(a[k],b[k]);
    else a[k]=b[k];
  }
  return a;
}

/* ---------------- SOUND (WebAudio 합성) ---------------- */
const Sound = {
  ctx:null, master:null, last:{},
  init(){
    if(!this.ctx){
      try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); this.master=this.ctx.createGain(); this.master.gain.value=0.5; this.master.connect(this.ctx.destination); }catch(e){ this.ctx=null; }
    }
    if(this.ctx && this.ctx.state==='suspended'){ this.ctx.resume().catch(()=>{}); }
  },
  get on(){ return Save.data.settings.sound && this.ctx; },
  tone(f, dur, type='sine', vol=0.2, slide=0, delay=0){
    if(!this.on) return;
    const c=this.ctx, t=c.currentTime+delay, o=c.createOscillator(), g=c.createGain();
    o.type=type; o.frequency.setValueAtTime(f,t);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide), t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+dur+0.02);
  },
  noise(dur, vol=0.2, freq=1200, delay=0){
    if(!this.on) return;
    const c=this.ctx, t=c.currentTime+delay, n=Math.floor(c.sampleRate*dur), buf=c.createBuffer(1,n,c.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const s=c.createBufferSource(); s.buffer=buf; const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=freq;
    const g=c.createGain(); g.gain.value=vol; s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  play(name){
    if(!this.on) return;
    const now=performance.now();
    const gap={hit:45,arrow:60,die:50,base:90,coin:60}[name]||0;
    if(gap && this.last[name] && now-this.last[name]<gap) return;
    this.last[name]=now;
    switch(name){
      case 'click': this.tone(660,0.06,'square',0.08); break;
      case 'open':  this.tone(520,0.08,'triangle',0.15); this.tone(780,0.1,'triangle',0.12,0,0.06); break;
      case 'correct': this.tone(880,0.12,'triangle',0.22); this.tone(1320,0.22,'triangle',0.2,0,0.09); break;
      case 'wrong': this.tone(220,0.25,'sawtooth',0.12,-80); this.tone(160,0.3,'square',0.08,-40,0.1); break;
      case 'summon': [523,659,784,1046].forEach((f,i)=>this.tone(f,0.12,'triangle',0.14,0,i*0.05)); break;
      case 'hit': this.noise(0.08,0.18,1800); this.tone(180,0.07,'square',0.06,-60); break;
      case 'arrow': this.noise(0.12,0.08,4000); break;
      case 'fire': this.noise(0.35,0.2,700); this.tone(120,0.3,'sawtooth',0.08,-50); break;
      case 'boom': this.noise(0.5,0.35,500); this.tone(80,0.5,'sine',0.3,-40); break;
      case 'die': this.tone(500,0.15,'square',0.07,-350); break;
      case 'base': this.noise(0.18,0.22,600); this.tone(90,0.2,'sine',0.2,-30); break;
      case 'coin': this.tone(1200,0.06,'square',0.05); this.tone(1600,0.08,'square',0.05,0,0.05); break;
      case 'upgrade': [440,660,880].forEach((f,i)=>this.tone(f,0.1,'square',0.08,0,i*0.06)); break;
      case 'boss': [0,0.45,0.9].forEach(d=>{ this.tone(110,0.4,'sawtooth',0.18,-20,d); this.tone(116,0.4,'sawtooth',0.12,-20,d); }); break;
      case 'fever': [660,880,1100,1320,1760].forEach((f,i)=>this.tone(f,0.1,'triangle',0.14,0,i*0.05)); break;
      case 'ice': this.tone(1400,0.15,'sine',0.1,-600); this.noise(0.08,0.06,6000); break;
      case 'cannon': this.noise(0.25,0.3,900); this.tone(140,0.2,'square',0.12,-70); break;
      case 'crit': this.tone(1800,0.08,'square',0.08,-900); this.noise(0.1,0.15,5000); break;
      case 'revive': [392,523,659,784,1046,1318].forEach((f,i)=>this.tone(f,0.14,'triangle',0.15,0,i*0.06)); break;
      case 'laser': this.tone(1600,0.12,'sawtooth',0.07,-1100); break;
      case 'clock': [1200,900,1200,900].forEach((f,i)=>this.tone(f,0.05,'square',0.06,0,i*0.07)); break;
      case 'tick': this.tone(700+Math.random()*300,0.04,'square',0.06); break;
      case 'crack': this.noise(0.2,0.25,3000); this.tone(1200,0.2,'triangle',0.15,600); break;
      case 'revealN': [660,880].forEach((f,i)=>this.tone(f,0.15,'triangle',0.16,0,i*0.08)); break;
      case 'revealR': [523,784,1046].forEach((f,i)=>this.tone(f,0.15,'triangle',0.16,0,i*0.08)); break;
      case 'revealSR': [523,659,784,1046,1318].forEach((f,i)=>this.tone(f,0.16,'triangle',0.17,0,i*0.07)); break;
      case 'revealUR': [523,659,784,1046,784,1046,1318,1568,2093].forEach((f,i)=>{ this.tone(f,0.22,'triangle',0.18,0,i*0.09); this.tone(f/2,0.22,'sine',0.1,0,i*0.09); }); break;
      case 'win': [523,659,784,1046,784,1046,1318].forEach((f,i)=>this.tone(f,0.18,'triangle',0.18,0,i*0.12)); break;
      case 'lose': [392,349,311,262].forEach((f,i)=>this.tone(f,0.3,'triangle',0.16,0,i*0.22)); break;
    }
  }
};

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
    this.pending=this.build(pick,false);
    return this.pending;
  },
  // 보기 만들기: reverse=false → 영어 보고 뜻 고르기, true → 뜻 보고 영어 고르기 (같은 품사 우선)
  build(pick, reverse){
    const f = reverse ? (w=>w.en) : (w=>w.ko);
    const others=this.list.filter(w=>w.en!==pick.en && f(w)!==f(pick));
    const same=shuffle(others.filter(w=>pick.pos && w.pos===pick.pos)).map(f);
    const rest=shuffle(others.filter(w=>!(pick.pos && w.pos===pick.pos))).map(f);
    const ds=[]; for(const k of same.concat(rest)){ if(ds.length>=3) break; if(!ds.includes(k)) ds.push(k); }
    const options=shuffle([f(pick), ...ds]);
    return { word:pick, options, answer:options.indexOf(f(pick)), reverse };
  },
  record(word, ok){
    const s=Save.data.stats; s.total++; ok? s.correct++ : s.wrong++;
    const e = s.words[word.en] || (s.words[word.en]={ko:word.ko,c:0,w:0,last:0});
    e.ko=word.ko;
    if(ok){ e.c++; e.rs=(e.rs||0)+1; if(e.nb && e.rs>=2){ e.nb=false; e.cleared=Date.now(); } }
    else { e.w++; e.last=Date.now(); e.nb=true; e.rs=0; }
    this.pending=null;
  }
};
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* =========================================================
   ART — 직접 디자인한 캐릭터 (캔버스 벡터)
   모든 그리기 함수는 발 위치(0,0)를 기준, 오른쪽을 바라보도록 그림
   ========================================================= */
const Art = {
  path(c, fill, stroke=INK, lw=3){ if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.lineWidth=lw;c.strokeStyle=stroke;c.lineJoin='round';c.lineCap='round';c.stroke();} },
  circ(c,x,y,r,fill,stroke=INK,lw=3){ c.beginPath(); c.arc(x,y,r,0,Math.PI*2); this.path(c,fill,stroke,lw); },
  ell(c,x,y,rx,ry,fill,stroke=INK,lw=3,rot=0){ c.beginPath(); c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,Math.PI*2); this.path(c,fill,stroke,lw); },
  rr(c,x,y,w,h,r,fill,stroke=INK,lw=3){ c.beginPath(); c.roundRect(x,y,w,h,r); this.path(c,fill,stroke,lw); },
  eye(c,x,y,r,blink,color='#2b2140',angry=false){
    if(blink){ c.beginPath(); c.arc(x,y-r*.3,r*.9,0.2*Math.PI,0.8*Math.PI); c.lineWidth=2.6; c.strokeStyle=INK; c.lineCap='round'; c.stroke(); return; }
    this.ell(c,x,y,r*.85,r*1.05,'#fff',INK,2.2);
    // 반짝이는 눈동자: 그라데이션 홍채 + 큰/작은 하이라이트
    const ix=x+r*.2, iy=y+r*.12, g=c.createRadialGradient(ix,iy-r*.3,r*.05,ix,iy,r*.7);
    g.addColorStop(0, color==='#2b2140'?'#6a58b8':color); g.addColorStop(1, color==='#2b2140'?'#1d1531':'#1d1531');
    this.ell(c,ix,iy,r*.6,r*.72,g,null);
    this.circ(c,ix,iy+r*.05,r*.28,'#120c22',null);
    this.circ(c,ix+r*.22,iy-r*.3,r*.24,'#fff',null);
    this.circ(c,ix-r*.22,iy+r*.32,r*.1,'rgba(255,255,255,.85)',null);
    if(angry){ c.beginPath(); c.moveTo(x-r*1.1,y-r*1.4); c.lineTo(x+r*1.1,y-r*.8); c.lineWidth=3; c.strokeStyle=INK; c.stroke(); }
  },
  blink(u,T){ return ((T+u.seed*7)%3.6)<0.12; },
  lunge(u, dist){ return u.atkP>0 ? Math.sin(u.atkP*Math.PI)*dist : 0; },

  /* ---------- 아군 ---------- */
  slime(c,u,T){
    const t=u.animT, walk=u.state==='walk';
    let sq = walk? Math.sin(t*12)*0.12 : Math.sin(T*4+u.seed)*0.04;
    if(u.atkP>0) sq = -Math.sin(u.atkP*Math.PI)*0.22;
    const hop = walk? Math.abs(Math.sin(t*12))*7 : 0;
    c.save(); c.translate(this.lunge(u,16), -hop); c.scale(1-sq*0.6, 1+sq);
    c.beginPath(); c.moveTo(-25,0); c.bezierCurveTo(-28,-32,-12,-44,2,-44); c.bezierCurveTo(16,-44,28,-30,25,0); c.quadraticCurveTo(0,5,-25,0);
    const g=c.createLinearGradient(0,-44,0,0); g.addColorStop(0,'#7ff5d0'); g.addColorStop(1,'#25b98a'); this.path(c,g);
    this.ell(c,-11,-31,4.5,8,'rgba(255,255,255,.75)',null,0,-0.5);
    // 새싹
    c.beginPath(); c.moveTo(2,-44); c.quadraticCurveTo(0,-52,4,-56); this.path(c,null,INK,2.5);
    this.ell(c,10,-56,7,4,'#9be55a',INK,2,-0.4); this.ell(c,-3,-55,5,3,'#9be55a',INK,2,0.5);
    const b=this.blink(u,T);
    this.eye(c,2,-22,5.5,b); this.eye(c,15,-22,5.5,b);
    this.ell(c,-4,-13,4,2.5,'rgba(255,120,160,.55)',null); this.ell(c,21,-13,3.5,2.5,'rgba(255,120,160,.55)',null);
    c.beginPath(); c.arc(9,-14,3.5,0.15*Math.PI,0.85*Math.PI); this.path(c,null,INK,2.2);
    c.restore();
  },
  knight(c,u,T){
    const t=u.animT, walk=u.state==='walk', sw=walk?Math.sin(t*11)*6:0, bob=walk?Math.abs(Math.cos(t*11))*2:0;
    c.save(); c.translate(this.lunge(u,10), -bob);
    // 다리
    this.rr(c,-10+sw,-14,8,14,3,'#4a4a6a'); this.rr(c,3-sw,-14,8,14,3,'#4a4a6a');
    // 방패 (뒤)
    this.ell(c,-15,-28,9,12,'#ffb84d',INK,3); this.circ(c,-15,-28,3.5,'#ff6b6b',INK,2);
    // 몸통
    this.rr(c,-13,-38,26,26,8,'#4c8dff');
    c.beginPath(); c.moveTo(-13,-24); c.lineTo(13,-24); this.path(c,null,'#2d5fc0',3);
    this.circ(c,0,-30,3,'#ffd23f',INK,1.5);
    // 머리
    this.circ(c,1,-50,14,'#ffe0c2');
    // 투구
    c.beginPath(); c.arc(1,-52,15,Math.PI*1.02,Math.PI*1.98); c.closePath(); this.path(c,'#d7dbe8');
    this.rr(c,-14,-55,30,5,2,'#b7bccd',INK,2);
    // 깃털
    c.beginPath(); c.moveTo(1,-66); c.quadraticCurveTo(-10,-80,-20,-70); c.quadraticCurveTo(-10,-72,1,-62); this.path(c,'#ff5d7a',INK,2.5);
    const b=this.blink(u,T); this.eye(c,4,-46,3.8,b); this.eye(c,12,-46,3.8,b);
    this.ell(c,13,-40,2.5,1.6,'rgba(255,120,160,.6)',null);
    // 칼
    let ang = -0.9 + Math.sin(T*3+u.seed)*0.05;
    if(u.atkP>0){ const p=u.atkP; ang = p<0.45 ? -0.9 - p/0.45*1.1 : -2.0 + Math.min(1,(p-0.45)/0.25)*3.0; }
    c.save(); c.translate(13,-28); c.rotate(ang+Math.PI/2);
    this.rr(c,-3,-6,6,12,2,'#8a5a2b',INK,2); this.rr(c,-8,-9,16,5,2,'#ffd23f',INK,2);
    c.beginPath(); c.moveTo(-4,-9); c.lineTo(-4,-36); c.lineTo(0,-42); c.lineTo(4,-36); c.lineTo(4,-9); c.closePath(); this.path(c,'#eef3ff',INK,2.5);
    c.restore();
    this.circ(c,13,-28,5,'#ffe0c2',INK,2.5);
    c.restore();
  },
  archer(c,u,T){
    const t=u.animT, walk=u.state==='walk', sw=walk?Math.sin(t*10)*5:0, bob=walk?Math.abs(Math.cos(t*10))*2:0;
    c.save(); c.translate(0,-bob);
    this.rr(c,-8+sw,-13,7,13,3,'#6b4a2b'); this.rr(c,2-sw,-13,7,13,3,'#6b4a2b');
    // 화살통
    this.rr(c,-17,-42,8,22,3,'#a0642e',INK,2.5);
    c.beginPath(); c.moveTo(-15,-42); c.lineTo(-17,-50); c.moveTo(-11,-42); c.lineTo(-10,-51); this.path(c,null,INK,2);
    // 몸통 (튜닉)
    c.beginPath(); c.moveTo(-12,-12); c.lineTo(-10,-36); c.lineTo(10,-36); c.lineTo(13,-12); c.closePath(); this.path(c,'#3fae5a');
    this.rr(c,-12,-22,25,4,2,'#8a5a2b',INK,1.5);
    // 머리 + 후드
    this.circ(c,1,-47,13,'#ffe0c2');
    c.beginPath(); c.moveTo(-13,-44); c.quadraticCurveTo(-14,-64,4,-66); c.quadraticCurveTo(22,-64,24,-58); c.lineTo(14,-56); c.quadraticCurveTo(0,-60,-6,-50); c.closePath(); this.path(c,'#2f8a48');
    const b=this.blink(u,T); this.eye(c,5,-45,3.6,b); this.eye(c,12,-45,3.6,b);
    // 활
    const pull = u.atkP>0 ? (u.atkP<0.5 ? u.atkP/0.5 : Math.max(0,1-(u.atkP-0.5)*6)) : 0;
    c.save(); c.translate(16,-30);
    c.beginPath(); c.arc(0,0,17,-1.2,1.2); this.path(c,null,'#8a5a2b',4);
    c.beginPath(); c.moveTo(Math.cos(-1.2)*17,Math.sin(-1.2)*17); c.lineTo(-pull*10,0); c.lineTo(Math.cos(1.2)*17,Math.sin(1.2)*17); this.path(c,null,'#fff',1.5);
    if(pull>0.05){ c.beginPath(); c.moveTo(-pull*10,0); c.lineTo(22,0); this.path(c,null,INK,2.5); c.beginPath(); c.moveTo(22,-3); c.lineTo(27,0); c.lineTo(22,3); this.path(c,'#ccc',INK,1.5); }
    c.restore();
    this.circ(c,16-pull*10,-30,4.5,'#ffe0c2',INK,2.2);
    c.restore();
  },
  golem(c,u,T){
    const t=u.animT, walk=u.state==='walk', sway=walk?Math.sin(t*5)*0.04:0, stomp=walk?Math.abs(Math.sin(t*5))*3:0;
    c.save(); c.translate(this.lunge(u,8),-stomp); c.rotate(sway);
    this.rr(c,-24,-18,18,18,5,'#7d8597'); this.rr(c,6,-18,18,18,5,'#7d8597');
    // 몸통
    c.beginPath(); c.moveTo(-34,-18); c.lineTo(-38,-62); c.quadraticCurveTo(-30,-84,0,-86); c.quadraticCurveTo(32,-84,38,-60); c.lineTo(34,-18); c.closePath();
    const g=c.createLinearGradient(0,-86,0,-18); g.addColorStop(0,'#a9b1c2'); g.addColorStop(1,'#727a8c'); this.path(c,g,INK,3.5);
    // 이끼
    c.beginPath(); c.moveTo(-34,-70); c.quadraticCurveTo(-26,-92,0,-88); c.quadraticCurveTo(28,-92,36,-70); c.quadraticCurveTo(26,-74,18,-68); c.quadraticCurveTo(8,-76,-2,-70); c.quadraticCurveTo(-14,-76,-22,-68); c.quadraticCurveTo(-28,-74,-34,-70); this.path(c,'#6ccf5f',INK,2.5);
    this.circ(c,-10,-84,4,'#ff8fb1',INK,1.5); this.circ(c,16,-82,3,'#fff27a',INK,1.5);
    // 금
    c.beginPath(); c.moveTo(-20,-40); c.lineTo(-14,-34); c.lineTo(-18,-26); c.moveTo(20,-48); c.lineTo(14,-42); this.path(c,null,'#4d5466',2);
    // 눈 (빛)
    const glow = 0.6+Math.sin(T*3+u.seed)*0.3;
    c.save(); c.shadowColor='#5ff7ff'; c.shadowBlur=12*glow;
    this.rr(c,2,-62,10,7,3,'#aaffff',INK,2); this.rr(c,18,-62,10,7,3,'#aaffff',INK,2);
    c.restore();
    // 팔
    let a = Math.sin(t*5)*0.15;
    if(u.atkP>0){ const p=u.atkP; a = p<0.4 ? -p/0.4*1.8 : -1.8+Math.min(1,(p-0.4)/0.15)*2.4; }
    c.save(); c.translate(30,-58); c.rotate(a);
    this.rr(c,-8,-4,16,38,7,'#8b93a5',INK,3); this.rr(c,-11,28,22,16,6,'#7d8597',INK,3);
    c.restore();
    c.restore();
  },
  dragon(c,u,T){
    const t=T+u.seed, fy = u.portrait? 0 : -46 + Math.sin(t*3)*6;
    c.save(); c.translate(this.lunge(u,6), fy);
    // 꼬리
    c.beginPath(); c.moveTo(-18,-28); c.quadraticCurveTo(-44,-24,-50,-40); c.quadraticCurveTo(-40,-30,-18,-36); this.path(c,'#9b6bff');
    c.beginPath(); c.moveTo(-50,-40); c.lineTo(-58,-46); c.lineTo(-52,-34); c.closePath(); this.path(c,'#ff9fd0',INK,2);
    // 뒷날개
    const f=Math.sin(t*12);
    c.save(); c.translate(-4,-46); c.rotate(-0.4+f*0.5);
    c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-10,-40,-34,-44); c.quadraticCurveTo(-26,-30,-30,-20); c.quadraticCurveTo(-16,-18,0,0); this.path(c,'#c9a6ff',INK,2.5);
    c.restore();
    // 몸
    this.ell(c,0,-34,24,17,'#8e5cff');
    this.ell(c,4,-28,15,10,'#ffd6f0',INK,2);
    // 다리
    this.rr(c,-12,-22,8,12,3,'#7a4ae0',INK,2); this.rr(c,6,-22,8,12,3,'#7a4ae0',INK,2);
    // 머리
    const open = u.atkP>0 ? Math.sin(u.atkP*Math.PI) : 0;
    c.save(); c.translate(22,-50);
    this.ell(c,0,0,15,13,'#9b6bff');
    this.ell(c,13,4+open*2,10,6+open*3,'#9b6bff',INK,2.5);
    if(open>0.2){ c.save(); c.shadowColor='#ff9a3c'; c.shadowBlur=14; this.ell(c,19,6,4,2+open*3,'#ffb347',null); c.restore(); }
    this.circ(c,18,1,1.4,INK,null);
    c.beginPath(); c.moveTo(-8,-10); c.lineTo(-14,-22); c.lineTo(-3,-12); this.path(c,'#fff5c2',INK,2);
    c.beginPath(); c.moveTo(1,-12); c.lineTo(0,-24); c.lineTo(7,-12); this.path(c,'#fff5c2',INK,2);
    this.eye(c,4,-3,4.5,this.blink(u,T));
    c.restore();
    // 앞날개
    c.save(); c.translate(0,-44); c.rotate(-0.2-f*0.6);
    c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-6,-44,-30,-50); c.quadraticCurveTo(-22,-34,-26,-22); c.quadraticCurveTo(-12,-20,0,0); this.path(c,'#b388ff',INK,2.5);
    c.restore();
    c.restore();
  },

  /* ---------- 뽑기 캐릭터 ---------- */
  bee(c,u,T){
    const walk=u.state==='walk', bob=Math.sin(T*10+u.seed*5)*3, thrust=u.atkP>0?Math.sin(u.atkP*Math.PI)*20:0;
    const sw=walk?Math.sin(u.animT*16)*5:0;
    c.beginPath(); c.moveTo(-6,-14); c.lineTo(-8+sw,0); c.moveTo(4,-14); c.lineTo(4-sw,0); this.path(c,null,INK,3);
    c.save(); c.translate(0,-4+bob);
    const f=Math.sin(T*42+u.seed*9);
    c.save(); c.translate(-4,-36); c.rotate(-0.6+f*0.45); this.ell(c,0,-12,8,15,'rgba(215,245,255,.85)',INK,2); c.restore();
    c.save(); c.translate(3,-36); c.rotate(0.1+f*0.45); this.ell(c,0,-11,7,13,'rgba(215,245,255,.85)',INK,2); c.restore();
    c.beginPath(); c.moveTo(-16,-22); c.lineTo(-27,-19); c.lineTo(-16,-15); this.path(c,INK,INK,2);
    this.ell(c,0,-22,17,15,'#ffd23f',null);
    c.save(); c.beginPath(); c.ellipse(0,-22,17,15,0,0,7); c.clip(); c.fillStyle=INK; c.fillRect(-11,-40,6,40); c.fillRect(1,-40,6,40); c.restore();
    this.ell(c,0,-22,17,15,null,INK,3);
    this.circ(c,14,-38,11,'#ffe48a');
    c.beginPath(); c.moveTo(11,-47); c.quadraticCurveTo(8,-56,4,-58); c.moveTo(17,-48); c.quadraticCurveTo(20,-57,25,-58); this.path(c,null,INK,2);
    this.circ(c,4,-58,2.5,INK,null); this.circ(c,25,-58,2.5,INK,null);
    this.eye(c,17,-39,3.6,this.blink(u,T));
    this.ell(c,20,-32,2.5,1.6,'rgba(255,120,160,.6)',null);
    c.save(); c.translate(10+thrust,-22);
    c.beginPath(); c.moveTo(-14,0); c.lineTo(30,0); this.path(c,null,'#8a5a2b',4);
    c.beginPath(); c.moveTo(30,-5); c.lineTo(43,0); c.lineTo(30,5); c.closePath(); this.path(c,'#e6ecfa',INK,2);
    c.restore();
    this.circ(c,12+thrust,-22,4,'#ffe48a',INK,2);
    c.restore();
  },
  mushroom(c,u,T){
    const walk=u.state==='walk', sw=walk?Math.sin(u.animT*9)*4:0, bob=walk?Math.abs(Math.cos(u.animT*9))*2:0;
    c.save(); c.translate(this.lunge(u,12),-bob);
    this.rr(c,-13+sw,-11,11,11,4,'#e9d2ad'); this.rr(c,3-sw,-11,11,11,4,'#e9d2ad');
    this.rr(c,-15,-38,30,30,11,'#fff3dc');
    const b=this.blink(u,T); this.eye(c,1,-26,3.6,b); this.eye(c,10,-26,3.6,b);
    this.ell(c,-3,-19,3,2,'rgba(255,120,160,.55)',null);
    c.beginPath(); c.arc(6,-19,3,0.15*Math.PI,0.85*Math.PI); this.path(c,null,INK,2);
    c.beginPath(); c.moveTo(-32,-34); c.quadraticCurveTo(-30,-70,2,-72); c.quadraticCurveTo(34,-70,33,-34); c.quadraticCurveTo(0,-27,-32,-34); this.path(c,'#ff5d5d',INK,3);
    this.circ(c,-15,-50,5.5,'#fff',null); this.circ(c,5,-61,6.5,'#fff',null); this.circ(c,20,-47,4.5,'#fff',null); this.circ(c,-2,-43,3,'#fff',null);
    this.ell(c,20,-22,10,15,'#c9945a',INK,3);
    this.ell(c,20,-22,5,9,'#8fd16b',INK,2);
    c.restore();
  },
  snowmage(c,u,T){
    const walk=u.state==='walk', sw=walk?Math.sin(u.animT*9)*4:0, bob=walk?Math.abs(Math.cos(u.animT*9))*2:0;
    c.save(); c.translate(0,-bob);
    this.rr(c,-9+sw,-8,8,8,3,'#3d4f8a'); this.rr(c,3-sw,-8,8,8,3,'#3d4f8a');
    c.beginPath(); c.moveTo(-17,-4); c.lineTo(-10,-38); c.lineTo(12,-38); c.lineTo(19,-4); c.quadraticCurveTo(1,2,-17,-4); this.path(c,'#6fc3ff');
    c.beginPath(); c.moveTo(-16,-9); c.quadraticCurveTo(1,-3,18,-9); this.path(c,null,'#fff',4);
    this.circ(c,1,-48,12,'#ffe0c2');
    this.ell(c,1,-53,20,5,'#3d6fd6');
    c.beginPath(); c.moveTo(-15,-53); c.quadraticCurveTo(-4,-70,2,-90); c.quadraticCurveTo(10,-70,17,-53); c.closePath(); this.path(c,'#3d6fd6');
    c.fillStyle='#fff'; Render.star(c,2,-68,5);
    const b=this.blink(u,T); this.eye(c,5,-46,3.4,b,'#2d6fd6'); this.eye(c,12,-46,3.4,b,'#2d6fd6');
    this.ell(c,13,-40,2.4,1.5,'rgba(255,120,160,.6)',null);
    const p=u.atkP>0?Math.sin(u.atkP*Math.PI):0;
    c.save(); c.translate(17,-26); c.rotate(-p*0.9);
    c.beginPath(); c.moveTo(0,22); c.lineTo(0,-30); this.path(c,null,'#8a5a2b',4);
    c.save(); c.shadowColor='#7fe0ff'; c.shadowBlur=10+p*20+Math.sin(T*5)*4;
    c.beginPath(); c.moveTo(0,-48); c.lineTo(7,-38); c.lineTo(0,-28); c.lineTo(-7,-38); c.closePath(); this.path(c,'#bff4ff',INK,2);
    c.restore(); c.restore();
    this.circ(c,17,-26,4.5,'#ffe0c2',INK,2.2);
    c.restore();
  },
  penguin(c,u,T){
    const walk=u.state==='walk', rot=walk?Math.sin(u.animT*9)*0.12:0;
    const rc=u.atkP>0&&u.atkP>0.45?-Math.sin(Math.min(1,(u.atkP-0.45)/0.55)*Math.PI)*7:0;
    c.save(); c.translate(-8+rc,0); c.rotate(rot);
    this.ell(c,-6,-2,7,3.5,'#ff9f43',INK,2); this.ell(c,7,-2,7,3.5,'#ff9f43',INK,2);
    this.ell(c,0,-26,17,23,'#2b3550');
    this.ell(c,4,-21,11,17,'#fff',null);
    c.beginPath(); c.arc(0,-30,17.5,Math.PI*1.08,Math.PI*1.92); c.closePath(); this.path(c,'#ff5d5d',INK,2.5);
    this.circ(c,-4,-44,2,'#fff',null); this.circ(c,6,-46,2,'#fff',null);
    c.beginPath(); c.moveTo(-15,-38); c.lineTo(-27,-44+Math.sin(T*6)*3); c.lineTo(-22,-33); c.closePath(); this.path(c,'#ff5d5d',INK,2);
    const b=this.blink(u,T); this.eye(c,6,-33,3.4,b); this.eye(c,13,-33,3.4,b);
    c.beginPath(); c.moveTo(13,-28); c.lineTo(25,-25); c.lineTo(13,-22); c.closePath(); this.path(c,'#ff9f43',INK,2);
    this.ell(c,-13,-20,4,11,'#2b3550',INK,2.5,0.3);
    c.restore();
    c.save(); c.translate(16+rc*1.4,-14);
    c.save(); c.rotate(-0.28);
    this.rr(c,-6,-9,36,18,7,'#4a4f63'); this.rr(c,27,-11,7,22,2,'#6b7186',INK,2.5);
    this.circ(c,31,0,4,INK,null);
    c.restore();
    this.circ(c,0,6,9,'#a0642e'); c.beginPath(); c.moveTo(-9,6); c.lineTo(9,6); c.moveTo(0,-3); c.lineTo(0,15); this.path(c,null,INK,2);
    c.restore();
    if(u.atkP>0.45 && u.atkP<0.95){ const q=(u.atkP-0.45)/0.5; c.globalAlpha=1-q; this.circ(c,52+q*10,-26-q*12,6+q*10,'#e8e8f0',null); this.circ(c,44+q*6,-20-q*8,4+q*7,'#ffffff',null); c.globalAlpha=1; }
  },
  fox(c,u,T){
    const walk=u.state==='walk', t=u.animT, sw=walk?Math.sin(t*18)*7:0;
    c.save(); c.translate(this.lunge(u,22),0); if(walk) c.rotate(0.12);
    if(walk && Math.sin(T*30+u.seed*10)>0.3){ c.beginPath(); c.moveTo(-26,-40); c.lineTo(-34,-34); c.lineTo(-30,-32); c.lineTo(-40,-24); this.path(c,null,'#ffe14d',3); }
    for(const [a,o] of [[-0.7,0],[-0.3,4]]){
      c.save(); c.translate(-12,-28+o); c.rotate(a+Math.sin(T*5+o)*0.15);
      this.ell(c,-14,0,15,7,'#ff9f43',INK,2.5); this.ell(c,-26,0,5,5,'#fff',null);
      c.restore();
    }
    this.rr(c,-9+sw,-13,7,13,3,'#2b2140',INK,2); this.rr(c,3-sw,-13,7,13,3,'#2b2140',INK,2);
    const wv=Math.sin(T*8)*3;
    c.beginPath(); c.moveTo(-6,-38); c.quadraticCurveTo(-26,-42+wv,-40,-36+wv); c.lineTo(-37,-31+wv); c.quadraticCurveTo(-22,-34,-6,-33); this.path(c,'#ff3b6b',INK,2);
    this.rr(c,-12,-38,24,27,8,'#3a2d63');
    this.rr(c,-12,-25,24,4,2,'#ffd23f',INK,1.5);
    c.beginPath(); c.moveTo(-9,-56); c.lineTo(-11,-74); c.lineTo(1,-61); this.path(c,'#ff9f43',INK,2.5);
    c.beginPath(); c.moveTo(4,-61); c.lineTo(10,-76); c.lineTo(13,-58); this.path(c,'#ff9f43',INK,2.5);
    this.ell(c,2,-50,14,12,'#ff9f43');
    this.ell(c,11,-46,9,6,'#fff',INK,2);
    this.circ(c,19,-47,2.3,INK,null);
    this.rr(c,-11,-56,26,6,3,'#3a2d63',INK,1.5);
    this.eye(c,6,-52,3.3,this.blink(u,T),'#2b2140',true);
    let ang=-0.4; if(u.atkP>0){ const p=u.atkP; ang = p<0.35 ? -0.4-p/0.35*1.4 : -1.8+Math.min(1,(p-0.35)/0.18)*3.2; }
    c.save(); c.translate(12,-28); c.rotate(ang+Math.PI/2);
    this.rr(c,-2.5,-4,5,10,2,'#2b2140',INK,1.5); this.rr(c,-6,-6,12,3,1,'#ffd23f',INK,1.5);
    c.save(); c.shadowColor='#bff4ff'; c.shadowBlur=u.atkP>0?16:6;
    c.beginPath(); c.moveTo(-2.5,-6); c.lineTo(-2.5,-38); c.lineTo(2.5,-44); c.lineTo(2.5,-6); c.closePath(); this.path(c,'#eaf8ff',INK,2);
    c.restore(); c.restore();
    this.circ(c,12,-28,4.5,'#ff9f43',INK,2);
    c.restore();
  },
  phoenix(c,u,T){
    const t=T+u.seed, fy=u.portrait?0:-62+Math.sin(t*2.5)*8;
    c.save(); c.translate(this.lunge(u,6),fy);
    const cols=['#ff5d3c','#ff8a3c','#ffb347','#ffd23f'];
    for(let i=4;i>=0;i--){ c.globalAlpha=0.9-i*0.12; this.ell(c,-30-i*10,-28+i*4+Math.sin(T*10+i)*3,15-i*2,6,cols[i%4],null,0,0.25); }
    c.globalAlpha=1;
    const f=Math.sin(t*6), glow=u.atkP>0?Math.sin(u.atkP*Math.PI):0;
    const wing=(rot)=>{ c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-18,-58,-62,-64); c.lineTo(-48,-50); c.lineTo(-56,-42); c.lineTo(-40,-34); c.lineTo(-44,-24); c.quadraticCurveTo(-20,-16,0,0);
      const g=c.createLinearGradient(0,0,-60,-60); g.addColorStop(0,'#ff5d3c'); g.addColorStop(0.6,'#ffb347'); g.addColorStop(1,'#fff3b0'); this.path(c,g,INK,2.5); };
    c.save(); c.translate(-4,-44); c.rotate(-0.35+f*0.5); wing(); c.restore();
    c.save(); c.shadowColor='#ffb347'; c.shadowBlur=22+glow*20;
    const gb=c.createLinearGradient(0,-50,0,-18); gb.addColorStop(0,'#ffb347'); gb.addColorStop(1,'#ff5d3c');
    this.ell(c,0,-34,23,16,gb);
    c.restore();
    this.ell(c,5,-29,13,9,'#fff3b0',null);
    c.beginPath(); c.moveTo(-6,-20); c.lineTo(-8,-8); c.moveTo(4,-20); c.lineTo(4,-8); this.path(c,null,INK,2.5);
    for(let i=0;i<3;i++){ c.save(); c.translate(18+i*5,-60); c.rotate(-0.5+i*0.35+Math.sin(T*8+i)*0.1); this.ell(c,0,-8,4,10,i===1?'#ffd23f':'#ff8a3c',INK,2); c.restore(); }
    this.circ(c,23,-50,13,'#ffb347');
    c.beginPath(); c.moveTo(33,-54); c.lineTo(46,-49); c.lineTo(33,-44); c.closePath(); this.path(c,'#ffd23f',INK,2);
    this.eye(c,27,-53,4,this.blink(u,T),'#c2410c');
    c.save(); c.translate(0,-42); c.rotate(-0.15-f*0.6); wing(); c.restore();
    if(glow>0.1){ c.globalAlpha=glow*0.6; this.circ(c,40,-48,10+glow*12,'#fff3b0',null); c.globalAlpha=1; }
    c.restore();
  },

  /* ---------- 신규 아군 ---------- */
  squirrel(c,u,T){
    const walk=u.state==='walk', hop=walk?Math.abs(Math.sin(u.animT*12))*6:0;
    const thr=u.atkP>0?Math.sin(u.atkP*Math.PI):0;
    c.save(); c.translate(0,-hop);
    c.save(); c.translate(-14,-20); c.rotate(-0.2+Math.sin(T*3+u.seed)*0.08);
    c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-30,-10,-26,-44); c.quadraticCurveTo(-18,-62,0,-54); c.quadraticCurveTo(-12,-40,-6,-20); c.closePath(); this.path(c,'#c47a3c');
    c.beginPath(); c.moveTo(-20,-40); c.quadraticCurveTo(-14,-52,-4,-50); this.path(c,null,'#f0c08a',3);
    c.restore();
    this.rr(c,-8,-8,7,8,3,'#8a4f22',INK,2); this.rr(c,4,-8,7,8,3,'#8a4f22',INK,2);
    this.ell(c,0,-22,14,16,'#d98a48');
    this.ell(c,4,-18,8,10,'#fbe3c4',null);
    this.circ(c,6,-42,12,'#d98a48');
    c.beginPath(); c.moveTo(-2,-50); c.lineTo(-4,-62); c.lineTo(4,-53); this.path(c,'#d98a48',INK,2);
    this.ell(c,13,-38,6,4.5,'#fbe3c4',INK,2); this.circ(c,18,-39,2,INK,null);
    this.eye(c,9,-45,3.6,this.blink(u,T));
    c.save(); c.translate(12,-26); c.rotate(-thr*2.2);
    this.circ(c,0,0,4,'#d98a48',INK,2);
    if(thr<0.6){ this.ell(c,4,-2,5,6,'#a0642e',INK,2); this.ell(c,4,-7,6,3,'#5e3b1a',INK,1.5); }
    c.restore();
    c.restore();
  },
  duck(c,u,T){
    const walk=u.state==='walk', rot=walk?Math.sin(u.animT*10)*0.1:0;
    c.save(); c.translate(this.lunge(u,8),0); c.rotate(rot);
    this.ell(c,-6,-2,7,3,'#ff9f43',INK,2); this.ell(c,6,-2,7,3,'#ff9f43',INK,2);
    c.beginPath(); c.moveTo(-24,-18); c.quadraticCurveTo(-30,-34,-18,-30); c.quadraticCurveTo(-4,-40,14,-30); c.quadraticCurveTo(22,-10,6,-4); c.lineTo(-14,-4); c.quadraticCurveTo(-24,-6,-24,-18); this.path(c,'#ffe14d');
    this.circ(c,8,-44,13,'#ffe14d');
    c.beginPath(); c.moveTo(18,-44); c.quadraticCurveTo(30,-44,30,-39); c.quadraticCurveTo(26,-36,18,-38); c.closePath(); this.path(c,'#ff9f43',INK,2);
    this.eye(c,12,-48,3.4,this.blink(u,T));
    this.ell(c,-6,-20,8,5,'#ffd23f',INK,2,-0.3);
    this.ell(c,20,-18,10,13,'#c0c6d6',INK,3); this.circ(c,20,-18,3,'#8d93a8',INK,1.5);
    c.restore();
  },
  frog(c,u,T){
    const walk=u.state==='walk', hop=walk?Math.abs(Math.sin(u.animT*9))*8:0, tongue=u.atkP>0?Math.sin(u.atkP*Math.PI):0;
    c.save(); c.translate(0,-hop);
    this.ell(c,-12,-4,10,5,'#3fae5a',INK,2.5); this.ell(c,10,-4,10,5,'#3fae5a',INK,2.5);
    this.ell(c,0,-20,20,16,'#5ed38a');
    this.ell(c,4,-16,12,9,'#d9f7c6',null);
    c.beginPath(); c.moveTo(4,-26); c.quadraticCurveTo(14,-20,22,-26); this.path(c,null,INK,2.5);
    if(tongue>0.05){ c.beginPath(); c.moveTo(18,-24); c.lineTo(18+tongue*50,-26); this.path(c,null,'#ff5d7a',5); this.circ(c,18+tongue*50,-26,5,'#ff5d7a',INK,2); }
    this.circ(c,-2,-36,8,'#5ed38a'); this.circ(c,14,-36,8,'#5ed38a');
    const b=this.blink(u,T); this.eye(c,-1,-37,4.5,b); this.eye(c,15,-37,4.5,b);
    c.beginPath(); c.moveTo(-12,-40); c.lineTo(24,-40); c.lineTo(18,-50); c.lineTo(-6,-50); c.closePath(); this.path(c,'#8a5a2b',INK,2.5);
    this.rr(c,-16,-42,44,4,2,'#6b4a2b',INK,2);
    c.beginPath(); c.moveTo(-4,-50); c.quadraticCurveTo(-10,-62,-18,-58); this.path(c,null,'#ff5d5d',3);
    c.restore();
  },
  sheep(c,u,T){
    const walk=u.state==='walk', sw=walk?Math.sin(u.animT*9)*4:0, glow=u.atkP>0?Math.sin(u.atkP*Math.PI):0;
    c.save();
    this.rr(c,-10+sw,-12,6,12,3,'#2b2140',INK,1.5); this.rr(c,5-sw,-12,6,12,3,'#2b2140',INK,1.5);
    for(const [x,y,r] of [[-12,-22,10],[0,-28,12],[12,-22,10],[-6,-14,9],[8,-14,9],[0,-20,11]]) this.circ(c,x,y,r,'#fbf7ee',INK,2.5);
    this.ell(c,14,-40,9,11,'#3a2d40');
    this.ell(c,6,-46,5,3,'#3a2d40',INK,2,-0.6);
    for(const [x,y] of [[8,-50],[14,-53],[20,-50]]) this.circ(c,x,y,5,'#fbf7ee',INK,2);
    this.eye(c,17,-41,3,this.blink(u,T));
    c.save(); c.globalAlpha=0.8; this.ell(c,14,-60,10,3,null,'#ffd23f',2.5); c.restore();
    c.save(); c.translate(-14,-24); c.rotate(-0.2-glow*0.6);
    c.beginPath(); c.moveTo(0,16); c.lineTo(0,-30); this.path(c,null,'#a0642e',3.5);
    c.save(); c.shadowColor='#fff6b0'; c.shadowBlur=8+glow*20; this.circ(c,0,-34,6,'#fff6b0',INK,2); c.restore();
    c.restore();
    c.restore();
  },
  robot(c,u,T){
    const walk=u.state==='walk', sw=walk?Math.sin(u.animT*8)*4:0, bob=walk?Math.abs(Math.cos(u.animT*8))*2:0;
    const punch=u.atkP>0?Math.sin(u.atkP*Math.PI):0;
    c.save(); c.translate(0,-bob);
    this.rr(c,-14+sw,-14,10,14,3,'#6b7186'); this.rr(c,4-sw,-14,10,14,3,'#6b7186');
    this.rr(c,-20,-46,40,34,8,'#a9b1c2');
    this.rr(c,-10,-38,20,14,4,'#2b3550',INK,2);
    c.fillStyle=Math.sin(T*6)>0?'#5ed38a':'#ffd23f'; c.fillRect(-6,-34,4,4); c.fillRect(2,-34,4,4);
    this.rr(c,-14,-68,30,22,8,'#c8cddc');
    this.rr(c,-6,-62,20,9,4,'#2b3550',INK,2);
    c.save(); c.shadowColor='#7fe0ff'; c.shadowBlur=8; this.circ(c,0,-58,2.6,'#7fe0ff',null); this.circ(c,8,-58,2.6,'#7fe0ff',null); c.restore();
    c.beginPath(); c.moveTo(0,-68); c.lineTo(0,-78); this.path(c,null,INK,2); this.circ(c,0,-80,3.5,'#ff5d5d',INK,2);
    this.rr(c,-26,-42,8,20,4,'#8d93a8',INK,2);
    c.save(); c.translate(18+punch*16,-32);
    this.rr(c,-4,-5,14,10,3,'#8d93a8',INK,2);
    c.beginPath(); c.arc(16,0,9,-Math.PI/2,Math.PI/2); c.lineTo(16,5); c.arc(16,0,4,Math.PI/2,-Math.PI/2,true); c.closePath(); this.path(c,'#ff5d5d',INK,2.5);
    c.fillStyle='#e6ecfa'; c.fillRect(12,-9,5,4); c.fillRect(12,5,5,4);
    c.restore();
    c.restore();
  },
  astronaut(c,u,T){
    const walk=u.state==='walk', sw=walk?Math.sin(u.animT*10)*4:0, bob=walk?Math.abs(Math.cos(u.animT*10))*2:0, sh=u.atkP>0?Math.sin(u.atkP*Math.PI):0;
    c.save(); c.translate(0,-bob);
    this.rr(c,-11+sw,-12,9,12,4,'#e6ecfa'); this.rr(c,3-sw,-12,9,12,4,'#e6ecfa');
    this.rr(c,-22,-42,10,24,4,'#c0c6d6',INK,2.5);
    this.rr(c,-14,-40,28,30,10,'#f5f7ff');
    this.rr(c,-6,-32,12,8,2,'#4c8dff',INK,1.5);
    this.circ(c,2,-56,17,'rgba(190,230,255,.35)',INK,3);
    this.ell(c,2,-54,11,10,'#ffb36b',null);
    this.ell(c,6,-50,6,4,'#fff3dc',null);
    this.circ(c,-6,-62,3.5,'#ffb36b',INK,1.5); this.circ(c,10,-62,3.5,'#ffb36b',INK,1.5);
    const b=this.blink(u,T); this.eye(c,1,-55,2.8,b); this.eye(c,8,-55,2.8,b);
    this.ell(c,-4,-62,4,6,'rgba(255,255,255,.6)',null,0,0.5);
    c.save(); c.translate(14,-26);
    this.rr(c,0,-5,18,10,3,'#8e6cff',INK,2); this.rr(c,16,-3,8,6,2,'#ffd23f',INK,1.5);
    if(sh>0.3){ c.save(); c.shadowColor='#ff7af5'; c.shadowBlur=12; this.circ(c,28,0,4+sh*4,'#ff7af5',null); c.restore(); }
    c.restore();
    this.circ(c,14,-26,4.5,'#f5f7ff',INK,2);
    c.restore();
  },
  owl(c,u,T){
    const t=T+u.seed, fy=u.portrait?0:-58+Math.sin(t*3)*6, f=Math.sin(t*10);
    c.save(); c.translate(0,fy);
    c.save(); c.translate(-6,-34); c.rotate(-0.3+f*0.5);
    c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-30,-26,-40,-10); c.lineTo(-30,-6); c.lineTo(-34,2); c.quadraticCurveTo(-14,4,0,0); this.path(c,'#8a5a2b',INK,2.5);
    c.restore();
    this.ell(c,0,-30,18,20,'#a0703c');
    this.ell(c,3,-26,11,13,'#f0dcb8',null);
    for(let i=0;i<3;i++){ c.beginPath(); c.arc(-1+i*4,-24+i*3,3,0.2,Math.PI-0.2); this.path(c,null,'#c49a6c',1.5); }
    c.beginPath(); c.moveTo(-14,-46); c.lineTo(-12,-58); c.lineTo(-4,-48); c.moveTo(6,-48); c.lineTo(14,-58); c.lineTo(16,-46); this.path(c,'#a0703c',INK,2);
    this.circ(c,-3,-42,7,'#fff6d6',INK,2); this.circ(c,11,-42,7,'#fff6d6',INK,2);
    const b=this.blink(u,T); if(b){ c.beginPath(); c.moveTo(-7,-42); c.lineTo(1,-42); c.moveTo(7,-42); c.lineTo(15,-42); this.path(c,null,INK,2); } else { this.circ(c,-2,-42,3.4,INK,null); this.circ(c,12,-42,3.4,INK,null); this.circ(c,-1,-43,1.2,'#fff',null); this.circ(c,13,-43,1.2,'#fff',null); }
    this.circ(c,11,-42,9,null,'#ffd23f',2);
    c.beginPath(); c.moveTo(3,-38); c.lineTo(7,-30); c.lineTo(9,-38); this.path(c,'#ffb347',INK,1.5);
    c.beginPath(); c.moveTo(-4,-10); c.lineTo(-6,-4); c.moveTo(4,-10); c.lineTo(6,-4); this.path(c,null,'#ff9f43',2.5);
    const g=u.atkP>0?Math.sin(u.atkP*Math.PI):0;
    c.save(); c.translate(10,-6); c.shadowColor='#fff6b0'; c.shadowBlur=10+g*15;
    c.beginPath(); c.moveTo(0,0); c.lineTo(0,6); this.path(c,null,INK,2); this.rr(c,-5,6,10,12,3,'#ffe48a',INK,2);
    c.restore();
    c.save(); c.translate(-2,-34); c.rotate(-0.1-f*0.6);
    c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-26,-30,-38,-16); c.lineTo(-28,-10); c.lineTo(-30,-2); c.quadraticCurveTo(-12,2,0,0); this.path(c,'#b07a44',INK,2.5);
    c.restore();
    c.restore();
  },
  turtle(c,u,T){
    const walk=u.state==='walk', sw=walk?Math.sin(u.animT*4)*5:0, cast=u.atkP>0?Math.sin(u.atkP*Math.PI):0;
    c.save(); c.translate(0,0);
    for(const x of [-26,-8,10,26]) this.rr(c,x-7+(x%2?sw:-sw)*0.5,-16,14,16,6,'#7ccf6a',INK,2.5);
    this.circ(c,40,-42,14,'#7ccf6a');
    this.eye(c,46,-45,4,this.blink(u,T));
    c.beginPath(); c.arc(46,-36,4,0.2*Math.PI,0.8*Math.PI); this.path(c,null,INK,2);
    c.beginPath(); c.moveTo(-40,-14); c.quadraticCurveTo(-42,-70,0,-72); c.quadraticCurveTo(42,-70,40,-14); c.closePath();
    const g=c.createLinearGradient(0,-72,0,-14); g.addColorStop(0,'#3fae5a'); g.addColorStop(1,'#2a7a40'); this.path(c,g,INK,3.5);
    this.circ(c,0,-42,20,'#fff8ec',INK,3);
    for(let i=0;i<12;i++){ const a=i*Math.PI/6; c.beginPath(); c.moveTo(Math.cos(a)*15,-42+Math.sin(a)*15); c.lineTo(Math.cos(a)*18,-42+Math.sin(a)*18); this.path(c,null,INK,1.5); }
    const ha=T*2, ma=T*0.3;
    c.beginPath(); c.moveTo(0,-42); c.lineTo(Math.cos(ha)*9,-42+Math.sin(ha)*9); this.path(c,null,INK,2.5);
    c.beginPath(); c.moveTo(0,-42); c.lineTo(Math.cos(ma)*14,-42+Math.sin(ma)*14); this.path(c,null,'#e0344f',2);
    this.circ(c,0,-42,2.5,INK,null);
    c.beginPath(); c.moveTo(26,-52); c.lineTo(52,-52); c.lineTo(42,-82); c.closePath(); this.path(c,'#5b43c9',INK,2.5);
    c.fillStyle='#ffd23f'; Render.star(c,42,-64,4);
    c.save(); c.translate(52,-26); c.rotate(-0.3-cast*0.5);
    c.beginPath(); c.moveTo(0,20); c.lineTo(0,-30); this.path(c,null,'#8a5a2b',4);
    c.save(); c.shadowColor='#bff4ff'; c.shadowBlur=10+cast*20; this.circ(c,0,-36,7,'#bff4ff',INK,2); c.restore();
    c.restore();
    c.restore();
  },

  /* ---------- 신규 적 ---------- */
  ghost(c,u,T){
    const t=T*1.2+u.seed, fy=u.portrait?-10:-52+Math.sin(t*3)*7;
    c.save(); c.translate(this.lunge(u,14),fy); c.globalAlpha*=0.92;
    c.beginPath(); c.moveTo(-18,-6); c.lineTo(-18,-30); c.arc(0,-30,18,Math.PI,0); c.lineTo(18,-6);
    for(let i=0;i<4;i++){ const x=18-i*9; c.quadraticCurveTo(x-4.5,-6+(i%2?6:-6)+Math.sin(T*8+i)*2,x-9,-6); }
    c.closePath(); this.path(c,'#f4f2ff');
    this.ell(c,-6,-36,3.5,5,'#2b2140',null); this.ell(c,6,-36,3.5,5,'#2b2140',null);
    this.ell(c,1,-24,5,6,'#2b2140',null); this.ell(c,2,-21,3,2.5,'#ff7aa8',null);
    this.ell(c,-12,-28,3,2,'rgba(255,120,160,.5)',null);
    c.restore();
  },
  zombie(c,u,T){
    const walk=u.state==='walk', t=u.animT, sw=walk?Math.sin(t*5)*5:0, lean=walk?Math.sin(t*5)*0.06:0;
    c.save(); c.translate(this.lunge(u,10),0); c.rotate(lean);
    this.rr(c,-9+sw,-16,8,16,3,'#4a5a8a',INK,2.5); this.rr(c,2-sw,-16,8,16,3,'#4a5a8a',INK,2.5);
    c.beginPath(); c.moveTo(-12,-14); c.lineTo(-10,-40); c.lineTo(12,-40); c.lineTo(13,-14); c.lineTo(6,-18); c.lineTo(0,-13); c.lineTo(-6,-18); c.closePath(); this.path(c,'#8a6b9a');
    this.circ(c,2,-52,13,'#9be08a');
    c.beginPath(); c.moveTo(-8,-58); c.lineTo(-2,-56); c.moveTo(-6,-60); c.lineTo(-6,-54); this.path(c,null,INK,1.5);
    this.circ(c,3,-54,3.6,'#fff',INK,1.5); this.circ(c,11,-53,2.4,'#fff',INK,1.5); this.circ(c,4,-54,1.4,INK,null);
    c.beginPath(); c.moveTo(4,-44); c.lineTo(8,-46); c.lineTo(12,-44); this.path(c,null,INK,2);
    const reach=u.atkP>0?Math.sin(u.atkP*Math.PI)*10:0;
    this.rr(c,8,-36,22+reach,7,3,'#9be08a',INK,2); this.rr(c,4,-30,20+reach,7,3,'#8fd07e',INK,2);
    c.restore();
  },
  boar(c,u,T){
    const walk=u.state==='walk', run=walk?Math.sin(u.animT*14):0;
    c.save(); c.translate(this.lunge(u,22),-(walk?Math.abs(run)*3:0));
    for(const [x,s] of [[-20,1],[-10,-1],[8,1],[18,-1]]) this.rr(c,x+run*5*s,-14,7,14,3,'#5e3b1a',INK,2.5);
    this.ell(c,-2,-28,30,17,'#8a5a3a');
    c.beginPath(); c.moveTo(-26,-40); for(let i=0;i<6;i++) c.lineTo(-20+i*7,-46-(i%2?0:6)); c.lineTo(14,-40); this.path(c,'#3a2416',INK,2);
    this.ell(c,24,-26,13,12,'#8a5a3a');
    this.ell(c,34,-22,7,6,'#e0a080',INK,2); this.circ(c,32,-22,1.5,INK,null); this.circ(c,36,-22,1.5,INK,null);
    c.beginPath(); c.moveTo(28,-16); c.quadraticCurveTo(34,-14,34,-24); this.path(c,'#fff8ec',INK,2);
    c.beginPath(); c.moveTo(18,-38); c.lineTo(16,-46); c.lineTo(24,-38); this.path(c,'#8a5a3a',INK,2);
    this.eye(c,26,-31,3,this.blink(u,T),'#c0392b',true);
    c.beginPath(); c.moveTo(-32,-30); c.quadraticCurveTo(-38,-36,-36,-24); this.path(c,null,INK,2);
    c.restore();
  },
  metalslime(c,u,T){
    const walk=u.state==='walk'; let sq=walk?Math.sin(u.animT*10)*0.1:Math.sin(T*4+u.seed)*0.03;
    if(u.atkP>0) sq=-Math.sin(u.atkP*Math.PI)*0.2;
    c.save(); c.translate(this.lunge(u,12),-(walk?Math.abs(Math.sin(u.animT*10))*5:0)); c.scale(1-sq*.6,1+sq);
    c.beginPath(); c.moveTo(-21,0); c.bezierCurveTo(-24,-28,-10,-36,1,-36); c.bezierCurveTo(13,-36,24,-25,21,0); c.quadraticCurveTo(0,4,-21,0);
    const g=c.createLinearGradient(-20,-36,20,0); g.addColorStop(0,'#ffffff'); g.addColorStop(0.35,'#c8cddc'); g.addColorStop(0.7,'#8d93a8'); g.addColorStop(1,'#b7bccd'); this.path(c,g);
    const sh=(T*1.5+u.seed)%2; if(sh<1){ c.save(); c.beginPath(); c.moveTo(-21,0); c.bezierCurveTo(-24,-28,-10,-36,1,-36); c.bezierCurveTo(13,-36,24,-25,21,0); c.closePath(); c.clip(); c.fillStyle='rgba(255,255,255,.7)'; c.beginPath(); c.moveTo(-30+sh*60,-40); c.lineTo(-22+sh*60,-40); c.lineTo(-38+sh*60,4); c.lineTo(-46+sh*60,4); c.fill(); c.restore(); }
    this.circ(c,-13,-12,2.5,'#6b7186',INK,1.5); this.circ(c,15,-10,2.5,'#6b7186',INK,1.5);
    const b=this.blink(u,T); this.eye(c,2,-19,4.5,b,'#2b2140',true); this.eye(c,13,-19,4.5,b,'#2b2140',true);
    c.beginPath(); c.moveTo(4,-9); c.lineTo(13,-9); this.path(c,null,INK,2.2);
    c.restore();
  },
  alien(c,u,T){
    const t=T*1.3+u.seed, walk=u.state==='walk';
    c.save(); c.translate(this.lunge(u,12),-(walk?Math.abs(Math.sin(u.animT*6))*3:0));
    for(let i=0;i<5;i++){ const x=-14+i*7, w=Math.sin(t*5+i)*4; c.beginPath(); c.moveTo(x,-14); c.quadraticCurveTo(x+w,-6,x-w*0.5,0); this.path(c,null,'#a35cff',4); }
    c.beginPath(); c.moveTo(-20,-14); c.bezierCurveTo(-24,-52,24,-52,20,-14); c.quadraticCurveTo(0,-8,-20,-14); this.path(c,'#c77dff');
    this.ell(c,-8,-38,4,6,'rgba(255,255,255,.55)',null,0,-0.4);
    const b=this.blink(u,T);
    this.eye(c,-4,-26,3.6,b,'#00b894'); this.eye(c,6,-28,4.4,b,'#00b894'); this.eye(c,14,-25,3.2,b,'#00b894');
    c.beginPath(); c.moveTo(2,-46); c.quadraticCurveTo(0,-56,6,-60); this.path(c,null,INK,2); this.circ(c,6,-60,3.5,'#5ff7a8',INK,1.5);
    c.restore();
  },
  ufo(c,u,T){
    const t=T+u.seed, fy=u.portrait?-20:-96+Math.sin(t*1.5)*8, beam=u.atkP>0?Math.sin(u.atkP*Math.PI):0;
    c.save(); c.translate(this.lunge(u,8),fy);
    if(beam>0.1){ c.save(); c.globalAlpha=beam*0.5; c.fillStyle='#5ff7a8'; c.beginPath(); c.moveTo(20,0); c.lineTo(80,96); c.lineTo(-20,96); c.lineTo(-10,0); c.fill(); c.restore(); }
    this.circ(c,0,-34,30,'rgba(190,240,255,.55)',INK,3.5);
    this.ell(c,0,-24,14,16,'#5fd38a');
    this.circ(c,-5,-30,4,'#fff',INK,1.5); this.circ(c,6,-30,4,'#fff',INK,1.5); this.circ(c,-4,-30,2,INK,null); this.circ(c,7,-30,2,INK,null);
    c.beginPath(); c.moveTo(-6,-46); c.lineTo(-10,-58); c.moveTo(6,-46); c.lineTo(10,-58); this.path(c,null,INK,2); this.circ(c,-10,-58,3,'#ffd23f',INK,1.5); this.circ(c,10,-58,3,'#ffd23f',INK,1.5);
    this.ell(c,0,-6,78,20,'#8d93a8',INK,4);
    this.ell(c,0,-12,60,10,'#c8cddc',null);
    for(let i=0;i<7;i++){ const on=((T*4+i)|0)%2; this.circ(c,-54+i*18,-2,4.5,on?'#ffd23f':'#ff5d7a',INK,1.5); }
    this.ell(c,0,8,30,7,'#5a5f73',INK,3);
    c.restore();
  },

  /* ---------- 적군 ---------- */
  eslime(c,u,T){
    const t=u.animT, walk=u.state==='walk';
    let sq = walk? Math.sin(t*10)*0.12 : Math.sin(T*4+u.seed)*0.04;
    if(u.atkP>0) sq=-Math.sin(u.atkP*Math.PI)*0.22;
    const hop=walk?Math.abs(Math.sin(t*10))*6:0;
    c.save(); c.translate(this.lunge(u,14),-hop); c.scale(1-sq*.6,1+sq);
    c.beginPath(); c.moveTo(-22,0); c.bezierCurveTo(-25,-28,-10,-38,2,-38); c.bezierCurveTo(14,-38,25,-26,22,0); c.quadraticCurveTo(0,4,-22,0);
    const g=c.createLinearGradient(0,-38,0,0); g.addColorStop(0,'#ff8ad8'); g.addColorStop(1,'#c2389a'); this.path(c,g);
    this.ell(c,-9,-27,4,7,'rgba(255,255,255,.6)',null,0,-0.5);
    c.beginPath(); c.moveTo(-6,-36); c.lineTo(-2,-46); c.lineTo(3,-37); this.path(c,'#5a2a6a',INK,2);
    const b=this.blink(u,T); this.eye(c,3,-19,5,b,'#7a0030',true); this.eye(c,15,-19,5,b,'#7a0030',true);
    c.beginPath(); c.moveTo(4,-9); c.lineTo(9,-11); c.lineTo(14,-9); this.path(c,null,INK,2.2);
    c.restore();
  },
  bat(c,u,T){
    const t=T*1.3+u.seed, fy = u.portrait? -20 : -66+Math.sin(t*4)*8;
    c.save(); c.translate(this.lunge(u,14),fy);
    const f=Math.sin(t*20);
    for(const s of [-1,1]){
      c.save(); c.scale(1,1); c.translate(0,-2); c.rotate(s*(0.2+f*0.5));
      c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-10*s+0, -26, -30*s, -18); c.quadraticCurveTo(-26*s,-10,-30*s,-2); c.quadraticCurveTo(-20*s,-6,-16*s,2); c.quadraticCurveTo(-8*s,-2,0,4); this.path(c,'#5b3f86',INK,2.5);
      c.restore();
    }
    this.circ(c,0,0,15,'#3e2a63');
    c.beginPath(); c.moveTo(-9,-10); c.lineTo(-11,-24); c.lineTo(-2,-14); this.path(c,'#3e2a63',INK,2.5);
    c.beginPath(); c.moveTo(4,-14); c.lineTo(10,-25); c.lineTo(11,-10); this.path(c,'#3e2a63',INK,2.5);
    this.circ(c,1,-2,4,'#ff4d6d',INK,1.5); this.circ(c,9,-2,4,'#ff4d6d',INK,1.5);
    this.circ(c,2,-3,1.3,'#fff',null); this.circ(c,10,-3,1.3,'#fff',null);
    c.beginPath(); c.moveTo(2,6); c.lineTo(4,10); c.lineTo(6,6); c.moveTo(8,6); c.lineTo(10,10); c.lineTo(12,6); this.path(c,'#fff',INK,1.5);
    c.restore();
  },
  wolf(c,u,T){
    const t=u.animT, walk=u.state==='walk', run=walk?Math.sin(t*16):0;
    c.save(); c.translate(this.lunge(u,18),-(walk?Math.abs(run)*3:0));
    // 꼬리
    c.beginPath(); c.moveTo(-24,-28); c.quadraticCurveTo(-42,-40+run*4,-40,-52); c.quadraticCurveTo(-32,-40,-20,-32); this.path(c,'#8d93a8');
    // 다리
    this.rr(c,-22+run*5,-16,7,16,3,'#6b7186',INK,2.5); this.rr(c,-12-run*5,-16,7,16,3,'#6b7186',INK,2.5);
    this.rr(c,8+run*5,-16,7,16,3,'#6b7186',INK,2.5); this.rr(c,17-run*5,-16,7,16,3,'#6b7186',INK,2.5);
    // 몸
    this.ell(c,0,-26,28,14,'#9aa1b8');
    this.ell(c,4,-20,16,7,'#e6e9f2',null);
    // 머리
    c.save(); c.translate(26,-36); c.rotate(u.atkP>0? -Math.sin(u.atkP*Math.PI)*0.3 : 0);
    this.ell(c,0,0,13,12,'#9aa1b8');
    c.beginPath(); c.moveTo(6,-4); c.lineTo(24,2); c.lineTo(20,9); c.lineTo(4,8); c.closePath(); this.path(c,'#c8cddc');
    this.circ(c,23,3,2.5,INK,null);
    c.beginPath(); c.moveTo(-6,-8); c.lineTo(-4,-24); c.lineTo(4,-10); this.path(c,'#8d93a8',INK,2.5);
    this.eye(c,5,-3,3.5,this.blink(u,T),'#c0392b',true);
    if(u.atkP>0){ c.beginPath(); c.moveTo(10,8); c.lineTo(12,12); c.lineTo(14,8); c.moveTo(16,8); c.lineTo(18,12); c.lineTo(20,8); this.path(c,'#fff',INK,1.5); }
    c.restore();
    c.restore();
  },
  skeleton(c,u,T){
    const t=u.animT, walk=u.state==='walk', sw=walk?Math.sin(t*8)*6:0, bob=walk?Math.abs(Math.cos(t*8))*2:0;
    c.save(); c.translate(this.lunge(u,10),-bob);
    // 다리뼈
    c.beginPath(); c.moveTo(-5,-24); c.lineTo(-7+sw,-2); c.moveTo(5,-24); c.lineTo(7-sw,-2); this.path(c,null,INK,6);
    c.beginPath(); c.moveTo(-5,-24); c.lineTo(-7+sw,-2); c.moveTo(5,-24); c.lineTo(7-sw,-2); this.path(c,null,'#f1ede0',3);
    // 방패
    this.rr(c,-26,-50,16,26,4,'#8a5a2b',INK,3); c.beginPath(); c.moveTo(-26,-37); c.lineTo(-10,-37); this.path(c,null,'#5e3b1a',2);
    // 갈비뼈
    this.rr(c,-12,-50,24,26,8,'#f1ede0');
    c.beginPath(); for(let i=0;i<3;i++){ c.moveTo(-9,-44+i*6); c.lineTo(9,-44+i*6); } this.path(c,null,'#9b9480',2);
    // 해골
    this.circ(c,2,-64,15,'#f6f2e6');
    this.rr(c,-5,-55,16,9,3,'#f6f2e6',INK,2.5);
    c.save(); c.shadowColor='#ff3b3b'; c.shadowBlur=10;
    this.ell(c,-1,-65,4.5,5,'#2b2140',null); this.ell(c,10,-65,4.5,5,'#2b2140',null);
    this.circ(c,0,-65,1.8,'#ff4d4d',null); this.circ(c,11,-65,1.8,'#ff4d4d',null);
    c.restore();
    c.beginPath(); c.moveTo(-1,-51); c.lineTo(-1,-47); c.moveTo(4,-51); c.lineTo(4,-47); c.moveTo(9,-51); c.lineTo(9,-47); this.path(c,null,INK,1.5);
    // 칼
    let ang=-0.6; if(u.atkP>0){ const p=u.atkP; ang = p<0.45 ? -0.6-p/0.45*1.2 : -1.8+Math.min(1,(p-0.45)/0.25)*2.6; }
    c.save(); c.translate(12,-40); c.rotate(ang+Math.PI/2);
    c.beginPath(); c.moveTo(-3,-6); c.lineTo(-4,-36); c.lineTo(0,-42); c.lineTo(4,-34); c.lineTo(3,-6); c.closePath(); this.path(c,'#b9a68a',INK,2.5);
    this.rr(c,-8,-8,16,5,2,'#6b4a2b',INK,2);
    c.restore();
    this.circ(c,12,-40,4,'#f1ede0',INK,2);
    c.restore();
  },
  boss(c,u,T){
    const t=u.animT, walk=u.state==='walk', step=walk?Math.sin(t*3):0;
    c.save(); c.translate(this.lunge(u,10),-(walk?Math.abs(step)*4:0));
    // 망토
    c.beginPath(); c.moveTo(-40,-140); c.quadraticCurveTo(-90,-80,-70,0); c.lineTo(20,0); c.lineTo(10,-130); c.closePath(); this.path(c,'#a3143b',INK,3.5);
    // 다리
    this.rr(c,-38+step*8,-40,26,40,10,'#3b2552',INK,3.5); this.rr(c,8-step*8,-40,26,40,10,'#3b2552',INK,3.5);
    // 몸
    c.beginPath(); c.moveTo(-52,-36); c.quadraticCurveTo(-64,-120,-10,-150); c.quadraticCurveTo(50,-150,56,-90); c.quadraticCurveTo(58,-50,46,-36); c.closePath();
    const g=c.createLinearGradient(0,-150,0,-36); g.addColorStop(0,'#5a3a7e'); g.addColorStop(1,'#2e1a45'); this.path(c,g,INK,4);
    // 배 문양
    c.save(); c.shadowColor='#ff4dff'; c.shadowBlur=16;
    c.beginPath(); c.moveTo(0,-96); c.lineTo(12,-78); c.lineTo(0,-60); c.lineTo(-12,-78); c.closePath(); this.path(c,'#ff7af5',INK,2.5);
    c.restore();
    // 뿔
    c.beginPath(); c.moveTo(-22,-142); c.quadraticCurveTo(-46,-160,-44,-188); c.quadraticCurveTo(-30,-166,-8,-150); this.path(c,'#f4e7c5',INK,3);
    c.beginPath(); c.moveTo(22,-146); c.quadraticCurveTo(44,-164,52,-190); c.quadraticCurveTo(46,-160,36,-140); this.path(c,'#f4e7c5',INK,3);
    // 왕관
    c.beginPath(); c.moveTo(-14,-150); c.lineTo(-12,-170); c.lineTo(-4,-160); c.lineTo(4,-176); c.lineTo(12,-160); c.lineTo(20,-170); c.lineTo(22,-148); c.closePath(); this.path(c,'#ffd23f',INK,3);
    this.circ(c,4,-160,3.5,'#ff4d6d',INK,1.5);
    // 눈
    const rage = u.atkP>0 ? 1 : 0.6+Math.sin(T*4)*0.2;
    c.save(); c.shadowColor='#fff04d'; c.shadowBlur=18*rage;
    c.beginPath(); c.moveTo(4,-124); c.lineTo(24,-118); c.lineTo(6,-112); c.closePath(); this.path(c,'#fff04d',INK,2.5);
    c.beginPath(); c.moveTo(30,-122); c.lineTo(46,-114); c.lineTo(32,-110); c.closePath(); this.path(c,'#fff04d',INK,2.5);
    c.restore();
    // 입
    c.beginPath(); c.moveTo(10,-100); c.quadraticCurveTo(28,-92,44,-100); this.path(c,null,INK,3);
    c.beginPath(); c.moveTo(16,-98); c.lineTo(19,-92); c.lineTo(22,-97); c.moveTo(34,-97); c.lineTo(37,-92); c.lineTo(40,-98); this.path(c,'#fff',INK,1.5);
    // 주먹
    let a=Math.sin(T*2)*0.1; if(u.atkP>0){ const p=u.atkP; a = p<0.45? -p/0.45*2.2 : -2.2+Math.min(1,(p-0.45)/0.12)*3.0; }
    c.save(); c.translate(46,-104); c.rotate(a);
    this.rr(c,-11,-6,22,56,10,'#4a2e68',INK,3.5); this.circ(c,0,58,18,'#5a3a7e',INK,3.5);
    c.beginPath(); c.moveTo(-8,48); c.lineTo(-6,44); c.moveTo(0,46); c.lineTo(0,42); c.moveTo(8,48); c.lineTo(6,44); this.path(c,null,INK,2);
    c.restore();
    c.restore();
  },

  /* ---------- 기지 ---------- */
  allyBase(c,b,T){
    c.save(); c.translate(b.x + (b.shake>0? rand(-4,4):0), GROUND);
    this.ell(c,0,4,74,10,'rgba(0,0,0,.18)',null);
    // 탑 2개
    for(const sx of [-38,38]){
      this.rr(c,sx-18,-150,36,150,6,'#fff1dc');
      c.beginPath(); c.moveTo(sx-24,-148); c.lineTo(sx,-196); c.lineTo(sx+24,-148); c.closePath(); this.path(c,'#ff7aa8');
      this.rr(c,sx-7,-128,14,18,7,'#6fb8ff',INK,2.5);
    }
    // 본관
    this.rr(c,-42,-110,84,110,8,'#ffe4c4');
    for(let i=0;i<4;i++) this.rr(c,-42+i*24,-122,14,16,3,'#ffe4c4',INK,3);
    // 문
    c.beginPath(); c.moveTo(-16,0); c.lineTo(-16,-36); c.arc(0,-36,16,Math.PI,0); c.lineTo(16,0); c.closePath(); this.path(c,'#a0642e');
    this.circ(c,9,-20,2.5,'#ffd23f',INK,1.5);
    // 창 + 얼굴
    this.ell(c,-18,-78,7,9,'#6fb8ff',INK,2.5); this.ell(c,18,-78,7,9,'#6fb8ff',INK,2.5);
    c.beginPath(); c.arc(0,-62,7,0.15*Math.PI,0.85*Math.PI); this.path(c,null,INK,2.5);
    // 깃발
    const wv=Math.sin(T*4);
    c.beginPath(); c.moveTo(38,-196); c.lineTo(38,-232); this.path(c,null,INK,3);
    c.beginPath(); c.moveTo(38,-232); c.quadraticCurveTo(54,-232+wv*4,68,-226); c.quadraticCurveTo(54,-220-wv*3,38,-214); c.closePath(); this.path(c,'#ffd23f',INK,2.5);
    c.fillStyle=INK; c.font='16px Jua, sans-serif'; c.textAlign='center'; c.fillText('S',51,-218);
    c.restore();
  },
  enemyBase(c,b,T){
    c.save(); c.translate(b.x + (b.shake>0? rand(-4,4):0), GROUND);
    this.ell(c,0,4,74,10,'rgba(0,0,0,.25)',null);
    // 기둥 (가시)
    c.beginPath(); c.moveTo(-60,0); c.lineTo(-46,-150); c.lineTo(-30,-130); c.lineTo(-18,-210); c.lineTo(0,-180); c.lineTo(18,-214); c.lineTo(30,-132); c.lineTo(46,-152); c.lineTo(60,0); c.closePath();
    const g=c.createLinearGradient(0,-214,0,0); g.addColorStop(0,'#5a3f86'); g.addColorStop(1,'#2a1a45'); this.path(c,g,INK,3.5);
    // 크리스탈
    c.save(); c.shadowColor='#c77dff'; c.shadowBlur=14;
    c.beginPath(); c.moveTo(-40,-60); c.lineTo(-34,-86); c.lineTo(-28,-60); c.closePath(); this.path(c,'#d9a6ff',INK,2);
    c.beginPath(); c.moveTo(30,-50); c.lineTo(37,-80); c.lineTo(44,-50); c.closePath(); this.path(c,'#d9a6ff',INK,2);
    c.restore();
    // 거대한 눈
    const bl=((T)%4)<0.15;
    this.ell(c,0,-110,26,bl?3:20,'#fff3f3',INK,3.5);
    if(!bl){ const lx=Math.sin(T*0.8)*6; this.ell(c,-6+lx,-110,9,14,'#e0344f',INK,2.5); this.ell(c,-6+lx,-110,3,9,INK,null); }
    // 입구
    c.beginPath(); c.moveTo(-20,0); c.lineTo(-20,-30); c.quadraticCurveTo(0,-56,20,-30); c.lineTo(20,0); c.closePath(); this.path(c,'#120c22');
    c.beginPath(); for(let i=0;i<4;i++){ c.moveTo(-15+i*10,-34); c.lineTo(-10+i*10,-24); c.lineTo(-5+i*10,-34);} this.path(c,'#fff',INK,1.5);
    c.restore();
  },
};
const DRAWERS = { slime:Art.slime, knight:Art.knight, archer:Art.archer, golem:Art.golem, dragon:Art.dragon,
  bee:Art.bee, mushroom:Art.mushroom, snowmage:Art.snowmage, penguin:Art.penguin, fox:Art.fox, phoenix:Art.phoenix,
  squirrel:Art.squirrel, duck:Art.duck, frog:Art.frog, sheep:Art.sheep, robot:Art.robot, astronaut:Art.astronaut, owl:Art.owl, turtle:Art.turtle,
  ghost:Art.ghost, zombie:Art.zombie, boar:Art.boar, metalslime:Art.metalslime, alien:Art.alien, ufo:Art.ufo,
  eslime:Art.eslime, bat:Art.bat, wolf:Art.wolf, skeleton:Art.skeleton, boss:Art.boss };
/* =========================================================
   DOODLE ART — 흰 바탕 + 검은 선의 낙서풍 캐릭터 (명암 없음)
   모든 캐릭터는 직접 그린 오리지널 디자인. 발 위치(0,0), 오른쪽을 바라봄
   ========================================================= */
const LN='#1b1b1b', WH='#ffffff';
const D = {
  lw:2.7,
  p(c,fill=WH,lw){ if(fill){ c.fillStyle=fill; c.fill(); } c.lineWidth=lw||D.lw; c.strokeStyle=LN; c.lineJoin='round'; c.lineCap='round'; c.stroke(); },
  line(c,pts,lw){ c.beginPath(); pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.lineWidth=lw||D.lw; c.strokeStyle=LN; c.lineCap='round'; c.lineJoin='round'; c.stroke(); },
  ell(c,x,y,rx,ry,fill=WH,lw,rot=0){ c.beginPath(); c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,Math.PI*2); D.p(c,fill,lw); },
  rr(c,x,y,w,h,r,fill=WH,lw){ c.beginPath(); c.roundRect(x,y,w,h,r); D.p(c,fill,lw); },
  dot(c,x,y,rx=1.9,ry=2.7){ c.fillStyle=LN; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,7); c.fill(); },
  ph(u){ const P=2*Math.PI/(WALK_W[u.key]||10); return (((u.animT%P)+P)%P)/P; },
  bob(u,a=2.5){ return u.state==='walk' ? Math.abs(Math.sin(D.ph(u)*Math.PI*2))*a : 0; },
  step(u,a=4){ return u.state==='walk' ? Math.sin(D.ph(u)*Math.PI*2)*a : 0; },
  swing(u,rest,back,fwd){ if(u.atkP<=0) return rest; const p=u.atkP; return p<0.42 ? rest-(p/0.42)*back : rest-back+Math.min(1,(p-0.42)/0.22)*(back+fwd); },
  pow(u){ return u.atkP>0 ? Math.sin(u.atkP*Math.PI) : 0; },
  eyes(c,x1,x2,y,u,T,kind='dot'){
    const b=Art.blink(u,T);
    for(const x of [x1,x2]){
      if(kind==='x'){ D.line(c,[[x-2.4,y-2.4],[x+2.4,y+2.4]],2); D.line(c,[[x+2.4,y-2.4],[x-2.4,y+2.4]],2); continue; }
      if(kind==='happy'||(b&&kind!=='angry')){ c.beginPath(); c.arc(x,y+1.5,2.6,Math.PI*1.15,Math.PI*1.85); c.lineWidth=2.1; c.strokeStyle=LN; c.lineCap='round'; c.stroke(); continue; }
      if(kind==='line'){ D.line(c,[[x,y-2.5],[x,y+2.5]],2.2); continue; }
      D.dot(c,x,y);
    }
    if(kind==='angry'){ D.line(c,[[x1-3.5,y-6],[x1+2.5,y-3.5]],2.1); D.line(c,[[x2+3.5,y-6],[x2-2.5,y-3.5]],2.1); }
  },
  mouth(c,x,y,kind='w'){
    c.beginPath();
    if(kind==='w'){ c.moveTo(x-4,y); c.quadraticCurveTo(x-2,y+3.2,x,y); c.quadraticCurveTo(x+2,y+3.2,x+4,y); }
    else if(kind==='o'){ c.ellipse(x,y+1,2,2.6,0,0,7); }
    else if(kind==='grr'){ c.moveTo(x-5,y+1); c.lineTo(x-2.5,y-1.2); c.lineTo(x,y+1); c.lineTo(x+2.5,y-1.2); c.lineTo(x+5,y+1); }
    else if(kind==='line'){ c.moveTo(x-3,y); c.lineTo(x+3,y); }
    else if(kind==='frown'){ c.arc(x,y+3,3,1.15*Math.PI,1.85*Math.PI); }
    else { c.arc(x,y-1.5,3.2,0.15*Math.PI,0.85*Math.PI); }
    c.lineWidth=2; c.strokeStyle=LN; c.lineCap='round'; c.stroke();
  },
  legs(c,u,spread=6,len=11,w=6.5,fill=WH){ const s=D.step(u,3.5); D.rr(c,-spread-w/2+s,-len,w,len+1,3,fill); D.rr(c,spread-w/2-s,-len,w,len+1,3,fill); },
  hand(c,x,y,r=3.8,fill=WH){ D.ell(c,x,y,r,r,fill,2.2); },
  sword(c,x,y,ang,len=30,blade='#eef1f5'){
    c.save(); c.translate(x,y); c.rotate(ang);
    D.rr(c,-2,-3,4,9,1.5,'#9a9a9a',2); D.rr(c,-7,-6,14,3.6,1.5,WH,2);
    c.beginPath(); c.moveTo(-3,-6); c.lineTo(-3,-len); c.lineTo(0,-len-6); c.lineTo(3,-len); c.lineTo(3,-6); c.closePath(); D.p(c,blade,2.2);
    c.restore();
  },
  staff(c,x,y,ang,orb,glow=0){
    c.save(); c.translate(x,y); c.rotate(ang);
    c.beginPath(); c.moveTo(0,20); c.lineTo(0,-28); c.lineWidth=5.5; c.strokeStyle=LN; c.lineCap='round'; c.stroke(); c.lineWidth=2.6; c.strokeStyle='#fff'; c.stroke();
    if(glow){ c.save(); c.globalAlpha=0.35*glow; D.ell(c,0,-34,12,12,orb,0.01); c.restore(); }
    D.ell(c,0,-34,6.5,6.5,orb,2.3);
    c.restore();
  },
  wing(c,x,y,ang,len=26,fill=WH){ c.save(); c.translate(x,y); c.rotate(ang); c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-len*0.45,-len*0.95,-len,-len*0.85); c.quadraticCurveTo(-len*0.8,-len*0.45,-len*0.95,-len*0.2); c.quadraticCurveTo(-len*0.4,0.2*len,0,0); D.p(c,fill,2.4); c.restore(); },
  batwing(c,x,y,ang,len=26,fill=WH){ c.save(); c.translate(x,y); c.rotate(ang); c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-len*0.3,-len*0.9,-len,-len*0.9); c.lineTo(-len*0.75,-len*0.55); c.lineTo(-len*0.95,-len*0.35); c.lineTo(-len*0.6,-len*0.22); c.lineTo(-len*0.7,0); c.quadraticCurveTo(-len*0.3,len*0.1,0,0); D.p(c,fill,2.4); c.restore(); },
};

const DD = {
  /* ================= 아군 ================= */
  slime(c,u,T){ const ph=D.ph(u), walk=u.state==='walk'; let sq=walk?Math.sin(ph*6.283)*0.1:Math.sin(T*3+u.seed)*0.03; if(u.atkP>0) sq=-D.pow(u)*0.22;
    const hop=walk?Math.abs(Math.sin(ph*6.283))*6:0;
    c.save(); c.translate(Art.lunge(u,14),-hop); c.scale(1-sq*0.5,1+sq);
    c.beginPath(); c.moveTo(-21,0); c.bezierCurveTo(-23,-27,-8,-34,2,-34); c.bezierCurveTo(14,-34,23,-25,21,0); c.closePath(); D.p(c);
    D.line(c,[[1,-34],[0,-41]],2.3); D.ell(c,5,-42.5,5,2.6,'#9be07a',2,-0.4);
    D.eyes(c,4,13,-19,u,T); D.mouth(c,8.5,-12,'w');
    c.restore(); },
  knight(c,u,T){ const sw=D.swing(u,-0.55,1.0,2.5);
    c.save(); c.translate(Art.lunge(u,10),-D.bob(u));
    D.legs(c,u,6,11);
    D.ell(c,-15,-24,9.5,11.5); D.line(c,[[-15,-31],[-15,-17]],2); D.line(c,[[-21,-24],[-9,-24]],2);
    D.rr(c,-12,-33,24,23,9);
    D.ell(c,-9,-61,6,6); D.ell(c,13,-61,6,6); D.ell(c,-9,-61,2.5,2.5,LN,0.1); D.ell(c,13,-61,2.5,2.5,LN,0.1);
    D.ell(c,2,-49,17,15);
    D.eyes(c,5,13,-50,u,T); D.ell(c,10,-44,2.6,1.9,LN,1); D.mouth(c,10,-41,'w');
    D.sword(c,13,-23,sw); D.hand(c,13,-23);
    c.restore(); },
  archer(c,u,T){ const pull=u.atkP>0?(u.atkP<0.5?u.atkP/0.5:Math.max(0,1-(u.atkP-0.5)*6)):0;
    c.save(); c.translate(0,-D.bob(u));
    D.legs(c,u,5,10);
    D.rr(c,-11,-31,22,22,9);
    c.save(); c.translate(-3,-60); c.rotate(-0.15+Math.sin(T*2+u.seed)*0.05); D.ell(c,0,-12,4.5,13); c.restore();
    c.save(); c.translate(7,-61); c.rotate(0.2+Math.sin(T*2+u.seed+1)*0.05); D.ell(c,0,-12,4.5,13); c.restore();
    D.ell(c,2,-46,15,13.5);
    D.eyes(c,5,12,-47,u,T); D.ell(c,9,-41,1.8,1.4,'#ff9fb0',1); D.mouth(c,9,-38.5,'w');
    c.save(); c.translate(16,-22);
    c.beginPath(); c.arc(0,0,16,-1.25,1.25); c.lineWidth=5; c.strokeStyle=LN; c.stroke(); c.lineWidth=2.4; c.strokeStyle='#c9945a'; c.stroke();
    D.line(c,[[Math.cos(-1.25)*16,Math.sin(-1.25)*16],[-pull*9,0],[Math.cos(1.25)*16,Math.sin(1.25)*16]],1.4);
    if(pull>0.05){ D.line(c,[[-pull*9,0],[20,0]],2.2); c.beginPath(); c.moveTo(20,-3); c.lineTo(26,0); c.lineTo(20,3); c.closePath(); D.p(c,WH,1.8); }
    c.restore(); D.hand(c,16-pull*9,-22);
    c.restore(); },
  golem(c,u,T){ const p=D.pow(u);
    c.save(); c.translate(Art.lunge(u,10),-D.bob(u,1.5));
    D.legs(c,u,12,10,9);
    // 둥글고 큰 코뿔소 몸
    c.beginPath(); c.moveTo(-28,-8); c.quadraticCurveTo(-34,-52,0,-56); c.quadraticCurveTo(30,-56,32,-30); c.quadraticCurveTo(34,-10,26,-8); c.closePath(); D.p(c);
    c.beginPath(); c.moveTo(26,-40); c.quadraticCurveTo(38,-50,36,-66); c.quadraticCurveTo(30,-52,20,-48); D.p(c,WH,2.4);
    D.ell(c,-6,-56,5,6,WH,2.2,-0.4);
    D.eyes(c,10,20,-38,u,T,'line'); D.mouth(c,20,-26,'line');
    D.line(c,[[-18,-30],[-12,-26]],2); D.line(c,[[-20,-20],[-14,-17]],2);
    c.save(); c.translate(30+p*8,-22); c.rotate(-p*0.25); D.rr(c,-5,-18,12,34,5,WH,2.6); D.line(c,[[1,-12],[1,10]],1.8); c.restore();
    c.restore(); },
  dragon(c,u,T){ const t=T+u.seed*5, fy=u.portrait?-10:-44+Math.sin(t*3)*6, f=Math.sin(t*12), op=D.pow(u);
    c.save(); c.translate(Art.lunge(u,6),fy);
    D.batwing(c,-4,-26,-0.3+f*0.5,28);
    c.beginPath(); c.moveTo(-14,-16); c.quadraticCurveTo(-34,-12,-40,-28); c.quadraticCurveTo(-28,-20,-14,-24); D.p(c);
    D.ell(c,-2,-22,16,12);
    D.ell(c,-6,-8,3.5,4,WH,2); D.ell(c,6,-8,3.5,4,WH,2);
    // 악어 머리: 길쭉한 주둥이
    c.save(); c.translate(10,-36);
    c.beginPath(); c.moveTo(-10,6); c.quadraticCurveTo(-12,-12,4,-12); c.lineTo(28,-6+op*-2); c.quadraticCurveTo(32,-2,28,2); c.lineTo(6,6+op*4); c.closePath(); D.p(c);
    D.line(c,[[8,-1],[29,-1]],1.8); D.ell(c,0,-14,4,4); D.dot(c,0,-14,1.5,2); D.dot(c,25,-6,1,1);
    if(op>0.2){ c.save(); c.globalAlpha=0.9; D.ell(c,36,-1,4+op*6,3+op*3,'#ffb347',2); c.restore(); }
    c.restore();
    D.batwing(c,0,-28,-0.1-f*0.6,24);
    c.restore(); },
  bee(c,u,T){ const ph=D.ph(u), f=Math.sin((T+u.seed)*40);
    c.save(); c.translate(Art.lunge(u,18),-12-Math.sin(ph*6.283)*3);
    c.save(); c.translate(-2,-22); c.rotate(-0.5+f*0.4); D.ell(c,0,-9,6,11,'#eef6ff',2); c.restore();
    c.beginPath(); c.moveTo(-14,-10); c.lineTo(-22,-8); c.lineTo(-14,-5); D.p(c,LN,1.5);
    D.ell(c,0,-10,15,11);
    c.save(); c.beginPath(); c.ellipse(0,-10,15,11,0,0,7); c.clip(); c.fillStyle='#ffd23f'; c.fillRect(-15,-21,30,22); c.fillStyle=LN; c.fillRect(-8,-21,4,22); c.fillRect(1,-21,4,22); c.restore();
    D.ell(c,0,-10,15,11,null);
    D.ell(c,14,-20,8,8);
    D.dot(c,16,-21,1.6,2.3); D.mouth(c,18,-16,'s');
    D.line(c,[[12,-27],[9,-34]],1.8); D.line(c,[[16,-27],[18,-34]],1.8);
    c.save(); c.translate(3,-24); c.rotate(0.1+f*0.4); D.ell(c,0,-8,5,10,'#eef6ff',2); c.restore();
    c.restore(); },
  mushroom(c,u,T){ const p=D.pow(u);
    c.save(); c.translate(Art.lunge(u,10),-D.bob(u,1.8));
    D.legs(c,u,9,9,8);
    c.beginPath(); c.moveTo(-22,-8); c.quadraticCurveTo(-26,-46,0,-48); c.quadraticCurveTo(24,-48,24,-24); c.quadraticCurveTo(24,-8,16,-8); c.closePath(); D.p(c);
    D.ell(c,-12,-46,4,3.5); D.ell(c,4,-48,4,3.5);
    D.ell(c,18,-26,10,8); D.dot(c,15,-27,1.2,1.6); D.dot(c,21,-27,1.2,1.6);
    D.eyes(c,4,12,-36,u,T,'line');
    D.ell(c,22+p*6,-20,11,14,WH,2.6); D.ell(c,22+p*6,-20,5,7,null,1.8);
    c.restore(); },
  squirrel(c,u,T){ const thr=D.pow(u);
    c.save(); c.translate(0,-D.bob(u,3));
    D.line(c,[[-4,-8],[-5,0]],2.6); D.line(c,[[4,-8],[5,0]],2.6);
    D.ell(c,0,-22,15,15);
    D.line(c,[[-2,-37],[0,-42],[3,-37]],2);
    D.eyes(c,4,11,-26,u,T); c.beginPath(); c.moveTo(14,-21); c.lineTo(21,-19); c.lineTo(14,-16); c.closePath(); D.p(c,'#ffb347',2);
    c.save(); c.translate(15,-14); c.rotate(-thr*1.6);
    D.line(c,[[0,8],[0,-1]],3); D.line(c,[[0,-1],[-4,-9]],2.6); D.line(c,[[0,-1],[4,-9]],2.6);
    if(thr<0.5){ D.ell(c,0,-11,3.2,3.6,'#c9945a',1.8); }
    c.restore(); D.hand(c,15,-12,3.2);
    c.restore(); },
  duck(c,u,T){
    c.save(); c.translate(Art.lunge(u,8),0);
    const r=u.state==='walk'?Math.sin(D.ph(u)*6.283)*0.08:0; c.rotate(r);
    D.ell(c,-6,-2,6,2.6,'#ffb347',2); D.ell(c,6,-2,6,2.6,'#ffb347',2);
    c.beginPath(); c.moveTo(-22,-16); c.quadraticCurveTo(-28,-30,-16,-28); c.quadraticCurveTo(-2,-34,12,-28); c.quadraticCurveTo(18,-8,4,-4); c.lineTo(-12,-4); c.quadraticCurveTo(-22,-6,-22,-16); D.p(c);
    D.ell(c,6,-40,11,11);
    c.beginPath(); c.moveTo(15,-41); c.quadraticCurveTo(25,-41,25,-37); c.quadraticCurveTo(22,-34,15,-36); c.closePath(); D.p(c,'#ffb347',2);
    D.dot(c,9,-43);
    D.line(c,[[-10,-20],[-2,-18]],1.8);
    D.ell(c,18,-16,10,12,WH,2.6); D.line(c,[[18,-24],[18,-8]],1.6);
    c.restore(); },
  snowmage(c,u,T){ const g=D.pow(u);
    c.save(); c.translate(0,-D.bob(u));
    D.legs(c,u,5,9);
    c.beginPath(); c.moveTo(-14,-8); c.lineTo(-9,-34); c.lineTo(11,-34); c.lineTo(16,-8); c.closePath(); D.p(c);
    D.line(c,[[-13,-12],[15,-12]],1.8);
    D.ell(c,1,-44,14,12);
    c.beginPath(); c.moveTo(4,-55); c.lineTo(9,-80); c.lineTo(10,-55); D.p(c,WH,2);
    D.line(c,[[5,-62],[9,-63]],1.4); D.line(c,[[6,-69],[9,-70]],1.4);
    D.eyes(c,4,11,-45,u,T); D.mouth(c,8,-39,'s');
    D.ell(c,-10,-38,2,1.4,'#9fd8ff',1);
    D.staff(c,15,-22,-g*0.8,'#bff4ff',g); D.hand(c,15,-22);
    c.restore(); },
  penguin(c,u,T){ const rc=u.atkP>0.45?-Math.sin(Math.min(1,(u.atkP-0.45)/0.55)*Math.PI)*7:0;
    c.save(); c.translate(-8+rc,0); c.rotate(u.state==='walk'?Math.sin(D.ph(u)*6.283)*0.1:0);
    D.ell(c,-5,-2,5,2.4,'#ffb347',1.8); D.ell(c,6,-2,5,2.4,'#ffb347',1.8);
    D.ell(c,0,-22,14,20,'#3b3b44');
    D.ell(c,3,-20,9,15,WH,1.8);
    D.ell(c,5,-32,4,4,WH,1.6); D.ell(c,11,-32,4,4,WH,1.6); D.dot(c,6,-32,1.4,2); D.dot(c,12,-32,1.4,2);
    c.beginPath(); c.moveTo(11,-27); c.lineTo(19,-25); c.lineTo(11,-23); c.closePath(); D.p(c,'#ffb347',1.8);
    c.restore();
    c.save(); c.translate(14+rc*1.4,-12); c.save(); c.rotate(-0.28);
    D.rr(c,-4,-8,32,16,7,'#cfcfd6'); D.rr(c,25,-10,6,20,2,WH); c.restore();
    D.ell(c,0,6,8,8); D.line(c,[[-8,6],[8,6]],1.6); D.line(c,[[0,-2],[0,14]],1.6);
    c.restore();
    if(u.atkP>0.45&&u.atkP<0.95){ const q=(u.atkP-0.45)/0.5; c.globalAlpha=1-q; D.ell(c,48+q*10,-26-q*10,5+q*8,5+q*8,WH,1.8); c.globalAlpha=1; } },
  frog(c,u,T){ const tg=D.pow(u), hop=u.state==='walk'?Math.abs(Math.sin(D.ph(u)*6.283))*7:0;
    c.save(); c.translate(0,-hop);
    D.ell(c,-11,-3,9,4); D.ell(c,10,-3,9,4);
    D.ell(c,0,-18,19,14);
    D.ell(c,-3,-32,7,7); D.ell(c,12,-32,7,7); D.dot(c,-2,-32); D.dot(c,13,-32);
    D.mouth(c,12,-20,'s'); D.line(c,[[2,-22],[18,-22]],1.8);
    if(tg>0.05){ D.line(c,[[18,-21],[18+tg*48,-19]],5); c.beginPath(); c.moveTo(18,-21); c.lineTo(18+tg*48,-19); c.lineWidth=2.6; c.strokeStyle='#ff8fa8'; c.stroke(); D.ell(c,18+tg*48,-19,4.5,4.5,'#ff8fa8',2); }
    c.beginPath(); c.moveTo(-10,-38); c.lineTo(22,-38); c.lineTo(17,-46); c.lineTo(-5,-46); c.closePath(); D.p(c,WH,2.2); D.line(c,[[-13,-38],[25,-38]],2.6);
    c.restore(); },
  sheep(c,u,T){ const g=D.pow(u);
    c.save(); c.translate(0,-D.bob(u));
    D.legs(c,u,6,10,5.5);
    for(const [x,y,r] of [[-11,-22,9],[0,-28,10],[10,-22,9],[-5,-15,8],[7,-15,8]]) D.ell(c,x,y,r,r);
    D.ell(c,0,-21,10,9,WH,0.1);
    D.ell(c,14,-40,9,10);
    c.beginPath(); c.arc(8,-49,6,Math.PI*0.9,Math.PI*2.1); D.p(c,null,2.2); c.beginPath(); c.arc(20,-49,6,Math.PI*0.9,Math.PI*2.1); D.p(c,null,2.2);
    D.eyes(c,14,20,-41,u,T,'happy'); D.mouth(c,18,-35,'w');
    c.save(); c.globalAlpha=0.95; c.beginPath(); c.ellipse(14,-58,10,3,0,0,7); c.lineWidth=2.4; c.strokeStyle='#ffc93a'; c.stroke(); c.restore();
    D.staff(c,-14,-22,-0.25-g*0.5,'#fff6b0',g); D.hand(c,-14,-22);
    c.restore(); },
  robot(c,u,T){ const p=D.pow(u), blink=Math.sin(T*6)>0;
    c.save(); c.translate(0,-D.bob(u,1.5));
    D.legs(c,u,7,12,7,'#e6e6ea');
    D.rr(c,-17,-42,34,32,6);
    D.rr(c,-9,-34,18,12,3,'#e6e6ea',2); c.fillStyle=blink?'#5ed38a':'#ffd23f'; c.fillRect(-5,-30,4,4); c.fillRect(2,-30,4,4);
    D.rr(c,-13,-64,28,22,7);
    D.rr(c,-6,-58,20,9,4,'#f3f3f6',2); D.dot(c,0,-53.5,1.7,1.7); D.dot(c,8,-53.5,1.7,1.7);
    D.line(c,[[1,-64],[1,-73]],2.2); D.ell(c,1,-75,3,3,'#ff6b6b',2);
    c.save(); c.translate(18+p*14,-28);
    D.rr(c,-4,-4,12,8,3); c.beginPath(); c.arc(14,0,8,-Math.PI/2,Math.PI/2); c.lineTo(14,4); c.arc(14,0,4,Math.PI/2,-Math.PI/2,true); c.closePath(); D.p(c,'#ff6b6b',2.2);
    c.restore();
    c.restore(); },
  fox(c,u,T){ const sw=D.swing(u,-0.35,1.4,3.2)+0.2, wv=Math.sin(T*8)*3, walk=u.state==='walk';
    c.save(); c.translate(Art.lunge(u,22),-D.bob(u)); if(walk) c.rotate(0.12);
    D.legs(c,u,5,11,6);
    c.beginPath(); c.moveTo(-6,-34); c.quadraticCurveTo(-24,-38+wv,-36,-32+wv); c.lineTo(-33,-28+wv); c.quadraticCurveTo(-20,-30,-6,-30); D.p(c,'#ff5d7a',2);
    D.rr(c,-11,-34,22,24,8);
    D.line(c,[[-11,-22],[11,-22]],2);
    c.beginPath(); c.moveTo(-9,-50); c.lineTo(-10,-66); c.lineTo(-1,-56); D.p(c); c.beginPath(); c.moveTo(4,-57); c.lineTo(9,-70); c.lineTo(12,-54); D.p(c);
    c.beginPath(); c.moveTo(-12,-44); c.quadraticCurveTo(-12,-60,2,-60); c.quadraticCurveTo(14,-60,16,-50); c.lineTo(26,-45); c.lineTo(14,-38); c.quadraticCurveTo(-10,-34,-12,-44); D.p(c);
    D.dot(c,25,-45,1.5,1.5);
    D.eyes(c,4,11,-50,u,T,'angry');
    D.sword(c,12,-24,sw,28,'#e9f6ff'); D.hand(c,12,-24);
    c.restore(); },
  astronaut(c,u,T){ const sh=D.pow(u);
    c.save(); c.translate(0,-D.bob(u));
    D.legs(c,u,5,10);
    D.rr(c,-19,-38,9,22,3); D.rr(c,-12,-34,24,24,9);
    D.rr(c,-5,-28,10,6,2,'#8fc1ff',1.8);
    D.ell(c,2,-48,14,12); D.ell(c,-11,-48,4,5); D.ell(c,15,-48,4,5);
    D.ell(c,5,-45,7,5,WH,1.8); D.eyes(c,0,8,-51,u,T); D.mouth(c,5,-44,'s');
    c.save(); c.globalAlpha=0.5; D.ell(c,2,-49,20,19,'rgba(200,230,255,.5)',2.4); c.restore(); D.ell(c,2,-49,20,19,null,2.4);
    D.line(c,[[-8,-61],[-4,-64]],2);
    c.save(); c.translate(14,-23); D.rr(c,0,-4,16,8,3,'#c9b6ff',2); D.rr(c,14,-2,6,4,1,WH,1.6);
    if(sh>0.3){ D.ell(c,26,0,3+sh*4,3+sh*4,'#ff9ef0',1.6); } c.restore(); D.hand(c,14,-23);
    c.restore(); },
  owl(c,u,T){ const t=T+u.seed*5, fy=u.portrait?-8:-50+Math.sin(t*3)*6, f=Math.sin(t*10), g=D.pow(u);
    c.save(); c.translate(0,fy);
    D.wing(c,-6,-22,-0.4+f*0.5,26);
    D.ell(c,0,-22,15,17);
    c.beginPath(); c.moveTo(-11,-34); c.lineTo(-13,-46); c.lineTo(-4,-38); D.p(c); c.beginPath(); c.moveTo(6,-38); c.lineTo(14,-46); c.lineTo(13,-33); D.p(c);
    D.ell(c,-3,-28,6,6); D.ell(c,9,-28,6,6); D.dot(c,-2,-28); D.dot(c,10,-28);
    c.beginPath(); c.moveTo(2,-25); c.lineTo(5,-19); c.lineTo(8,-25); c.closePath(); D.p(c,'#ffb347',1.8);
    D.line(c,[[-4,-6],[-6,0]],2); D.line(c,[[4,-6],[6,0]],2);
    c.save(); c.translate(12,-6); D.line(c,[[0,-4],[0,2]],1.8); if(g>0){ c.globalAlpha=0.4*g; D.ell(c,0,9,10,10,'#fff6b0',0.01); c.globalAlpha=1; } D.rr(c,-5,2,10,12,3,'#fff1a8',2); c.restore();
    D.wing(c,-2,-24,-0.1-f*0.6,22);
    c.restore(); },
  phoenix(c,u,T){ const t=T+u.seed*5, fy=u.portrait?-10:-56+Math.sin(t*2.5)*7, f=Math.sin(t*6), g=D.pow(u);
    c.save(); c.translate(Art.lunge(u,6),fy);
    for(let i=0;i<3;i++){ c.save(); c.translate(-16-i*7,-14+i*3); c.rotate(0.4+i*0.15+Math.sin(T*8+i)*0.1); c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-14,-6,-22,4); c.quadraticCurveTo(-12,2,0,6); c.closePath(); D.p(c,['#ffb347','#ffd23f','#ff7a5c'][i],2); c.restore(); }
    D.wing(c,-4,-26,-0.3+f*0.5,32,'#fff1d6');
    D.ell(c,0,-24,15,13);
    D.ell(c,14,-38,11,11);
    for(let i=0;i<3;i++){ c.save(); c.translate(10+i*4,-48); c.rotate(-0.5+i*0.35); D.ell(c,0,-6,2.6,6,['#ff7a5c','#ffd23f','#ff7a5c'][i],1.8); c.restore(); }
    c.beginPath(); c.moveTo(22,-40); c.quadraticCurveTo(30,-38,27,-31); c.quadraticCurveTo(24,-34,21,-34); c.closePath(); D.p(c,'#ffd23f',2);
    D.eyes(c,15,15,-40,u,T);
    D.line(c,[[-4,-12],[-5,-6]],2); D.line(c,[[4,-12],[5,-6]],2);
    D.wing(c,0,-28,-0.1-f*0.6,28,'#fff1d6');
    if(g>0.1){ c.save(); c.globalAlpha=0.5*g; D.ell(c,30,-40,8+g*8,8+g*8,'#ffe58a',0.01); c.restore(); }
    c.restore(); },
  turtle(c,u,T){ const cast=D.pow(u), walk=u.state==='walk';
    c.save(); c.translate(0,-D.bob(u,1.2));
    D.legs(c,u,8,10,8);
    D.ell(c,0,-26,17,19);
    // 나무늘보 얼굴 무늬
    D.ell(c,2,-50,16,14);
    D.ell(c,6,-50,11,8,WH,1.8);
    D.ell(c,1,-51,3.5,2.6,'#d9d9d9',1.4); D.ell(c,11,-51,3.5,2.6,'#d9d9d9',1.4);
    D.eyes(c,1,11,-51,u,T,'happy'); D.mouth(c,6,-45,'s');
    c.beginPath(); c.moveTo(-16,-60); c.lineTo(22,-60); c.lineTo(6,-92); c.closePath(); D.p(c,'#d9ccff',2.4); D.line(c,[[-18,-60],[24,-60]],3);
    c.save(); c.translate(-14,-24); D.ell(c,0,0,9,9,WH,2.2); D.line(c,[[0,0],[Math.cos(T*2)*6,Math.sin(T*2)*6]],1.6); D.line(c,[[0,0],[Math.cos(T*0.3)*4,Math.sin(T*0.3)*4]],1.6); c.restore();
    // 긴 팔 + 지팡이
    const arm = -0.2-cast*0.6;
    D.staff(c,18,-24,arm,'#bff4ff',cast); D.hand(c,18,-24,4.2);
    c.restore(); },

  /* ================= 적 ================= */
  eslime(c,u,T){ const ph=D.ph(u), walk=u.state==='walk'; let sq=walk?Math.sin(ph*6.283)*0.1:0.0; if(u.atkP>0) sq=-D.pow(u)*0.22;
    c.save(); c.translate(Art.lunge(u,14),-(walk?Math.abs(Math.sin(ph*6.283))*5:0)); c.scale(1-sq*.5,1+sq);
    c.beginPath(); c.moveTo(-19,0); c.bezierCurveTo(-21,-24,-7,-31,2,-31); c.bezierCurveTo(12,-31,21,-22,19,0); c.closePath(); D.p(c,'#efe0ff');
    D.eyes(c,3,12,-17,u,T,'angry'); D.mouth(c,7.5,-9,'grr');
    c.restore(); },
  bat(c,u,T){ const t=T*1.3+u.seed, fy=u.portrait?-12:-66+Math.sin(t*4)*8, f=Math.sin((T+u.seed)*22);
    c.save(); c.translate(Art.lunge(u,14),fy);
    D.batwing(c,-4,-2,-0.2+f*0.7,22,'#d8d8e0');
    D.ell(c,0,0,11,10,'#d8d8e0');
    c.beginPath(); c.moveTo(-6,-8); c.lineTo(-7,-17); c.lineTo(-1,-10); D.p(c,'#d8d8e0',2); c.beginPath(); c.moveTo(3,-10); c.lineTo(7,-18); c.lineTo(8,-7); D.p(c,'#d8d8e0',2);
    D.eyes(c,2,8,-1,u,T,'angry'); c.beginPath(); c.moveTo(3,4); c.lineTo(4,7); c.lineTo(5,4); D.p(c,WH,1.4);
    D.batwing(c,2,-2,0.2-f*0.7,20,'#d8d8e0');
    c.restore(); },
  wolf(c,u,T){ const run=u.state==='walk'?Math.sin(D.ph(u)*6.283):0;
    c.save(); c.translate(Art.lunge(u,18),-(u.state==='walk'?Math.abs(run)*3:0));
    c.beginPath(); c.moveTo(-18,-10); c.quadraticCurveTo(-32,-6,-36,-18+run*3); D.p(c,null,2.2);
    D.line(c,[[-10,-6],[-12+run*4,0]],2.4); D.line(c,[[8,-6],[10-run*4,0]],2.4);
    D.ell(c,-2,-12,18,10);
    D.ell(c,14,-17,10,9);
    D.ell(c,10,-27,6,6); D.ell(c,10,-27,2.5,2.5,'#ffc3cf',1.4);
    c.beginPath(); c.moveTo(22,-18); c.lineTo(27,-15); c.lineTo(22,-13); D.p(c,WH,1.8); D.ell(c,27,-15,1.8,1.8,'#ff9fb0',1.2);
    D.eyes(c,17,17,-19,u,T,'angry');
    D.line(c,[[24,-13],[31,-11]],1.2); D.line(c,[[24,-15],[31,-16]],1.2);
    c.restore(); },
  skeleton(c,u,T){ const sw=D.swing(u,-0.5,1.1,2.3), s=D.step(u,5);
    c.save(); c.translate(Art.lunge(u,10),-D.bob(u,2));
    D.rr(c,-9+s,-16,7,16,3,'#cfe8c5'); D.rr(c,3-s,-16,7,16,3,'#cfe8c5');
    D.rr(c,-14,-42,28,28,8,'#e8e1f0');
    D.line(c,[[-14,-30],[14,-30]],1.6); D.line(c,[[-4,-42],[-8,-20]],1.6);
    D.ell(c,1,-56,15,14,'#cfe8c5');
    D.line(c,[[-6,-64],[0,-60],[6,-64]],1.8);
    D.eyes(c,0,0,-56,u,T,'x'); D.dot(c,10,-56,2.2,2.2); D.mouth(c,6,-48,'grr');
    D.sword(c,14,-28,sw,26,'#d9d1c5'); D.hand(c,14,-28,4,'#cfe8c5');
    c.restore(); },
  ghost(c,u,T){ const t=T*1.2+u.seed, fy=u.portrait?-6:-48+Math.sin(t*3)*7;
    c.save(); c.translate(Art.lunge(u,14),fy); c.globalAlpha*=0.95;
    c.beginPath(); c.moveTo(-16,-4); c.lineTo(-16,-26); c.arc(0,-26,16,Math.PI,0); c.lineTo(16,-4);
    for(let i=0;i<4;i++){ const x=16-i*8; c.quadraticCurveTo(x-4,-4+(i%2?5:-5)+Math.sin(T*8+i)*2,x-8,-4); }
    c.closePath(); D.p(c);
    D.ell(c,0,-30,2.6,3.6,LN,0.1); D.ell(c,9,-30,2.6,3.6,LN,0.1);
    D.ell(c,5,-20,3.6,4.4,LN,0.1); D.ell(c,5,-17,2.2,1.6,'#ff9fb0',0.1);
    c.restore(); },
  zombie(c,u,T){ const s=D.step(u,4), r=D.pow(u)*8;
    c.save(); c.translate(Art.lunge(u,8),-D.bob(u,1.5)); c.rotate(u.state==='walk'?Math.sin(D.ph(u)*6.283)*0.05:0);
    D.rr(c,-8+s,-13,6,13,3,'#c9e7bd'); D.rr(c,2-s,-13,6,13,3,'#c9e7bd');
    c.beginPath(); c.moveTo(-11,-12); c.lineTo(-9,-32); c.lineTo(10,-32); c.lineTo(12,-12); c.lineTo(6,-15); c.lineTo(0,-11); c.lineTo(-6,-15); c.closePath(); D.p(c,'#e3dff0');
    D.ell(c,1,-42,12,11,'#c9e7bd');
    D.line(c,[[-7,-48],[-2,-46]],1.6); D.line(c,[[-5,-50],[-5,-44]],1.6);
    D.eyes(c,4,10,-43,u,T,'line'); D.mouth(c,7,-36,'frown');
    D.rr(c,6,-28,18+r,5.5,2.5,'#c9e7bd',2); D.rr(c,4,-23,16+r,5.5,2.5,'#c9e7bd',2);
    c.restore(); },
  boar(c,u,T){ const run=u.state==='walk'?Math.sin(D.ph(u)*6.283):0;
    c.save(); c.translate(Art.lunge(u,22),-(u.state==='walk'?Math.abs(run)*3:0));
    D.line(c,[[-12,-6],[-14+run*4,0]],2.6); D.line(c,[[10,-6],[12-run*4,0]],2.6);
    // 고슴도치 가시
    c.beginPath(); c.moveTo(-26,-10);
    for(let i=0;i<7;i++){ const a=Math.PI*(1-i/6), r1=26, r2=36; c.lineTo(Math.cos(a)*r1-2, -12-Math.sin(a)*r1*0.8); c.lineTo(Math.cos(a-0.22)*r2-2, -12-Math.sin(a-0.22)*r2*0.8); }
    c.lineTo(24,-10); c.closePath(); D.p(c,'#e8e3dc');
    D.ell(c,4,-12,22,12);
    D.ell(c,22,-14,9,8); D.ell(c,29,-14,2.4,2.4,LN,0.1);
    D.eyes(c,21,21,-17,u,T,'angry');
    c.restore(); },
  metalslime(c,u,T){ const ph=D.ph(u), walk=u.state==='walk'; let sq=walk?Math.sin(ph*6.283)*0.06:0; if(u.atkP>0) sq=-D.pow(u)*0.18;
    c.save(); c.translate(Art.lunge(u,12),-(walk?Math.abs(Math.sin(ph*6.283))*4:0)); c.scale(1-sq*.5,1+sq);
    D.rr(c,-17,-34,34,34,7,'#dfe3ea');
    D.line(c,[[-11,-28],[-5,-28]],2); D.line(c,[[10,-6],[13,-9]],1.6);
    const sh=(T*1.5+u.seed)%2; if(sh<1){ c.save(); c.beginPath(); c.roundRect(-17,-34,34,34,7); c.clip(); c.globalAlpha=0.9; c.fillStyle='#fff'; c.beginPath(); c.moveTo(-26+sh*44,-36); c.lineTo(-20+sh*44,-36); c.lineTo(-30+sh*44,2); c.lineTo(-36+sh*44,2); c.fill(); c.restore(); D.rr(c,-17,-34,34,34,7,null); }
    D.eyes(c,2,11,-20,u,T,'angry'); D.mouth(c,6.5,-11,'line');
    c.restore(); },
  alien(c,u,T){ const t=T*1.3+u.seed, s=D.step(u,4);
    c.save(); c.translate(Art.lunge(u,12),-D.bob(u,2));
    D.line(c,[[-5,-12],[-6+s,0]],2.6); D.line(c,[[5,-12],[6-s,0]],2.6);
    D.ell(c,0,-22,11,12,'#eadcff');
    D.ell(c,1,-44,16,14,'#eadcff');
    D.line(c,[[-6,-56],[-10,-66]],1.8); D.ell(c,-10,-67,2.6,2.6,'#b6ffcf',1.6); D.line(c,[[8,-56],[12,-66]],1.8); D.ell(c,12,-67,2.6,2.6,'#b6ffcf',1.6);
    D.dot(c,-1,-45); D.dot(c,6,-47); D.dot(c,12,-44); D.mouth(c,6,-37,'o');
    c.save(); c.globalAlpha=0.35; D.ell(c,1,-44,22,20,'#dff6ff',0.01); c.restore(); D.ell(c,1,-44,22,20,null,2.2);
    D.line(c,[[10,-22],[20,-18-D.pow(u)*6]],2.4);
    c.restore(); },
  boss(c,u,T){ const p=D.pow(u), s=D.step(u,7);
    c.save(); c.translate(Art.lunge(u,10),-D.bob(u,3));
    D.rr(c,-30+s,-34,22,34,6,'#d6d8e0'); D.rr(c,8-s,-34,22,34,6,'#d6d8e0');
    D.rr(c,-46,-126,92,94,16,'#e9ebf1',3.4);
    D.rr(c,-26,-110,52,34,8,'#d6d8e0',2.6); D.line(c,[[-18,-62],[18,-62]],2.4); D.line(c,[[-18,-52],[18,-52]],2.4);
    D.rr(c,-34,-182,68,56,14,'#e9ebf1',3.4);
    D.rr(c,-22,-168,48,22,8,'#f6f6f8',2.4);
    D.eyes(c,-6,12,-157,u,T,'angry'); D.mouth(c,4,-136,'grr');
    c.beginPath(); c.moveTo(-28,-182); c.lineTo(-24,-206); c.lineTo(-10,-192); c.lineTo(2,-214); c.lineTo(14,-192); c.lineTo(28,-206); c.lineTo(30,-182); c.closePath(); D.p(c,'#ffe27a',3);
    c.save(); c.translate(48,-112); c.rotate(-p*2+0.2); D.rr(c,-9,-6,18,52,8,'#d6d8e0',3); D.rr(c,-14,42,28,24,8,'#e9ebf1',3); c.restore();
    c.restore(); },
  ufo(c,u,T){ const t=T+u.seed, fy=u.portrait?0:-60+Math.sin(t*1.5)*8, beam=D.pow(u);
    c.save(); c.translate(Art.lunge(u,8),fy);
    if(beam>0.1){ c.save(); c.globalAlpha=beam*0.45; c.fillStyle='#d4ffe6'; c.beginPath(); c.moveTo(16,-4); c.lineTo(66,60); c.lineTo(-30,60); c.lineTo(-14,-4); c.fill(); c.restore(); }
    D.ell(c,0,-30,26,24,'#eef8ff'); 
    D.ell(c,0,-24,11,12,'#eadcff'); D.dot(c,-4,-28); D.dot(c,5,-28); D.mouth(c,0,-21,'o');
    D.ell(c,0,-6,64,16,'#e3e6ee',3.2);
    D.ell(c,0,-10,46,7,WH,2);
    for(let i=0;i<6;i++){ const on=((T*4+i)|0)%2; D.ell(c,-45+i*18,-2,3.6,3.6,on?'#ffe27a':'#ffb3c1',1.8); }
    D.ell(c,0,8,22,5,'#d6d8e0',2.4);
    c.restore(); },
};

/* ---------- 낙서풍 기지 ---------- */
const DB = {
  ally(c,b,T){
    c.save(); c.translate(b.x+(b.shake>0?rand(-4,4):0), GROUND);
    c.fillStyle='rgba(0,0,0,.12)'; c.beginPath(); c.ellipse(0,4,62,8,0,0,7); c.fill();
    c.beginPath(); c.moveTo(-40,0); c.lineTo(-30,-170); c.lineTo(30,-170); c.lineTo(40,0); c.closePath(); D.p(c,WH,3.2);
    for(let i=0;i<5;i++) D.rr(c,-34+i*14,-184,10,16,2,WH,2.6);
    D.line(c,[[-35,-120],[35,-120]],2); D.line(c,[[-37,-70],[37,-70]],2);
    D.ell(c,-12,-145,4,5,LN,0.1); D.ell(c,12,-145,4,5,LN,0.1);
    D.mouth(c,0,-134,'w');
    c.beginPath(); c.moveTo(-14,0); c.lineTo(-14,-30); c.arc(0,-30,14,Math.PI,0); c.lineTo(14,0); D.p(c,WH,2.6);
    const wv=Math.sin(T*4);
    D.line(c,[[0,-184],[0,-222]],2.6);
    c.beginPath(); c.moveTo(0,-222); c.quadraticCurveTo(14,-222+wv*3,28,-216); c.quadraticCurveTo(14,-210-wv*2,0,-206); c.closePath(); D.p(c,'#ff8fa8',2.2);
    c.fillStyle=LN; c.font='13px Jua, sans-serif'; c.textAlign='center'; c.fillText('W',12,-210);
    c.restore();
  },
  enemy(c,b,T){
    c.save(); c.translate(b.x+(b.shake>0?rand(-4,4):0), GROUND);
    c.fillStyle='rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(0,4,62,8,0,0,7); c.fill();
    c.beginPath(); c.moveTo(-44,0); c.lineTo(-30,-150); c.lineTo(-20,-140); c.lineTo(-10,-190); c.lineTo(0,-160); c.lineTo(12,-196); c.lineTo(22,-142); c.lineTo(32,-152); c.lineTo(44,0); c.closePath(); D.p(c,'#d4d0dc',3.2);
    D.line(c,[[-30,-60],[-18,-54]],2); D.line(c,[[20,-90],[30,-96]],2); D.line(c,[[-24,-110],[-16,-100]],2);
    const bl=(T%4)<0.15;
    D.ell(c,0,-100,20,bl?2:15,WH,2.8); if(!bl){ D.ell(c,-3+Math.sin(T*0.8)*5,-100,6,9,'#ff9fb0',2); D.ell(c,-3+Math.sin(T*0.8)*5,-100,2,5,LN,0.1); }
    c.beginPath(); c.moveTo(-16,0); c.lineTo(-16,-26); c.quadraticCurveTo(0,-46,16,-26); c.lineTo(16,0); D.p(c,'#8a8496',2.6);
    c.restore();
  },
};

Object.assign(DRAWERS, DD);
const Assets = { load(){ return Promise.resolve(); } };
function setupWalk(){ Object.assign(WALK_W,{ slime:12, knight:10, archer:10, golem:6, mushroom:7, squirrel:12, duck:10, snowmage:9, penguin:9, frog:7, sheep:9, robot:8, fox:14, astronaut:10, turtle:4, bee:16,
  eslime:11, wolf:18, skeleton:7, zombie:6, boar:16, metalslime:9, alien:10, boss:3 }); }


function drawPortrait(canvas, key, flip=false, scale=1){
  const c=canvas.getContext('2d'), w=canvas.width, h=canvas.height; c.clearRect(0,0,w,h);
  const u={key,def:UNITS[key]||ENEMIES[key],animT:0,state:'idle',atkP:0,seed:0.3,portrait:true};
  const [bx,by,bw,bh]=FX.box(key,true);
  const s=Math.min(w*0.86/bw, h*0.86/bh)*scale;
  c.save(); c.translate(w/2-(bx+bw/2)*(flip?-s:s), h*0.95-(by+bh)*s); c.scale(flip?-s:s, s);
  FX.stamp(c, FX.paint(key,u,1,s), 2.4);
  c.restore();
}

/* =========================================================
   BATTLE — 전투 시뮬레이션
   ========================================================= */
const PROJ_SPEED = { arrow:640, fire:420, ice:560, cannon:470, sun:400, acorn:520, holy:480, laser:900, feather:620, clock:420 };
const PROJ_SOUND = { arrow:'arrow', fire:'fire', ice:'ice', cannon:'cannon', sun:'fire', acorn:'arrow', holy:'ice', laser:'laser', feather:'arrow', clock:'clock' };
const PROJ_TRAIL = { fire:['#ff9a3c','#ffd23f'], sun:['#ffd23f','#ff5d3c'], ice:['#bff4ff','#ffffff'], holy:['#fff6b0','#ffffff'], clock:['#bff4ff','#ffd23f'] };
const hasT = (d,t)=> !!(d.traits && d.traits.includes(t));
function abilityTags(d){
  return [
    ...(d.strong||[]).map(t=>`🎯 ${TRAITS[t].icon}${TRAITS[t].name}에 강함`),
    d.purify?'✨ 정화':'', d.metalBreak?'🧲 강철 파괴':'', d.shieldBreak?'🛡️ 보호막 파괴':'', d.freeze?'⏸ 멈춤':'', d.kb?'💨 넉백':'', d.noKb?'🧱 넉백 무시':'',
    d.slow?'❄️ 둔화':'', d.crit?'⚡ 치명타':'', d.revive?'🔥 부활':'', d.aoe?'💥 범위':'', d.def?`🛡 피해 ${Math.round(d.def*100)}%↓`:'', d.fly?'🪽 비행':''
  ].filter(Boolean).map(x=>`<span>${x}</span>`).join('');
}
const CANNON_T = 30;
const Battle = {
  running:false, paused:false, quizOpen:false, speed:1, uid:0,
  start(si){
    const st=STAGES[si], up=Save.data.up;
    this.si=si; this.stage=st; this.time=0; this.over=false; this.endT=0; this.win=false;
    this.units=[]; this.projs=[]; this.parts=[]; this.texts=[]; this.rings=[]; this.slams=[]; this.souls=[]; this.hits=[]; this.beam=0; this.cannon=0;
    const bh=Math.round(3000*(1+0.15*up.base));
    this.ally={x:ALLY_BASE_X,w:BASE_W,hp:bh,maxHp:bh,shake:0,isBase:true,team:'ally'};
    this.enemy={x:ENEMY_BASE_X,w:BASE_W,hp:st.baseHp,maxHp:st.baseHp,shake:0,isBase:true,team:'enemy'};
    this.energy=500+150*up.start; this.maxEnergy=5000; this.eLv=1; this.baseRate=50*(1+0.1*up.energy);
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
  get rate(){ return this.baseRate + (this.eLv-1)*25; },
  eUpCost(){ return this.eLv>=8 ? Infinity : 150 + this.eLv*100; },
  upgradeEnergy(){
    const cost=this.eUpCost();
    if(!this.running||this.over||this.energy<cost) return;
    this.energy-=cost; this.eLv++; Sound.play('upgrade');
    this.floatText(ALLY_BASE_X, GROUND-240, `자원 생산 Lv.${this.eLv}!`, '#ffd23f', 22);
    UI.updateHud();
  },
  stats(key){ const d=UNITS[key], lv=Save.data.units[key].lv, m=1+0.12*(lv-1); return {hp:Math.round(d.hp*m), atk:Math.round(d.atk*m)}; },
  onField(key){ return this.units.filter(u=>u.team==='ally' && u.key===key && !u.dying).length; },
  canSummon(key){ const card=this.deck.find(d=>d.key===key); return card && card.cd<=0 && this.energy>=UNITS[key].cost && this.onField(key)<fieldCap(key) && !this.over; },
  makeUnit(team,key,def,hp,atk){
    return { id:++this.uid, team, key, def, x:0, y:GROUND, lane:rand(-10,10), hp, maxHp:hp, atk, w:def.w, atkTimer:0.2, atkP:0, pending:null,
      state:'walk', animT:rand(0,3), seed:Math.random(), hitT:0, dying:false, dieT:0, kbv:0, spawnT:0, power:false, hopT:0, kbs:def.kbs||(def.boss?4:(def.def||def.noKb)?3:2), kbNext:hp*(1-1/(def.kbs||(def.boss?4:(def.def||def.noKb)?3:2))) };
  },
  summon(key, power){
    const d=UNITS[key], s=this.stats(key), card=this.deck.find(c=>c.key===key);
    this.energy-=d.cost; card.cd=d.cd;
    const u=this.makeUnit('ally',key,d,s.hp,Math.round(s.atk*(power?1.3:1)));
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
    this.cannon=Math.min(1,this.cannon+dt/CANNON_T);
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
    if(u.hopT>0) u.hopT-=dt;
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
    if(a && a.freeze && tg.team==='enemy' && !(tg.freezeImmune>this.time)){ tg.freezeT=tg.def.boss?a.freeze*0.4:a.freeze; tg.freezeImmune=this.time+tg.freezeT+3; if(!tg.def.boss){ tg.atkP=0; tg.pending=null; } }
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
    this.hits.push({x:tg.x+rand(-8,8), y:hy+16+rand(-6,6), life:0.2, s:tg.def.boss?1.5:1});
    // 냥코식 넉백: 체력이 일정 비율 아래로 내려갈 때마다 통통 튕겨 뒤로 밀림
    if(tg.hp>0 && tg.hp<=tg.kbNext){ tg.kbNext-=tg.maxHp/tg.kbs; this.knock(tg, tg.def.boss?140:260); }
    if(strong && !src.crit) this.floatText(tg.x+rand(-8,8), hy-22, '상성!', '#ffd23f', 14);
    if(src.crit){ this.floatText(tg.x+rand(-8,8), hy-6, '⚡'+real+'!', '#ffe14d', 26); Sound.play('crit'); for(let i=0;i<8;i++) this.parts.push({x:tg.x,y:hy+20,vx:rand(-220,220),vy:rand(-220,0),r:rand(2,4),life:.3,max:.3,color:'#ffe14d',g:0}); }
    else this.floatText(tg.x+rand(-8,8), hy, String(real), src.team==='ally'?'#fff':'#ff8f8f', tg.def.boss?24:18);

    Sound.play('hit');
    if(tg.hp<=0) this.kill(tg, src);
  },
  knock(u,v){ if(u.dying) return; u.kbv=v; u.hopT=0.45; u.atkP=0; u.pending=null; },
  fireCannon(){
    this.cannon=0; this.beam=0.6; this.shakeT=Math.max(this.shakeT,0.6); Sound.play('boom');
    const dmg=Math.round(150+70*this.si);
    for(const e of this.units.filter(u=>u.team==='enemy'&&!u.dying)){ this.damage(e,dmg,{team:'ally'}); if(!e.dying) this.knock(e, e.def.boss?120:380); }
    this.floatText(W/2, GROUND-200, '💥 단어 대포!', '#ffd23f', 30);
  },
  kill(u, src){
    // 언데드: 한 번 되살아남. 정화(purify) 공격으로 쓰러지면 부활하지 못함
    if(u.team==='enemy' && hasT(u.def,'undead') && !u.revived && !this.over){
      if(src && src.u && src.u.def.purify){ this.floatText(u.x, GROUND-110, '✨ 정화!', '#fff6b0', 20); for(let i=0;i<14;i++) this.parts.push({x:u.x,y:GROUND-50,vx:rand(-120,120),vy:rand(-220,-60),r:rand(2,5),life:.7,max:.7,color:'#fff6b0',g:0,star:true}); }
      else { u.revived=true; u.hp=Math.round(u.maxHp*0.5); u.hitT=0; u.kbv=0; u.freezeT=0.6;
        this.floatText(u.x, GROUND-110, '💀 되살아남!', '#9be55a', 20); this.rings.push({x:u.x,y:GROUND-30,r:8,life:.5,max:.5,color:'#9be55a'}); Sound.play('die'); return; }
    }
    if(u.def.revive && !u.revived && !this.over){
      u.revived=true; u.hp=Math.round(u.maxHp*0.6); u.hitT=0; u.kbv=0;
      const cy=GROUND-90;
      this.rings.push({x:u.x,y:cy,r:10,life:.7,max:.7,color:'#ffd23f'}); this.rings.push({x:u.x,y:cy,r:2,life:.9,max:.9,color:'#ff5d3c'});
      for(let i=0;i<30;i++) this.parts.push({x:u.x,y:cy,vx:rand(-200,200),vy:rand(-300,-60),r:rand(3,7),life:rand(.5,1),max:1,color:['#ffd23f','#ff8a3c','#fff3b0'][i%3],g:200,star:i%2===0});
      this.floatText(u.x, cy-50, '🔥 부활!', '#ffd23f', 28); Sound.play('revive');
      return;
    }
    u.dying=true; u.dieT=0; u.hp=0;
    if(u.team==='ally') this.souls.push({x:u.x, y:GROUND-30, life:1.6, max:1.6, fly:!!u.def.fly});
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
    for(const o of this.souls){ o.life-=dt; o.y-=46*dt; } this.souls=this.souls.filter(o=>o.life>0);
    for(const h of this.hits) h.life-=dt; this.hits=this.hits.filter(h=>h.life>0);
    if(this.beam>0) this.beam-=dt;
    this.slams=this.slams.filter(s=>s.life>0);
  },
};

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
const POTATO = ()=>Save.data.settings.potato;
/* 감자 모드용 스프라이트 캐시: 유닛 동작을 몇 장의 그림으로 미리 그려 두고 찍기만 함 */
/* =========================================================
   FX — 캐릭터 마감 처리: 두꺼운 바깥 외곽선 + 위 밝게/아래 어둡게 명암
   캐릭터를 작은 캔버스에 먼저 그리고, 실루엣으로 외곽선을 둘러 찍음
   ========================================================= */
const OFFS=[[1,0],[-1,0],[0,1],[0,-1],[.71,.71],[-.71,.71],[.71,-.71],[-.71,-.71]];
const FX = {
  bounds:new Map(), a:document.createElement('canvas'), b:document.createElement('canvas'), noGlow:false, flat:true,
  ctxA(){
    if(this._ga) return this._ga;
    const g=this.a.getContext('2d'), d=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,'shadowBlur'), fx=this;
    if(d && d.set) Object.defineProperty(g,'shadowBlur',{configurable:true, get(){ return d.get.call(this); }, set(v){ d.set.call(this, fx.noGlow?0:v); }});
    return this._ga=g;
  },
  box(key,pt=false){
    const bk=key+(pt?'|p':''); if(this.bounds.has(bk)) return this.bounds.get(bk);
    const S=440, OY=310, cv=document.createElement('canvas'); cv.width=S; cv.height=S;
    const g=cv.getContext('2d',{willReadFrequently:true}); let x0=S,y0=S,x1=0,y1=0;
    const def=UNITS[key]||ENEMIES[key], poses=[];
    for(let i=0;i<6;i++) poses.push(['walk',i/8,0,i*0.37]);
    for(let i=0;i<5;i++) poses.push(['attack',0,(i+0.5)/5,i*0.53]);
    poses.push(['idle',0,0,1]);
    for(const [st,at,ap,T] of poses){
      g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,S,S); g.translate(S/2,OY);
      DRAWERS[key].call(Art,g,{key,def,state:st,animT:at,atkP:ap,seed:0.3,hitT:0,portrait:pt},T);
      const d=g.getImageData(0,0,S,S).data;
      for(let y=0;y<S;y+=2) for(let x=0;x<S;x+=2) if(d[(y*S+x)*4+3]>10){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    }
    const pad=10, box=[x0-S/2-pad, y0-OY-pad, x1-x0+pad*2, y1-y0+pad*2];
    this.bounds.set(bk,box); return box;
  },
  // ps = 화면 픽셀 / 월드 단위. 결과는 this.a(색) / this.b(외곽선 실루엣)
  paint(key,u,T,ps){
    ps=Math.max(0.3,Math.min(3,ps));
    const [x,y,w,h]=this.box(key,!!u.portrait), pad=3, W=Math.ceil(w*ps)+pad*2, H=Math.ceil(h*ps)+pad*2, a=this.a, b=this.b;
    if(a.width<W||a.height<H){ a.width=b.width=Math.max(a.width,W); a.height=b.height=Math.max(a.height,H); }
    const ga=this.ctxA(), gb=b.getContext('2d');
    // 1) 빛 번짐 없이 그려서 외곽선용 실루엣을 만듦 (빛 주변에 검은 테두리가 생기지 않게)
    if(this.flat){
      ga.setTransform(1,0,0,1,0,0); ga.globalCompositeOperation='source-over'; ga.clearRect(0,0,W+4,H+4);
      ga.setTransform(ps,0,0,ps,pad-x*ps,pad-y*ps); DRAWERS[key].call(Art,ga,u,T); ga.setTransform(1,0,0,1,0,0);
      return {W,H,x:x-pad/ps,y:y-pad/ps,ps};
    }
    this.noGlow=true;
    ga.setTransform(1,0,0,1,0,0); ga.globalCompositeOperation='source-over'; ga.clearRect(0,0,W+4,H+4);
    ga.setTransform(ps,0,0,ps,pad-x*ps,pad-y*ps); DRAWERS[key].call(Art,ga,u,T);
    ga.setTransform(1,0,0,1,0,0);
    gb.setTransform(1,0,0,1,0,0); gb.globalCompositeOperation='source-over'; gb.clearRect(0,0,W+4,H+4);
    gb.drawImage(a,0,0,W,H,0,0,W,H); gb.globalCompositeOperation='source-in'; gb.fillStyle=INK; gb.fillRect(0,0,W,H); gb.globalCompositeOperation='source-over';
    // 2) 빛 효과까지 넣어 진짜 그림을 그림
    this.noGlow=false;
    ga.clearRect(0,0,W+4,H+4);
    ga.setTransform(ps,0,0,ps,pad-x*ps,pad-y*ps); DRAWERS[key].call(Art,ga,u,T);
    ga.setTransform(1,0,0,1,0,0); ga.globalCompositeOperation='source-atop';
    const g=ga.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'rgba(255,255,255,0.24)'); g.addColorStop(0.4,'rgba(255,255,255,0)'); g.addColorStop(0.6,'rgba(45,20,90,0)'); g.addColorStop(1,'rgba(45,20,90,0.30)');
    ga.fillStyle=g; ga.fillRect(0,0,W,H);
    const g2=ga.createRadialGradient(W*0.32,H*0.22,0,W*0.32,H*0.22,Math.max(W,H)*0.45);
    g2.addColorStop(0,'rgba(255,255,255,0.18)'); g2.addColorStop(1,'rgba(255,255,255,0)');
    ga.fillStyle=g2; ga.fillRect(0,0,W,H);
    ga.globalCompositeOperation='source-over';
    return {W,H,x:x-pad/ps,y:y-pad/ps,ps};
  },
  stamp(c,r,ol){
    const {W,H,x,y,ps}=r, w=W/ps, h=H/ps; if(this.flat) ol=0;
    if(ol>0) for(const [dx,dy] of OFFS) c.drawImage(this.b,0,0,W,H,x+dx*ol,y+dy*ol,w,h);
    c.drawImage(this.a,0,0,W,H,x,y,w,h);
  },
  draw(c,u,T,ps,ol=2.3){ this.stamp(c,this.paint(u.key,u,T,ps),ol); },
  // 완성된 그림을 새 캔버스로 굽기 (감자 모드 캐시용)
  bake(key,u,T,ps,ol=2.3){
    if(this.flat) ol=0;
    const r=this.paint(key,u,T,ps), m=Math.ceil(ol*ps)+1, cv=document.createElement('canvas'); cv.width=r.W+m*2; cv.height=r.H+m*2;
    const g=cv.getContext('2d');
    for(const [dx,dy] of OFFS) g.drawImage(this.b,0,0,r.W,r.H,m+dx*ol*ps,m+dy*ol*ps,r.W,r.H);
    g.drawImage(this.a,0,0,r.W,r.H,m,m,r.W,r.H);
    return {cv, x:r.x-m/ps, y:r.y-m/ps, w:cv.width/ps, h:cv.height/ps};
  },
};
const UNIT_SCALE = 1.15;
/* 스프라이트 캐시: 동작별 그림을 외곽선·명암까지 입혀 한 번만 굽고, 이후엔 찍기만 함 (일반·감자 모드 공통) */
const WALK_W={slime:12,knight:11,archer:10,golem:5,bee:16,mushroom:9,snowmage:9,penguin:9,fox:18,squirrel:12,duck:10,frog:9,sheep:9,robot:8,astronaut:10,turtle:4,eslime:10,wolf:16,skeleton:8,zombie:5,boar:14,metalslime:10,alien:6,boss:3};
const FLIERS=new Set(['dragon','phoenix','owl','bat','ghost','ufo']);
const FLY_P=2*Math.PI/3;
const SpriteCache = {
  m:new Map(),
  frame(u,T){
    if(u.atkP>0) return 'a'+Math.min(5,Math.floor(u.atkP*6));
    if(FLIERS.has(u.key)) return 'f'+(Math.floor(((T+u.seed*5)%FLY_P)/FLY_P*24)%24);
    if(u.state==='walk'){ const P=2*Math.PI/(WALK_W[u.key]||10); return 'w'+(Math.floor((u.animT%P)/P*8)%8); }
    return 'i';
  },
  draw(c,u,T,ps){
    ps=Math.round(ps*10)/10;
    const f=this.frame(u,T), id=u.key+'|'+f+'|'+ps; let sp=this.m.get(id);
    if(!sp){
      const n=+f.slice(1)||0, P=2*Math.PI/(WALK_W[u.key]||10);
      let fake={ key:u.key, def:u.def, state:'attack', animT:0, atkP:0, seed:0.3, hitT:0, portrait:false }, t=0.3;
      if(f[0]==='w'){ fake.state='walk'; fake.animT=n/8*P; t=fake.animT; }
      else if(f[0]==='f'){ fake.state='walk'; t=n/24*FLY_P; fake.animT=t; }
      else if(f[0]==='a'){ fake.atkP=(n+0.5)/6; }
      sp=FX.bake(u.key,fake,t,ps); this.m.set(id,sp);
    }
    c.drawImage(sp.cv,sp.x,sp.y,sp.w,sp.h);
  },
  clear(){ this.m.clear(); }
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
    SpriteCache.clear();
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
    DB.ally(c,B.ally,T); DB.enemy(c,B.enemy,T);
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
    // 단어 대포 빔
    if(B.beam>0){ const a=Math.min(1,B.beam/0.25), hgt=60*a; c.save(); c.globalAlpha=Math.min(1,B.beam*3);
      c.fillStyle='#fffbe0'; c.strokeStyle=LN; c.lineWidth=3; c.beginPath(); c.roundRect(ALLY_BASE_X+30,GROUND-70-hgt/2,W,hgt,hgt/2); c.fill(); c.stroke();
      c.fillStyle='#fff'; c.fillRect(ALLY_BASE_X+30,GROUND-70-hgt*0.15,W,hgt*0.3); c.restore(); }
    // 타격 별
    for(const h of B.hits){ const p=1-h.life/0.2, r=(10+p*8)*h.s; c.save(); c.translate(h.x,h.y); c.rotate(h.x); c.globalAlpha=Math.min(1,h.life*8);
      c.beginPath(); for(let i=0;i<16;i++){ const a=i*Math.PI/8, rr=i%2?r*0.45:r; c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr); } c.closePath(); c.fillStyle='#fff'; c.fill(); c.lineWidth=2.4; c.strokeStyle=LN; c.stroke(); c.restore(); }
    // 영혼 (아군이 쓰러지면 둥실 올라감)
    for(const o of B.souls){ const a=Math.min(1,o.life/0.6); c.save(); c.globalAlpha=a; c.translate(o.x+Math.sin(o.life*6)*4,o.y);
      c.beginPath(); c.ellipse(0,-12,9,11,0,Math.PI,0); c.lineTo(9,0); c.quadraticCurveTo(4,-4,2,2); c.quadraticCurveTo(-2,-4,-5,2); c.quadraticCurveTo(-7,-3,-9,0); c.closePath(); c.fillStyle='#fff'; c.fill(); c.lineWidth=2.2; c.strokeStyle=LN; c.stroke();
      D.dot(c,-2,-12,1.4,2); D.dot(c,4,-12,1.4,2);
      c.beginPath(); c.ellipse(1,-27,7,2.4,0,0,7); c.lineWidth=2.2; c.strokeStyle='#ffc93a'; c.stroke();
      D.wing(c,-7,-8,-0.6+Math.sin(o.life*14)*0.3,10); c.restore(); }
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
      c.font=`${Math.round(t.size*s)}px Jua, sans-serif`;
      c.lineWidth=4; c.strokeStyle=INK; c.strokeText(t.text,t.x,t.y); c.fillStyle=t.color; c.fillText(t.text,t.x,t.y);
    }
    c.globalAlpha=1;
  },
  star(c,x,y,r){ c.beginPath(); for(let i=0;i<10;i++){ const a=i*Math.PI/5-Math.PI/2, rr=i%2?r*.45:r; c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr); } c.closePath(); c.fill(); },
  drawUnit(c,u,T){
    const big=u.def.boss;
    c.save(); c.translate(u.x, u.y+u.lane*0.6);
    // 그림자
    const shW = u.w*1.1;
    c.fillStyle='rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0,2,shW,shW*0.22,0,0,7); c.fill();
    if(u.hopT>0 && !u.dying) c.translate(0,-Math.sin((1-u.hopT/0.45)*Math.PI)*22);
    if(u.dying && u.team==='ally'){ const p=Math.min(1,u.dieT/0.25); c.globalAlpha=1-p; }
    else if(u.dying){ const p=u.dieT/0.7; c.globalAlpha=Math.max(0,1-p); c.translate(0,-p*30); c.rotate((u.team==='ally'?-1:1)*p*0.8); c.scale(1+p*.2,1-p*.4); }
    if(u.spawnT>0){ const p=1-u.spawnT/0.45; const e=p<1? 1-Math.pow(1-p,3):1; c.translate(0,-(1-e)*80); c.scale(0.4+e*0.6,0.4+e*0.6+(p>0.8?Math.sin((p-0.8)*15)*0.1:0)); }
    if(u.power){ c.save(); c.shadowColor='#ffd23f'; c.shadowBlur=20; c.fillStyle='rgba(255,210,63,.25)'; c.beginPath(); c.ellipse(0,-30,u.w*1.4,40,0,0,7); c.fill(); c.restore(); }
    if(u.team==='enemy') c.scale(-1,1);
    c.scale(UNIT_SCALE,UNIT_SCALE); if(big) c.scale(1.05,1.05);
    if(u.hitT>0){ if(POTATO()) c.globalAlpha*=0.55; else c.filter='brightness(2.2) saturate(.4)'; }
    SpriteCache.draw(c,u,T, POTATO()?0.6:Math.min(1.5,this.scale*UNIT_SCALE*(big?1.05:1)));
    c.filter='none';
    if(u.freezeT>0 && !u.dying){ const fy=u.def.fly?-66:0, hh=u.def.boss?170:70; c.fillStyle='rgba(190,240,255,.45)'; c.strokeStyle='rgba(255,255,255,.9)'; c.lineWidth=2; c.beginPath(); c.roundRect(-u.w*1.2,fy-hh,u.w*2.4,hh,6); c.fill(); c.stroke(); }
    if(u.shield>0 && !u.dying){ const fy=u.def.fly?(u.def.boss?-96:-66):0, r=u.def.boss?95:34; c.strokeStyle='rgba(199,125,255,.85)'; c.fillStyle='rgba(199,125,255,.15)'; c.lineWidth=3; c.beginPath(); c.ellipse(0,fy-r*0.8,r*0.9+Math.sin(T*6)*1.5,r,0,0,7); c.fill(); c.stroke(); }
    if(u.slowT>0 && !u.dying){ const fy=u.def.fly?-66:0; c.fillStyle='rgba(150,225,255,.35)'; c.beginPath(); c.ellipse(0,fy-26,u.w*1.3,32,0,0,7); c.fill(); c.fillStyle='#e6fbff'; Render.star(c,-u.w*0.8,fy-50+Math.sin(T*4)*3,5); Render.star(c,u.w*0.6,fy-12,4); }
    c.restore();
    // 체력바
    const top0 = (u.def.boss? GROUND-(u.key==='ufo'?200:210) : u.def.fly ? GROUND-({dragon:140,phoenix:160,owl:130,ghost:116}[u.key]||110) : GROUND-({golem:102,mushroom:84,snowmage:104,turtle:96,robot:96,frog:70,duck:72,zombie:86}[u.key]||86));
    const top = GROUND + FX.box(u.key)[1]*UNIT_SCALE*(u.def.boss?1.05:1) + 6;
    if(!u.dying && u.team==='enemy' && u.def.traits){ c.font='15px sans-serif'; c.textAlign='center'; c.fillText(u.def.traits.map(t=>TRAITS[t].icon).join(''), u.x, top-6+u.lane*0.6); }
    if(!u.dying && u.shield>0){ const bw=u.def.boss?110:42, x=u.x-bw/2, y=top+u.lane*0.6+(u.def.boss?13:9); c.fillStyle=INK; c.fillRect(x-2,y-1,bw+4,6); c.fillStyle='#c77dff'; c.fillRect(x,y,bw*u.shield/u.maxShield,4); }
    if(!u.dying && u.hp<u.maxHp){
      const bw = big?110:42, x=u.x-bw/2, y=top+u.lane*0.6;
      c.fillStyle=INK; c.beginPath(); c.roundRect(x-2,y-2,bw+4,big?12:8,4); c.fill();
      c.fillStyle=u.team==='ally'?'#5ed38a':'#ff5d5d'; c.beginPath(); c.roundRect(x,y,bw*Math.max(0,u.hp/u.maxHp),big?8:4,2); c.fill();
    }
  },
};

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
    $('#cannon').onclick=()=>this.tryCannon();
    $('#g-pull1').onclick=()=>Gacha.request(1,false);
    $('#g-free').onclick=()=>Gacha.request(1,true);
    $('#lk-skip').onclick=()=>Gacha.luckAnswer(-1);
    $('#btn-review').onclick=()=>Review.start();
    $('#lobby-review').onclick=()=>Review.start();
    $('#rv-close').onclick=()=>Review.close();
    $('#word-sort').onchange=()=>this.renderStats();
    this.wordFilter='all'; this.deckFilter='all';
    $('#g-pull10').onclick=()=>Gacha.request(10,false);
    $('#g-buy').onclick=()=>Gacha.buy();
    if(DEV_MODE){
      $('#screen-menu .foot-note').insertAdjacentHTML('afterbegin','<b style="color:#ffd23f;-webkit-text-stroke:0">🧪 테스트 버전 (재화 무제한 · 실사용 저장과 분리됨)</b><br>');
      const b=document.createElement('button'); b.className='chip-btn'; b.style.background='#ff8f8f'; b.textContent='🧪 테스트 재화 충전 (코인 +99,999 · 뽑기권 +100)';
      b.onclick=()=>{ Save.data.coins+=99999; Save.data.tickets+=100; Save.data.cleared=STAGES.length; Save.save(); this.refreshCoins(); this.toast('🧪','재화를 충전했어요!'); };
      $('.lobby-quick').appendChild(b);
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
      if($('#modal-luck').classList.contains('show')){
        if(['1','2','3','4'].includes(e.key)) Gacha.luckAnswer(+e.key-1);
        else if(e.key==='Escape') Gacha.luckAnswer(-1);
        return;
      }
      if($('#modal-review').classList.contains('show')){
        if(['1','2','3','4'].includes(e.key)) Review.answer(+e.key-1);
        else if(e.key==='Enter' || e.key===' ') { e.preventDefault(); Review.nextIfDone(); }
        else if(e.key==='Escape') Review.close();
        return;
      }
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
      if(e.key==='c'||e.key==='C') this.tryCannon();
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
    $('#app').classList.toggle('has-nav', name!=='battle');
    document.querySelectorAll('#navbar button').forEach(b=>b.classList.toggle('active', b.dataset.go===name || (name==='stages' && b.dataset.go==='menu')));
    this.refreshCoins();
    ({menu:()=>this.renderLobby(), deck:()=>this.renderDeck(), gacha:()=>Gacha.render(), stages:()=>this.renderStages(), shop:()=>this.renderShop(), stats:()=>this.renderStats(), achieve:()=>this.renderAch(), settings:()=>this.renderSettings()}[name]||(()=>{}))();
  },
  refreshCoins(){ document.querySelectorAll('.coin-val').forEach(e=>e.textContent=fmt(Save.data.coins)); document.querySelectorAll('.ticket-val').forEach(e=>e.textContent=Save.data.tickets); const dot=$('#gacha-dot'); if(dot){ dot.style.display=Save.data.tickets>0?'flex':'none'; dot.textContent=Save.data.tickets; } },
  toast(em,text){ const d=document.createElement('div'); d.className='toast'; d.innerHTML=`<span class="em">${em}</span><span>${text}</span>`; $('#toasts').appendChild(d); setTimeout(()=>d.remove(),3300); },
  banner(text,cls){ const b=$('#banner'); b.className=''; b.querySelector('.b-in').textContent=text; void b.offsetWidth; b.className='show '+(cls||''); },

  /* --- 메뉴 히어로 애니메이션 --- */
  menuHero(){ LobbyBG.start(); },

  /* --- 스테이지 선택 --- */
  renderStages(){
    $('#trait-guide').innerHTML = `<b class="jua" style="font-size:18px">📖 적 특성 안내</b> <span style="font-size:13px;opacity:.75">— 아군 카드의 🎯 표시는 그 특성의 적에게 1.8배 피해를 주고, 받는 피해는 40% 줄어요</span><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">${Object.values(TRAITS).map(t=>`<span style="background:${t.color}33;border:2px solid ${t.color};border-radius:10px;padding:3px 10px;font-size:13px"><b>${t.icon} ${t.name}</b> · ${t.desc}</span>`).join('')}</div>`;
    $('#trait-guide').insertAdjacentHTML('afterbegin', `<div class="stage-deck" style="margin-bottom:10px;padding-bottom:10px;border-bottom:2px dashed #d6cfe6"><b class="jua" style="font-size:18px">⚔️ 출전 편성</b>${[0,1,2].map(i=>`<button class="btn small ${i===Save.data.deckIdx?'':'white'}" data-preset="${i}">편성 ${i+1}</button>`).join('')}<div class="mini" id="stage-mini"></div><button class="btn small green" data-go2="deck" style="margin-left:auto">🐾 편성 바꾸기</button></div>`);
    Save.data.deck.forEach(k=>{ const cv=document.createElement('canvas'); cv.width=88; cv.height=72; cv.className='g-bg-'+gradeOf(k); drawPortrait(cv,k); $('#stage-mini').appendChild(cv); });
    $('#trait-guide').querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{ this.setPreset(+b.dataset.preset); this.renderStages(); });
    $('#trait-guide').querySelector('[data-go2]').onclick=()=>this.go('deck');
    const g=$('#stage-grid'); g.innerHTML='';
    STAGES.forEach((st,i)=>{
      const locked = i>Save.data.cleared, cleared=i<Save.data.cleared, best=Save.data.stageBest[st.id]||0;
      const d=document.createElement('div'); d.className='stage-card'+(locked?' locked':'');
      const cv=document.createElement('canvas'); cv.width=440; cv.height=240;
      Render.prepareBg(st.theme, cv);
      const c=cv.getContext('2d'); const sc=cv.width/W;
      const ens=[...new Set(st.spawns.map(s=>s.t))]; if(st.boss) ens.push(st.boss.t);
      c.save(); c.scale(sc,cv.height/H);
      const nb=ens.filter(k=>!ENEMIES[k].boss).length; let jj=0; ens.forEach((k,j)=>{ const isB=!!ENEMIES[k].boss; c.save(); const x=W*(st.boss?0.38:0.5)+(jj-(nb-1)/2)*(st.boss?190:220); if(!isB) jj++; c.translate(isB?W*0.8:x,GROUND); const s=isB?1.5:2.2; c.scale(-s,s); FX.stamp(c, FX.paint(k,{key:k,def:ENEMIES[k],animT:0,state:'idle',atkP:0,seed:j,portrait:false},0.5,s*sc), 2.4); c.restore(); });
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
      const d=UNITS[card.key], g=gradeOf(card.key), el=document.createElement('button'); el.className='card r-'+g+' g-bg-'+g; el.dataset.key=card.key;
      el.innerHTML=`<span class="key">${i+1}</span><span class="rar r-${g}">${'★'.repeat(RARITY[g].stars)}</span>${fieldCap(card.key)<99?`<span class="capb">최대 ${fieldCap(card.key)}</span>`:''}<canvas width="192" height="152"></canvas><span class="nm">${d.name}</span><span class="cost">⚡${d.cost}</span><div class="cdov"></div>`;
      drawPortrait(el.querySelector('canvas'),card.key);
      el.onclick=()=>this.tryCard(card.key);
      box.appendChild(el); card.el=el; card.ov=el.querySelector('.cdov');
    });
  },
  tryCannon(){ Sound.init(); if(!Battle.running||Battle.over||Battle.paused||Battle.quizOpen) return; if(Battle.cannon<1){ Sound.play('click'); return; } this.openQuiz('__cannon'); },
  tryCard(key){
    Sound.init();
    if(!Battle.running||Battle.over||Battle.paused||Battle.quizOpen) return;
    const card=Battle.deck.find(c=>c.key===key);
    if(card.cd>0){ Sound.play('click'); return; }
    if(Battle.onField(key)>=fieldCap(key)){ Sound.play('wrong'); Battle.floatText(ALLY_BASE_X+60,GROUND-200,`${UNITS[key].name}은(는) 한 번에 ${fieldCap(key)}마리까지!`,'#ff8f8f',18); return; }
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
    $('#cannon').style.setProperty('--p', (B.cannon*100).toFixed(1)+'%'); $('#cannon').classList.toggle('ready', B.cannon>=1); $('#cn-pct').textContent = B.cannon>=1 ? '발사 준비!' : Math.floor(B.cannon*100)+'%';
    for(const card of B.deck){
      if(!card.el) continue;
      const d=UNITS[card.key], poor=B.energy<d.cost;

      card.ov.style.height=(card.cd/d.cd*100)+'%';
      const full=B.onField(card.key)>=fieldCap(card.key); card.el.classList.toggle('poor',poor||full);
      card.el.classList.toggle('ready',!poor && !full && card.cd<=0);
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
    const cn=key==='__cannon';
    $('#quiz-unit').textContent= cn ? '단어 대포' : UNITS[key].name;
    if(cn){ const pc=$('#quiz-portrait'), g=pc.getContext('2d'); g.clearRect(0,0,pc.width,pc.height); g.font='80px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('💥',pc.width/2,pc.height/2+4); }
    else drawPortrait($('#quiz-portrait'),key);
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
    if(key==='__cannon'){
      if(ok){ s.correct++; s.combo++; s.maxCombo=Math.max(s.maxCombo,s.combo); s.coins+=1; fb.textContent='⭕ 정답! 단어 대포 발사!'; fb.className='quiz-fb ok'; Sound.play('correct'); }
      else { s.wrong++; s.combo=0; s.wrongWords.push(q.word); fb.innerHTML=`❌ 불발! <b style="color:#2b2140">${q.word.en}</b> = ${q.word.ko}`; fb.className='quiz-fb no'; Sound.play('wrong'); }
      setTimeout(()=>{ $('#modal-quiz').classList.remove('show'); Battle.quizOpen=false; Battle.quizAny=false; if(ok) Battle.fireCannon(); else Battle.cannon=0.5; this.setCombo(s.combo,ok); }, ok?600:1500);
      Save.save(); return;
    }
    if(ok){
      s.correct++; s.combo++; s.maxCombo=Math.max(s.maxCombo,s.combo); Save.data.totals.maxCombo=Math.max(Save.data.totals.maxCombo,s.combo);
      let bonus='';
      s.coins+=1;
      if(s.combo>=3){ const ref=Math.min(150,Math.round(UNITS[key].cost*0.1*Math.min(5,s.combo-2))); bonus=` +⚡${ref} 콤보 보너스`; this._refund=ref; } else this._refund=0;
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
        if(s.combo>0 && s.combo%5===0){ this.banner(`FEVER! ${s.combo} COMBO`,'fever'); Sound.play('fever'); Battle.energy=Math.min(Battle.maxEnergy,Battle.energy+300); Battle.floatText(ALLY_BASE_X+70,GROUND-160,'+⚡300 피버 보너스!','#ffd23f',22); }
      },650);
    } else {
      s.wrong++; s.combo=0; s.wrongWords.push(q.word);
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
    $('#res-stars').innerHTML = win? [0,1,2].map(i=>`<span class="${i<stars?'':'off'}">⭐</span>`).join('') : '<span style="font-size:20px;font-family:Jua">단어를 복습하고 다시 도전해 봐요!</span>';
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
    $('#res-words').innerHTML = (tickets? `<div style="text-align:center;font-family:Jua;font-size:22px;color:#7a4ae0;margin-bottom:8px">🎟️ 뽑기권 +${tickets}장 획득!${stars===3?' (★3 보너스 포함)':''}</div>` : '') + `<h4>📝 이번 전투에서 틀린 단어 (최고 콤보 ${s.maxCombo})</h4>` + (uniq.length? uniq.map(w=>`<span class="chip">${w.en} <i>${w.ko}</i></span>`).join('') : '<div class="empty">틀린 단어가 없어요! 완벽해요 🎉</div>');
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
    $('#deck-info').innerHTML=`전투에 데려갈 몬스터는 <b>🐾 편성</b> 탭에서 골라요.`;
    UNIT_ORDER.forEach(k=>{
      const d=UNITS[k], st=D.units[k], row=document.createElement('div'); row.className='unit-row r-'+gradeOf(k);
      const m=1+0.12*(st.lv-1), hp=Math.round(d.hp*m), atk=Math.round(d.atk*m);
      let btn;
      if(!st.owned){
        if(d.gacha) btn=`<button class="btn purple small" data-go2="gacha">🎁 뽑기에서<br>획득 (${(RARITY[d.gacha].rate/UNIT_ORDER.filter(x=>UNITS[x].gacha===d.gacha).length).toFixed(1)}%)</button>`;
        else { const need=d.unlock, ok=D.cleared>=need.stage, can=ok && D.coins>=need.coins;
          btn=`<button class="btn purple small" ${can?'':'disabled'} data-unlock="${k}">${ok?`🔓 해금<br>C ${need.coins}`:`STAGE ${need.stage}<br>클리어 필요`}</button>`; }
      } else {
        const inDeck=D.deck.includes(k);
        btn = (st.lv>=10) ? `<button class="btn small" disabled>MAX</button>`
          : (()=>{ const cost=d.upg*st.lv; return `<button class="btn small ${D.coins>=cost?'green':''}" ${D.coins>=cost?'':'disabled'} data-lv="${k}">강화 ▲ · C ${cost}</button>`; })();

      }
      const gk=gradeOf(k), rb = `<span class="rbadge r-${gk}">${'★'.repeat(RARITY[gk].stars)} ${RARITY[gk].name}</span>`;
      const extra = abilityTags(d);
      row.innerHTML=`<canvas width="192" height="168"></canvas><div><h4>${d.name}${rb}${st.owned?`<span class="lv">Lv.${st.lv}</span>`:''}</h4><div class="desc">${d.desc}</div>
        <div class="statline"><span>❤️ ${hp}</span><span>⚔️ ${atk}</span><span>👟 ${d.speed}</span><span>⏱ ${d.rate}s</span><span>🎯 ${d.range>50?'원거리':'근접'}</span><span>⚡ ${d.cost}</span><span>⌛ ${d.cd}s</span>${extra}</div></div><div class="btns">${btn}</div>`;
      drawPortrait(row.querySelector('canvas'),k); row.querySelector('canvas').classList.add('g-bg-'+gk);
      if(!st.owned) row.querySelector('canvas').style.filter='brightness(0) opacity(.45)';
      box.appendChild(row);
    });
    box.querySelectorAll('[data-go2]').forEach(b=>b.onclick=()=>this.go('gacha'));
    box.querySelectorAll('[data-deck]').forEach(b=>b.onclick=()=>{
      const k=b.dataset.deck, i=D.deck.indexOf(k);
      if(i>=0){ if(D.deck.length<=1){ this.toast('⚠️','최소 1마리는 편성해야 해요'); return; } D.deck.splice(i,1); }
      else { if(D.deck.length>=DECK_MAX){ this.toast('⚠️',`편성은 최대 ${DECK_MAX}마리까지예요. 먼저 하나를 빼 주세요`); return; } D.deck.push(k); }
      Save.save(); Sound.play('click'); this.renderShop();
    });
    box.querySelectorAll('[data-unlock]').forEach(b=>b.onclick=()=>{ const k=b.dataset.unlock; D.coins-=UNITS[k].unlock.coins; D.units[k].owned=true; if(D.deck.length<DECK_MAX) D.deck.push(k); Save.save(); Sound.play('fever'); this.toast('🎉',`${UNITS[k].name} 해금!`); this.refreshCoins(); this.renderShop(); });
    box.querySelectorAll('[data-lv]').forEach(b=>b.onclick=()=>{ const k=b.dataset.lv; const cost=UNITS[k].upg*D.units[k].lv; if(D.coins<cost) return; D.coins-=cost; D.units[k].lv++; Save.save(); Sound.play('upgrade'); this.refreshCoins(); this.renderShop(); this.checkAch(); });
    const ups=[
      {k:'energy', name:'⚡ 자원 생산 속도', desc:'전투 중 초당 자원 증가량 +10%', base:100, fmtv:lv=>`${Math.round(50*(1+0.1*lv))}/s`},
      {k:'start',  name:'🎒 시작 자원',     desc:'전투 시작 시 자원 +150',         base:80,  fmtv:lv=>`${500+150*lv}`},
      {k:'base',   name:'🏰 기지 체력',     desc:'우리 기지 최대 체력 +15%',        base:90,  fmtv:lv=>`${Math.round(3000*(1+0.15*lv))}`},
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
  /* --- 로비 --- */
  renderLobby(){
    const D=Save.data, next=Math.min(D.cleared, STAGES.length-1), st=STAGES[next];
    $('#lobby-stage').innerHTML = D.cleared>=STAGES.length ? `🏆 모든 스테이지 클리어! <b>더 높은 별에 도전해 보세요</b>` : `다음 도전: <b>STAGE ${st.id} · ${st.name}</b>`;
    $('#lobby-wrong').textContent = Object.values(D.stats.words).filter(e=>e.nb).length;
    $('#lobby-deck').textContent = D.deckIdx+1;
  },
  setPreset(i){
    const D=Save.data; D.deckIdx=i; Save.fixDecks(); Save.save(); Sound.play('click');
  },
  /* --- 편성 --- */
  renderDeck(){
    const D=Save.data;
    const tabs=$('#preset-tabs'); tabs.innerHTML='';
    [0,1,2].forEach(i=>{ const b=document.createElement('button'); b.className='btn '+(i===D.deckIdx?'cur':''); b.textContent=`편성 ${i+1}`+(i===D.deckIdx?' ✔':''); b.onclick=()=>{ this.setPreset(i); this.renderDeck(); }; tabs.appendChild(b); });
    const cp=document.createElement('button'); cp.className='btn small white'; cp.style.marginLeft='auto'; cp.textContent='📋 다른 편성에서 복사';
    cp.onclick=()=>{ const from=(D.deckIdx+1)%3; D.decks[D.deckIdx].splice(0,DECK_MAX,...D.decks[from]); Save.fixDecks(); Save.save(); this.toast('📋',`편성 ${from+1}을(를) 복사했어요`); this.renderDeck(); };
    tabs.appendChild(cp);
    const slots=$('#deck-slots'); slots.innerHTML='';
    let total=0;
    for(let i=0;i<DECK_MAX;i++){
      const k=D.deck[i], el=document.createElement('div');
      if(k){ const u=UNITS[k], g=gradeOf(k); total+=u.cost;
        el.className='slot g-bg-'+g; el.innerHTML=`<span class="num">${i+1}</span><canvas width="192" height="152"></canvas><b>${u.name}</b><small>⚡${u.cost} · ⌛${u.cd}s</small>`;
        drawPortrait(el.querySelector('canvas'),k);
        el.onclick=()=>{ if(D.deck.length<=1){ this.toast('⚠️','최소 1마리는 편성해야 해요'); return; } D.deck.splice(i,1); Save.save(); Sound.play('click'); this.renderDeck(); };
      } else { el.className='slot empty'; el.textContent='+'; }
      slots.appendChild(el);
    }
    // 필터
    const fr=$('#deck-filter'); fr.innerHTML='';
    [['all','전체'],['UR','전설'],['SR','에픽'],['R','레어'],['N','노말'],...Object.entries(TRAITS).map(([t,v])=>[t,`🎯${v.icon}${v.name}`])].forEach(([v,l])=>{ const b=document.createElement('button'); b.textContent=l; b.className=this.deckFilter===v?'on':''; b.onclick=()=>{ this.deckFilter=v; this.renderDeck(); }; fr.appendChild(b); });
    const pool=$('#deck-pool'); pool.innerHTML='';
    const ord={UR:0,SR:1,R:2,N:3};
    UNIT_ORDER.slice().sort((a,b)=>(D.units[b].owned-D.units[a].owned) || ord[gradeOf(a)]-ord[gradeOf(b)] || UNITS[b].cost-UNITS[a].cost)
      .filter(k=>{ const f=this.deckFilter; if(f==='all') return true; if(RARITY[f]) return gradeOf(k)===f; return (UNITS[k].strong||[]).includes(f); })
      .forEach(k=>{
        const u=UNITS[k], st=D.units[k], g=gradeOf(k), inD=D.deck.includes(k), el=document.createElement('div');
        el.className='utile g-bg-'+g+(inD?' in':'')+(st.owned?'':' locked');
        const icons=[...(u.strong||[]).map(t=>TRAITS[t].icon), u.purify?'✨':'', u.metalBreak?'🧲':'', u.shieldBreak?'🛡️':'', u.freeze?'⏸':'', u.kb?'💨':'', u.slow?'❄️':'', u.crit?'⚡':''].filter(Boolean).join('');
        el.innerHTML=`<canvas width="192" height="152"></canvas><b>${u.name}</b><div class="meta">${'★'.repeat(RARITY[g].stars)} Lv.${st.lv} · ⚡${u.cost}</div><div class="tags">${st.owned?icons:'🔒 미보유'}</div>`;
        drawPortrait(el.querySelector('canvas'),k);
        el.title=u.desc;
        el.onclick=()=>{
          if(!st.owned){ this.toast('🔒', u.gacha?'뽑기에서 얻을 수 있어요':'강화 탭에서 해금할 수 있어요'); return; }
          const i=D.deck.indexOf(k);
          if(i>=0){ if(D.deck.length<=1){ this.toast('⚠️','최소 1마리는 편성해야 해요'); return; } D.deck.splice(i,1); }
          else { if(D.deck.length>=DECK_MAX){ this.toast('⚠️',`편성은 최대 ${DECK_MAX}마리예요. 위 슬롯을 눌러 하나 빼 주세요`); return; } D.deck.push(k); }
          Save.save(); Sound.play('click'); this.renderDeck();
        };
        pool.appendChild(el);
      });
  },

  /* --- 학습 기록 --- */
  renderStats(){
    const s=Save.data.stats, acc=s.total?Math.round(s.correct/s.total*100):0, W=s.words;
    const note=Object.entries(W).filter(([,e])=>e.nb);
    const cleared=Object.values(W).filter(e=>e.w>0 && !e.nb).length;
    $('#stat-tiles').innerHTML=[[s.total,'전체 출제'],[s.correct,'정답'],[s.wrong,'오답'],[s.total?acc+'%':'-','정답률'],[note.length,'오답 노트']]
      .map(([v,l],i)=>`<div class="tile" style="background:${['#eef4ff','#e6fbee','#ffecec','#fff6d6','#ffe3ef'][i]}"><b>${v}</b><small>${l}</small></div>`).join('');
    $('#note-info').textContent = note.length ? `${note.length}개 남음 · 지금까지 ${cleared}개 극복` : (cleared? `모두 극복했어요! (${cleared}개)` : '');
    $('#btn-review').disabled = !note.length;
    $('#btn-review').textContent = note.length ? `📝 오답 시험 보기 (${Math.min(10,note.length)}문제)` : '📝 오답 노트가 비었어요';
    $('#note-list').innerHTML = note.length ? note.sort((a,b)=>b[1].w-a[1].w).map(([en,e])=>`<span class="chip">${en} <i>${e.ko}</i> <b style="color:#e0344f">✖${e.w}</b>${e.rs?` <b style="color:#1fa557">✔${e.rs}/2</b>`:''}</span>`).join('') : '<div class="empty">오답 노트가 비어 있어요 🎉</div>';
    // 단어별 기록
    const fr=$('#word-filter'); fr.innerHTML='';
    [['all','전체 단어'],['wrong','틀린 적 있음'],['note','오답 노트만']].forEach(([v,l])=>{ const b=document.createElement('button'); b.textContent=l; b.className=this.wordFilter===v?'on':''; b.onclick=()=>{ this.wordFilter=v; this.renderStats(); }; fr.appendChild(b); });
    const rows=Quiz.list.map(w=>({w, e:W[w.en]||{c:0,w:0,last:0}}))
      .filter(r=>this.wordFilter==='all' || (this.wordFilter==='wrong' ? r.e.w>0 : r.e.nb));
    const sort=$('#word-sort').value, ac=r=>(r.e.c+r.e.w)? r.e.c/(r.e.c+r.e.w) : 2;
    rows.sort(sort==='w' ? (a,b)=>b.e.w-a.e.w || ac(a)-ac(b) : sort==='last' ? (a,b)=>(b.e.last||0)-(a.e.last||0) : sort==='acc' ? (a,b)=>ac(a)-ac(b) || b.e.w-a.e.w : (a,b)=>a.w.en.localeCompare(b.w.en));
    $('#word-table').innerHTML = rows.length ? `<div class="word-table-wrap"><table class="word-table"><tr><th>단어</th><th>뜻</th><th>✖ 틀림</th><th>✔ 맞힘</th><th>정답률</th><th>상태</th></tr>${rows.map(({w,e})=>{ const n=e.c+e.w, p=n?Math.round(e.c/n*100):0;
      return `<tr><td class="en">${w.en}</td><td>${w.ko}</td><td class="cnt">${e.w}회</td><td class="ok">${e.c}회</td><td>${n?`<span class="bar"><i style="width:${p}%"></i></span>${p}%`:'-'}</td><td>${e.nb?'<span class="st-note">오답 노트</span>':e.w>0?'<span class="st-done">극복</span>':n?'<span class="st-done">✔</span>':'<span class="st-new">아직 안 나옴</span>'}</td></tr>`; }).join('')}</table></div>` : '<div class="empty">해당하는 단어가 없어요.</div>';
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

/* =========================================================
   메인 루프
   ========================================================= */
/* =========================================================
   LOBBY BG — 메인 화면 배경: 하늘·구름·언덕·성·단어 풍선·몬스터 행진
   ========================================================= */
const LobbyBG = {
  cv:null, c:null, w:0, h:0, dpr:1, stat:null, clouds:[], balloons:[], parade:[], sparks:[], spawnT:0, balT:0, last:0, fr:0,
  start(){
    this.cv=$('#lobby-bg'); this.c=this.cv.getContext('2d');
    const loop=(now)=>{ requestAnimationFrame(loop); if(UI.screen!=='menu') return;
      if(POTATO() && now-this.fr<48) return; this.fr=now;
      const dt=Math.min(0.06,(now-(this.last||now))/1000); this.last=now; this.frame(now/1000,dt); };
    requestAnimationFrame(loop);
  },
  resize(){
    const dpr=POTATO()?1:Math.min(2,window.devicePixelRatio||1), w=this.cv.clientWidth, h=this.cv.clientHeight;
    if(!w||!h) return false;
    if(w===this.w && h===this.h && dpr===this.dpr && this.stat) return true;
    this.w=w; this.h=h; this.dpr=dpr; this.cv.width=Math.floor(w*dpr); this.cv.height=Math.floor(h*dpr);
    this.hz=h*0.6; this.path=h*0.9;
    this.clouds=Array.from({length:7},()=>({x:rand(0,w),y:rand(h*0.06,h*0.36),s:rand(0.7,1.5),v:rand(8,22)}));
    this.paintStatic(); return true;
  },
  paintStatic(){
    const {w,h,dpr,hz}=this, cv=document.createElement('canvas'); cv.width=Math.floor(w*dpr); cv.height=Math.floor(h*dpr);
    const c=cv.getContext('2d'); c.scale(dpr,dpr);
    let seed=7; const R=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
    const g=c.createLinearGradient(0,0,0,hz); g.addColorStop(0,'#4fb8ff'); g.addColorStop(0.7,'#9fe0ff'); g.addColorStop(1,'#d9f6ff'); c.fillStyle=g; c.fillRect(0,0,w,h);
    // 먼 산
    c.fillStyle='#9cc7f0'; c.beginPath(); c.moveTo(0,hz);
    for(let x=0;x<=w+60;x+=60){ c.lineTo(x, hz-h*0.12-Math.abs(Math.sin(x/170))*h*0.12-R()*12); } c.lineTo(w,hz); c.fill();
    c.fillStyle='rgba(255,255,255,.7)';
    for(let x=80;x<w;x+=340){ const y=hz-h*0.12-Math.abs(Math.sin(x/170))*h*0.12; c.beginPath(); c.moveTo(x-22,y+18); c.lineTo(x,y-2); c.lineTo(x+22,y+18); c.fill(); }
    // 언덕 2겹
    const hill=(col,base,amp,f,ph)=>{ c.fillStyle=col; c.beginPath(); c.moveTo(0,h); c.lineTo(0,base); for(let x=0;x<=w;x+=20) c.lineTo(x, base-Math.sin(x/f+ph)*amp-amp); c.lineTo(w,h); c.fill(); c.strokeStyle='rgba(43,33,64,.25)'; c.lineWidth=2; c.beginPath(); for(let x=0;x<=w;x+=20) c[x?'lineTo':'moveTo'](x, base-Math.sin(x/f+ph)*amp-amp); c.stroke(); };
    hill('#8fdc7a',hz+8,h*0.035,150,1);
    // 나무
    for(let i=0;i<14;i++){ const x=R()*w, y=hz+R()*h*0.05, s=0.6+R()*0.6; if(x>w*0.08&&x<w*0.2) continue;
      c.save(); c.translate(x,y); c.scale(s,s);
      c.fillStyle='#8a5a2b'; c.strokeStyle='#2b2140'; c.lineWidth=3; c.beginPath(); c.roundRect(-5,-8,10,30,3); c.fill(); c.stroke();
      c.fillStyle=R()<.5?'#4fbf5a':'#5ed38a'; c.beginPath(); c.arc(0,-24,22,0,7); c.arc(-16,-12,15,0,7); c.arc(16,-12,15,0,7); c.fill(); c.stroke();
      c.fillStyle='rgba(255,255,255,.25)'; c.beginPath(); c.arc(-7,-31,8,0,7); c.fill();
      if(R()<.4){ c.fillStyle='#ff5d5d'; c.beginPath(); c.arc(8,-20,3.5,0,7); c.arc(-6,-12,3.5,0,7); c.fill(); }
      c.restore(); }
    hill('#6cc65c',hz+h*0.09,h*0.03,110,2.5);
    // 땅 + 길
    const pg=c.createLinearGradient(0,h*0.8,0,h); pg.addColorStop(0,'#5fb84f'); pg.addColorStop(1,'#4ea443'); c.fillStyle=pg; c.fillRect(0,h*0.8,w,h*0.2);
    c.fillStyle='#e8c38a'; c.strokeStyle='#2b2140'; c.lineWidth=3; c.beginPath(); c.roundRect(-10,this.path-10,w+20,h*0.075,10); c.fill(); c.stroke();
    c.fillStyle='rgba(160,100,46,.35)'; for(let i=0;i<40;i++){ c.beginPath(); c.ellipse(R()*w,this.path-2+R()*h*0.05,5+R()*8,2+R()*2,0,0,7); c.fill(); }
    // 꽃과 풀
    for(let i=0;i<70;i++){ const x=R()*w, y=hz+h*0.1+R()*(h*0.18); if(y>this.path-14 && y<this.path+h*0.07) continue;
      if(R()<0.5){ c.fillStyle='#3e9a3a'; c.beginPath(); c.moveTo(x-5,y); c.lineTo(x-2,y-10); c.lineTo(x,y); c.lineTo(x+3,y-12); c.lineTo(x+5,y); c.fill(); }
      else { c.fillStyle=['#fff','#ffd23f','#ff7aa8','#c9a6ff'][i%4]; for(let k=0;k<5;k++){ c.beginPath(); c.arc(x+Math.cos(k*1.26)*4,y+Math.sin(k*1.26)*4,3,0,7); c.fill(); } c.fillStyle='#ffb703'; c.beginPath(); c.arc(x,y,2.2,0,7); c.fill(); } }
    // 성(왼쪽)과 먼 적 탑(오른쪽)
    c.save(); c.translate(w*0.12-ALLY_BASE_X*1.25, hz+h*0.11-GROUND*1.25); c.scale(1.25,1.25); DB.ally(c,{x:ALLY_BASE_X,shake:0},1); c.restore();
    c.save(); c.globalAlpha=0.55; c.translate(w*0.93-ENEMY_BASE_X*0.7, hz+h*0.03-GROUND*0.7); c.scale(0.7,0.7); DB.enemy(c,{x:ENEMY_BASE_X,shake:0},2); c.restore();
    this.stat=cv;
  },
  frame(T,dt){
    if(!this.resize()) return;
    const {c,w,h,dpr}=this;
    c.setTransform(dpr,0,0,dpr,0,0);
    c.drawImage(this.stat,0,0,w,h);
    // 해 + 빛줄기
    const sx=w*0.84, sy=h*0.14;
    c.save(); c.translate(sx,sy); c.rotate(T*0.15); c.fillStyle='rgba(255,246,176,.16)';
    for(let i=0;i<12;i++){ c.rotate(Math.PI/6); c.beginPath(); c.moveTo(0,0); c.lineTo(-12,-h*0.2); c.lineTo(12,-h*0.2); c.fill(); }
    c.restore();
    Art.circ(c,sx,sy,h*0.065,'#fff3a0','#ffb703',4);
    Art.circ(c,sx-h*0.02,sy-h*0.005,h*0.008,INK,null); Art.circ(c,sx+h*0.02,sy-h*0.005,h*0.008,INK,null);
    c.beginPath(); c.arc(sx,sy+h*0.012,h*0.018,0.15*Math.PI,0.85*Math.PI); Art.path(c,null,INK,3);
    // 구름
    for(const cl of this.clouds){ cl.x+=cl.v*dt; if(cl.x>w+140) cl.x=-140;
      c.save(); c.translate(cl.x,cl.y); c.scale(cl.s,cl.s);
      c.fillStyle='rgba(120,170,220,.35)'; c.beginPath(); c.ellipse(4,6,56,18,0,0,7); c.fill();
      c.fillStyle='#fff'; c.beginPath(); c.ellipse(0,0,56,20,0,0,7); c.fill(); c.beginPath(); c.ellipse(26,-12,30,24,0,0,7); c.fill(); c.beginPath(); c.ellipse(-24,-6,24,17,0,0,7); c.fill();
      c.restore(); }
    // 단어 풍선
    this.balT-=dt; const maxB=POTATO()?3:6;
    if(this.balT<=0 && this.balloons.length<maxB && Quiz.list.length){ this.balT=rand(1.4,2.6);
      const wd=Quiz.list[Math.floor(Math.random()*Quiz.list.length)];
      this.balloons.push({x:rand(w*0.04,w*0.96), y:h*0.78, t:wd.en, ko:wd.ko, v:rand(18,30), ph:rand(0,6), col:['#ff7aa8','#4c8dff','#5ed38a','#ffd23f','#a35cff','#ff9f43'][Math.floor(Math.random()*6)], life:0}); }
    for(const b of this.balloons){ b.y-=b.v*dt; b.life+=dt; const bx=b.x+Math.sin(T*1.2+b.ph)*12;
      const a=Math.min(1,b.life*1.5)*Math.min(1,Math.max(0,(b.y-h*0.03)/(h*0.12)));
      c.save(); c.globalAlpha=a*0.92; c.font='17px Jua, sans-serif'; const tw=Math.max(54,c.measureText(b.t).width+26);
      c.beginPath(); c.moveTo(bx,b.y+18); c.quadraticCurveTo(bx-6,b.y+34,bx+2,b.y+48); Art.path(c,null,'rgba(43,33,64,.5)',1.5);
      c.beginPath(); c.roundRect(bx-tw/2,b.y-16,tw,34,17); Art.path(c,b.col,INK,3);
      c.beginPath(); c.moveTo(bx-5,b.y+17); c.lineTo(bx,b.y+24); c.lineTo(bx+5,b.y+17); Art.path(c,b.col,INK,2);
      c.fillStyle='rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(bx-tw/2+14,b.y-7,7,3,-0.3,0,7); c.fill();
      c.fillStyle='#fff'; c.textAlign='center'; c.lineWidth=4; c.strokeStyle=INK; c.strokeText(b.t,bx,b.y+6); c.fillText(b.t,bx,b.y+6);
      c.restore(); }
    this.balloons=this.balloons.filter(b=>b.y>-40);
    // 몬스터 행진
    this.spawnT-=dt;
    const owned=UNIT_ORDER.filter(k=>Save.data.units[k].owned);
    if(this.spawnT<=0 && this.parade.length<(POTATO()?5:9)){ this.spawnT=rand(1.6,2.8);
      const k=owned[Math.floor(Math.random()*owned.length)]||'slime';
      this.parade.push({key:k, def:UNITS[k], state:'walk', animT:rand(0,3), atkP:0, seed:Math.random(), hitT:0, portrait:false, x:-60, v:rand(42,70), hop:0}); }
    const sc=Math.min(1.25, h/560), ps=Math.min(1.5,sc*dpr*(POTATO()?0.6:1));
    for(const u of this.parade){ u.x+=u.v*dt; u.animT+=dt;
      c.save(); c.translate(u.x,this.path+h*0.035); c.scale(sc,sc);
      c.fillStyle='rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0,2,u.def.w*1.1,u.def.w*0.24,0,0,7); c.fill();
      SpriteCache.draw(c,u,T,ps); c.restore(); }
    this.parade=this.parade.filter(u=>u.x<w+80);
    // 반짝이
    if(!POTATO() && Math.random()<0.15) this.sparks.push({x:rand(0,w),y:rand(h*0.05,h*0.55),life:1});
    c.fillStyle='#fff'; for(const p of this.sparks){ p.life-=dt; c.globalAlpha=Math.max(0,Math.sin(p.life*Math.PI)); Render.star(c,p.x,p.y,5); } c.globalAlpha=1;
    this.sparks=this.sparks.filter(p=>p.life>0);
  },
};

/* =========================================================
   REVIEW — 오답 시험 (전투 밖에서 틀린 단어만 다시 풀기)
   ========================================================= */
const Review = {
  start(){
    const W=Save.data.stats.words;
    const words=Quiz.list.filter(w=>W[w.en] && W[w.en].nb);
    if(!words.length){ UI.toast('🎉','오답 노트가 비어 있어요!'); return; }
    Sound.init();
    // 많이 틀린 단어 우선, 최대 10문제. 영어→뜻 / 뜻→영어를 번갈아 냄
    const pick=shuffle(words).sort((a,b)=>W[b.en].w-W[a.en].w).slice(0,10);
    this.qs=shuffle(pick).map((w,i)=>Quiz.build(w, i%2===1));
    this.i=0; this.ok=0; this.wrongs=[]; this.clearedNow=[]; this.done=false;
    $('#modal-review').classList.add('show'); Sound.play('open');
    this.show();
  },
  show(){
    const q=this.qs[this.i]; this.answered=false;
    $('#rv-progress').textContent=`${this.i+1} / ${this.qs.length} · 맞힌 개수 ${this.ok}`;
    $('#rv-bar').style.width=(this.i/this.qs.length*100)+'%';
    const e=Save.data.stats.words[q.word.en];
    $('#rv-body').innerHTML=`<div class="quiz-word" style="background:linear-gradient(#e0344f,#ff7aa8)"><span class="pos">${q.reverse?'뜻 → 영어':'영어 → 뜻'} · 지금까지 ✖${e.w}</span>
      <div class="w" style="${q.reverse?'font-size:clamp(28px,4.5vw,40px);letter-spacing:0':''}">${q.reverse?q.word.ko:q.word.en.toUpperCase()}</div><div class="q">${q.reverse?'이 뜻의 영어 단어는?':'다음 중 올바른 뜻은?'}</div></div>
      <div class="opts">${q.options.map((o,i)=>`<button class="opt" data-i="${i}"><span class="n">${'①②③④'[i]}</span><span>${o}</span></button>`).join('')}</div>
      <div class="quiz-fb" id="rv-fb"></div>`;
    $('#rv-body').querySelectorAll('.opt').forEach(b=>b.onclick=()=>this.answer(+b.dataset.i));
  },
  answer(i){
    if(this.done || this.answered) return; this.answered=true;
    const q=this.qs[this.i], ok=i===q.answer, btns=[...document.querySelectorAll('#rv-body .opt')];
    const wasNote=Save.data.stats.words[q.word.en].nb;
    Quiz.record(q.word, ok);
    const e=Save.data.stats.words[q.word.en];
    btns.forEach((b,j)=>{ if(j===q.answer) b.classList.add('correct'); else if(j===i) b.classList.add('wrong'); else b.classList.add('dim'); });
    const fb=$('#rv-fb');
    if(ok){ this.ok++; Save.data.coins+=2; Sound.play('correct');
      if(wasNote && !e.nb){ this.clearedNow.push(q.word); fb.innerHTML='⭕ 정답! <b>오답 노트에서 빠졌어요</b> +2 코인'; }
      else fb.innerHTML=`⭕ 정답! (연속 ${e.rs}/2) +2 코인`;
      fb.className='quiz-fb ok';
    } else { this.wrongs.push(q.word); Sound.play('wrong'); fb.innerHTML=`❌ <b style="color:#2b2140">${q.word.en}</b> = ${q.word.ko}`; fb.className='quiz-fb no'; }
    Save.save(); UI.refreshCoins();
    clearTimeout(this.tm); this.tm=setTimeout(()=>this.next(), ok?700:1600);
  },
  next(){
    clearTimeout(this.tm);
    if(!$('#modal-review').classList.contains('show')) return;
    this.i++;
    if(this.i<this.qs.length) return this.show();
    this.done=true; $('#rv-bar').style.width='100%';
    const n=this.qs.length, left=Object.values(Save.data.stats.words).filter(e=>e.nb).length;
    $('#rv-progress').textContent='시험 끝!';
    $('#rv-body').innerHTML=`<div class="result-title ${this.ok/n>=0.7?'win':'lose'}" style="font-size:44px">${this.ok} / ${n}</div>
      <div class="res-grid" style="grid-template-columns:repeat(3,1fr)"><div class="tile" style="background:#e6fbee"><b>${this.clearedNow.length}</b><small>오답 노트에서 빠짐</small></div><div class="tile" style="background:#ffecec"><b>${this.wrongs.length}</b><small>또 틀림</small></div><div class="tile" style="background:#fff6d6"><b>+${this.ok*2}</b><small>코인</small></div></div>
      <div class="res-words">${this.wrongs.length?`<h4>다시 틀린 단어</h4>${[...new Map(this.wrongs.map(w=>[w.en,w])).values()].map(w=>`<span class="chip">${w.en} <i>${w.ko}</i></span>`).join('')}`:'<div class="empty">모두 맞혔어요! 🎉</div>'}</div>
      <p style="text-align:center;font-size:14px;margin-bottom:10px">오답 노트에 <b>${left}개</b> 남았어요.</p>
      <div class="modal-actions">${left?'<button class="btn pink" id="rv-again">📝 한 번 더</button>':''}<button class="btn white" id="rv-done">닫기</button></div>`;
    Sound.play(this.ok/n>=0.7?'win':'click');
    const ag=$('#rv-again'); if(ag) ag.onclick=()=>this.start();
    $('#rv-done').onclick=()=>this.close();
    UI.checkAch();
  },
  nextIfDone(){ if(this.answered && !this.done) this.next(); },
  close(){ clearTimeout(this.tm); $('#modal-review').classList.remove('show'); if(UI.screen==='stats') UI.renderStats(); if(UI.screen==='menu') UI.renderLobby(); },
};

/* =========================================================
   GACHA — 캐릭터 뽑기
   ========================================================= */
const RCOL = { N:'#b8c2d6', R:'#4c8dff', SR:'#a35cff', UR:'#ffb300' };
const RORD = { N:0, R:1, SR:2, UR:3 };
const Gacha = {
  pool(r){ return UNIT_ORDER.filter(k=>UNITS[k].gacha===r); },
  today(){ const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; },
  // 오늘의 픽업: 에픽·전설 중 하나가 날마다 바뀜
  featured(){ const pool=[...this.pool('UR'),...this.pool('SR')]; const d=new Date(); const n=Math.floor((d-new Date(d.getFullYear(),0,0))/864e5); return pool[n%pool.length]; },
  freeLeft(){ return Save.data.freeDay!==this.today(); },
  roll(lucky, forceMin){
    const D=Save.data; D.pity++;
    let r='N';
    if(D.pity>=PITY_MAX) r='UR';
    else {
      const rate={...Object.fromEntries(Object.entries(RARITY).map(([k,v])=>[k,v.rate]))};
      if(lucky){ rate.UR*=2; rate.SR*=2; rate.N=100-rate.UR-rate.SR-rate.R; }     // 행운: 에픽·전설 2배
      let x=Math.random()*100; for(const k of ['UR','SR','R','N']){ x-=rate[k]; if(x<0){ r=k; break; } }
    }
    if(forceMin && RORD[r]<RORD[forceMin]) r=forceMin;
    if(r==='UR') D.pity=0;
    const pool=this.pool(r), fk=this.featured();
    let key = (UNITS[fk].gacha===r && Math.random()<0.5) ? fk : pool[Math.floor(Math.random()*pool.length)];
    const st=D.units[key];
    const res={key, r, isNew:!st.owned, lvFrom:st.lv, lvTo:st.lv, coins:0, deckAdded:false, pick:key===fk};
    if(!st.owned){ st.owned=true; if(D.deck.length<DECK_MAX){ D.deck.push(key); res.deckAdded=true; } }
    else if(st.lv<10){ st.lv++; res.lvTo=st.lv; }
    else { res.coins=RARITY[r].dupCoins; D.coins+=res.coins; }
    D.totals.pulls++;
    return res;
  },
  // 뽑기 요청 → 행운의 단어 퀴즈 → 실제 뽑기
  request(n, free){
    const D=Save.data; Sound.init();
    if(free){ if(!this.freeLeft()){ UI.toast('🎁','오늘의 무료 뽑기는 이미 했어요'); return; } }
    else if(D.tickets<n){ UI.toast('🎟️','뽑기권이 부족해요! 스테이지를 클리어해 보세요'); Sound.play('wrong'); return; }
    this.req={n,free}; this.luckQuiz();
  },
  luckQuiz(){
    const w=Quiz.list[Math.floor(Math.random()*Quiz.list.length)], q=Quiz.build(w, Math.random()<0.5); this.lq=q; this.lqDone=false;
    $('#lk-word').textContent = q.reverse ? q.word.ko : q.word.en.toUpperCase();
    $('#lk-word').style.fontSize = q.reverse ? 'clamp(26px,4vw,38px)' : '';
    $('#lk-q').textContent = q.reverse ? '이 뜻의 영어 단어는?' : '다음 중 올바른 뜻은?';
    const box=$('#lk-opts'); box.innerHTML='';
    q.options.forEach((o,i)=>{ const b=document.createElement('button'); b.className='opt'; b.innerHTML=`<span class="n">${'①②③④'[i]}</span><span>${o}</span>`; b.onclick=()=>this.luckAnswer(i); box.appendChild(b); });
    $('#lk-fb').textContent=''; $('#lk-fb').className='quiz-fb';
    $('#modal-luck').classList.add('show'); Sound.play('open');
  },
  luckAnswer(i){
    if(this.lqDone) return; this.lqDone=true;
    const q=this.lq, ok = i===q.answer, btns=[...document.querySelectorAll('#lk-opts .opt')];
    if(i>=0){ Quiz.record(q.word, ok); btns.forEach((b,j)=>{ if(j===q.answer) b.classList.add('correct'); else if(j===i) b.classList.add('wrong'); else b.classList.add('dim'); }); }
    const fb=$('#lk-fb');
    if(ok){ fb.innerHTML='✨ 정답! <b>행운 버프: 에픽·전설 확률 2배!</b>'; fb.className='quiz-fb ok'; Sound.play('fever'); }
    else if(i>=0){ fb.innerHTML=`아쉬워요! <b style="color:#2b2140">${q.word.en}</b> = ${q.word.ko} · 그냥 뽑아요`; fb.className='quiz-fb no'; Sound.play('wrong'); }
    Save.save();
    setTimeout(()=>{ $('#modal-luck').classList.remove('show'); this.doPull(ok); }, i<0?0:(ok?900:1500));
  },
  doPull(lucky){
    const D=Save.data, {n,free}=this.req;
    if(free) D.freeDay=this.today(); else D.tickets-=n;
    const res=[]; for(let i=0;i<n;i++) res.push(this.roll(lucky));
    if(n>=10 && !res.some(r=>RORD[r.r]>=1)){ D.pity--; D.totals.pulls--; res[n-1]=this.roll(lucky,'R'); res[n-1].guaranteed=true; }   // 10연차 레어 이상 확정
    res.lucky=lucky;
    Save.save(); UI.refreshCoins(); this.play(res);
  },
  buy(){
    const D=Save.data; Sound.init();
    if(D.coins<TICKET_PRICE){ UI.toast('💰','코인이 부족해요'); Sound.play('wrong'); return; }
    D.coins-=TICKET_PRICE; D.tickets++; Save.save(); Sound.play('coin'); UI.refreshCoins(); this.render();
  },
  render(){
    const D=Save.data, fk=this.featured(), fu=UNITS[fk];
    $('#g-free').disabled = !this.freeLeft();
    $('#g-free').innerHTML = this.freeLeft() ? '🎁 오늘의 무료 뽑기' : '🎁 무료 뽑기 (내일 또!)';
    $('#g-pull1').disabled = D.tickets<1;
    $('#g-pull10').disabled = D.tickets<10;
    $('#g-buy').disabled = D.coins<TICKET_PRICE;
    $('#g-pity').textContent = `🌞 전설 확정까지 ${PITY_MAX-D.pity}회 (천장 ${D.pity}/${PITY_MAX})`;
    $('#g-pity-bar').style.width = (D.pity/PITY_MAX*100)+'%';
    // 픽업 배너
    const g=fu.gacha;
    $('#pick-banner').className='pick-banner g-bg-'+g;
    $('#pick-name').innerHTML=`<span class="rbadge r-${g}" style="margin:0 6px 0 0">${'★'.repeat(RARITY[g].stars)} ${RARITY[g].name}</span>${fu.name}`;
    $('#pick-desc').textContent=fu.desc;
    $('#pick-rate').textContent=`${RARITY[g].name}이 나오면 50% 확률로 이 캐릭터! (오늘만)`;
    drawPortrait($('#pick-cv'),fk);
    const tb=$('#rate-table'); tb.innerHTML='';
    ['UR','SR','R','N'].forEach(r=>{
      const pool=this.pool(r);
      const pr=k=> (UNITS[fk].gacha===r) ? (k===fk ? RARITY[r].rate*0.5+RARITY[r].rate*0.5/pool.length : RARITY[r].rate*0.5/pool.length) : RARITY[r].rate/pool.length;
      const tr=document.createElement('tr');
      tr.innerHTML=`<td style="width:112px"><span class="rbadge r-${r}" style="margin:0">${'★'.repeat(RARITY[r].stars)} ${RARITY[r].name}</span></td>
        <td><div class="rate-chars">${pool.map(k=>`<span class="${D.units[k].owned?'':'own'}" title="${UNITS[k].desc}"><canvas width="60" height="52" data-k="${k}"></canvas>${k===fk?'⭐':''}${UNITS[k].name} <small style="opacity:.6">${pr(k).toFixed(2)}% · ⚡${UNITS[k].cost}</small>${D.units[k].owned?` ✔`:''}</span>`).join('')}</div></td>
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
      const ready=Save.data.tickets>0||this.freeLeft(), shake = ready ? Math.sin(T*3)*0.02 : 0; c.rotate(shake);
      Art.rr(c,-90,70,180,110,24,'#ff7aa8',INK,4);
      Art.rr(c,-30,100,60,44,12,'#2b2140',INK,3);
      c.save(); c.translate(0,122); c.rotate(ready?T*1.2:0); Art.circ(c,0,0,12,'#ffd23f',INK,3); c.beginPath(); c.moveTo(-10,0); c.lineTo(10,0); Art.path(c,null,INK,3); c.restore();
      c.fillStyle='#fff'; c.font='22px Jua, sans-serif'; c.textAlign='center'; c.fillText('GACHA',0,92);
      c.save(); c.beginPath(); c.arc(0,0,92,0,Math.PI*2); c.clip();
      c.fillStyle='rgba(220,245,255,.55)'; c.fillRect(-100,-100,200,200);
      for(const p of caps){
        p.vy+=300*(1/60); p.x+=p.vx/60; p.y+=p.vy/60;
        if(p.y>58){ p.y=58; p.vy=-rand(120,260)*(ready?1:0.3); }
        if(p.x<-70||p.x>70){ p.vx*=-1; p.x=clamp(p.x,-70,70); }
        Gacha.capsule(c,p.x,p.y,16,p.col,p.x*0.05);
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
  capsule(c,x,y,r,col,rot=0,open=0){
    c.save(); c.translate(x,y); c.rotate(rot);
    // 아래 반쪽(흰색)
    c.save(); c.translate(0,open*r*0.9); c.beginPath(); c.arc(0,0,r,0,Math.PI); c.closePath(); Art.path(c,'#fff',INK,Math.max(2,r*0.12)); c.restore();
    // 위 반쪽(색)
    c.save(); c.translate(open*r*0.3,-open*r*1.6); c.rotate(-open*0.8);
    c.beginPath(); c.arc(0,0,r,Math.PI,0); c.closePath(); Art.path(c,col,INK,Math.max(2,r*0.12));
    c.fillStyle='rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-r*0.4,-r*0.5,r*0.16,r*0.28,-0.6,0,7); c.fill();
    c.restore();
    if(!open){ c.beginPath(); c.moveTo(-r,0); c.lineTo(r,0); Art.path(c,null,INK,Math.max(2,r*0.1)); Art.circ(c,0,0,r*0.16,'#ffd23f',INK,Math.max(1.5,r*0.06)); }
    c.restore();
  },
  /* --- 뽑기 연출 --- */
  play(res){
    this.res=res; this.top=res.reduce((a,b)=>RORD[b.r]>RORD[a]?b.r:a,'N');
    this.multi=res.length>1; this.t=0; this.revealed=false; this.opened=false; this.sparks=[]; this.active=true; this.stage=0; this.flash=0; this.ringFx=[];
    // 승급 연출: 등급 수만큼 색이 바뀜 (흰색 → 파랑 → 보라 → 금색/무지개)
    this.ups=RORD[this.top]; this.upAt=[0.95,1.55,2.15].slice(0,this.ups); this.openAt=(this.upAt.at(-1)||0.6)+0.9;
    const m=$('#modal-gacha'); m.classList.add('show'); const box=$('#gacha-result'); box.classList.remove('show'); box.innerHTML=''; $('#gacha-skip').style.display='';
    $('#gacha-skip').textContent='화면을 누르면 바로 열어요';
    m.onclick=(e)=>{ if(e.target.closest('button')) return; if(!this.opened) this.t=Math.max(this.t,this.openAt-0.05); else if(this.multi && !this.allFlipped) this.flipAll(); };
    const cv=$('#gacha-cv'); let last=performance.now();
    if(res.lucky) UI.toast('✨','행운 버프 적용! 에픽·전설 확률 2배');
    const loop=(now)=>{
      if(!this.active) return;
      const dt=Math.min(0.05,(now-last)/1000); last=now; this.t+=dt;
      while(this.stage<this.upAt.length && this.t>=this.upAt[this.stage]){ this.stage++; this.flash=0.5; this.ringFx.push({r:20,life:0.6}); Sound.play(['revealR','revealSR','revealUR'][this.stage-1]||'revealR'); }
      if(!this.opened && this.t>=this.openAt){ this.opened=true; this.openT=this.t; this.flash=1; Sound.play('crack'); }
      if(this.opened && !this.revealed && this.t>=this.openT+0.55) this.reveal();
      this.draw(cv,dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },
  stageColor(i,T){ return i>=3 ? `hsl(${(T*240)%360},95%,62%)` : ['#e9edf5','#4c8dff','#a35cff'][i]; },
  draw(cv,dt){
    const dpr=Math.min(2,window.devicePixelRatio||1), w=cv.clientWidth, h=cv.clientHeight;
    if(cv.width!==Math.floor(w*dpr)||cv.height!==Math.floor(h*dpr)){ cv.width=Math.floor(w*dpr); cv.height=Math.floor(h*dpr); }
    const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
    const t=this.t, cx=w/2, cy=h*0.5, s=Math.min(w,h)/600, st=this.stage, col=this.stageColor(st,t);
    const glowCol = st>=3 ? '#ffd23f' : st===0 ? '#3a2d63' : col;
    const g=c.createRadialGradient(cx,cy,10,cx,cy,Math.max(w,h)*0.7);
    g.addColorStop(0, glowCol); g.addColorStop(0.35,'#1d1631'); g.addColorStop(1,'#0b0716');
    c.globalAlpha=1; c.fillStyle=g; c.fillRect(0,0,w,h);
    // 회전하는 빛줄기
    if(st>0 || this.opened){
      const a=this.opened?1:0.35+st*0.12; c.save(); c.translate(cx,cy); c.rotate(t*0.5);
      const n = st>=3?24:16;
      for(let i=0;i<n;i++){ c.rotate(Math.PI*2/n); c.globalAlpha=a*0.3; c.fillStyle= st>=3 ? `hsl(${(i*30+t*120)%360},95%,65%)` : glowCol;
        c.beginPath(); c.moveTo(0,0); c.lineTo(-24*s,-900*s); c.lineTo(24*s,-900*s); c.closePath(); c.fill(); }
      c.restore(); c.globalAlpha=1;
    }
    // 반짝이
    if(st>0 && Math.random()<0.3+st*0.2) this.sparks.push({x:cx+rand(-160,160)*s,y:cy+rand(-160,160)*s,vx:rand(-60,60),vy:rand(-120,-20),life:1,col:st>=3?`hsl(${rand(0,360)},95%,70%)`:col});
    for(const p of this.sparks){ p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; c.globalAlpha=Math.max(0,p.life); c.fillStyle=p.col; Render.star(c,p.x,p.y,7*s); }
    this.sparks=this.sparks.filter(p=>p.life>0); c.globalAlpha=1;
    // 링 효과
    for(const r of this.ringFx){ r.life-=dt; r.r+=500*dt; c.globalAlpha=Math.max(0,r.life/0.6); c.strokeStyle=st>=3?'#ffd23f':col; c.lineWidth=8*s; c.beginPath(); c.arc(cx,cy,r.r*s,0,7); c.stroke(); }
    this.ringFx=this.ringFx.filter(r=>r.life>0); c.globalAlpha=1;
    if(!this.revealed){
      // 캡슐: 떨어짐 → 흔들림 → 승급 → 열림
      const drop=Math.min(1,t/0.45), e=drop<1? 1-Math.pow(1-drop,3) : 1, bounce = t>0.45&&t<0.75 ? Math.sin((t-0.45)/0.3*Math.PI)*24 : 0;
      const ey=cy-(1-e)*420*s-bounce*s;
      const k=this.opened?0:Math.min(1,Math.max(0,(t-0.5)/(this.openAt-0.5)));
      const rot=this.opened?0:Math.sin(t*(20+k*25))*(0.05+k*0.25);
      const pop=this.flash>0.3?1+(this.flash-0.3)*0.4:1;
      const op=this.opened?Math.min(1,(t-this.openT)/0.4):0;
      c.save(); c.translate(cx,ey); c.scale(s*1.5*pop,s*1.5*pop);
      if(st>0){ c.shadowColor=st>=3?'#ffd23f':col; c.shadowBlur=40+Math.sin(t*10)*15; }
      this.capsule(c,0,0,68,col,rot,op);
      c.restore();
      if(this.multi){ c.font=`${Math.round(30*s)}px Jua, sans-serif`; c.textAlign='center'; c.fillStyle='#fff'; c.fillText(`× ${this.res.length}`,cx+110*s,cy+90*s); }
    }
    if(this.flash>0){ c.globalAlpha=Math.min(1,this.flash); c.fillStyle='#fff'; c.fillRect(0,0,w,h); c.globalAlpha=1; this.flash-=dt*2.2; }
  },
  cardHTML(r,i){
    const d=UNITS[r.key], sub = r.isNew ? (r.deckAdded?'편성에 자동 추가!':'편성 탭에서 넣어 보세요') : r.coins? `최대 레벨! +${r.coins} 코인` : `중복! Lv.${r.lvFrom} → Lv.${r.lvTo}`;
    return `<div class="fcard r-${r.r}" data-i="${i}"><div class="fin">
      <div class="fback g-bg-${r.r}"><div class="fq">?</div><div class="fglow"></div></div>
      <div class="ffront g-bg-${r.r}">${r.isNew?'<div class="g-new">NEW!</div>':''}${r.pick?'<div class="pick-tag">PICK UP</div>':''}
        <canvas width="240" height="200" data-k="${r.key}"></canvas>
        <div class="fstars">${'★'.repeat(RARITY[r.r].stars)}</div><b>${d.name}</b><small>${sub}</small></div></div></div>`;
  },
  reveal(){
    this.revealed=true; $('#gacha-skip').style.display='none';
    const box=$('#gacha-result'), D=Save.data, res=this.res, n=res.length;
    if(!this.multi){
      const r=res[0], d=UNITS[r.key];
      Sound.play('reveal'+r.r);
      box.innerHTML=`<div class="g-card r-${r.r}">${r.isNew?'<div class="g-new">NEW!</div>':''}${r.pick?'<div class="pick-tag">PICK UP</div>':''}<canvas width="480" height="400" class="sil"></canvas>
        <div class="stars" id="g-stars"></div><span class="rbadge r-${r.r}" style="margin:0">${RARITY[r.r].name}</span>
        <h3>${d.name}</h3><div class="gdesc">${d.desc}</div>
        <div class="statline" style="justify-content:center"><span>❤️ ${d.hp}</span><span>⚔️ ${d.atk}</span><span>⚡ 소환 ${d.cost}</span>${abilityTags(d)}</div>
        <div class="g-dup">${r.isNew ? (r.deckAdded?'편성에 자동 추가!':'편성 탭에서 넣어 보세요') : r.coins? `최대 레벨! +${r.coins} 코인` : `중복! Lv.${r.lvFrom} → Lv.${r.lvTo}`}</div></div>`;
      const cv=box.querySelector('canvas'); drawPortrait(cv,r.key);
      setTimeout(()=>cv.classList.remove('sil'), 450);
      const stars=$('#g-stars'); for(let i=0;i<RARITY[r.r].stars;i++) setTimeout(()=>{ stars.insertAdjacentHTML('beforeend','<span class="spop">★</span>'); Sound.play('coin'); }, 550+i*180);
      this.allFlipped=true;
      this.actions(box,n);
    } else {
      box.innerHTML=`<div class="g-grid">${res.map((r,i)=>this.cardHTML(r,i)).join('')}</div><div class="g-actions" id="g-act"><button class="btn white" id="g-all">⏩ 모두 열기</button></div>`;
      box.querySelectorAll('canvas[data-k]').forEach(cv=>drawPortrait(cv,cv.dataset.k));
      $('#g-all').onclick=()=>this.flipAll();
      this.allFlipped=false; this.flipIdx=0; this.flipNext();
    }
    box.classList.add('show');
  },
  flipNext(){
    if(!this.active || this.allFlipped) return;
    const i=this.flipIdx; if(i>=this.res.length){ this.finishFlip(); return; }
    const r=this.res[i], el=document.querySelector(`.fcard[data-i="${i}"]`);
    const high=RORD[r.r]>=2;
    if(high){ el.classList.add('tease'); Sound.play('tick'); }
    this.ft=setTimeout(()=>{ el.classList.remove('tease'); el.classList.add('flipped'); if(high){ Sound.play('reveal'+r.r); this.flash=0.6; this.ringFx.push({r:20,life:0.6}); } else Sound.play('click');
      this.flipIdx++; this.ft=setTimeout(()=>this.flipNext(), 180); }, high?750:200);
  },
  flipAll(){ clearTimeout(this.ft); document.querySelectorAll('.fcard').forEach(e=>{ e.classList.remove('tease'); e.classList.add('flipped'); }); Sound.play('reveal'+this.top); this.finishFlip(); },
  finishFlip(){ if(this.allFlipped) return; this.allFlipped=true; this.actions($('#gacha-result'),this.res.length); },
  actions(box,n){
    const D=Save.data, old=$('#g-act'); if(old) old.remove();
    setTimeout(()=>UI.checkAch(), 400);
    box.insertAdjacentHTML('beforeend',`<div class="g-actions" id="g-act"><button class="btn white" id="g-ok">확인</button>${D.tickets>=n?`<button class="btn pink" id="g-again">🎟️ ${n}회 더 뽑기 (남은 ${D.tickets})</button>`:''}</div>`);
    $('#g-ok').onclick=()=>this.close();
    const ag=$('#g-again'); if(ag) ag.onclick=()=>{ this.active=false; clearTimeout(this.ft); $('#modal-gacha').classList.remove('show'); this.request(n,false); };
  },
  close(){
    this.active=false; clearTimeout(this.ft); $('#modal-gacha').classList.remove('show'); Sound.play('click');
    UI.refreshCoins(); if(UI.screen==='gacha') this.render();
  },
};

let lastT=performance.now(), hudT=0, fpsT=0, fpsN=0, lagHint=false;
function loop(now){
  if(POTATO() && now-lastT<31){ requestAnimationFrame(loop); return; }   // 감자 모드: 초당 약 30프레임
  const dtReal=Math.min(0.05,(now-lastT)/1000); lastT=now;
  // 렉 감지: 전투 중 평균 프레임이 낮으면 감자 모드를 한 번 권해 줌
  if(UI.screen==='battle' && Battle.running && !Battle.paused && !Battle.quizOpen && !POTATO() && !lagHint){
    fpsT+=dtReal; fpsN++;
    if(fpsT>=5){ if(fpsN/fpsT<35){ lagHint=true; UI.toast('🥔','화면이 버벅이나요? 일시정지 메뉴나 설정에서 감자 모드를 켜 보세요'); } fpsT=0; fpsN=0; }
  }
  if(UI.screen==='battle' && Battle.running){
    const frozen = Battle.paused || Battle.quizOpen;
    if(!frozen) Battle.update(dtReal*Battle.speed);
    Render.draw(now/1000*(frozen?0:1) || Render._T || 0, dtReal);
    if(!frozen) Render._T=now/1000;
    hudT-=dtReal; if(hudT<=0){ hudT=0.08; UI.updateHud(); }
  }
  requestAnimationFrame(loop);
}

setupWalk();
Assets.load().then(()=>{ Save.load(); Quiz.init(); Render.init(); UI.init(); UI.go('menu'); requestAnimationFrame(loop); });
