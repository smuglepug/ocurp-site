
const $=id=>document.getElementById(id);
// LAMPLIGHT_RULES: the page's exact generator budget. Mirrored verbatim in
// tools/provers/lamplight.py - if you change one, change the other.
const LAMPLIGHT_RULES={WALL:1,BULB:2,FREE:0,
  sizes:{7:{n:7,extra:7},8:{n:8,extra:12},9:{n:9,extra:14}},
  maxTries:600};
const LLR=LAMPLIGHT_RULES;
let ll={n:0,wall:[],bulb:[],history:[],moves:0,status:'playing',seed:0};
const llCell=(r,c)=>r*ll.n+c;

// segments: a free cell's light is stopped by walls, so light is a property of
// the ROW SEGMENT and COLUMN SEGMENT a cell belongs to. Two bulbs see each other
// exactly when they share one of those ids.
function llSegments(){
  const n=ll.n,rs=[],cs=[];
  for(let r=0;r<n;r++)rs.push(new Array(n).fill(-1));
  for(let r=0;r<n;r++)cs.push(new Array(n).fill(-1));
  let k=0;
  for(let r=0;r<n;r++){let c=0;
    while(c<n){
      if(ll.wall[r][c]){c++;continue}
      let j=c; while(j<n&&!ll.wall[r][j]){rs[r][j]=k;j++}
      k++; c=j}}
  k=0;
  for(let c=0;c<n;c++){let r=0;
    while(r<n){
      if(ll.wall[r][c]){r++;continue}
      let j=r; while(j<n&&!ll.wall[j][c]){cs[j][c]=k;j++}
      k++; r=j}}
  return {rs,cs}}
// llIllum: recompute which cells are lit by the current bulb set.
function llIllum(bs){
  const n=ll.n,{rs,cs}=llSegments(),lit=new Array(n*n).fill(false);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)
    if(bs[r][c]){let j=c; while(j<n&&!ll.wall[r][j]){lit[r*n+j]=true;j++}
      j=r; while(j<n&&!ll.wall[j][c]){lit[j*n+c]=true;j++}}
  return lit}
// llCount: how many bulb layouts satisfy the rules, capped at `limit`.
// EXACT - this is what makes a board provably unique rather than probably so.
function llCount(limit,bs0){
  const n=ll.n,{rs,cs}=llSegments();
  const cells=[]; for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!ll.wall[r][c])cells.push([r,c]);
  let litR=0,litC=0;
  const base=bs0||Array.from({length:n},()=>new Array(n).fill(0));
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(base[r][c]){
    if((litR>>rs[r][c]&1)||(litC>>cs[r][c]&1))return 0;   // two givens already see
    litR|=1<<rs[r][c]; litC|=1<<cs[r][c]}
  let found=0;
  function rec(k,litR,litC,usedR,usedC){
    if(found>=limit)return;
    if(k===cells.length){
      for(const [r,c] of cells)
        if(!(litR>>rs[r][c]&1)&&!(litC>>cs[r][c]&1))return;
      found++; return}
    const [r,c]=cells[k],a=rs[r][c],b=cs[r][c];
    if(litR>>a&1 || litC>>b&1) rec(k+1,litR,litC,usedR,usedC);
    if(!(usedR>>a&1)&&!(usedC>>b&1)) rec(k+1,litR|(1<<a),litC|(1<<b),usedR|(1<<a),usedC|(1<<b));
  }
  rec(0,litR,litC,litR,litC);
  return found}
// llSolve: one bulb layout satisfying the rules, or null.
function llSolve(bs0){
  const n=ll.n,{rs,cs}=llSegments();
  const cells=[]; for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!ll.wall[r][c])cells.push([r,c]);
  let litR=0,litC=0;
  const base=bs0||Array.from({length:n},()=>new Array(n).fill(0));
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(base[r][c]){
    if((litR>>rs[r][c]&1)||(litC>>cs[r][c]&1))return null;
    litR|=1<<rs[r][c]; litC|=1<<cs[r][c]}
  let out=null;
  function rec(k,litR,litC,usedR,usedC,acc){
    if(out)return;
    if(k===cells.length){
      for(const [r,c] of cells)
        if(!(litR>>rs[r][c]&1)&&!(litC>>cs[r][c]&1))return;
      out=acc.map(a=>a.slice()); return}
    const [r,c]=cells[k],a=rs[r][c],b=cs[r][c];
    if(litR>>a&1 || litC>>b&1){rec(k+1,litR,litC,usedR,usedC,acc); if(out)return}
    if(!(usedR>>a&1)&&!(usedC>>b&1)){
      acc[r][c]=1;
      rec(k+1,litR|(1<<a),litC|(1<<b),usedR|(1<<a),usedC|(1<<b),acc);
      acc[r][c]=0}
  }
  rec(0,litR,litC,litR,litC,Array.from({length:n},()=>new Array(n).fill(0)));
  return out}
// llWalls: the wall layout. Skeleton walls on every odd/odd cell, then `extra`
// more walls dropped on random free cells. LLR.sizes[n].extra is the count.
function llWalls(rng){
  const {n,extra}=LLR.sizes[ll.n];
  const w=Array.from({length:n},()=>new Array(n).fill(0));
  for(let r=1;r<n;r+=2)for(let c=1;c<n;c+=2)w[r][c]=LLR.WALL;
  const skel=[]; for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!w[r][c])skel.push([r,c]);
  for(let i=skel.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));const t=skel[i];skel[i]=skel[j];skel[j]=t}
  for(let i=0;i<extra&&i<skel.length;i++)w[skel[i][0]][skel[i][1]]=LLR.WALL;
  return w}
