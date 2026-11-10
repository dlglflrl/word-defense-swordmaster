import { DEV_MODE } from './config.js';
import { UNIT_ORDER, DECK_MAX, UNITS, STAGES } from './data.js';

/* ---------------- SAVE ---------------- */
const SAVE_KEY = DEV_MODE ? 'swordmaster_word_defense_TEST' : 'swordmaster_word_defense_v1';
const Save = {
  data:null,
  defaults(){
    return {
      coins:0, cleared:0,
      units:Object.fromEntries(UNIT_ORDER.map(k=>[k,{owned:['slime','knight','archer'].includes(k),lv:1}])),
      deck:['slime','knight','archer'], tickets:1, pity:0,
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
    const hadDeck = d && Array.isArray(d.deck);
    this.data = d ? merge(this.defaults(), d) : this.defaults();
    if(!hadDeck) this.data.deck = UNIT_ORDER.filter(k=>this.data.units[k].owned).slice(0,DECK_MAX);   // 이전 버전 저장 데이터 변환
    this.data.deck = this.data.deck.filter(k=>UNITS[k] && this.data.units[k].owned);
    if(!this.data.deck.length) this.data.deck=['slime'];
  },
  save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); }catch(e){} },
  reset(){ this.data = this.defaults(); this.save(); },
};
function merge(a,b){
  for(const k in b){
    if(b[k] && typeof b[k]==='object' && !Array.isArray(b[k]) && a[k] && typeof a[k]==='object' && !Array.isArray(a[k])) a[k]=merge(a[k],b[k]);
    else a[k]=b[k];
  }
  return a;
}

// 저장된 설정을 매번 읽어 감자 모드 전환을 즉시 반영한다.
const POTATO = ()=>Save.data.settings.potato;

export { Save, POTATO };
