const TEST={
1:[
{n:1,a:['elsinore'],p:'Street address: 45 (1) ______ Court'},
{n:2,a:['077896245'],p:'Contact phone number'},
{n:3,a:['waiter'],p:'Current part-time job'},
{n:4,a:['baseball coach'],p:'Previous job at Ridgemont High School'},
{n:5,a:['rescue diver'],p:'Additional relevant work experience'},
{n:6,a:['diving experience'],p:'Relevant skills/qualifications: CPR certification & (6) ______'},
{n:7,a:['october'],p:'CPR certification expiration date'},
{n:8,a:['saturday mornings'],p:'Preferred weekly shift'},
{n:9,a:["6 (o'clock)","6"],p:"Time available to start work"},
{n:10,a:['radio'],p:'Advertisement source'}
],
2:[
{n:11,o:{A:'City of Nottingham.',B:"University of Nottingham Students' Union.",C:'Nottingham Police Department.'},a:['B'],p:'The lecture was organised by'},
{n:12,o:{A:'drugs and alcohol.',B:'violence.',C:'theft.'},a:['C'],p:'The majority of crime on campus is'},
{n:13,o:{A:'increased.',B:'decreased.',C:'stayed the same.'},a:['B'],p:'The campus crime rate has ______ so far for this year.'},
{n:14,o:{A:'Exaggeration in media.',B:'Crime TV shows.',C:'Factual news articles.'},a:['A'],p:'Why is there added concern about crime?'},
{n:15,o:{A:'run away.',B:'resist.',C:'seek help.'},a:['C'],p:'Carlos says if you are the victim of crime, you should'},
{n:16,o:{A:'Informing students and staff of safety precautions.',B:'Offering free self-defense courses to students.',C:'Reminding students to carry a mobile phone at all times.'},a:['A'],p:'What is the primary method for increasing safety?'},
{n:17,o:{A:'not return home until the morning.',B:'go back with a friend.',C:'bring a mobile phone.'},a:['B'],p:'If a student must work late, it is most important to'},
{n:18,o:{A:'drive home late at night.',B:'carry a knife.',C:'carry pepper spray.'},a:['B'],p:'It is dangerous to'},
{n:19,o:{A:'more aware of dangers.',B:'mentally tougher.',C:'walking more confidently.'},a:['A'],p:'Students who complete self-defense course are'},
{n:20,o:{A:'not surrounded by walls.',B:'patrolled by military.',C:'completely safe.'},a:['A'],p:'A university is'}
],
3:[
{n:21,o:{A:'the teacher.',B:'a class.',C:'a handout.'},a:['C'],p:'Information on the test is from'},
{n:22,o:{A:'it will become a permanent record.',B:'it is a must for passing 11th grade English.',C:'it will affect the English level next year.'},a:['A'],p:'This assignment is important because'},
{n:23,o:{A:'he often plays football.',B:'his father loves football.',C:'he is interested in football.'},a:['B'],p:'Bobby chooses football as project topic because'},
{n:24,o:{A:'too vague',B:'too factual',C:'too unreliable',D:'too noisy',E:'too long',F:'too short',G:'too complicated'},a:['D'],p:'Background sounds'},
{n:25,o:{A:'too vague',B:'too factual',C:'too unreliable',D:'too noisy',E:'too long',F:'too short',G:'too complicated'},a:['F'],p:'Answer of questions'},
{n:26,o:{A:'too vague',B:'too factual',C:'too unreliable',D:'too noisy',E:'too long',F:'too short',G:'too complicated'},a:['G'],p:'One of the questions'},
{n:27,o:{A:'too vague',B:'too factual',C:'too unreliable',D:'too noisy',E:'too long',F:'too short',G:'too complicated'},a:['E'],p:'Time of answering'},
{n:28,o:{A:'too vague',B:'too factual',C:'too unreliable',D:'too noisy',E:'too long',F:'too short',G:'too complicated'},a:['C'],p:'Recording equipment'},
{n:29,o:{A:'too vague',B:'too factual',C:'too unreliable',D:'too noisy',E:'too long',F:'too short',G:'too complicated'},a:['A'],p:'Topic of project'},
{n:30,o:{A:'too vague',B:'too factual',C:'too unreliable',D:'too noisy',E:'too long',F:'too short',G:'too complicated'},a:['B'],p:'Report on project'}
],
4:[
{n:31,a:['important'],p:'Lecturers often feel more nervous if a speech is'},
{n:32,a:['a gift'],p:'Many think that the ability to make a good public speaking is'},
{n:33,a:['last'],p:'The audience will only remember the ______ sentence of speech.'},
{n:34,a:['well-organised'],p:'Ensure that your speech is'},
{n:35,a:['paying attention'],p:"Don't start your speech until audience is"},
{n:36,a:['sheet of paper'],p:'You can make your main ideas or notes on cards or a'},
{n:37,a:['entire','full'],p:'You do not need to write down the ______ speech.'},
{n:38,a:['one or two'],p:'You can just write ______ ideas.'},
{n:39,a:['time'],p:'Remember to ______ yourself to see how long your speech will be.'},
{n:40,a:['read'],p:"Don't just ______ a script."}
]};

