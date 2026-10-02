(()=>{"use strict";
const $=id=>document.getElementById(id);
const canvas=$("game"),ctx=canvas.getContext("2d");
let vw=innerWidth,vh=innerHeight,dpr=1,last=performance.now();
let mode="1v4",side="survivor",char="miner",running=false,need=5,escaped=0;
const WORLD={w:2800,h:1900},SCALE=10;
const cname={miner:"矿工",doctor:"医生",dancer:"舞女",soldier:"士兵",tamer:"驯兽师"};
const charColors={miner:"#d9ae59",doctor:"#e4879b",dancer:"#bd8ee8",soldier:"#779b75",tamer:"#d27c5f"};
const walls=[
[230,170,520,75],[920,110,85,440],[1230,250,560,75],[2050,160,85,460],
[190,650,85,560],[470,790,540,75],[1190,690,85,540],[1480,840,560,75],
[2210,780,85,570],[330,1450,600,75],[1160,1500,650,75],[2050,1400,470,80],
[680,1110,85,250],[1610,1130,85,250],[2450,380,80,260],[520,330,180,55]
];
const furnPos=[[420,450],[820,380],[1400,520],[1900,440],[2470,520],[400,1120],[980,1250],[1460,1100],[1970,1200],[2460,1120]];
const lockers=[[610,340],[1110,560],[1800,350],[2380,800],[500,1320],[1510,1370],[2130,1280]];
const palletsPos=[[820,730],[1320,650],[1770,930],[980,1400],[2300,1360]];
const popPos=[[300,320],[2520,330],[360,1630],[2420,1610]];
const gatePos=[[1400,54],[1400,1840]];
const props=[[780,1080,"crate"],[1080,300,"pipe"],[1830,650,"crate"],[2280,1060,"barrel"],[560,960,"barrel"],[1320,1330,"pipe"]];

let entities=[],furnaces=[],pallets=[],gates=[],paintings=[],smokes=[],effects=[],player=null;
let joy={x:0,y:0,id:null},keys={},toastT=0,aim=null,calib=null,gameClock=0;

const badges={
 legendary:[
  {id:"scorpion",name:"毒蝎",cost:30,desc:"被扛起后获得一次校准逃脱机会。等级提高追捕者眩晕时间。"},
  {id:"eagle",name:"鹰眼",cost:30,desc:"短时间显示追捕者与队友的方向指针。"},
  {id:"cocoon",name:"破茧",cost:30,desc:"被扛起时挣扎所需时间减少 50%。"},
  {id:"bullet",name:"命运的子弹",cost:30,desc:"被救下后向前翻滚，等级提高翻滚持续时间与碰撞眩晕。"}
 ],
 rare:[
  {id:"proMiner",name:"国服矿工",cost:40,desc:"完成蒸汽炉后标记高进度蒸汽炉，朝目标移动获得加速。"},
  {id:"longLegs",name:"大长腿",cost:25,desc:"交互速度随等级提高。"},
  {id:"laborSong",name:"勤劳赞歌",cost:40,desc:"蒸汽炉工作速度 +5% / +10% / +15%。"},
  {id:"loneWolf",name:"独狼",cost:35,desc:"与队友保持分离时提高蒸汽炉工作速度，可叠加。"}
 ]
};
let profile=loadProfile();

function loadProfile(){
 try{
  const p=JSON.parse(localStorage.getItem("steamHorrorV2Profile")||"null");
  if(p&&typeof p.coal==="number") return p;
 }catch(e){}
 return {coal:120,owned:{},equippedLegendary:null,equippedRare:[]};
}
function saveProfile(){localStorage.setItem("steamHorrorV2Profile",JSON.stringify(profile));syncCoal()}
function syncCoal(){
 $("coalCount").textContent=profile.coal;$("shopCoal").textContent=profile.coal;
}
function iconSVG(name){
 const common='fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
 const map={
  shovel:`<svg viewBox="0 0 32 32"><g ${common}><path d="M18 4l3 3-9 9-3-3z"/><path d="M11 15L5 21c-2 2-1 6 2 7 2 1 5 0 6-2l4-7z"/><path d="M20 5l5-2 4 4-2 5"/></g></svg>`,
  med:`<svg viewBox="0 0 32 32"><g ${common}><rect x="5" y="8" width="22" height="18" rx="4"/><path d="M12 8V5h8v3M16 12v10M11 17h10"/></g></svg>`,
  dash:`<svg viewBox="0 0 32 32"><g ${common}><path d="M4 19c7-1 9-7 12-13 2 5 5 8 12 9-5 2-8 5-10 11-3-4-6-6-14-7z"/><path d="M7 25h15"/></g></svg>`,
  smoke:`<svg viewBox="0 0 32 32"><g ${common}><path d="M9 22c-4 0-6-5-3-8 1-1 3-2 5-1 0-4 4-7 8-5 2 1 3 3 3 5 5-1 8 5 5 8-1 1-3 2-5 1"/><path d="M11 23c2 3 7 4 10 1"/></g></svg>`,
  roll:`<svg viewBox="0 0 32 32"><g ${common}><circle cx="16" cy="17" r="9"/><path d="M16 8c4 4 5 9 2 17M9 12c5 0 10 4 14 9"/><path d="M6 6h6M4 10h5"/></g></svg>`,
  hand:`<svg viewBox="0 0 32 32"><g ${common}><path d="M9 16V8a2 2 0 014 0v6-9a2 2 0 014 0v9-7a2 2 0 014 0v8-5a2 2 0 014 0v9c0 6-4 9-9 9h-2c-4 0-6-3-8-7l-2-4c-1-2 2-4 4-2z"/></g></svg>`,
  claw:`<svg viewBox="0 0 32 32"><g ${common}><path d="M5 25c5-4 7-9 8-18M12 26c5-5 7-11 7-21M19 27c4-6 6-12 5-19"/><path d="M12 7l2-4 2 5M19 5l2-3 2 4M24 8l3-2 1 5"/></g></svg>`,
  sketch:`<svg viewBox="0 0 32 32"><g ${common}><rect x="5" y="4" width="20" height="24" rx="2"/><path d="M10 21c2-7 10-7 11 0M12 12c2-3 6-3 8 0M8 7h14"/><path d="M25 22l4 4-5 2z"/></g></svg>`,
  portal:`<svg viewBox="0 0 32 32"><g ${common}><path d="M16 4c8 0 12 7 9 14-3 7-13 11-18 5-5-6 1-15 9-15 6 0 8 6 5 10-3 4-9 3-9-2 0-3 3-5 6-4"/></g></svg>`,
  gallery:`<svg viewBox="0 0 32 32"><g ${common}><rect x="5" y="6" width="9" height="18"/><rect x="18" y="8" width="9" height="18"/><path d="M9 17c2-4 4-4 6 0M21 18c1-3 3-3 4 0M14 14h4"/></g></svg>`,
  carry:`<svg viewBox="0 0 32 32"><g ${common}><circle cx="20" cy="7" r="3"/><path d="M17 11l-4 6 4 4 2 7M13 17l-7-3M17 21l7-2M8 27l5-10"/></g></svg>`
 };
 return map[name]||map.hand;
}
document.querySelectorAll("[data-icon]").forEach(el=>el.innerHTML=iconSVG(el.dataset.icon));

function resize(){
 vw=innerWidth;vh=innerHeight;dpr=Math.min(2,devicePixelRatio||1);
 canvas.width=Math.max(1,Math.floor(vw*dpr));canvas.height=Math.max(1,Math.floor(vh*dpr));
 canvas.style.width=vw+"px";canvas.style.height=vh+"px";
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener("resize",resize,{passive:true});resize();

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function say(s){$("toast").textContent=s;toastT=1.8}
function blocked(x,y,r=18){
 if(x-r<0||y-r<0||x+r>WORLD.w||y+r>WORLD.h)return true;
 for(const q of walls) if(x+r>q[0]&&x-r<q[0]+q[2]&&y+r>q[1]&&y-r<q[1]+q[3]) return true;
 return false;
}
function move(e,dx,dy){
 if(!blocked(e.x+dx,e.y,e.r))e.x+=dx;
 if(!blocked(e.x,e.y+dy,e.r))e.y+=dy;
 if(Math.abs(dx)+Math.abs(dy)>.05){e.faceX=dx;e.faceY=dy}
}
function nearest(e,arr,max=1e9){
 let best=null,bd=max;
 for(const o of arr){
  const ox=o.x??o[0],oy=o.y??o[1],d=Math.hypot(e.x-ox,e.y-oy);
  if(d<bd){bd=d;best=o}
 }
 return best;
}
function step(e,t,s,dt){
 let dx=t.x-e.x,dy=t.y-e.y,m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;
 const tries=[[dx,dy],[-dy,dx],[dy,-dx],[(dx-dy)*.707,(dy+dx)*.707],[(dx+dy)*.707,(dy-dx)*.707]];
 for(const [vx,vy] of tries){
  if(!blocked(e.x+vx*s*dt*2,e.y+vy*s*dt*2,e.r)){move(e,vx*s*dt,vy*s*dt);return}
 }
}
function lineBlocked(a,b){
 for(let i=1;i<13;i++){
  const t=i/13,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
  for(const w of walls) if(x>w[0]&&x<w[0]+w[2]&&y>w[1]&&y<w[1]+w[3]) return true;
 }
 return false;
}
function segmentHitEntity(x1,y1,x2,y2,e,r=25){
 const vx=x2-x1,vy=y2-y1,wx=e.x-x1,wy=e.y-y1;
 const vv=vx*vx+vy*vy||1,t=clamp((wx*vx+wy*vy)/vv,0,1);
 const px=x1+vx*t,py=y1+vy*t;
 return {hit:Math.hypot(e.x-px,e.y-py)<=r,t};
}
function lineObstacleT(x1,y1,x2,y2){
 for(let i=1;i<=40;i++){
  const t=i/40,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;
  for(const w of walls) if(x>w[0]&&x<w[0]+w[2]&&y>w[1]&&y<w[1]+w[3]) return t;
 }
 return 2;
}

function makeSurv(i,isPlayer=false){
 return {kind:"s",x:180+Math.random()*2380,y:180+Math.random()*1500,r:18,
  hp:mode==="2v8"?3:2,maxhp:mode==="2v8"?3:2,char:isPlayer?char:["miner","doctor","dancer","soldier","tamer"][i%5],
  speed:168,down:false,dead:false,carried:false,hook:null,hookT:0,hookN:0,hide:null,target:null,
  skillCd:0,charges:3,chargeT:0,dodge:0,roll:0,boost:0,coal:0,blood:0,faceX:1,faceY:0,
  chaseT:0,lastLocker:null,lastLockerRisk:0,footT:0,footprints:[]};
}
function makeHunter(i){
 return {kind:"h",x:i?2260:1400,y:i?1420:940,r:26,speed:182,dead:false,stun:0,atkCd:0,recovery:0,
  target:null,lastSeen:null,carry:null,energy:0,ult:0,ultCd:0,sketch:2,sketchT:0,sketchGap:0,
  boost:0,faceX:1,faceY:0,lastPainting:null,chasePaintCd:0};
}
function resetGame(){
 furnaces=furnPos.map((q,i)=>({x:q[0],y:q[1],p:0,id:i}));
 pallets=palletsPos.map(q=>({x:q[0],y:q[1],open:false,dead:false}));
 gates=gatePos.map(q=>({x:q[0],y:q[1],open:0}));
 paintings=[];smokes=[];effects=[];entities=[];escaped=0;need=mode==="1v4"?5:7;gameClock=0;aim=null;calib=null;
 const ns=mode==="1v4"?4:8,nh=mode==="1v4"?1:2;
 if(side==="survivor"){
  player=makeSurv(0,true);entities.push(player);
  for(let i=1;i<ns;i++)entities.push(makeSurv(i));
  for(let i=0;i<nh;i++)entities.push(makeHunter(i));
 }else{
  player=makeHunter(0);entities.push(player);
  for(let i=1;i<nh;i++)entities.push(makeHunter(i));
  for(let i=0;i<ns;i++)entities.push(makeSurv(i));
 }
 updateControlLabels();
}
function updateStatus(){
 $("status").textContent="当前："+mode+" / "+(side==="survivor"?"逃生者":"追捕者 · 贝琳达")+" / "+cname[char];
}
function pair(a,b,chosen){$(a).classList.toggle("active",chosen===a);$(b).classList.toggle("active",chosen===b)}
$("m14").onclick=()=>{mode="1v4";pair("m14","m28","m14");updateStatus()};
$("m28").onclick=()=>{mode="2v8";pair("m14","m28","m28");updateStatus()};
$("ss").onclick=()=>{side="survivor";pair("ss","sh","ss");updateStatus()};
$("sh").onclick=()=>{side="hunter";pair("ss","sh","sh");updateStatus()};
$("chars").querySelectorAll("button").forEach(b=>b.onclick=()=>{
 char=b.dataset.c;$("chars").querySelectorAll("button").forEach(x=>x.classList.remove("active"));b.classList.add("active");updateStatus();
});
$("start").onclick=()=>{
 resetGame();running=true;$("menu").style.display="none";canvas.style.display="block";$("controls").style.display="block";$("back").style.display="block";say("对局开始");
};
$("back").onclick=()=>{running=false;aim=null;hideAim();hideCalibration();$("menu").style.display="block";canvas.style.display="none";$("controls").style.display="none";$("back").style.display="none"};
syncCoal();

function renderShop(){
 const render=(group,type)=>{
  const root=$(type==="legendary"?"legendaryGrid":"rareGrid");root.innerHTML="";
  group.forEach(b=>{
   const level=profile.owned[b.id]||0;
   const equipped=type==="legendary"?profile.equippedLegendary===b.id:profile.equippedRare.includes(b.id);
   const card=document.createElement("div");card.className="badge-card "+type;
   card.innerHTML=`<div class="badge-top"><span class="badge-rarity">${type==="legendary"?"典藏":"稀有"}</span><span class="badge-level">${level?"Lv."+level:"未拥有"}</span></div>
   <h4>${b.name}</h4><p>${b.desc}</p><div class="badge-actions"></div>`;
   const actions=card.querySelector(".badge-actions");
   const buy=document.createElement("button");
   buy.textContent=level>=3?"已满级":(level?"升级 "+b.cost:"购买 "+b.cost);
   buy.disabled=level>=3;
   buy.onclick=()=>{
    if(profile.coal<b.cost){say("煤矿不足");return}
    profile.coal-=b.cost;profile.owned[b.id]=(profile.owned[b.id]||0)+1;saveProfile();renderShop();
   };
   const equip=document.createElement("button");equip.textContent=equipped?"已装备":(level?"装备":"未拥有");equip.disabled=!level;
   if(equipped)equip.classList.add("equipped");
   equip.onclick=()=>{
    if(!level)return;
    if(type==="legendary")profile.equippedLegendary=equipped?null:b.id;
    else{
     let arr=profile.equippedRare.slice();
     if(equipped)arr=arr.filter(x=>x!==b.id);
     else{if(arr.length>=3){say("稀有徽章最多装备 3 个");return}arr.push(b.id)}
     profile.equippedRare=arr;
    }
    saveProfile();renderShop();
   };
   actions.append(buy,equip);root.appendChild(card);
  });
 };
 render(badges.legendary,"legendary");render(badges.rare,"rare");syncCoal();
}
$("shopBtn").onclick=()=>{renderShop();$("shop").classList.remove("hidden")};
$("shopClose").onclick=()=>$("shop").classList.add("hidden");

const jb=$("joy"),knob=$("knob");
function setJoy(e){
 const r=jb.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 let dx=e.clientX-cx,dy=e.clientY-cy,m=Math.hypot(dx,dy),mx=r.width*.34;
 if(m>mx){dx*=mx/m;dy*=mx/m}joy.x=dx/mx;joy.y=dy/mx;knob.style.transform=`translate(${dx}px,${dy}px)`;
}
jb.addEventListener("pointerdown",e=>{joy.id=e.pointerId;jb.setPointerCapture(e.pointerId);setJoy(e);e.preventDefault()});
jb.addEventListener("pointermove",e=>{if(e.pointerId===joy.id){setJoy(e);e.preventDefault()}});
function joyEnd(e){if(e.pointerId===joy.id){joy.id=null;joy.x=joy.y=0;knob.style.transform="translate(0,0)"}}
jb.addEventListener("pointerup",joyEnd);jb.addEventListener("pointercancel",joyEnd);
addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=1;if(e.key.toLowerCase()==="e")interact();if(e.key.toLowerCase()==="j")attack()});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=0);

