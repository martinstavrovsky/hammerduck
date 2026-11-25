// Reusable headless harness for the game: fake canvas, audio, gamepad, DOM.
const fs=require('fs');
const path=require('path');const ROOT=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
// load the same scripts, in the same order, as index.html does
const src=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>fs.readFileSync(path.join(ROOT,m[1]),'utf8')).join('\n;\n');
const noop=()=>{};
const grad=()=>({addColorStop:noop});
const ctx=new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:50}):(k==='createLinearGradient'||k==='createRadialGradient')?grad:(k in t?t[k]:noop),set:(t,k,v)=>{t[k]=v;return true}});
const L={};let now=0,cb=null;
global.window=global;global.innerWidth=1024;global.innerHeight=576;global.devicePixelRatio=1;
global.addEventListener=(n,f)=>{(L[n]=L[n]||[]).push(f)};
global.document={getElementById:()=>({getContext:()=>ctx,style:{},addEventListener:noop}),addEventListener:noop,documentElement:{requestFullscreen:()=>Promise.resolve()}};
global.CanvasRenderingContext2D=function(){};CanvasRenderingContext2D.prototype.roundRect=noop;
const BTN=Array.from({length:17},()=>({pressed:false}));
Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[{axes:[0,0],buttons:BTN}]},configurable:true});
global.location={hash:''};global.requestAnimationFrame=f=>{cb=f};global.performance={now:()=>now};
let notes=0;
const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}});
const node=()=>({connect(){},start(){notes++},stop(){},frequency:param(),gain:param(),Q:param(),type:''});
global.AudioContext=function(){return{get currentTime(){return now/1000},state:'running',sampleRate:44100,destination:{},createGain:node,createOscillator:node,createBiquadFilter:node,createBufferSource:node,createBuffer:()=>({getChannelData:()=>new Float32Array(10)}),resume(){}}};
(0,eval)(src+`;globalThis.GAME={get P(){return P},get L(){return L},get boss(){return boss},get state(){return state},get thrown(){return thrown},get track(){return trackName()},get WORLD(){return WORLD},get touchMode(){return touchMode},get sceneWait(){return sceneWait},TCH,touchLayout:()=>layout(),pauseItems:()=>pauseItems(),WORLDS,startWorld,get introT(){return introT},get storyT(){return storyT},get winT(){return winT},get sunJoy(){return sunJoy},stats,keys,T:(x,y)=>T(x,y),setT:(x,y,v)=>setT(x,y,v),groundTop:c=>groundTop(c),hitEnemy,hurtPlayer};`);
const FING=new Map();
const touchEv=(type,id,gone)=>(L[type]||[]).forEach(f=>f({touches:[...FING.values()],changedTouches:[gone||FING.get(id)],cancelable:true,preventDefault:noop}));
module.exports={G:globalThis.GAME,BTN,notes:()=>notes,
  fr:n=>{for(let i=0;i<n;i++){now+=16.67;cb(now)}},
  dn:c=>L.keydown.forEach(f=>f({code:c,preventDefault:noop,repeat:false})),
  up:c=>L.keyup.forEach(f=>f({code:c})),
  // fingers: touchDown(id, x, y) in screen px (the harness screen is 1024x576, so screen px = game px).
  // Sends touch events with e.touches = every finger still down, like a real browser.
  touchDown:(id,x,y)=>{FING.set(id,{identifier:id,clientX:x,clientY:y});touchEv('touchstart',id)},
  touchMove:(id,x,y)=>{FING.set(id,{identifier:id,clientX:x,clientY:y});touchEv('touchmove',id)},
  touchUp:id=>{const t=FING.get(id);FING.delete(id);touchEv('touchend',id,t)},
  touchLost:id=>FING.delete(id), // the browser never tells us this finger lifted (iOS edge swipe...)
};
