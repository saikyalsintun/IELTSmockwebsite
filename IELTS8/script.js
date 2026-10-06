const A={
1:[
 {n:1,a:['three times','three'],p:'Total number of visits:'},
 {n:2,a:['amazing weather'],p:'Best thing about the city:'},
 {n:3,a:['town hall'],p:'Favourite attraction:'},
 {n:4,a:['variety'],p:"Best thing about the destination's dining options:"},
 {n:5,a:['plane'],p:'Method of transport to destination:'},
 {n:6,m:2,o:{
   A:'A big family with many young children',
   B:'A family without smoker or drinkers',
   C:'A family without any pets',
   D:'A family with many animals or pets'
 },a:['B','D'],p:'Which kind of family does the girl prefer?'},
 {n:7,a:['seafood'],p:"Although the girl is not a vegetarian, she doesn't eat a lot of meat. Her favourite food is"},
 {n:8,a:['tennis'],p:'The girl has given up playing handball. Now, she just plays'},
 {n:9,a:['take the train'],p:'The girl does not like the bus because they are always late. She would rather'},
 {n:10,a:['this afternoon'],p:'The girl can get the information about the homestay family that she wants'}
],
2:[
 {n:11,sel:['A','B','C','D','E'],a:['B'],p:'Science Museum'},
 {n:12,sel:['A','B','C','D','E'],a:['A'],p:'National History Museum'},
 {n:13,sel:['A','B','C','D','E'],a:['E'],p:'Car Park'},
 {n:14,sel:['A','B','C','D','E'],a:['C'],p:'Shopping Mall'},
 {n:15,sel:['A','B','C','D','E'],a:['D'],p:'Primary School'},
 {n:16,sel:['A','B','C','D','E','F','G'],a:['E'],p:'Car Park'},
 {n:17,sel:['A','B','C','D','E','F','G'],a:['G'],p:'Primary School'},
 {n:18,sel:['A','B','C','D','E','F','G'],a:['C'],p:'Science Museum'},
 {n:19,sel:['A','B','C','D','E','F','G'],a:['D'],p:'National History Museum'},
 {n:20,sel:['A','B','C','D','E','F','G'],a:['A'],p:'Shopping Mall'}
],
3:[
 {n:21,o:{A:'be reviewed by two examiners.',B:'be added to the final grade.',C:'be returned with feedback.'},a:['C'],p:'The proposal will'},
 {n:22,o:{A:'topics.',B:'methods.',C:'results.'},a:['B'],p:'The proposal will consist mostly of'},
 {n:23,o:{A:'pay attention to time limits.',B:'write at least 6,000 words.',C:'keep on topic.'},a:['A'],p:'For the practice paper, the tutor has directed the students to make sure to'},
 {n:24,a:['interview'],p:'There is no need to ______ lots of people.'},
 {n:25,a:['format'],p:'Pay attention to the ______ of the final report.'},
 {n:26,a:['2 copies'],p:'Prepare ______ one for the teachers, another for the students themselves.'},
 {n:27,a:['may 11'],p:'The deadline of the final paper is ______.'},
 {n:28,a:['change'],p:'The students can ______ their topics before the beginning of April.'},
 {n:29,a:['note'],p:'Students deciding to change topics must deliver a ______ to the research in advance.'},
 {n:30,a:['procedure'],p:'At the beginning of the report, the hypothesis and an outline of the ______ are needed.'}
],
4:[
 {n:31,a:['distance'],p:'The ______ customers must travel affects the probability that they will buy the product.'},
 {n:32,a:['sound'],p:'Advertising slogans are easier to remember if there is a ______ played with them.'},
 {n:33,a:['smell'],p:"Mandy's Candy Store appeals to people's sense of ______ to draw in customers."},
 {n:34,a:['flexibility'],p:'To an ad campaign for digital products, it is ______ that is extremely important.'},
 {n:35,a:['reaction'],p:"The customer's ______ after he or she experiences the ad is most important."},
 {n:36,a:['languages'],p:'On international flights, it is wise for the advertisement to be displayed in the common ______ of most passengers.'},
 {n:37,a:['newspaper'],p:'Very few young people buy ______.'},
 {n:38,a:['environment'],p:'The UNESCO website would be a good place to advertise for companies aiming to improve the ______.'},
 {n:39,a:['swimming pool'],p:'One good location to place ads for sunscreen is the ______.'},
 {n:40,a:['national park'],p:'A good scene for a water purification commercial would be ______.'}
]};

let S={
 part:1,
 ans:JSON.parse(localStorage.getItem('ieltsAdvertisingMapAnswers')||'{}'),
 left:1800,
 done:false,
 filter:'all'
};