function btnParts(id,label,sub,icon,charge=""){
 const b=$(id);b.querySelector(".skill-label").textContent=label;b.querySelector(".skill-sub").textContent=sub||"";
 const ic=b.querySelector(".skill-icon");if(icon)ic.innerHTML=iconSVG(icon);
 const cp=b.querySelector(".charge-pill");if(cp){cp.textContent=charge;cp.style.display=charge===""?"none":"grid"}
}
function updateControlLabels(){
 if(!player)return;
 if(player.kind==="h"){
  $("attack").style.display="flex";$("carry").style.display="flex";$("ultimate").style.display="flex";$("skill2").style.pointerEvents="auto";$("skill2").style.opacity="1";
  btnParts("attack","虚空之爪","普攻","claw");
  const phase=player.lastPainting&&paintings.includes(player.lastPainting)&&!player.lastPainting.clawUsed?"claw":"sketch";
  if(phase==="claw")btnParts("skill1","请君入画","长按选方向","claw",String(player.sketch));
  else btnParts("skill1","速写","长按选点","sketch",String(player.sketch));
  btnParts("skill2","出画","长按选画","portal");
  btnParts("ultimate","画廊穿梭",player.ult>0?Math.ceil(player.ult)+"s":(player.ultCd>0?"冷却 "+Math.ceil(player.ultCd)+"s":Math.floor(player.energy)+"%"),"gallery");
  btnParts("carry","扛起","","carry");
 }else{
  $("attack").style.display="none";$("carry").style.display="none";$("ultimate").style.display="none";
  const defs={
   miner:["铁铲","50矿渣 → +30%","shovel"],
   doctor:["医疗包","恢复 1 HP","med"],
   dancer:["闪避","1秒免伤","dash"],
   soldier:["云雾弹","点按近投 / 长按瞄准","smoke"],
   tamer:["翻滚","2秒 +40%","roll"]
  };
  const passives={
   miner:["能工巧匠","蒸汽炉效率 ×1.5"],
   doctor:["血样采集","治疗队友逐层加速"],
   dancer:["善用巧力","成功闪避返还充能"],
   soldier:["军事训练","贴障碍移动不留足迹"],
   tamer:["鞭笞","救援/治疗后强化队友"]
  };
  const d=defs[player.char],p=passives[player.char];
  btnParts("skill1",d[0],d[1],d[2],player.char==="dancer"?String(player.charges):"");
  btnParts("skill2",p[0],p[1],"hand");
  $("skill2").style.pointerEvents="none";$("skill2").style.opacity=".72";
 }
}
function damage(s){
 if(s.dodge>0){say("闪避成功");return false}
 s.hp--;s.boost=1;
 if(s.hp<=0){s.hp=0;s.down=true}
 return true;
}
function interact(){
 if(!running||!player||player.dead)return;
 if(player.kind==="s"){
  if(player.down)return;
  for(const l of lockers){
   if(Math.hypot(player.x-l[0],player.y-l[1])<58){
    if(player.hide){player.hide=null;player.lastLocker=l;player.lastLockerRisk=5;say("离开柜子")}
    else if(player.lastLocker===l&&player.lastLockerRisk>0)say("这个柜子刚暴露，暂时不安全");
    else{player.hide=l;player.x=l[0];player.y=l[1];say("躲进柜子")}
    return;
   }
  }
  const p=nearest(player,pallets.filter(x=>!x.dead),65);
  if(p){
   if(!p.open){p.open=true;entities.filter(e=>e.kind==="h").forEach(h=>{if(Math.hypot(h.x-p.x,h.y-p.y)<75)h.stun=1.5});say("拉开折叠板")}
   else{const fx=player.faceX||1,fy=player.faceY||0,m=Math.hypot(fx,fy)||1;move(player,fx/m*70,fy/m*70);say("翻越折叠板")}
   return;
  }
  const f=nearest(player,furnaces.filter(x=>x.p<100),90);
  if(f){player.target=f;say("开始挖蒸汽炉");return}
  const mate=nearest(player,entities.filter(e=>e.kind==="s"&&e!==player&&!e.dead),72);
  if(mate){
   if(mate.hook){mate.hook=null;mate.down=false;mate.hp=Math.max(1,mate.hp);say("救援成功");return}
   if(mate.hp<mate.maxhp){mate.hp=Math.min(mate.maxhp,mate.hp+1);mate.down=false;say("治疗完成");return}
  }
  if(furnaces.filter(x=>x.p>=100).length>=need){
   const g=nearest(player,gates,96);if(g){player.target={gate:g};say("正在开启逃生门");return}
  }
 }else{
  const p=nearest(player,pallets.filter(x=>x.open&&!x.dead),78);
  if(p){p.dead=true;say("折叠板已破坏")}
 }
}
function attack(){
 if(!running||!player||player.kind!=="h"||player.atkCd>0||player.recovery>0||player.stun>0)return;
 player.atkCd=.82;
 for(const l of lockers){
  if(Math.hypot(player.x-l[0],player.y-l[1])<70){
   const s=entities.find(e=>e.kind==="s"&&e.hide===l&&!e.dead);
   if(s){s.hide=null;s.lastLocker=l;s.lastLockerRisk=6;damage(s);say("虚空之爪击中柜中逃生者");return}
  }
 }
 const s=nearest(player,entities.filter(e=>e.kind==="s"&&!e.dead&&!e.carried&&!e.hide),82);
 if(s){damage(s);say("虚空之爪命中")}
}
function carry(){
 if(!running||!player||player.kind!=="h")return;
 if(player.carry){
  const pc=nearest(player,popPos,105);
  if(pc){
   const s=player.carry;s.carried=false;s.hook=pc;s.x=pc[0];s.y=pc[1];s.hookN++;player.carry=null;
   if(s.hookN>=3){s.dead=true;s.hook=null;say("第三次上挂：立即淘汰")}else say("挂上爆米花机");
  }else say("靠近爆米花机才能上挂");
  return;
 }
 const s=nearest(player,entities.filter(e=>e.kind==="s"&&e.down&&!e.dead&&!e.carried),72);
 if(s){player.carry=s;s.carried=true;say("扛起逃生者")}
}
$("interact").addEventListener("pointerdown",e=>{e.preventDefault();interact()});
$("attack").addEventListener("pointerdown",e=>{e.preventDefault();attack()});
$("carry").addEventListener("pointerdown",e=>{e.preventDefault();carry()});

