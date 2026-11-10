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
  slime:  { name:'말랑 슬라임', desc:'싸고 빠르게 뽑는 기본 전투 유닛', cost:75,  hp:110,  atk:14,  speed:72, rate:0.9, range:12,  w:20, cd:3,  upg:40 },
  knight: { name:'꼬마 검사',   desc:'공격력과 체력이 균형 잡힌 근접 유닛', cost:180, hp:320, atk:38, speed:52, rate:1.0, range:14,  w:22, cd:6,  upg:60, strong:['beast'] },
  archer: { name:'숲의 궁수',   desc:'멀리서 화살을 쏘는 원거리 유닛 (체력 낮음)', cost:240, hp:130, atk:30, speed:46, rate:1.4, range:230, w:18, cd:7, ranged:'arrow', upg:70, strong:['float'] },
  golem:  { name:'이끼 골렘',   desc:'느리지만 단단한 방패 유닛 (피해 35% 감소)', cost:550, hp:1600, atk:45, speed:22, rate:1.8, range:14, w:34, cd:24, def:0.35, noKb:true, upg:100, unlock:{coins:300, stage:1} },
  dragon: { name:'보라 드래곤', desc:'화염구로 범위 공격하는 하늘의 지배자', cost:1400, hp:900, atk:110, speed:38, rate:2.4, range:180, w:30, cd:45, ranged:'fire', aoe:75, fly:true, strong:['float'], upg:150, unlock:{coins:900, stage:3} },
  /* ----- 뽑기 전용 캐릭터 ----- */
  bee:      { gacha:'N',  name:'꿀벌 창병',     desc:'날쌘 발로 달려가 창을 콕콕! 공격 속도가 빨라요', cost:120, hp:150, atk:22, speed:95, rate:0.6, range:18, w:18, cd:4, upg:50 },
  mushroom: { gacha:'N',  name:'버섯 방패병',   desc:'싸고 튼튼한 방패 유닛 (피해 40% 감소)', cost:150, hp:560, atk:12, speed:40, rate:1.2, range:12, w:22, cd:8, def:0.4, upg:50 },
  snowmage: { gacha:'R',  name:'눈송이 마법사', desc:'얼음 결정을 쏴서 맞은 적을 느리게 만들어요', cost:480, hp:240, atk:42, speed:40, rate:1.5, range:220, w:18, cd:14, ranged:'ice', slow:true, upg:90 },
  penguin:  { gacha:'R',  name:'대포 펭귄',     desc:'아주 먼 곳까지 대포알을 쏘는 범위 공격수', cost:650, hp:320, atk:90, speed:32, rate:2.6, range:290, w:22, cd:20, ranged:'cannon', aoe:60, strong:['alien'], upg:110 },
  squirrel: { gacha:'N',  name:'도토리 다람쥐', desc:'도토리를 던지는 값싼 원거리 유닛. 야수에게 강해요', cost:140, hp:120, atk:26, speed:60, rate:1.1, range:170, w:18, cd:5, ranged:'acorn', strong:['beast'], upg:50 },
  duck:     { gacha:'N',  name:'고무 오리 방패', desc:'아주 싸고 넉백되지 않는 벽. 공격력은 약해요', cost:90, hp:420, atk:6, speed:50, rate:1.5, range:12, w:20, cd:7, noKb:true, upg:45 },
  frog:     { gacha:'R',  name:'개구리 사냥꾼', desc:'긴 혀로 적을 뒤로 날려 버려요. 야수·떠다니는 적에게 강해요', cost:420, hp:380, atk:55, speed:60, rate:1.2, range:42, w:22, cd:14, kb:200, strong:['beast','float'], upg:90 },
  sheep:    { gacha:'R',  name:'양 성직자',     desc:'빛 구슬로 언데드를 정화해 되살아나지 못하게 해요', cost:520, hp:300, atk:45, speed:40, rate:1.6, range:200, w:20, cd:15, ranged:'holy', purify:true, strong:['undead'], upg:90 },
  robot:    { gacha:'R',  name:'자석 로봇',     desc:'자석 주먹으로 강철 적에게도 제대로 된 피해를 줘요', cost:600, hp:650, atk:60, speed:35, rate:1.4, range:16, w:26, cd:22, metalBreak:true, strong:['metal'], upg:110 },
  fox:      { gacha:'SR', name:'번개 여우 닌자', desc:'번개처럼 빠른 칼질! 30% 확률로 2.5배 치명타', cost:1100, hp:750, atk:120, speed:115, rate:0.55, range:16, w:22, cd:28, crit:0.3, upg:160 },
  astronaut:{ gacha:'SR', name:'햄스터 우주비행사', desc:'광선총으로 외계 보호막을 한 번에 깨요. 외계에 강해요', cost:1000, hp:650, atk:95, speed:50, rate:1.0, range:190, w:22, cd:26, ranged:'laser', shieldBreak:true, strong:['alien'], upg:160 },
  owl:      { gacha:'SR', name:'유령 사냥 올빼미', desc:'하늘에서 깃털을 쏘며 언데드를 정화해요. 언데드·떠다니는 적에게 강해요', cost:950, hp:600, atk:85, speed:55, rate:0.9, range:150, w:24, cd:26, ranged:'feather', fly:true, purify:true, strong:['undead','float'], upg:160 },
  phoenix:  { gacha:'UR', name:'태양 피닉스',   desc:'태양 불꽃으로 넓은 범위를 태우고, 쓰러지면 한 번 부활해요', cost:2600, hp:2400, atk:270, speed:45, rate:2.0, range:210, w:32, cd:70, ranged:'sun', aoe:120, fly:true, revive:true, purify:true, strong:['undead'], upg:250 },
  turtle:   { gacha:'UR', name:'시간의 거북 현자', desc:'시계 마법으로 넓은 범위의 적을 2.5초 동안 멈춰요. 넉백되지 않아요', cost:2800, hp:3400, atk:160, speed:22, rate:2.4, range:200, w:34, cd:75, ranged:'clock', aoe:140, freeze:2.5, noKb:true, upg:250 },
};
const ENEMIES = {
  eslime:   { name:'꼬마 슬라임', hp:105,  atk:11,  speed:44,  rate:1.0, range:12, w:18, reward:2 },
  bat:      { name:'박쥐',       hp:70,   atk:9,   speed:115, rate:0.7, range:12, w:18, fly:true, reward:3, traits:['float'] },
  wolf:     { name:'늑대',       hp:230,  atk:24,  speed:96,  rate:0.9, range:14, w:28, reward:4, traits:['beast'] },
  skeleton: { name:'해골 전사',   hp:650,  atk:34,  speed:34,  rate:1.3, range:16, w:22, def:0.2, reward:6, traits:['undead'] },
  ghost:    { name:'장난꾸러기 유령', hp:170, atk:18, speed:58,  rate:0.9, range:12, w:18, fly:true, reward:5, traits:['float','undead'] },
  zombie:   { name:'느릿느릿 좀비', hp:420,  atk:24,  speed:24,  rate:1.4, range:14, w:22, reward:5, traits:['undead'] },
  boar:     { name:'돌진 멧돼지', hp:460,  atk:40,  speed:88,  rate:1.1, range:14, w:30, reward:6, traits:['beast'] },
  metalslime:{ name:'강철 슬라임', hp:24,   atk:26,  speed:42,  rate:1.0, range:12, w:18, reward:15, traits:['metal'] },
  alien:    { name:'외계 해파리', hp:520,  atk:30,  speed:36,  rate:1.2, range:14, w:22, reward:8, traits:['alien'] },
  boss:     { name:'그림자 대왕', hp:6000, atk:110, speed:16,  rate:2.6, range:30, w:62, aoe:120, kb:300, reward:80, boss:true },
  ufo:      { name:'외계 함대장', hp:6500, atk:115, speed:18,  rate:2.6, range:40, w:62, aoe:120, kb:260, reward:100, boss:true, fly:true, traits:['alien','float'] },
};
const STAGES = [
  { id:1, name:'햇살 초원',   desc:'꼬마 슬라임들이 몰려와요. 기본기를 익혀요!', theme:0, baseHp:3000, reward:120,
    spawns:[ {t:'eslime', every:3.5, start:2}, {t:'bat', every:9, start:14} ], hpMul:1.12 },
  { id:2, name:'박쥐 동굴',   desc:'날쌘 박쥐가 등장! 빠른 적을 조심하세요.', theme:1, baseHp:4000, reward:160,
    spawns:[ {t:'eslime', every:4.4, start:2}, {t:'bat', every:4, start:6}, {t:'wolf', every:13, start:16} ], hpMul:1.2 },
  { id:3, name:'으스스한 숲', desc:'튼튼한 해골 전사와 늑대가 숲을 지켜요.', theme:2, baseHp:4500, reward:220,
    spawns:[ {t:'eslime', every:6, start:3}, {t:'skeleton', every:13, start:10}, {t:'wolf', every:12, start:18} ], hpMul:1.15 },
  { id:4, name:'혼돈의 계곡', desc:'모든 종류의 적이 한꺼번에 몰려와요!', theme:3, baseHp:6000, reward:280,
    spawns:[ {t:'eslime', every:4.5, start:2}, {t:'bat', every:5.5, start:5}, {t:'wolf', every:8, start:10}, {t:'skeleton', every:12, start:15}, {t:'boar', every:14, start:25} ], hpMul:1.25 },
  { id:5, name:'그림자 성',   desc:'최종 보스 그림자 대왕이 깨어납니다…!', theme:4, baseHp:8000, reward:450,
    spawns:[ {t:'eslime', every:5, start:2}, {t:'bat', every:6.5, start:6}, {t:'wolf', every:9, start:12}, {t:'skeleton', every:13, start:16}, {t:'ghost', every:11, start:20} ], hpMul:1.3,
    boss:{ t:'boss', at:40, hpTrigger:0.7 } },
  { id:6, name:'유령 묘지',   desc:'쓰러져도 일어나는 언데드 무리! 정화 능력이 필요해요.', theme:5, baseHp:9000, reward:520,
    spawns:[ {t:'zombie', every:6, start:2}, {t:'ghost', every:5.5, start:5}, {t:'skeleton', every:11, start:12}, {t:'bat', every:7, start:8} ], hpMul:1.4 },
  { id:7, name:'강철 광산',   desc:'공격이 잘 안 먹히는 강철 슬라임과 멧돼지 떼!', theme:6, baseHp:10000, reward:600,
    spawns:[ {t:'metalslime', every:7, start:4}, {t:'boar', every:8, start:6}, {t:'eslime', every:4, start:2}, {t:'wolf', every:9, start:12} ], hpMul:1.45 },
  { id:8, name:'외계 침공',   desc:'보호막을 두른 외계 생명체와 함대장이 내려와요!', theme:7, baseHp:12000, reward:800,
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

// 유닛 데이터에 따라 결정되는 강화 비용
const upgCost=(k,lv)=>Math.round(Math.max(40,UNITS[k].cost*0.3)*(1+0.5*(lv-1))/5)*5;

export { UNIT_ORDER, DECK_MAX, RARITY, PITY_MAX, TICKET_PRICE, TRAITS, STRONG_MUL, STRONG_DEF, UNITS, ENEMIES, STAGES, ACHIEVEMENTS, upgCost };
