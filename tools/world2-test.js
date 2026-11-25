// World 2 (Frosty Isle) mechanics test: node tools/world2-test.js
const {G,fr,dn,up}=require('./harness.js');
const tap=k=>{dn(k);fr(2);up(k)};
let fails=0;const ok=(name,cond,extra='')=>{console.log((cond?'PASS ':'FAIL ')+name+(extra?'  ('+extra+')':''));if(!cond)fails++;};
const TS=48, P=()=>G.P;
const place=(col,row)=>{const p=P();p.x=col*TS;p.y=(row!==undefined?row*TS:G.groundTop(col))-p.h;p.vx=0;p.vy=0;p.inv=0;fr(2);};
const clearKeys=()=>{for(const k in G.keys)G.keys[k]=false;};
const bugsOnly=types=>{G.L.enemies=G.L.enemies.filter(e=>types.includes(e.type));};

G.startWorld(1,false);fr(5);
ok('Frosty Isle has exactly 100 snowflakes',G.L.totalSeeds===100,G.L.totalSeeds);

// --- ice: you keep sliding after letting go
bugsOnly([]);
place(13);G.keys.ArrowRight=true;fr(40);G.keys.ArrowRight=false;let x0=P().x;fr(30);const iceSlide=P().x-x0;
place(2);G.keys.ArrowRight=true;fr(40);G.keys.ArrowRight=false;x0=P().x;fr(30);const snowSlide=P().x-x0;
ok('ice is slippery (slides much further than snow)',iceSlide>snowSlide*3,`ice ${iceSlide.toFixed(0)}px vs snow ${snowSlide.toFixed(0)}px`);

// --- sliding on ice: the feet stop walking
G.startWorld(1,false);fr(3);bugsOnly([]);place(13);G.keys.ArrowRight=true;fr(40);G.keys.ArrowRight=false;
{const r0=P().run;fr(20);ok('feet stand still while sliding on ice (no walking animation)',P().run===r0&&Math.abs(P().vx)>20,`still sliding at ${P().vx.toFixed(0)}`);}

// --- bugs never walk or hop into the water on their own
G.startWorld(1,false);fr(3);bugsOnly(['roly']);
{const r=G.L.enemies[0];Object.assign(r,{x:27*TS,y:G.groundTop(27)-30,st:'roll',rollT:3,dir:1,vx:0,vy:0,awake:true});place(20);
 for(let i=0;i<60*3;i++){P().inv=9;fr(1);}
 ok('a rolling roly-poly bounces back at the edge of a water hole',G.L.enemies.includes(r)&&r.y<G.groundTop(27),`x col ${(r.x/TS).toFixed(1)}`);}
G.startWorld(1,false);fr(3);bugsOnly(['flea']);
{const f=G.L.enemies[0];Object.assign(f,{x:51*TS,y:G.groundTop(51)-26,vx:0,vy:0,awake:true,cd:0});
 const fl=G.L.movers.find(m=>m.ice);P().x=fl.x+10;P().y=fl.y-P().h;P().vy=0;
 let hops=0,was=true;for(let i=0;i<60*6;i++){P().inv=9;fl.sink=0;fl.sit=0;fr(1);if(!f.onGround&&was)hops++;was=f.onGround;}
 ok('a snow flea next to the water hops in place instead of jumping in',G.L.enemies.includes(f)&&!f.dead&&f.y<500&&hops>=2,`${hops} hops, x col ${(f.x/TS).toFixed(1)}`);}

// --- belly slide keeps speed and bowls over bugs
G.startWorld(1,false);fr(3);bugsOnly(['flea']);
const flea=G.L.enemies[0];place(12);
G.keys.ArrowRight=true;fr(30);dn('ArrowDown');G.keys.ArrowRight=false;fr(10);
ok('belly slide: crouching on ice keeps you moving',P().crouch&&Math.abs(P().vx)>140,`vx ${P().vx.toFixed(0)}`);
flea.x=P().x+70;flea.y=G.groundTop(Math.floor(flea.x/TS))-flea.h;flea.vx=0;flea.vy=0;flea.awake=true;flea.cd=5;const h0=P().hearts;
fr(40);up('ArrowDown');clearKeys();
ok('belly slide knocks out a bug without getting hurt',flea.dead&&P().hearts===h0);