const SECTION_TEXT={
1:'PHONE INTERVIEW',
2:'CAMPUS SAFETY LECTURE',
3:'PROJECT DISCUSSION',
4:'GIVING A SPEECH'
};

let state={
 part:1,
 answers:JSON.parse(localStorage.getItem('ieltsSpeechTestAnswers')||'{}'),
 finished:false,
 seconds:1800,
 filter:'all'
};

function allQuestions(){return Object.values(TEST).flat();}
function getQ(n){return allQuestions().find(x=>x.n===n);}
function norm(v){
 return String(v??'').trim().toLowerCase()
   .replace(/[’']/g,"'")
   .replace(/\s+/g,' ');
}
function answered(n){
 const q=getQ(n),v=state.answers[n];
 if(q.multi)return Array.isArray(v)&&v.length===q.multi;
 return typeof v==='string'&&v.trim()!=='';
}
function saveAnswer(n,v){
 state.answers[n]=v;
 localStorage.setItem('ieltsSpeechTestAnswers',JSON.stringify(state.answers));
 updateNav();updateCount();
}
function textInput(n){
 const i=document.createElement('input');
 i.type='text';i.className='blank';i.value=state.answers[n]||'';
 i.addEventListener('input',e=>saveAnswer(n,e.target.value));
 return i;
}
function radioOptions(q){
 const box=document.createElement('div');box.className='options';
 Object.entries(q.o).forEach(([letter,text])=>{
   const label=document.createElement('label');label.className='option';
   const input=document.createElement('input');
   input.type=q.multi?'checkbox':'radio';input.name='q'+q.n;input.value=letter;
   if(q.multi)input.checked=(state.answers[q.n]||[]).includes(letter);
   else input.checked=state.answers[q.n]===letter;
   input.addEventListener('change',()=>{
     if(q.multi){
       let arr=[...(state.answers[q.n]||[])];
       if(input.checked){
         if(arr.length>=q.multi){input.checked=false;return;}
         arr.push(letter);
       }else arr=arr.filter(x=>x!==letter);
       saveAnswer(q.n,arr);
     }else saveAnswer(q.n,letter);
   });
   const b=document.createElement('b');b.textContent=letter+'.';
   const s=document.createElement('span');s.textContent=text;
   label.append(input,b,s);box.append(label);
 });
 return box;
}
function makeBlock(title,instruction){
 const b=document.createElement('section');b.className='block';
 const r=document.createElement('div');r.className='range';r.textContent=title;b.append(r);
 if(instruction){const i=document.createElement('div');i.className='instruction';i.textContent=instruction;b.append(i);}
 return b;
}
function renderPart(){
 document.querySelectorAll('#parts button').forEach(b=>b.classList.toggle('active',+b.dataset.part===state.part));
 document.getElementById('audioTitle').textContent='Part '+state.part+' Audio';
 document.getElementById('audio').src='audio/part'+state.part+'.mp3';
 const c=document.getElementById('content');c.innerHTML='';
 const h=document.createElement('div');h.className='heading';
 h.innerHTML='<h1>Section '+state.part+' — '+SECTION_TEXT[state.part]+'</h1>';
 c.append(h);
 if(state.part===1)renderP1(c);
 if(state.part===2)renderP2(c);
 if(state.part===3)renderP3(c);
 if(state.part===4)renderP4(c);
 updateNav();updateCount();
}
function renderP1(c){
 const b=makeBlock('Section 1 — Questions 1–10','Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.');
 const table=document.createElement('table');table.className='form';
 table.innerHTML='<tr><th colspan="2">PHONE INTERVIEW</th></tr>'+
 '<tr><td>Name</td><td>John Murphy</td></tr>'+
 '<tr><td><i>Example: Position applying for</i></td><td><u>Lifeguard</u></td></tr>';
 const rows=[
 ['Street address:', '45 ',1,' Court'],
 ['Contact phone number:', '',2,''],
 ['Current part-time job:', '',3,''],
 ['Previous job at Ridgemont High School','',4,''],
 ['Additional relevant work experience:','',5,''],
 ['Relevant skills/qualifications:','CPR certification & ',6,''],
 ['CPR certification expiration date:','',7,''],
 ['Preferred weekly shift:','',8,''],
 ['Time available to start work:','',9,''],
 ['Advertisement source:','',10,'']
 ];
 rows.forEach(r=>{
   const tr=table.insertRow();tr.insertCell().textContent=r[0];
   const td=tr.insertCell();td.append(document.createTextNode(r[1]),textInput(r[2]),document.createTextNode(r[3]));
 });
 b.append(table);c.append(b);
}
function renderP2(c){
 const b=makeBlock('Questions 11–20','Choose the correct letter, A, B or C.');
 TEST[2].forEach(q=>{
   const d=document.createElement('div');d.className='q';
   d.innerHTML='<b>'+q.n+'.</b> '+q.p;
   d.append(radioOptions(q));b.append(d);
 });
 c.append(b);
}
function renderP3(c){
 const b=makeBlock('Questions 21–23','Choose the correct letter, A, B or C.');
 TEST[3].slice(0,3).forEach(q=>{
   const d=document.createElement('div');d.className='q';
   d.innerHTML='<b>'+q.n+'.</b> '+q.p;d.append(radioOptions(q));b.append(d);
 });
 c.append(b);
 const b2=makeBlock('Questions 24–30','What problems do the speakers identify for this project? Choose SEVEN answers from the box and write the letters A–G next to questions 24–30.');
 const box=document.createElement('div');box.className='matchBox';
 Object.entries(TEST[3][3].o).forEach(([l,t])=>{
   const d=document.createElement('div');d.innerHTML='<b>'+l+'</b> '+t;box.append(d);
 });
 b2.append(box);
 const grid=document.createElement('div');grid.className='matchGrid';
 TEST[3].slice(3).forEach(q=>{
   const row=document.createElement('div');row.className='matchRow';
   row.innerHTML='<b>'+q.n+'.</b> '+q.p+' ';
   const s=document.createElement('select');s.className='select-answer';
   s.innerHTML='<option value="">Select</option>'+Object.keys(q.o).map(x=>'<option>'+x+'</option>').join('');
   s.value=state.answers[q.n]||'';
   s.addEventListener('change',e=>saveAnswer(q.n,e.target.value));
   row.append(s);grid.append(row);
 });
 b2.append(grid);c.append(b2);
}
function renderP4(c){
 const b=makeBlock('Section 4 — Questions 31–40','Complete the notes below. Write NO MORE THAN THREE WORDS for each answer.');
 const h=document.createElement('h2');h.textContent='GIVING A SPEECH';h.style.textAlign='center';b.append(h);
 const groups=[
  ['Reasons for nervousness',[31,32]],
  ['How to prepare a quality speech',[33,34]],
  ["Do's and Don'ts",[35,36,37,38,39,40]]
 ];
 groups.forEach(g=>{
   const h4=document.createElement('h3');h4.textContent=g[0];b.append(h4);
   g[1].forEach(n=>{
     const q=getQ(n),d=document.createElement('div');d.className='q';
     d.innerHTML='<b>'+n+'.</b> '+q.p+' ';
     d.append(textInput(n));
     b.append(d);
   });
 });
 c.append(b);
}
function updateNav(){
 const n=document.getElementById('questionNav');n.innerHTML='';
 for(let i=1;i<=40;i++){
   const b=document.createElement('button');b.className='qnav'+(answered(i)?' answered':'');b.textContent=i;
   b.onclick=()=>{const p=i<=10?1:i<=20?2:i<=30?3:4;if(state.part!==p){state.part=p;renderPart();}window.scrollTo({top:0,behavior:'smooth'});};
   n.append(b);
 }
}
function updateCount(){document.getElementById('answeredCount').textContent=Array.from({length:40},(_,i)=>i+1).filter(answered).length;}
function correct(n){
 const q=getQ(n),v=state.answers[n];
 if(q.multi){
   const got=(v||[]).map(norm).sort(),key=q.a.map(norm).sort();
   return got.length===key.length&&got.every((x,i)=>x===key[i]);
 }
 return q.a.some(a=>norm(v)===norm(a));
}
function band(s){return s>=39?9:s>=37?8.5:s>=35?8:s>=32?7.5:s>=30?7:s>=26?6.5:s>=23?6:s>=18?5.5:s>=16?5:s>=13?4.5:s>=10?4:s>=8?3.5:s>=6?3:s>=4?2.5:s===3?2:s===2?1.5:s===1?1:0;}
function finishTest(){
 state.finished=true;
 document.getElementById('confirmModal').classList.add('hidden');
 document.getElementById('topbar').classList.add('hidden');
 document.getElementById('parts').classList.add('hidden');
 document.getElementById('testLayout').classList.add('hidden');
 document.getElementById('footer').classList.add('hidden');
 document.getElementById('results').classList.remove('hidden');
 let score=0,unanswered=0;
 for(let n=1;n<=40;n++){if(correct(n))score++;if(!answered(n))unanswered++;}
 document.getElementById('scoreText').textContent=score+'/40';
 document.getElementById('bandText').textContent=band(score).toFixed(1);
 document.getElementById('correctText').textContent=score;
 document.getElementById('wrongText').textContent=40-score;
 document.getElementById('unansweredText').textContent=unanswered;
 document.getElementById('accuracyText').textContent=Math.round(score/40*100)+'%';
 renderPartScores();renderReview();
}
function renderPartScores(){
 const box=document.getElementById('partScores');box.innerHTML='';
 [[1,1,10],[2,11,20],[3,21,30],[4,31,40]].forEach(([part,start,end])=>{
   let score=0;for(let n=start;n<=end;n++)if(correct(n))score++;
   const card=document.createElement('div');card.className='partCard';
   card.innerHTML='<div class="scoreLine"><b>Part '+part+'</b><b>'+score+'/10</b></div>'+
     '<div class="scoreBig">'+score+' correct</div>'+
     '<div class="bar"><i style="width:'+score*10+'%"></i></div>';
   box.append(card);
 });
}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function answerDisplay(n){
 const v=state.answers[n];return Array.isArray(v)?v.join(', '):(v&&String(v).trim()?v:'—');
}
function renderReview(){
 const box=document.getElementById('review');box.innerHTML='';
 for(let n=1;n<=40;n++){
   const good=correct(n);if(state.filter==='wrong'&&good)continue;
   const q=getQ(n),d=document.createElement('div');d.className='reviewItem '+(good?'good':'bad');
   d.innerHTML='<div class="reviewHead"><b>'+n+'. '+esc(q.p)+'</b><span class="status">'+(good?'✓ Correct':'✗ Incorrect')+'</span></div>'+
     '<div class="answerLine"><label>Your answer</label><span>'+esc(answerDisplay(n))+'</span></div>'+
     (good?'':'<div class="answerLine"><label>Correct answer</label><span class="correctAnswer">'+esc(q.a.join(' / '))+'</span></div>');
   box.append(d);
 }
}
document.querySelectorAll('#parts button').forEach(b=>b.onclick=()=>{state.part=+b.dataset.part;renderPart();});
document.getElementById('audioFile').addEventListener('change',e=>{if(e.target.files[0])document.getElementById('audio').src=URL.createObjectURL(e.target.files[0]);});
document.getElementById('finishBtn').onclick=()=>document.getElementById('confirmModal').classList.remove('hidden');
document.getElementById('continueBtn').onclick=()=>document.getElementById('confirmModal').classList.add('hidden');
document.getElementById('confirmFinishBtn').onclick=finishTest;
document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.filter=b.dataset.filter;renderReview();});
document.getElementById('printBtn').onclick=()=>window.print();
document.getElementById('restartBtn').onclick=()=>{localStorage.removeItem('ieltsSpeechTestAnswers');location.reload();};
setInterval(()=>{
 if(state.finished)return;
 if(state.seconds>0)state.seconds--;
 const m=String(Math.floor(state.seconds/60)).padStart(2,'0'),s=String(state.seconds%60).padStart(2,'0');
 document.getElementById('timer').textContent=m+':'+s;
 if(state.seconds===0)finishTest();
},1000);
renderPart();
