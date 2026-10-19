// ===== APP =====
const D=window.MECH;
const main=document.getElementById("main"),nav=document.getElementById("nav"),q=document.getElementById("q");
let cur=0,cvs=[];
function esc(s){return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function card(x){return `<div class="card"><h3>${esc(x.h)}</h3><div class="${x.a?'row':''}"><div>
<p>${esc(x.s)}</p><div class="f">${esc(x.f)}</div>
<p><span class="tag">Real life:</span> ${esc(x.u)}</p>
<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(x.v)}" target="_blank" rel="noopener">▶ Watch videos on this topic</a></div>
${x.a?`<canvas width="300" height="120" data-a="${x.a}"></canvas>`:""}</div></div>`}
function show(i,filter){cur=i;[...nav.children].forEach((b,j)=>b.classList.toggle("on",j===i&&!filter));
let h="";if(filter){D.forEach(s=>s.t.forEach(x=>{if((x.h+x.s+x.u).toLowerCase().includes(filter))h+=card(x)}));h=h||"<p>No topic found.</p>"}
else{const s=D[i];h=`<h2>${esc(s.n)}</h2><div class="sub">${esc(s.d)}</div><div class="books">Books: ${esc(s.b)}</div>`+s.t.map(card).join("")}
main.innerHTML=h;cvs=[...main.querySelectorAll("canvas")]}
D.forEach((s,i)=>{const b=document.createElement("button");b.textContent=s.n;b.onclick=()=>{q.value="";show(i)};nav.appendChild(b)});
q.oninput=()=>{const v=q.value.trim().toLowerCase();v?show(cur,v):show(cur)};
show(0);
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
function loop(ts){const t=ts/1000;cvs.forEach(c=>{const g=c.getContext("2d"),ink=getComputedStyle(document.body).color;g.clearRect(0,0,300,120);g.strokeStyle=ink;g.fillStyle=ink;g.lineWidth=1.5;g.font="12px system-ui";A[c.dataset.a](g,reduce?0.5:t,300,120,c)});requestAnimationFrame(loop)}
requestAnimationFrame(loop);