// --- floes sink while you stand on them
G.startWorld(1,false);fr(3);bugsOnly([]);
const floe=G.L.movers.find(m=>m.ice);P().x=floe.x+20;P().y=floe.y-P().h-2;P().vy=0;fr(5);
const y0=floe.y;fr(120);
ok('ice floe sinks while you stand on it',floe.y-y0>30,`sank ${(floe.y-y0).toFixed(0)}px`);
fr(60*6);ok('standing too long on a floe = into the cold water',P().dead||P().lives<3);

// --- geyser launches you up
G.startWorld(1,false);fr(3);bugsOnly([]);
const gz=G.L.geysers[0];P().x=gz.x-P().w/2;P().y=gz.y-P().h;P().vy=0;
let minY=P().y;for(let i=0;i<60*4;i++){fr(1);minY=Math.min(minY,P().y);}
ok('geyser blasts you high up',gz.y-(minY+P().h)>250,`${(gz.y-(minY+P().h)).toFixed(0)}px`);

// --- wind pushes you back, crouching braces
G.startWorld(1,false);fr(3);bugsOnly([]);
const wz=G.L.winds[0];
const windTest=crouch=>{place(150);let moved=0;for(let i=0;i<60*4;i++){if(crouch)G.keys.ArrowDown=true;const bx=P().x;fr(1);if(wz.active)moved+=P().x-bx;}clearKeys();return moved;};
const pushStand=windTest(false), pushCrouch=windTest(true);
ok('wind gusts push you backwards',pushStand<-100,`${pushStand.toFixed(0)}px`);
ok('crouching braces against the wind',pushCrouch>pushStand*0.6,`${pushCrouch.toFixed(0)}px`);

// --- icicles fall and shatter
G.startWorld(1,false);fr(3);bugsOnly([]);
const ic=G.L.icicles[0];place(110);let fell=false,hurt=false;const hh=P().hearts;
P().x=ic.x-P().w/2;for(let i=0;i<60*2;i++){fr(1);if(ic.st==='fall')fell=true;}
ok('icicle drops when you walk under it',fell&&ic.st==='gone');
ok('a falling icicle hurts',P().hearts<hh);

// --- cracking ice breaks under you
G.startWorld(1,false);fr(3);bugsOnly([]);
place(132,10);fr(60);
ok('cracking ice breaks after you stand on it',G.T(132,10)===0);

// --- snowballs: moth throws, a hammer swing bats it back and knocks the moth out
G.startWorld(1,false);fr(3);bugsOnly(['moth']);
const moth=G.L.enemies[0];{const fl=G.L.movers.find(m=>m.ice&&m.x>=59*TS);P().x=fl.x+20;P().y=fl.y-P().h;P().vy=0;fr(2);}P().face=1;moth.awake=true;moth.cd=0.05;
let shot=null;for(let i=0;i<120&&!shot;i++){fr(1);shot=G.L.shots[0];}
ok('frost moth throws a snowball',!!shot);
let batted=false;for(let i=0;i<120&&shot&&!shot.gone&&!moth.dead;i++){const sx=shot.x-(P().x+P().w/2),sy=shot.y-(P().y+P().h/2);P().face=sx<0?-1:1;if(Math.abs(sx)<120&&Math.abs(sy)<90&&!P().swinging&&!shot.reflected){tap('KeyH');}else fr(1);P().inv=1;if(shot.reflected)batted=true;}
for(let i=0;i<90&&!moth.dead;i++)fr(1);
ok('swinging bats the snowball back',batted);
ok('the batted snowball knocks out the moth',moth.dead);

// --- roly-poly: rolling ones bounce off the swing, the throw stops them
G.startWorld(1,false);fr(3);bugsOnly(['roly']);
const roly=G.L.enemies[0];roly.x=24*TS;roly.y=G.groundTop(24)-roly.h;place(28);P().face=-1;roly.awake=true;
for(let i=0;i<90&&roly.st!=='roll';i++)fr(1);
ok('roly-poly curls up and rolls at you',roly.st==='roll');
const rd=roly.dir;P().inv=5;for(let i=0;i<60&&roly.dir===rd;i++){if(Math.abs(roly.x-P().x)<90&&!P().swinging)tap('KeyH');else fr(1);}
ok('a swing bounces a rolling roly-poly away (BOING)',roly.dir!==rd&&!roly.dead);
// (it may have rolled into a lake hole; set up a fresh dizzy one on solid ice)
if(!G.L.enemies.includes(roly)) G.L.enemies.push(roly);
Object.assign(roly,{x:26*TS,y:G.groundTop(26)-roly.h,st:'dizzy',st_t:0,vx:0,vy:0,dead:false});
P().x=23*TS;P().y=G.groundTop(23)-P().h;P().vx=0;P().face=1;P().throwCD=0;P().inv=5;fr(1);tap('KeyG');for(let i=0;i<120&&!roly.dead;i++)fr(1);
ok('the thrown hammer knocks it out',roly.dead);