const qs=()=>Object.values(A).flat();
const q=n=>qs().find(x=>x.n==n);
const N=v=>String(v??'').trim().toLowerCase()
 .replace(/[£$]/g,'')
 .replace(/[’']/g,"'")
 .replace(/\s+/g,' ');

function isAns(n){
 let z=q(n),v=S.ans[n];
 if(z.m) return Array.isArray(v)&&v.length===z.m;
 if(z.sel) return typeof v==='string'&&v.trim()!=='';
 return String(v??'').trim()!=='';
}

function set(n,v){
 S.ans[n]=v;
 localStorage.setItem('ieltsAdvertisingMapAnswers',JSON.stringify(S.ans));
 nav();
 count();
}

function inp(n){
 let x=document.createElement('input');
 x.type='text';
 x.className='blank';
 x.value=S.ans[n]||'';
 x.oninput=e=>set(n,e.target.value);
 return x;
}

function selectInput(n,values){
 let s=document.createElement('select');
 s.className='select-answer';
 s.innerHTML='<option value="">Select</option>'+values.map(v=>`<option value="${v}">${v}</option>`).join('');
 s.value=S.ans[n]||'';
 s.onchange=e=>set(n,e.target.value);
 return s;
}

function opts(z){
 let d=document.createElement('div');
 d.className='options';
 Object.entries(z.o).forEach(([k,t])=>{
   let l=document.createElement('label');
   l.className='option';
   let x=document.createElement('input');
   x.type=z.m?'checkbox':'radio';
   x.name='q'+z.n;
   x.value=k;
   x.checked=z.m?(S.ans[z.n]||[]).includes(k):S.ans[z.n]===k;
   x.onchange=()=>{
     if(z.m){
       let v=[...(S.ans[z.n]||[])];
       if(x.checked){
         if(v.length>=z.m){x.checked=false;return}
         v.push(k);
       }else v=v.filter(a=>a!==k);
       S.ans[z.n]=v;
       localStorage.setItem('ieltsAdvertisingMapAnswers',JSON.stringify(S.ans));
       nav();count();
     }else set(z.n,k);
   };
   l.append(
     x,
     Object.assign(document.createElement('b'),{textContent:k+'.'}),
     Object.assign(document.createElement('span'),{textContent:t})
   );
   d.append(l);
 });
 return d;
}

function block(title,inst){
 let d=document.createElement('div');
 d.className='block';
 d.innerHTML='<div class="range">'+title+'</div>'+(inst?'<div class="instruction">'+inst+'</div>':'');
 return d;
}

function render(){
 document.querySelectorAll('#parts button').forEach(b=>b.classList.toggle('active',+b.dataset.p===S.part));
 document.getElementById('audioTitle').textContent='Part '+S.part+' Audio';
 document.getElementById('player').src='audio/part'+S.part+'.mp3';

 let c=document.getElementById('content');
 c.innerHTML='';
 let h=document.createElement('div');
 h.className='heading';
 h.innerHTML='<h1>Section '+S.part+' — '+[
   'Melbourne Travel Survey',
   'Area Map & Improvements',
   'Research Proposal',
   'Advertising Effect'
 ][S.part-1]+'</h1>';
 c.append(h);

 if(S.part===1)p1(c);
 if(S.part===2)p2(c);
 if(S.part===3)p3(c);
 if(S.part===4)p4(c);
 nav();
 count();
}

function p1(c){
 let b=block('Questions 1–5','Complete the form below. Write NO MORE THAN TWO WORDS for each answer.');
 let t=document.createElement('table');
 t.className='form';
 t.innerHTML='<tr><th>Field</th><th>Answer</th></tr>';
 [
  ['Example: Name','Robert Goddard'],
  ['Destination','Melbourne'],
  ['Total number of visits',1],
  ['Best thing about the city',2],
  ['Favourite attraction',3],
  ["Best thing about the destination's dining options",4],
  ['Method of transport to destination','by',5],
  ['Age group',6],
  ['Income level',7],
  ['Purpose of visit','- on business /',8],
  ['Occupation','- ',9],
  ['Opinion of cost of accommodation','- ',10]
 ].forEach(r=>{
   let tr=t.insertRow();
   tr.insertCell().textContent=r[0];
   let td=tr.insertCell();
   if(typeof r[1]==='number'){
     td.append(inp(r[1]));
   }else if(r[2]){
     td.append(document.createTextNode(r[1]+' '),inp(r[2]));
   }else{
     td.textContent=r[1];
   }
 });
 b.append(t);
 c.append(b);

 let b2=block('Question 6','Mark TWO letters that represent the correct answer.');
 b2.append(document.createTextNode(q(6).p));
 b2.append(opts(q(6)));
 c.append(b2);

 let b3=block('Questions 7–10','Fill in the blanks with NO MORE THAN THREE WORDS for each answer.');
 [7,8,9,10].forEach(n=>{
   let d=document.createElement('div');
   d.className='q';
   d.innerHTML='<b>'+n+'.</b> '+q(n).p+' ';
   d.append(inp(n));
   d.append('.');
   b3.append(d);
 });
 c.append(b3);
}

function p2(c){
 let b=block('Questions 11–15','Label the map below. Write the correct letter, A–E, next to questions 11–15.');

 let map=document.createElement('div');
 map.className='map-wrap';
 let img=document.createElement('img');
 img.src='map_questions_11_15.png';
 img.alt='Map for Questions 11–15';
 map.append(img);
 b.append(map);

 [11,12,13,14,15].forEach(n=>{
   let d=document.createElement('div');
   d.className='q';
   d.innerHTML='<b>'+n+'.</b> '+q(n).p+' ';
   d.append(selectInput(n,q(n).sel));
   b.append(d);
 });
 c.append(b);

 let b2=block('Questions 16–20','Choose FIVE answers from the box and write the correct letter, A–G, next to questions 16–20.');
 let box=document.createElement('div');
 box.className='match-box';
 box.innerHTML='<div><b>A</b> New entrance</div>'+
   '<div><b>B</b> Free lunch provided</div>'+
   '<div><b>C</b> Free information provided</div>'+
   '<div><b>D</b> Increase in size</div>'+
   '<div><b>E</b> Additional signs</div>'+
   '<div><b>F</b> New exhibitions</div>'+
   '<div><b>G</b> New structure</div>';
 b2.append(box);

 [16,17,18,19,20].forEach(n=>{
   let d=document.createElement('div');
   d.className='q';
   d.innerHTML='<b>'+n+'.</b> '+q(n).p+' ';
   d.append(selectInput(n,q(n).sel));
   b2.append(d);
 });
 c.append(b2);
}

function p3(c){
 let b=block('Questions 21–23','Choose the correct letter, A, B or C.');
 [21,22,23].forEach(n=>{
   let d=document.createElement('div');
   d.className='q';
   d.innerHTML='<b>'+n+'.</b> '+q(n).p;
   d.append(opts(q(n)));
   b.append(d);
 });
 c.append(b);

 let b2=block('Questions 24–30','Complete the sentences below. Write ONE WORD AND/OR A NUMBER for each answer.');
 [24,25,26,27,28,29,30].forEach(n=>{
   let d=document.createElement('div');
   d.className='q';
   let text=q(n).p;
   if(n===24)text='There is no need to';
   if(n===25)text='Pay attention to the';
   if(n===26)text='Prepare';
   if(n===27)text='The deadline of the final paper is';
   if(n===28)text='The students can';
   if(n===29)text='Students deciding to change topics must deliver a';
   if(n===30)text='At the beginning of the report, the hypothesis and an outline of the';
   d.innerHTML='<b>'+n+'.</b> '+text+' ';
   d.append(inp(n));
   if(n===24)d.append(' lots of people.');
   if(n===25)d.append(' of the final report.');
   if(n===26)d.append(' — one for the teachers, another for the students themselves.');
   if(n===27)d.append('.');
   if(n===28)d.append(' their topics before the beginning of April.');
   if(n===29)d.append(' to the research in advance.');
   if(n===30)d.append(' are needed.');
   b2.append(d);
 });
 c.append(b2);
}

function p4(c){
 let b=block('Questions 31–40','Complete the notes below. Write NO MORE THAN TWO WORDS for each answer.');
 const title=document.createElement('h3');
 title.textContent='ADVERTISING EFFECT';
 title.style.textAlign='center';
 b.append(title);

 const groups=[
  ['The important factor to consider',[31]],
  ['Methods of communication',[32,33,34]],
  ['Effect on your product sales',[35]],
  ['Marketing strategies',[36,37,38,39,40]]
 ];
 groups.forEach(g=>{
   let h=document.createElement('h4');
   h.textContent=g[0];
   b.append(h);
   g[1].forEach(n=>{
     let d=document.createElement('div');
     d.className='q';
     d.innerHTML='<b>'+n+'.</b> '+q(n).p.replace('______','');
     d.append(inp(n));
     b.append(d);
   });
 });
 c.append(b);
}

function nav(){
 let d=document.getElementById('nav');
 d.innerHTML='';
 for(let n=1;n<=40;n++){
   let b=document.createElement('button');
   b.className='qnav'+(isAns(n)?' answered':'');
   b.textContent=n;
   b.onclick=()=>{
     let p=n<=10?1:n<=20?2:n<=30?3:4;
     if(S.part!==p){S.part=p;render();}
     window.scrollTo({top:0,behavior:'smooth'});
   };
   d.append(b);
 }
}

function count(){
 document.getElementById('count').textContent=
   Array.from({length:40},(_,i)=>i+1).filter(isAns).length;
}

function ok(n){
 let z=q(n),v=S.ans[n];
 if(z.m){
   let got=(v||[]).map(N).sort();
   let key=z.a.map(N).sort();
   return got.length===key.length&&got.every((x,i)=>x===key[i]);
 }
 return z.a.some(a=>N(v)===N(a));
}

function band(s){
 return s>=39?9:s>=37?8.5:s>=35?8:s>=32?7.5:s>=30?7:s>=26?6.5:s>=23?6:s>=18?5.5:s>=16?5:s>=13?4.5:s>=10?4:s>=8?3.5:s>=6?3:s>=4?2.5:s===3?2:s===2?1.5:s===1?1:0;
}

function finish(){
 S.done=true;
 document.getElementById('modal').classList.add('hide');
 document.querySelector('header').classList.add('hide');
 document.getElementById('parts').classList.add('hide');
 document.querySelector('.layout').classList.add('hide');
 document.querySelector('footer').classList.add('hide');
 document.getElementById('results').classList.remove('hide');

 let score=0,u=0;
 for(let n=1;n<=40;n++){
   if(ok(n))score++;
   if(!isAns(n))u++;
 }
 document.getElementById('score').textContent=score+'/40';
 document.getElementById('band').textContent=band(score).toFixed(1);
 document.getElementById('correct').textContent=score;
 document.getElementById('wrong').textContent=40-score;
 document.getElementById('unanswered').textContent=u;
 document.getElementById('accuracy').textContent=Math.round(score/40*100)+'%';

 let ps=document.getElementById('partScores');
 ps.innerHTML='';
 [[1,1,10],[2,11,20],[3,21,30],[4,31,40]].forEach(x=>{
   let s=0;
   for(let n=x[1];n<=x[2];n++)if(ok(n))s++;
   let d=document.createElement('div');
   d.className='ps';
   d.innerHTML='<div><b>Part '+x[0]+'</b> <span style="float:right">'+s+'/10</span></div><div class="bar"><i style="width:'+s*10+'%"></i></div>';
   ps.append(d);
 });
 review();
}

function esc(s){
 return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function showAns(n){
 let v=S.ans[n];
 if(Array.isArray(v))return v.filter(Boolean).join(', ')||'—';
 return v&&String(v).trim()?v:'—';
}
function key(n){
 let z=q(n);
 return z.a.join(' / ');
}
function review(){
 let r=document.getElementById('review');
 r.innerHTML='';
 for(let n=1;n<=40;n++){
   let good=ok(n);
   if(S.filter==='wrong'&&good)continue;
   let d=document.createElement('div');
   d.className='review '+(good?'good':'bad');
   d.innerHTML='<div class="rhead"><b>'+n+'. '+esc(q(n).p)+'</b><span class="status">'+(good?'✓ Correct':'✗ Incorrect')+'</span></div>'+
     '<div class="answer"><label>Your answer</label><span>'+esc(showAns(n))+'</span></div>'+
     (good?'':'<div class="answer"><label>Correct answer</label><span class="correctAns">'+esc(key(n))+'</span></div>');
   r.append(d);
 }
}

document.querySelectorAll('#parts button').forEach(b=>{
 b.onclick=()=>{S.part=+b.dataset.p;render();}
});

document.getElementById('audioFile').onchange=e=>{
 let f=e.target.files[0];
 if(f)document.getElementById('player').src=URL.createObjectURL(f);
};

document.getElementById('finish').onclick=()=>{
 document.getElementById('modal').classList.remove('hide');
};
document.getElementById('cancel').onclick=()=>{
 document.getElementById('modal').classList.add('hide');
};
document.getElementById('confirm').onclick=finish;
document.getElementById('print').onclick=()=>print();
document.getElementById('restart').onclick=()=>{
 localStorage.removeItem('ieltsAdvertisingMapAnswers');
 location.reload();
};
document.querySelectorAll('.filter').forEach(b=>{
 b.onclick=()=>{
   document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));
   b.classList.add('active');
   S.filter=b.dataset.f;
   review();
 };
});

setInterval(()=>{
 if(S.done)return;
 if(--S.left<=0){
   S.left=0;
   finish();
 }
 let m=String(Math.floor(S.left/60)).padStart(2,'0');
 let s=String(S.left%60).padStart(2,'0');
 document.getElementById('timer').textContent=m+':'+s;
},1000);

render();