function survivorSkillQuick(){
 if(player.char==="miner"){
  const f=nearest(player,furnaces.filter(x=>x.p<100),120);
  if(player.coal>=50&&f){f.p=Math.min(100,f.p+30);player.coal-=50;say("铁铲：蒸汽炉 +30%")}else say("需要 50 矿渣并靠近蒸汽炉");
 }else if(player.char==="doctor"){
  if(player.hp<player.maxhp){player.hp++;player.blood=Math.min(10,player.blood+1);say("医疗包：恢复 1 HP")}else say("生命值已满");
 }else if(player.char==="dancer"){
  if(player.charges>0){player.charges--;player.dodge=1;player.boost=1;say("闪避：1秒")}else say("闪避充能不足");
 }else if(player.char==="tamer"){
  if(player.skillCd<=0){player.roll=2;player.skillCd=28;say("翻滚：2秒 +40%")}else say("翻滚冷却中");
 }
}
function startAim(type,e){
 aim={type,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,startTime:performance.now(),dirX:player.faceX||1,dirY:player.faceY||0,targetX:player.x,targetY:player.y,selected:null};
 showAim(type);
}
function updateAim(e){
 if(!aim||e.pointerId!==aim.pointerId)return;
 aim.x=e.clientX;aim.y=e.clientY;
 let dx=e.clientX-aim.startX,dy=e.clientY-aim.startY,m=Math.hypot(dx,dy);
 if(m>8){aim.dirX=dx/m;aim.dirY=dy/m}
 if(aim.type==="sketch"){
  const d=clamp(m*4.2,90,500);aim.targetX=clamp(player.x+aim.dirX*d,35,WORLD.w-35);aim.targetY=clamp(player.y+aim.dirY*d,35,WORLD.h-35);
 }else if(aim.type==="claw"){
  aim.targetX=player.lastPainting.x+aim.dirX*150;aim.targetY=player.lastPainting.y+aim.dirY*150;
 }else if(aim.type==="out"){
  const candidates=paintings.filter(p=>(p.active>0||player.ult>0)&&Math.hypot(player.x-p.x,player.y-p.y)<=500&&!p.fallen);
  let best=null,bscore=-9;
  for(const p of candidates){
   let dxp=p.x-player.x,dyp=p.y-player.y,mm=Math.hypot(dxp,dyp)||1;dxp/=mm;dyp/=mm;
   const score=dxp*aim.dirX+dyp*aim.dirY;
   if(score>bscore){bscore=score;best=p}
  }
  aim.selected=best;
 }else if(aim.type==="smoke"){
  const d=clamp(m*4.2,40,500);aim.targetX=clamp(player.x+aim.dirX*d,35,WORLD.w-35);aim.targetY=clamp(player.y+aim.dirY*d,35,WORLD.h-35);
 }
}
function finishAim(e){
 if(!aim||e.pointerId!==aim.pointerId)return;
 const held=performance.now()-aim.startTime,a=aim;aim=null;hideAim();
 if(a.type==="sketch"){
  if(held<180){say("长按“速写”并拖动，选择 50 米内位置");return}
  placePainting(a.targetX,a.targetY,false);
 }else if(a.type==="claw"){
  if(held<160){say("长按“请君入画”选择魔爪方向");return}
  castClaw(a.dirX,a.dirY);
 }else if(a.type==="out"){
  if(held<160){say("长按“出画”并朝目标画作拖动");return}
  if(a.selected)outOfPainting(a.selected);else say("50米内没有可用画作");
 }else if(a.type==="smoke"){
  if(held<180)throwSmoke(player.x+35,player.y+18,true);
  else throwSmoke(a.targetX,a.targetY,false);
 }
}
function showAim(type){
 $("aimHint").classList.remove("hidden");
 const texts={
  sketch:["速写 · 选点","拖动选择 50 米内落点，松手放置画作"],
  claw:["请君入画 · 选方向","紫色魔爪最大 15 米；碰到墙体会立刻收回"],
  out:["出画 · 选画","朝已激活画作方向拖动；大招期间普通画作也可选择"],
  smoke:["云雾弹 · 抛投","拖动选择最多 50 米落点；快速点按会落在身边"]
 };
 $("aimTitle").textContent=texts[type][0];$("aimText").textContent=texts[type][1];
}
function hideAim(){$("aimHint").classList.add("hidden")}
function placePainting(x,y,auto){
 if(!auto){
  if(player.sketch<=0){say("速写充能不足");return}
  if(player.sketchGap>0){say("速写间隔尚未结束");return}
  player.sketch--;player.sketchGap=3;
 }
 const nearby=paintings.filter(p=>!p.fallen&&Math.hypot(p.x-x,p.y-y)<=300).sort((a,b)=>a.created-b.created);
 if(nearby.length>=3)nearby[0].fallen=true;
 const p={x,y,t:40,active:0,near:0,created:gameClock,variant:Math.floor(Math.random()*3),fallen:false,clawUsed:false,trigger:null,auto};
 paintings.push(p);
 if(player&&player.kind==="h"&&!auto){player.lastPainting=p;say("速写：画作已放置，可使用“请君入画”")}
 updateControlLabels();
}
function castClaw(dx,dy){
 const p=player.lastPainting;
 if(!p||p.fallen||p.clawUsed){say("没有可发动魔爪的速写画作");updateControlLabels();return}
 p.clawUsed=true;
 const m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;
 const x2=p.x+dx*150,y2=p.y+dy*150,wallT=lineObstacleT(p.x,p.y,x2,y2);
 let victim=null,vt=2;
 for(const s of entities.filter(e=>e.kind==="s"&&!e.dead&&!e.carried)){
  const hit=segmentHitEntity(p.x,p.y,x2,y2,s,28);
  if(hit.hit&&hit.t<vt&&hit.t<wallT){victim=s;vt=hit.t}
 }
 effects.push({type:"claw",x1:p.x,y1:p.y,x2:p.x+(x2-p.x)*Math.min(1,wallT),y2:p.y+(y2-p.y)*Math.min(1,wallT),t:.42});
 if(victim){
  damage(victim);
  const fm=Math.hypot(dx,dy)||1;victim.x=clamp(player.x+dx/fm*54,30,WORLD.w-30);victim.y=clamp(player.y+dy/fm*54,30,WORLD.h-30);
  player.energy=Math.min(100,player.energy+25);player.recovery=.7;say("请君入画命中：拖至身前并造成 1 点伤害");
 }else say(wallT<1?"魔爪撞上障碍，立即收回":"魔爪未命中");
 setTimeout(updateControlLabels,0);
}
function outOfPainting(p){
 if(!p||p.fallen)return;
 player.x=p.x;player.y=p.y;player.boost=3;p.fallen=true;
 effects.push({type:"burst",x:p.x,y:p.y,t:.7});say("出画：移动速度 +30% / 3秒");
}
function throwSmoke(x,y,quick){
 if(player.skillCd>0){say("云雾弹冷却中");return}
 smokes.push({x:clamp(x,20,WORLD.w-20),y:clamp(y,20,WORLD.h-20),t:5});player.skillCd=23;say(quick?"云雾弹：近投":"云雾弹：抛投");
}
const skill1=$("skill1"),skill2=$("skill2");
skill1.addEventListener("pointerdown",e=>{
 if(!running||!player)return;e.preventDefault();skill1.classList.add("pressed");skill1.setPointerCapture(e.pointerId);
 if(player.kind==="h"){
  const phase=player.lastPainting&&paintings.includes(player.lastPainting)&&!player.lastPainting.fallen&&!player.lastPainting.clawUsed?"claw":"sketch";
  startAim(phase,e);
 }else if(player.char==="soldier") startAim("smoke",e);
 else survivorSkillQuick();
});
skill1.addEventListener("pointermove",e=>updateAim(e));
skill1.addEventListener("pointerup",e=>{skill1.classList.remove("pressed");finishAim(e)});
skill1.addEventListener("pointercancel",e=>{skill1.classList.remove("pressed");if(aim&&aim.pointerId===e.pointerId){aim=null;hideAim()}});
skill2.addEventListener("pointerdown",e=>{
 if(!running||!player||player.kind!=="h")return;e.preventDefault();skill2.classList.add("pressed");skill2.setPointerCapture(e.pointerId);startAim("out",e);
});
skill2.addEventListener("pointermove",e=>updateAim(e));
skill2.addEventListener("pointerup",e=>{skill2.classList.remove("pressed");finishAim(e)});
skill2.addEventListener("pointercancel",e=>{skill2.classList.remove("pressed");if(aim&&aim.pointerId===e.pointerId){aim=null;hideAim()}});
$("ultimate").addEventListener("pointerdown",e=>{
 e.preventDefault();if(!running||!player||player.kind!=="h")return;
 if(player.ult>0){say("画廊穿梭已经开启");return}
 if(player.ultCd>0){say("画廊穿梭冷却中");return}
 if(player.energy<100){say("画廊穿梭需要 100 能量");return}
 player.energy=0;player.ult=20;say("画廊穿梭：20秒内可传送至任意有效画作");updateControlLabels();
});