// --- ice spider drops down
G.startWorld(1,false);fr(3);bugsOnly(['spider']);
const sp=G.L.enemies[0];place(Math.floor((sp.x+sp.w/2)/TS),10);sp.awake=true;P().inv=5;
let low=false;for(let i=0;i<90;i++){fr(1);if(sp.st==='low')low=true;}
ok('ice spider drops down when you pass under',low);

// --- the BIGGER BUG
G.startWorld(1,false);fr(3);bugsOnly(['bigger']);
const B=G.boss;place(189);fr(10);place(192);fr(30);
ok('Bigger Bug wakes up and flies',B.active&&['rise','hover'].includes(B.state),B.state);
for(let i=0;i<120;i++)fr(1);
ok('boss music plays',G.track==='boss');
const hp0=B.hp;P().inv=99;
// a swing can't hurt him while he flies
B.state='hover';B.inv=0;const r1=G.hitEnemy(B,1,'swing');ok('swing does nothing while he is flying',!r1&&B.hp===hp0);
B.inv=0;const r2=G.hitEnemy(B,1,'throw');ok('a thrown hammer hits him in the air',r2&&B.hp===hp0-1);
// wait for a dive -> stuck
let stuck=false;for(let i=0;i<60*12&&!stuck;i++){fr(1);P().inv=99;if(B.state==='stuck')stuck=true;}
ok('he dives and gets his head stuck in the snow',stuck);
let hits=0;const hb=B.hp;for(let i=0;i<60*3&&B.state==='stuck';i++){P().x=B.x-P().w-4;P().y=B.y+B.h-P().h;P().face=1;P().inv=99;if(!P().swinging){tap('KeyH');}else fr(1);}
ok('while stuck, hammer swings hurt him (several hits per dive)',B.hp<=hb-2,`hp ${hb} -> ${B.hp}`);
for(let i=0;i<60*40&&!B.dead;i++){P().inv=99;fr(1);if(B.state==='stuck'){B.inv=0;G.hitEnemy(B,1,'swing');}}
fr(5);ok('the Bigger Bug can be beaten (10 hp)',B.dead);
ok('arena gates open after the fight',G.T(212,5)===0&&G.T(186,5)===0);
ok('victory march plays',G.track==='hero');

// --- ending: cage smashed, family thanks, THE END -> title
P().x=216*TS;P().y=G.groundTop(216)-P().h;G.keys.ArrowRight=true;
for(let i=0;i<60*8;i++)fr(1);clearKeys();
ok('reaching Drake wins the world',G.state==='win');
ok('lullaby plays at the end',G.track==='calm');
tap('Enter');fr(5);ok('ENTER after the ending returns to the title (last world)',G.state==='title');

// --- story between worlds: World 1 win -> pigeon -> World 2 intro, lives carried over
G.startWorld(0,false);fr(3);G.P.lives=5;G.boss.dead=true;G.boss.active=false;
for(let y=0;y<12;y++){if(G.T(201,y)===6)G.setT(201,y,0);if(G.T(227,y)===6)G.setT(227,y,0);}
G.P.x=236*TS;G.P.y=G.groundTop(236)-G.P.h;G.keys.ArrowRight=true;fr(60*4);clearKeys();
ok('World 1 won',G.state==='win');
tap('Enter');fr(5);ok('ENTER starts the pigeon story',G.state==='story');
{let k=0;while(!G.sceneWait&&k<300){fr(1);k++}const t0=G.storyT;fr(200);ok('story dialogue waits for a press',G.sceneWait&&G.storyT===t0);}
for(let i=0;i<60*16&&G.state==='story';i++){fr(1);if(G.sceneWait)tap('Space');}
ok('story leads into the Frosty Isle intro',G.state==='intro'&&G.WORLD.name==='Frosty Isle');
ok('lives carry over to World 2',G.P.lives===5,G.P.lives);

console.log(fails?`\n${fails} FAILED`:'\nAll passed');process.exit(fails?1:0);
