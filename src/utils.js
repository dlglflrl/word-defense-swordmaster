// 여러 기능에서 함께 사용하는 계산·DOM·배열 도구
const rand = (a,b)=>a+Math.random()*(b-a);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const $ = s=>document.querySelector(s);
const fmt = n=>Math.floor(n).toLocaleString();

function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

export { rand, clamp, $, fmt, shuffle };