function showCalibration(f){
 calib={f,phase:0,dir:1};
 $("calibration").classList.remove("hidden");
}
function hideCalibration(){calib=null;$("calibration").classList.add("hidden")}
$("calibration").addEventListener("pointerdown",e=>{
 if(!calib)return;e.preventDefault();
 const v=calib.phase,red=v>=.42&&v<=.58;
 const gain=red?4.5+Math.random():2.3+Math.random();
 calib.f.p=Math.min(100,calib.f.p+gain);say((red?"完美校准 ":"普通校准 ")+("+"+gain.toFixed(1)));
 hideCalibration();
});
function updateCalibration(dt){
 if(!calib)return;
 calib.phase+=calib.dir*dt*.72;
 if(calib.phase>=1){calib.phase=1;calib.dir=-1}
 if(calib.phase<=0){calib.phase=0;calib.dir=1}
 $("needle").style.left=(calib.phase*100)+"%";
}

function aiHunter(h,dt){
 if(h.stun>0||h.recovery>0)return;
 if(h.carry){
  const pc=nearest(h,popPos);step(h,{x:pc[0],y:pc[1]},h.speed,dt);
  if(Math.hypot(h.x-pc[0],h.y-pc[1])<60){const s=h.carry;s.carried=false;s.hook=pc;s.x=pc[0];s.y=pc[1];s.hookN++;h.carry=null;if(s.hookN>=3){s.dead=true;s.hook=null}}
  return;
 }
 const visible=entities.filter(s=>s.kind==="s"&&!s.dead&&!s.carried&&!s.hide&&dist(h,s)<450&&!lineBlocked(h,s));
 if(visible.length){h.target=nearest(h,visible);h.lastSeen={x:h.target.x,y:h.target.y,t:3}}
 if(h.target&&!h.target.dead&&!h.target.hide&&dist(h,h.target)<550){
  step(h,h.target,h.speed,dt);
  if(dist(h,h.target)<72&&h.atkCd<=0){h.atkCd=.95;damage(h.target)}
  if(h.target.down&&dist(h,h.target)<54){h.carry=h.target;h.target.carried=true}
  return;
 }
 h.target=null;
 if(h.lastSeen&&h.lastSeen.t>0){h.lastSeen.t-=dt;step(h,h.lastSeen,h.speed*.82,dt);return}
 const f=furnaces.filter(x=>x.p<100).sort((a,b)=>b.p-a.p)[0];if(f)step(h,f,h.speed*.68,dt);
}
function aiSurvivor(s,dt){
 if(s.dead||s.carried||s.hook)return;
 const hs=entities.filter(e=>e.kind==="h"&&!e.dead),h=nearest(s,hs);
 if(s.down){if(h){let dx=s.x-h.x,dy=s.y-h.y,m=Math.hypot(dx,dy)||1;move(s,dx/m*s.speed*.5*dt,dy/m*s.speed*.5*dt)}return}
 if(h&&dist(s,h)<270){
  const p=nearest(s,pallets.filter(x=>!x.dead&&!x.open),190);
  if(p){step(s,p,s.speed*1.06,dt);if(Math.hypot(s.x-p.x,s.y-p.y)<42){p.open=true;if(Math.hypot(h.x-p.x,h.y-p.y)<78)h.stun=1.5}}
  else{let dx=s.x-h.x,dy=s.y-h.y,m=Math.hypot(dx,dy)||1;move(s,dx/m*s.speed*1.07*dt,dy/m*s.speed*1.07*dt)}
  return;
 }
 const hook=nearest(s,entities.filter(e=>e.kind==="s"&&e.hook&&!e.dead&&e!==s));
 if(hook&&(!h||dist(h,hook)>190)){step(s,hook,s.speed,dt);if(dist(s,hook)<58){hook.hook=null;hook.down=false;hook.hp=Math.max(1,hook.hp)}return}
 const f=nearest(s,furnaces.filter(x=>x.p<100));
 if(f){step(s,f,s.speed*.9,dt);if(Math.hypot(s.x-f.x,s.y-f.y)<75){let mult=s.char==="miner"?1.5:1;if(profile.equippedRare.includes("laborSong"))mult*=1+[.05,.10,.15][(profile.owned.laborSong||1)-1];f.p=Math.min(100,f.p+.35*mult*dt);s.coal+=dt}}
 else{const g=nearest(s,gates);step(s,g,s.speed,dt);if(Math.hypot(s.x-g.x,s.y-g.y)<75){g.open=Math.min(10,g.open+dt);if(g.open>=10){s.dead=true;escaped++}}}
}

