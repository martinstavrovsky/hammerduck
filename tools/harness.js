// Reusable headless harness for the game: fake canvas, audio, gamepad, DOM.
const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8').split('<script>')[1].split('</script>')[0];
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
(0,eval)(src+`;globalThis.GAME={get P(){return P},get L(){return L},get boss(){return boss},get state(){return state},get thrown(){return thrown},get track(){return curTrack},get sunJoy(){return sunJoy},stats,keys,T:(x,y)=>T(x,y),hitEnemy,hurtPlayer};`);
module.exports={G:globalThis.GAME,BTN,notes:()=>notes,
  fr:n=>{for(let i=0;i<n;i++){now+=16.67;cb(now)}},
  dn:c=>L.keydown.forEach(f=>f({code:c,preventDefault:noop,repeat:false})),
  up:c=>L.keyup.forEach(f=>f({code:c}))};
