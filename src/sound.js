import { Save } from './save.js';

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

export { Sound };