function update(dt){
 if(!running||!player)return;gameClock+=dt;
 let ix=(keys.d?1:0)-(keys.a?1:0)+joy.x,iy=(keys.s?1:0)-(keys.w?1:0)+joy.y,m=Math.hypot(ix,iy);
 if(m>1){ix/=m;iy/=m}
 if(!player.dead&&!player.carried&&!player.hook&&!player.down&&!player.hide&&player.stun<=0){
  let sp=player.speed*(player.boost>0?1.3:1)*(player.roll>0?1.4:1)*(player.kind==="h"&&player.ult>0?1.3:1);
  move(player,ix*sp*dt,iy*sp*dt);
 }
 for(const e of entities){
  if(e.atkCd>0)e.atkCd=Math.max(0,e.atkCd-dt);if(e.skillCd>0)e.skillCd=Math.max(0,e.skillCd-dt);
  if(e.boost>0)e.boost=Math.max(0,e.boost-dt);if(e.dodge>0)e.dodge=Math.max(0,e.dodge-dt);if(e.roll>0)e.roll=Math.max(0,e.roll-dt);
  if(e.stun>0)e.stun=Math.max(0,e.stun-dt);if(e.recovery>0)e.recovery=Math.max(0,e.recovery-dt);
  if(e.lastLockerRisk>0)e.lastLockerRisk=Math.max(0,e.lastLockerRisk-dt);
  if(e.kind==="s"&&e.char==="dancer"&&e.charges<3){e.chargeT+=dt;if(e.chargeT>=25){e.charges++;e.chargeT=0}}
  if(e.kind==="h"){
   e.energy=Math.min(100,e.energy+dt);
   if(e.ult>0){e.ult=Math.max(0,e.ult-dt);if(e.ult===0)e.ultCd=20}else if(e.ultCd>0)e.ultCd=Math.max(0,e.ultCd-dt);
   if(e.sketch<2){e.sketchT+=dt;if(e.sketchT>=15){e.sketch++;e.sketchT=0}}
   if(e.sketchGap>0)e.sketchGap=Math.max(0,e.sketchGap-dt);if(e.chasePaintCd>0)e.chasePaintCd=Math.max(0,e.chasePaintCd-dt);
  }
 }
 if(player.kind==="s"&&player.target){
  if(player.target.gate){
   const g=player.target.gate;
   if(Math.hypot(player.x-g.x,player.y-g.y)<96){g.open=Math.min(10,g.open+dt);if(g.open>=10&&!player.dead){player.dead=true;escaped++;say("成功逃生")}}else player.target=null;
  }else{
   const f=player.target;
   if(Math.hypot(player.x-f.x,player.y-f.y)<90&&f.p<100){
    let mult=player.char==="miner"?1.5:1;if(profile.equippedRare.includes("laborSong"))mult*=1+[.05,.10,.15][(profile.owned.laborSong||1)-1];
    f.p=Math.min(100,f.p+.35*mult*dt);player.coal+=dt;
    player._calibT=(player._calibT||0)+dt;if(player._calibT>=3&&!calib){player._calibT=0;showCalibration(f)}
   }else{player.target=null;player._calibT=0;hideCalibration()}
  }
 }
 for(const s of entities.filter(e=>e.kind==="s"&&!e.dead)){
  if(s.hook){s.hookT+=dt;if(s.hookT>=20){s.dead=true;s.hook=null}}
 }
 for(const p of paintings){
  p.t-=dt;
  if(p.active>0){
   p.active-=dt;if(p.active<=0)p.fallen=true;
  }else if(!p.fallen){
   const near=entities.find(e=>e.kind==="s"&&!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<100);
   if(near){p.near+=dt;p.trigger=near;if(p.near>=2){p.active=10;p.near=0;entities.filter(e=>e.kind==="h").forEach(h=>h.energy=Math.min(100,h.energy+25));if(player.kind==="h")say("画中窥影：画作被触发")}}
   else p.near=0;
  }
 }
 paintings=paintings.filter(p=>p.t>0&&!p.fallen);
 if(player.kind==="h"&&player.lastPainting&&!paintings.includes(player.lastPainting))player.lastPainting=null;
 for(const h of entities.filter(e=>e.kind==="h"&&!e.dead)){
  if(h.target&&!h.target.dead&&!h.target.down){h.target.chaseT+=dt;if(h.target.chaseT>=10&&h.chasePaintCd<=0){let dx=h.target.x-h.x,dy=h.target.y-h.y,mm=Math.hypot(dx,dy)||1;dx/=mm;dy/=mm;paintings.push({x:clamp(h.target.x+dx*65,30,WORLD.w-30),y:clamp(h.target.y+dy*65,30,WORLD.h-30),t:40,active:0,near:0,created:gameClock,variant:Math.floor(Math.random()*3),fallen:false,clawUsed:true,trigger:null,auto:true});h.target.chaseT=0;h.chasePaintCd=30}}
  else entities.filter(e=>e.kind==="s").forEach(s=>s.chaseT=Math.max(0,s.chaseT-dt*2));
 }
 smokes.forEach(s=>s.t-=dt);smokes=smokes.filter(s=>s.t>0);
 effects.forEach(e=>e.t-=dt);effects=effects.filter(e=>e.t>0);
 entities.forEach(e=>{if(e!==player&&!e.dead){if(e.kind==="h")aiHunter(e,dt);else aiSurvivor(e,dt)}});
 updateCalibration(dt);updateControlLabels();
 if(toastT>0){toastT-=dt;if(toastT<=0)$("toast").textContent=""}
}

