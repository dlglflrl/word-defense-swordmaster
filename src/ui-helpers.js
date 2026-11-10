import { TRAITS } from './data.js';

// 상점과 뽑기 결과에서 공통으로 표시하는 유닛 능력 설명
function abilityTags(d){
  return [
    ...(d.strong||[]).map(t=>`🎯 ${TRAITS[t].icon}${TRAITS[t].name}에 강함`),
    d.purify?'✨ 정화':'', d.metalBreak?'🧲 강철 파괴':'', d.shieldBreak?'🛡️ 보호막 파괴':'', d.freeze?'⏸ 멈춤':'', d.kb?'💨 넉백':'', d.noKb?'🧱 넉백 무시':'',
    d.slow?'❄️ 둔화':'', d.crit?'⚡ 치명타':'', d.revive?'🔥 부활':'', d.aoe?'💥 범위':'', d.def?`🛡 피해 ${Math.round(d.def*100)}%↓`:'', d.fly?'🪽 비행':''
  ].filter(Boolean).map(x=>`<span>${x}</span>`).join('');
}

export { abilityTags };
