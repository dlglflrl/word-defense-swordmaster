// 게임 시작 순서와 프레임 루프를 담당한다.
import { Save, POTATO } from './save.js';
import { Quiz } from './quiz.js';
import { Battle } from './battle.js';
import { Render } from './render.js';
import { Gacha } from './gacha.js';
import { UI } from './ui.js';

// 모든 모듈이 준비된 뒤 서로 호출할 화면 기능을 연결한다.
Battle.init({ render: Render, ui: UI });
Gacha.init({ ui: UI });

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

Save.load(); Quiz.init(); Render.init(); UI.init();
requestAnimationFrame(loop);