function cam(){return{x:clamp(player.x-vw/2,0,Math.max(0,WORLD.w-vw)),y:clamp(player.y-vh/2,0,Math.max(0,WORLD.h-vh))}}
function roundRect(x,y,w,h,r,fill,stroke){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}
}
function drawFloor(){
 const g=ctx.createLinearGradient(0,0,0,WORLD.h);g.addColorStop(0,"#26322e");g.addColorStop(1,"#18231f");ctx.fillStyle=g;ctx.fillRect(0,0,WORLD.w,WORLD.h);
 ctx.strokeStyle="rgba(255,255,255,.025)";ctx.lineWidth=1;
 for(let x=0;x<WORLD.w;x+=90){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD.h);ctx.stroke()}
 for(let y=0;y<WORLD.h;y+=90){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD.w,y);ctx.stroke()}
 ctx.strokeStyle="rgba(7,10,9,.32)";
 for(let i=0;i<70;i++){const x=(i*317)%WORLD.w,y=(i*173)%WORLD.h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+28,y+11);ctx.lineTo(x+44,y-7);ctx.stroke()}
}
function drawWall(w){
 ctx.save();ctx.shadowColor="#0009";ctx.shadowBlur=12;ctx.shadowOffsetY=7;
 const g=ctx.createLinearGradient(w[0],w[1],w[0],w[1]+w[3]);g.addColorStop(0,"#626970");g.addColorStop(.15,"#4c555b");g.addColorStop(1,"#343c41");
 ctx.fillStyle=g;ctx.fillRect(...w);ctx.restore();
 ctx.strokeStyle="#77808755";ctx.lineWidth=2;ctx.strokeRect(w[0]+3,w[1]+3,w[2]-6,w[3]-6);
 ctx.strokeStyle="#252c30aa";for(let x=w[0]+35;x<w[0]+w[2];x+=70){ctx.beginPath();ctx.moveTo(x,w[1]+8);ctx.lineTo(x,w[1]+w[3]-8);ctx.stroke()}
}
function drawFurnace(f){
 ctx.save();ctx.translate(f.x,f.y);ctx.shadowColor="#0009";ctx.shadowBlur=14;ctx.shadowOffsetY=8;
 roundRect(-31,-38,62,74,10,"#49382d","#8b6a4e");ctx.shadowBlur=0;
 ctx.fillStyle="#1d2527";ctx.fillRect(-22,-22,44,34);
 const glow=f.p>=100?"#80ffc0":"#ff9c4a";ctx.fillStyle=glow;ctx.globalAlpha=.18+.25*(f.p/100);ctx.fillRect(-18,-18,36,26);ctx.globalAlpha=1;
 ctx.strokeStyle="#c8a67f";ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,-39,18,Math.PI,0);ctx.stroke();
 ctx.fillStyle="#222a2c";ctx.beginPath();ctx.arc(0,-38,12,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#f0d3a1";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-38);ctx.lineTo(8,-43);ctx.stroke();
 ctx.fillStyle="#75604e";ctx.fillRect(-38,20,76,9);ctx.fillStyle="#a58a69";ctx.fillRect(-42,29,84,6);
 ctx.fillStyle="#18201d";ctx.fillRect(-31,42,62,7);ctx.fillStyle=glow;ctx.fillRect(-31,42,62*(f.p/100),7);
 ctx.fillStyle="#e8edf0";ctx.font="11px sans-serif";ctx.textAlign="center";ctx.fillText(Math.floor(f.p)+"%",0,63);ctx.restore();
}
function drawLocker(l){
 const [x,y]=l;ctx.save();ctx.translate(x,y);ctx.shadowColor="#0008";ctx.shadowBlur=10;ctx.shadowOffsetY=6;
 roundRect(-22,-34,44,68,5,"#263f50","#65819a");ctx.shadowBlur=0;ctx.strokeStyle="#162633";ctx.beginPath();ctx.moveTo(0,-32);ctx.lineTo(0,32);ctx.stroke();
 ctx.strokeStyle="#66869d";for(let yy=-22;yy<-10;yy+=5){ctx.beginPath();ctx.moveTo(-15,yy);ctx.lineTo(-4,yy);ctx.moveTo(4,yy);ctx.lineTo(15,yy);ctx.stroke()}
 ctx.fillStyle="#a9c0cf";ctx.fillRect(-5,2,2,8);ctx.fillRect(3,2,2,8);ctx.restore();
}
function drawPallet(p){
 if(p.dead)return;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.open?Math.PI/2:0);ctx.shadowColor="#0007";ctx.shadowBlur=7;
 ctx.fillStyle="#946238";for(let yy=-20;yy<=20;yy+=20)ctx.fillRect(-34,yy-5,68,10);
 ctx.fillStyle="#5f4029";ctx.fillRect(-25,-29,8,58);ctx.fillRect(17,-29,8,58);ctx.restore();
}
function drawPopcornMachine(p){
 const x=p[0],y=p[1];ctx.save();ctx.translate(x,y);ctx.shadowColor="#000a";ctx.shadowBlur=16;ctx.shadowOffsetY=9;
 roundRect(-34,-43,68,78,9,"#8f2e43","#ffbd65");ctx.shadowBlur=0;
 ctx.fillStyle="#f0c45f";ctx.fillRect(-34,-44,68,13);
 for(let i=-30;i<34;i+=14){ctx.fillStyle=(Math.floor((i+30)/14)%2)?"#f8df8c":"#b7334e";ctx.beginPath();ctx.moveTo(i,-44);ctx.lineTo(i+12,-44);ctx.lineTo(i+7,-57);ctx.lineTo(i-5,-57);ctx.closePath();ctx.fill()}
 roundRect(-24,-27,48,39,5,"#1c262ccc","#ffd58a");ctx.fillStyle="#fff4cf";
 for(let i=0;i<11;i++){const px=-18+(i*13)%38,py=-20+(i*9)%25;ctx.beginPath();ctx.arc(px,py,4+(i%2),0,Math.PI*2);ctx.fill()}
 ctx.fillStyle="#f2c86e";ctx.fillRect(-28,18,56,7);ctx.fillStyle="#3a1d26";ctx.fillRect(-21,35,8,15);ctx.fillRect(13,35,8,15);
 roundRect(-39,54,78,19,7,"#201218","#d96d86");ctx.fillStyle="#ffd58a";ctx.font="10px sans-serif";ctx.textAlign="center";ctx.fillText("爆 米 花 机",0,67);ctx.restore();
}
function drawGate(g){
 ctx.save();ctx.translate(g.x,g.y);ctx.strokeStyle=g.open>=10?"#65efa0":"#e4b958";ctx.lineWidth=7;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=12;
 ctx.beginPath();ctx.moveTo(-60,20);ctx.lineTo(-60,-24);ctx.lineTo(60,-24);ctx.lineTo(60,20);ctx.stroke();ctx.shadowBlur=0;
 for(let x=-45;x<=45;x+=18){ctx.beginPath();ctx.moveTo(x,-22);ctx.lineTo(x,18);ctx.stroke()}
 ctx.restore();
}
function drawPainting(p){
 ctx.save();ctx.translate(p.x,p.y);ctx.shadowColor=p.active>0?"#c25cff":"#0009";ctx.shadowBlur=p.active>0?24:10;
 const frameGrad=ctx.createLinearGradient(-24,-35,24,35);frameGrad.addColorStop(0,"#7f6245");frameGrad.addColorStop(.5,"#34271f");frameGrad.addColorStop(1,"#a47a4d");
 roundRect(-25,-36,50,72,4,frameGrad,"#d5a86f");ctx.shadowBlur=0;ctx.fillStyle="#15131a";ctx.fillRect(-18,-29,36,58);
 ctx.globalAlpha=.22;ctx.fillStyle="#8f6cac";ctx.beginPath();ctx.ellipse(0,-12,14,5,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#c2a8d8";ctx.beginPath();ctx.ellipse(0,-5,8,10,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#4f3b5e";ctx.beginPath();ctx.moveTo(-11,6);ctx.lineTo(10,6);ctx.lineTo(15,28);ctx.lineTo(-15,28);ctx.closePath();ctx.fill();
 if(p.variant===1){ctx.strokeStyle="#9f78c4";ctx.beginPath();ctx.moveTo(-16,20);ctx.lineTo(15,-18);ctx.stroke()}
 if(p.variant===2){ctx.fillStyle="#6d507e";ctx.fillRect(-14,13,28,3)}
 ctx.globalAlpha=1;
 if(p.active>0){ctx.strokeStyle="#dc8cff";ctx.lineWidth=3;ctx.strokeRect(-29,-40,58,80);ctx.fillStyle="#efd9ff";ctx.font="9px sans-serif";ctx.textAlign="center";ctx.fillText(Math.ceil(p.active)+"s",0,-45)}
 ctx.restore();
}
function drawEgg(e){
 ctx.save();ctx.translate(e.x,e.y);ctx.shadowColor="#0008";ctx.shadowBlur=8;ctx.shadowOffsetY=5;
 const c=e.down?"#777c80":charColors[e.char];const g=ctx.createRadialGradient(-7,-10,2,0,0,28);g.addColorStop(0,"#fff8");g.addColorStop(.18,c);g.addColorStop(1,"#594f50");
 ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,19,25,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 ctx.fillStyle="#17191b";ctx.beginPath();ctx.arc(-6,-5,2.3,0,Math.PI*2);ctx.arc(6,-5,2.3,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle="#fff9";ctx.lineWidth=2;
 if(e.char==="miner"){ctx.beginPath();ctx.moveTo(-16,-18);ctx.lineTo(16,-18);ctx.moveTo(-11,-21);ctx.lineTo(11,-21);ctx.stroke()}
 if(e.char==="doctor"){ctx.fillStyle="#fff";ctx.fillRect(-3,-23,6,12);ctx.fillRect(-7,-19,14,4)}
 if(e.char==="dancer"){ctx.beginPath();ctx.arc(0,-19,10,Math.PI,0);ctx.stroke()}
 if(e.char==="soldier"){ctx.fillStyle="#53694f";ctx.fillRect(-14,-23,28,7)}
 if(e.char==="tamer"){ctx.beginPath();ctx.moveTo(-14,8);ctx.quadraticCurveTo(-28,20,-17,28);ctx.stroke()}
 ctx.fillStyle="#f7f8fa";ctx.font="10px sans-serif";ctx.textAlign="center";ctx.fillText(cname[e.char],0,-34);
 ctx.restore();
}
function drawBelinda(e){
 ctx.save();ctx.translate(e.x,e.y);ctx.shadowColor="#000c";ctx.shadowBlur=18;ctx.shadowOffsetY=10;
 ctx.fillStyle="#07070a";ctx.beginPath();ctx.ellipse(0,-42,42,9,0,0,Math.PI*2);ctx.fill();ctx.fillRect(-14,-45,28,16);
 ctx.shadowBlur=0;ctx.fillStyle="#d7c9c4";ctx.beginPath();ctx.ellipse(0,-26,9,12,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#16131a";ctx.beginPath();ctx.moveTo(-19,-13);ctx.lineTo(18,-13);ctx.lineTo(34,43);ctx.lineTo(-32,43);ctx.closePath();ctx.fill();
 ctx.strokeStyle="#393040";ctx.lineWidth=2;for(let i=-22;i<=22;i+=11){ctx.beginPath();ctx.moveTo(i,-6);ctx.lineTo(i*1.35,40);ctx.stroke()}
 // 左手持画：虚空 + 两只伸出的手
 ctx.save();ctx.translate(-41,1);ctx.rotate(-.08);roundRect(-20,-29,40,58,3,"#5a432e","#d1a464");ctx.fillStyle="#09070d";ctx.fillRect(-14,-23,28,46);
 ctx.strokeStyle="#ae91c5";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,16);ctx.quadraticCurveTo(-3,4,1,-7);ctx.moveTo(8,18);ctx.quadraticCurveTo(4,5,-2,-4);ctx.stroke();
 ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(1,-7);ctx.lineTo(-5,-12);ctx.moveTo(1,-7);ctx.lineTo(5,-13);ctx.moveTo(-2,-4);ctx.lineTo(-9,-8);ctx.stroke();ctx.restore();
 // 右手虚空之爪
 ctx.strokeStyle="#a16bc6";ctx.lineWidth=4;ctx.shadowColor="#b05cff";ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(19,-1);ctx.lineTo(35,12);ctx.stroke();
 ctx.lineWidth=2;for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(34,11);ctx.lineTo(48+k*3,2+k*5);ctx.stroke()}ctx.shadowBlur=0;
 ctx.fillStyle="#fff";ctx.font="11px sans-serif";ctx.textAlign="center";ctx.fillText("画中女郎 · 贝琳达",0,-58);ctx.restore();
}
function drawEffects(){
 for(const e of effects){
  if(e.type==="claw"){
   ctx.save();ctx.globalAlpha=clamp(e.t/.42,0,1);ctx.strokeStyle="#b95cff";ctx.shadowColor="#d494ff";ctx.shadowBlur=18;ctx.lineCap="round";
   ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(e.x1,e.y1);ctx.lineTo(e.x2,e.y2);ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle="#eed5ff";ctx.stroke();ctx.restore();
  }else{
   ctx.save();ctx.globalAlpha=clamp(e.t/.7,0,1);ctx.strokeStyle="#cd7cff";ctx.lineWidth=5;ctx.beginPath();ctx.arc(e.x,e.y,(.7-e.t)*90,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
 }
}
function drawAim(){
 if(!aim)return;
 ctx.save();ctx.setLineDash([10,7]);ctx.lineWidth=3;ctx.shadowBlur=12;
 if(aim.type==="sketch"){
  ctx.strokeStyle="#c179ff";ctx.shadowColor="#b85cff";ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.lineTo(aim.targetX,aim.targetY);ctx.stroke();
  ctx.setLineDash([]);ctx.beginPath();ctx.arc(aim.targetX,aim.targetY,34,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#d8b7ff";ctx.font="11px sans-serif";ctx.textAlign="center";ctx.fillText((Math.hypot(aim.targetX-player.x,aim.targetY-player.y)/SCALE).toFixed(0)+"m",aim.targetX,aim.targetY-43);
 }else if(aim.type==="claw"&&player.lastPainting){
  ctx.strokeStyle="#b958ff";ctx.shadowColor="#c65cff";ctx.beginPath();ctx.moveTo(player.lastPainting.x,player.lastPainting.y);ctx.lineTo(aim.targetX,aim.targetY);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle="#dca6ff";ctx.beginPath();ctx.arc(aim.targetX,aim.targetY,12,0,Math.PI*2);ctx.fill();
 }else if(aim.type==="out"){
  for(const p of paintings.filter(p=>(p.active>0||player.ult>0)&&Math.hypot(player.x-p.x,player.y-p.y)<=500)){
   ctx.strokeStyle=p===aim.selected?"#f0c1ff":"#8e5fb5";ctx.lineWidth=p===aim.selected?5:2;ctx.setLineDash([]);ctx.beginPath();ctx.arc(p.x,p.y,p===aim.selected?46:36,0,Math.PI*2);ctx.stroke();
  }
 }else if(aim.type==="smoke"){
  ctx.strokeStyle="#d6dde4";ctx.shadowColor="#fff";ctx.beginPath();ctx.moveTo(player.x,player.y);const mx=(player.x+aim.targetX)/2,my=Math.min(player.y,aim.targetY)-75;ctx.quadraticCurveTo(mx,my,aim.targetX,aim.targetY);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(aim.targetX,aim.targetY,26,0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();
}
function drawDirectionArrow(p,target,label){
 const dx=target.x-p.x,dy=target.y-p.y,a=Math.atan2(dy,dx);const margin=85;
 const sx=vw/2+Math.cos(a)*(Math.min(vw,vh)/2-margin),sy=vh/2+Math.sin(a)*(Math.min(vw,vh)/2-margin);
 ctx.save();ctx.translate(sx,sy);ctx.rotate(a);ctx.fillStyle="#e0a4ff";ctx.shadowColor="#c95eff";ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-10,-10);ctx.lineTo(-5,0);ctx.lineTo(-10,10);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.rotate(-a);ctx.fillStyle="#f1d9ff";ctx.font="10px sans-serif";ctx.textAlign="center";ctx.fillText(label,0,-16);ctx.restore();
}

function draw(){
 ctx.clearRect(0,0,vw,vh);if(!running||!player)return;
 const c=cam();ctx.save();ctx.translate(-c.x,-c.y);
 drawFloor();walls.forEach(drawWall);props.forEach(p=>{ctx.fillStyle=p[2]==="crate"?"#5b4631":"#39474b";ctx.fillRect(p[0]-22,p[1]-18,44,36)});
 furnaces.forEach(drawFurnace);lockers.forEach(drawLocker);pallets.forEach(drawPallet);popPos.forEach(drawPopcornMachine);gates.forEach(drawGate);
 smokes.forEach(s=>{const g=ctx.createRadialGradient(s.x,s.y,10,s.x,s.y,130);g.addColorStop(0,"rgba(225,230,238,.32)");g.addColorStop(1,"rgba(170,180,190,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,130,0,Math.PI*2);ctx.fill()});
 paintings.forEach(drawPainting);
 entities.forEach(e=>{if(e.dead||(e.hide&&e!==player))return;e.kind==="s"?drawEgg(e):drawBelinda(e);if(e.kind==="s"&&e.hook){ctx.fillStyle="#ffb6c2";ctx.font="12px sans-serif";ctx.textAlign="center";ctx.fillText("淘汰 "+Math.max(0,20-e.hookT).toFixed(1)+"s",e.x,e.y-45)}});
 drawEffects();drawAim();ctx.restore();

 if(player.kind==="s"){
  const hs=entities.filter(e=>e.kind==="h"&&!e.dead),near=nearest(player,hs);
  if(near&&dist(player,near)<500){ctx.strokeStyle=near.target===player?"rgba(255,70,82,.82)":"rgba(255,215,75,.68)";ctx.lineWidth=8;ctx.beginPath();ctx.arc(vw/2,vh/2,44,0,Math.PI*2);ctx.stroke()}
 }
 if(player.kind==="h"){
  const act=paintings.filter(p=>p.active>0&&p.trigger);
  if(act.length){const p=act[0];drawDirectionArrow(player,p.trigger,cname[p.trigger.char]);$("paintingAlert").textContent="画中窥影："+cname[p.trigger.char]+" 触发了一幅画作"}
  else $("paintingAlert").textContent="";
 }else $("paintingAlert").textContent="";

 const done=furnaces.filter(f=>f.p>=100).length;
 $("hudMain").innerHTML=(player.kind==="s"?"逃生者":"追捕者")+" · "+mode+"<br>蒸汽炉 "+done+"/"+need+"　逃出 "+escaped+"<br>"+
  (player.kind==="s"?("HP "+player.hp+"/"+player.maxhp+"　"+cname[player.char]+(player.char==="miner"?"　矿渣 "+Math.floor(player.coal):"")):
  ("贝琳达　能量 "+Math.floor(player.energy)+"%"+(player.ult>0?"　画廊穿梭 "+Math.ceil(player.ult)+"s":"")));
}
function frame(ts){const dt=Math.min(.033,Math.max(0,(ts-last)/1000));last=ts;update(dt);draw();requestAnimationFrame(frame)}
requestAnimationFrame(frame);
window.__steamGameV2={getMode:()=>mode,getSide:()=>side,isRunning:()=>running,paintings:()=>paintings.length};
})();