// llBuild: generate a board that has EXACTLY ONE solution (by construction).
function llBuild(n,seed){
  ll.n=n;
  let s=seed>>>0;
  const rng=()=>{s=(s*1664525+1013904223)>>>0; return s/4294967296};
  for(let t=0;t<LLR.maxTries;t++){
    ll.wall=llWalls(rng);
    if(llCount(2)!==1) continue;                 // must be uniquely solvable
    const sol=llSolve(); if(!sol) continue;
    const given=sol.map(r=>r.slice());
    const order=[]; for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(given[r][c])order.push([r,c]);
    for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));const t=order[i];order[i]=order[j];order[j]=t}
    for(const [r,c] of order){
      given[r][c]=0;
      if(llCount(2,given)!==1) given[r][c]=LLR.BULB;   // blank it only if still unique
    }
    ll.bulb=given; ll.history=[]; ll.moves=0; ll.status='playing'; ll.seed=seed>>>0;
    return true}
  return false}
// llVictory: the win test. All free cells lit AND no two bulbs share a segment.
function llVictory(bs){
  const n=ll.n,{rs,cs}=llSegments();
  const usedR=new Set(),usedC=new Set(); let bulbs=0;
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(bs[r][c]){
    bulbs++;
    const a=rs[r][c],b=cs[r][c];
    if(usedR.has(a)||usedC.has(b))return false;   // two bulbs see each other
    usedR.add(a); usedC.add(b)}
  const lit=llIllum(bs);
  for(let i=0;i<n*n;i++) if(!ll.wall[Math.floor(i/n)][i%n] && !lit[i]) return false;
  return true}
function llClick(r,c){
  if(ll.status!=='playing')return {ok:false,why:'solved'};
  if(ll.wall[r][c])return {ok:false,why:'wall'};
  ll.bulb[r][c]=ll.bulb[r][c]?0:LLR.BULB;
  ll.history.push([r,c]);
  ll.moves++;
  if(llVictory(ll.bulb)){
    ll.status='solved';
    $('msg').textContent='Solved in '+ll.moves+' move'+(ll.moves===1?'':'s')+'. Every cell is lit and no two bulbs see each other.'}
  else $('msg').textContent=ll.moves+' move'+(ll.moves===1?'':'s')+' placed.';
  render();
  return {ok:true,status:ll.status,moves:ll.moves}}
function llUndo(){
  if(ll.status!=='playing'||!ll.history.length)return {ok:false,why:'nothing to undo'};
  const [r,c]=ll.history.pop();
  ll.bulb[r][c]=0; ll.moves=Math.max(0,ll.moves-1);
  render(); return {ok:true,moves:ll.moves}}
function llHint(){
  const sol=llSolve(ll.bulb); if(!sol)return null;
  for(let r=0;r<ll.n;r++)for(let c=0;c<ll.n;c++)if(sol[r][c]&&!ll.bulb[r][c])return [r,c];
  return null}
function llRender(){
  const n=ll.n,b=$('board');
  b.style.gridTemplateColumns='repeat('+n+',38px)';
  let h='';
  const lit=llIllum(ll.bulb);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    const i=llCell(r,c);
    let cls='ll-cell',lbl='';
    if(ll.wall[r][c]){cls+=' ll-wall'}
    else if(ll.bulb[r][c]){cls+=' ll-mark'; lbl='&#9679;'}
    else if(lit[i])cls+=' ll-lit';
    h+='<button class="'+cls+'" data-r="'+r+'" data-c="'+c+'" data-i="'+i+'">'+lbl+'</button>'}
  b.innerHTML=h;
  b.querySelectorAll('button').forEach(el=>el.onclick=()=>{
    llClick(+el.dataset.r,+el.dataset.c)});
  let bulbs=0; for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(ll.bulb[r][c])bulbs++;
  let walls=0,free=0; for(let r=0;r<n;r++)for(let c=0;c<n;c++){if(ll.wall[r][c])walls++;else free++}
  let litn=0; for(let i=0;i<n*n;i++)if(lit[i])litn++;
  $('bulbs').textContent=bulbs; $('walls').textContent=walls;
  $('lit').textContent=litn; $('moves').textContent=ll.moves;
  document.querySelectorAll('.sz').forEach(el=>
    el.className=('sz'+(+el.dataset.size===ll.n?' ws-btn':' ws-btn-ghost')));
}
function render(){llRender()}
function llNew(n,seed){
  const size=n||ll.n||7;
  const s=seed===undefined?((Math.random()*4294967295)>>>0):seed;
  if(!llBuild(size,s)){
    // maxTries exhausted: a uniquely-solvable layout with this seed failed.
    // Falling back to a smaller board would ship a game the player did not
    // ask for, so keep retrying with a fresh seed instead.
    return llNew(size,((s+1)>>>0))}
  render(); return ll.n}
$('new').onclick=()=>llNew(ll.n);
$('undo').onclick=llUndo;
$('hint').onclick=()=>{const h=llHint(); if(h){ll.bulb[h[0]][h[1]]=LLR.BULB; ll.moves++; render()}};
document.querySelectorAll('.sz').forEach(el=>el.onclick=()=>llNew(+el.dataset.size));
llNew(7,20240517);
window.__lamplight={RULES:LLR,ll,
  get G(){return {n:ll.n,wall:ll.wall.map(r=>r.slice()),
    bulb:ll.bulb.map(r=>r.slice()),moves:ll.moves,status:ll.status,
    bulbs:ll.bulb.flat().filter(v=>v===LLR.BULB).length,
    seed:ll.seed}},
  newGame:llNew,click:llClick,undo:llUndo,victory:llVictory,count:llCount,
  solve:llSolve,build:llBuild,illum:llIllum,segments:llSegments,hint:llHint};
