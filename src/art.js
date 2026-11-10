import { INK, GROUND } from './config.js';
import { rand } from './utils.js';

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
    if(blink){ c.beginPath(); c.moveTo(x-r,y); c.lineTo(x+r,y); c.lineWidth=2.5; c.strokeStyle=INK; c.stroke(); return; }
    this.ell(c,x,y,r*.8,r,'#fff',INK,2.2);
    this.circ(c,x+r*.25,y+r*.1,r*.5,color,null);
    this.circ(c,x+r*.4,y-r*.2,r*.18,'#fff',null);
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
    c.fillStyle='#fff'; star(c,2,-68,5);
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
    c.fillStyle='#ffd23f'; star(c,42,-64,4);
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
    c.fillStyle=INK; c.font='16px "Do Hyeon", sans-serif'; c.textAlign='center'; c.fillText('S',51,-218);
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

function drawPortrait(canvas, key, flip=false, scale=1){
  const c=canvas.getContext('2d'), w=canvas.width, h=canvas.height; c.clearRect(0,0,w,h);
  const big={golem:0.72, dragon:0.85, boss:0.36, phoenix:0.7, penguin:0.9, snowmage:0.85, turtle:0.62, robot:0.8, owl:0.85, ufo:0.42, frog:0.95, boar:0.85}[key]||1;
  const s=(h/90)*big*scale;
  c.save(); c.translate(w/2 + ({dragon:6,phoenix:8,penguin:-8,fox:4,turtle:-10,squirrel:6,frog:-4}[key]||0)*s, h-8*(h/90)); c.scale(flip?-s:s, s);
  const u={animT:0,state:'idle',atkP:0,seed:0.3,portrait:true};
  DRAWERS[key].call(Art,c,u,1);
  c.restore();
}

// 캐릭터와 렌더러에서 함께 쓰는 별 모양 그리기
function star(c,x,y,r){ c.beginPath(); for(let i=0;i<10;i++){ const a=i*Math.PI/5-Math.PI/2, rr=i%2?r*.45:r; c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr); } c.closePath(); c.fill(); }

export { Art, DRAWERS, drawPortrait, star };
