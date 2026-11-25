// Touch controls test: node tools/touch-test.js
const {G,fr,dn,up,touchDown,touchMove,touchUp,touchLost}=require('./harness.js');
let fails=0;const ok=(name,cond,extra='')=>{console.log((cond?'PASS ':'FAIL ')+name+(extra?'  ('+extra+')':''));if(!cond)fails++;};
const tap=(x,y,id=1)=>{touchDown(id,x,y);fr(2);touchUp(id);fr(1)};
const P=()=>G.P, TS=48;
const ground=col=>{const p=P();p.x=col*TS;p.y=G.groundTop(col)-p.h;p.vx=0;p.vy=0;p.inv=99;fr(3)};

ok('keyboard mode by default on a computer',!G.touchMode);
tap(500,300);ok('a tap on the title starts the game',G.state==='intro');
ok('touching switches to touch mode',G.touchMode);
{let k=0;while(!G.sceneWait&&k<300){fr(1);k++}const t0=G.introT;
 tap(500,300);fr(3);ok('a tap shows the next line, but does NOT skip the intro',G.state==='intro'&&!G.sceneWait&&G.introT>t0);}
tap(1024-90,576-26);ok('the SKIP button skips the intro',G.state==='play');
G.L.enemies.length=0;

const {pad,btns}=G.touchLayout(),B=id=>btns.find(b=>b.id===id);
ground(4);
{const x0=P().x;touchDown(5,pad.x+pad.r*0.6,pad.y);fr(40);
 ok('holding ▶ on the d-pad walks right',P().x>x0+60,`moved ${(P().x-x0).toFixed(0)}px`);
 touchDown(6,B('jump').x,B('jump').y);fr(3);ok('JUMP while walking (two fingers)',P().vy<0&&G.TCH.right);
 touchUp(6);touchUp(5);fr(60);const x1=P().x;fr(20);ok('letting go stops walking',Math.abs(P().x-x1)<3);}
{ground(4);const x0=P().x;touchDown(5,pad.x-pad.r*0.6,pad.y);fr(30);ok('◀ walks left',P().x<x0-40);
 touchMove(5,pad.x+pad.r*0.6,pad.y);fr(40);ok('sliding the thumb to ▶ turns around',P().vx>0);touchUp(5);fr(30);}
ground(4);touchDown(5,pad.x,pad.y+pad.r*0.7);fr(6);ok('▼ on the d-pad crouches',P().crouch);touchUp(5);fr(10);
ground(4);tap(B('atk').x,B('atk').y);ok('HAMMER swings',P().swinging);fr(40);
ground(4);P().throwCD=0;tap(B('throw').x,B('throw').y);ok('THROW throws the hammer',!!G.thrown);
{let t=0;while(G.thrown&&t<400){fr(1);t++}}
ground(4);touchDown(6,B('jump').x,B('jump').y);fr(8);touchUp(6);fr(4);tap(B('slam').x,B('slam').y);ok('SLAM in the air',P().pound);fr(60);
ground(4);touchDown(6,B('jump').x+B('jump').r*1.3,B('jump').y);fr(3);ok('a slightly-off thumb still hits JUMP',P().vy<0);touchUp(6);fr(60);

// a finger whose "lift" never arrives (iOS edge swipe) must not leave ▶ stuck
ground(4);touchDown(5,pad.x+pad.r*0.6,pad.y);fr(10);touchLost(5);fr(5);
ok('(lost finger: ▶ still held until the next touch)',G.TCH.right);
tap(B('atk').x,B('atk').y,8);fr(2);ok('the next touch anywhere un-sticks ▶',!G.TCH.right);
{fr(40);const x1=P().x;fr(20);ok('…and the duck stops',Math.abs(P().x-x1)<3);}
touchDown(5,pad.x+pad.r*0.6,pad.y);fr(5);touchLost(5);touchDown(6,pad.x+pad.r*0.6,pad.y);fr(2);touchUp(6);fr(2);
ok('touching ▶ again and letting go un-sticks it too',!G.TCH.right);
// pause menu
tap(800,32);ok('⏸ pauses',G.state==='pause');
{const items=G.pauseItems(),it=id=>items.find(i=>i.id===id);
 tap(it('mute').x+20,it('mute').y);ok('Sound button toggles sound and stays paused',G.pauseItems()[1].label.includes('OFF')&&G.state==='pause');tap(it('mute').x+20,it('mute').y);
 tap(it('resume').x+20,it('resume').y);ok('Continue resumes',G.state==='play');}
// finger held while pausing does not stay stuck
touchDown(5,pad.x+pad.r*0.6,pad.y);fr(3);tap(800,32,7);ok('pausing mid-walk pauses',G.state==='pause');fr(2);
ok('…and releases the held d-pad',!G.TCH.right);touchUp(5);
{const items=G.pauseItems();tap(items[0].x+20,items[0].y);}
// keyboard takes over again
dn('KeyH');up('KeyH');ok('pressing a key switches back to keyboard mode',!G.touchMode);
// game over: tap to restart

console.log(fails?`\n${fails} FAILED`:'\nAll passed');process.exit(fails?1:0);
