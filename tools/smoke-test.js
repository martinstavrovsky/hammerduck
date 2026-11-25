// Quick regression test: node tools/smoke-test.js
const {G,BTN,fr,dn,up}=require('./harness.js');
const tap=k=>{dn(k);fr(2);up(k)};
let fails=0;const ok=(name,cond)=>{console.log((cond?'PASS ':'FAIL ')+name);if(!cond)fails++;};
dn('Enter');up('Enter');fr(30);
ok('ENTER on title starts the intro',G.state==='intro');
// dialogue waits for a press: run the scene, pressing SPACE whenever it waits
const advance=(sec)=>{for(let i=0;i<60*sec&&G.state==='intro';i++){fr(1);if(G.sceneWait){tap('Space');}}};
{let k=0;while(!G.sceneWait&&k<300){fr(1);k++}const t0=G.introT;fr(120);
 ok('intro dialogue waits for the player (no time limit)',G.sceneWait&&G.introT===t0&&G.state==='intro');
 tap('Space');fr(3);ok('SPACE shows the next line',!G.sceneWait&&G.introT>t0);}
{let k=0;while(!G.sceneWait&&k<600){fr(1);k++}const t0=G.introT;tap('KeyH');fr(3);ok('H also shows the next line',G.introT>t0);}
advance(1.5);ok('intro plays boss music once the Big Bug arrives',G.track==='boss');
advance(16);ok('after the last line the intro ends and the level starts',G.state==='play');
const P=G.P;

ok('seed total is exactly 100',G.L.totalSeeds===100);
ok('starts with 3 lives, throw loaded',P.lives===3&&P.throwCD<=0);
dn('Space');fr(3);ok('SPACE jumps',P.vy<0);up('Space');fr(6);
tap('KeyJ');ok('J slams in the air',P.pound);fr(60);
tap('KeyH');ok('H swings hammer',P.swinging);fr(40);
dn('ArrowDown');fr(5);ok('down crouches on ground',P.crouch);up('ArrowDown');fr(5);
tap('KeyG');ok('G throws hammer',!!G.thrown);let t=0;while(G.thrown&&t<400){fr(1);t++}
ok('hammer returns and reload starts',P.hasHammer&&P.throwCD>4);
// boss
P.x=204*48;P.y=400;fr(10);P.x=207*48;P.y=400;fr(30);
ok('boss wakes and boss music plays',G.boss.active&&G.track==='boss');
const h0=P.hearts;P.inv=0;let k=0;while(P.hearts===h0&&k<900){fr(1);k++}ok('boss can hurt the duck',P.hearts<h0);
for(let i=0;i<5;i++){G.boss.inv=0;G.hitEnemy(G.boss,1);}fr(30);
ok('boss beaten, gates open, hero music',G.boss.dead&&G.T(201,5)===0&&G.track==='hero');
P.inv=99;P.x=236*48;P.y=430;dn('ArrowRight');fr(60*4);
ok('reaching the family wins, calm music',G.state==='win'&&G.track==='calm');
// skipping the intro (fresh game in a separate process)
const skip=require('child_process').execFileSync(process.execPath,['-e',`
  const {G,fr,dn,up}=require(${JSON.stringify(__dirname+'/harness.js')});
  dn('Enter');up('Enter');fr(60);dn('Enter');up('Enter');fr(5);process.stdout.write(G.state);`]).toString();
ok('ENTER skips the intro',skip==='play');
console.log(fails?`\n${fails} FAILED`:'\nAll passed');process.exit(fails?1:0);
