const ANSWERS={
1:['32'],2:['electricity'],3:['internet'],4:['bus'],5:['hooper'],6:['B','D','E'],7:['B','D','E'],8:['B','D','E'],9:['C'],10:['B'],
11:['24','twenty-four'],12:['18','eighteen'],13:['5','five'],14:['19','nineteen'],15:['family ticket'],16:['107'],17:['online'],18:['confirmation email','confirmation e-mail'],19:['by telephone'],20:['in person'],
21:['seven weeks'],22:['five people'],23:["grab people's attention","grab people’s attention"],24:['A','D','E','F','H'],25:['A','D','E','F','H'],26:['A','D','E','F','H'],27:['A','D','E','F','H'],28:['A','D','E','F','H'],29:['ground floor'],30:['assignment'],
31:['A'],32:['B'],33:['C'],34:['C'],35:['C'],36:['rammed earth'],37:['susceptible to erosion'],38:['frequent sandstorms'],39:['eyesight'],40:['architectural feats']
};
const PARTS=[{id:1,start:1,end:10,audio:'audio/part1.mp3'},{id:2,start:11,end:20,audio:'audio/part2.mp3'},{id:3,start:21,end:30,audio:'audio/part3.mp3'},{id:4,start:31,end:40,audio:'audio/part4.mp3'}];
let part=0,answers={},finished=false,timeLeft=1800,audioURL=null;
const $=id=>document.getElementById(id);
function norm(v){return String(v??'').trim().toLowerCase().replace(/[’]/g,"'").replace(/\s+/g,' ')}
function setAnswer(q,v){answers[q]=v;updateNav();updateCount()}
function isAnswered(q){const v=answers[q];return Array.isArray(v)?v.length>0:String(v??'').trim()!==''}
function current(){return PARTS[part]}
function updateCount(){let c=0;for(let q=current().start;q<=current().end;q++)if(isAnswered(q))c++;$('answeredCount').textContent=c}
function updateNav(){document.querySelectorAll('.q-nav').forEach(b=>{const q=+b.dataset.q;b.classList.toggle('answered',isAnswered(q));b.classList.toggle('active',q>=current().start&&q<=current().end)})}
function buildNav(){const n=$('questionNav');n.innerHTML='';for(let q=current().start;q<=current().end;q++){const b=document.createElement('button');b.className='q-nav';b.dataset.q=q;b.textContent=q;b.onclick=()=>{const el=document.querySelector(`[data-q-anchor="${q}"]`);if(el)el.scrollIntoView({behavior:'smooth',block:'center'});};n.appendChild(b)}updateNav()}
function showPart(){document.querySelectorAll('.part-content').forEach((x,i)=>x.classList.toggle('hidden-part',i!==part));$('partLabel').textContent=`Part ${part+1}`;$('partNumber').textContent=part+1;$('progressText').textContent=`Questions ${current().start}–${current().end}`;$('audioPart').textContent=part+1;$('audioSource').src=current().audio;$('audioPlayer').load();$('audioStatus').textContent=`Using ${current().audio} if available.`;$('prevPart').disabled=part===0;$('nextPart').textContent=part===3?'Finish test':'Next part ›';document.querySelectorAll('.part-content:not(.hidden-part) [data-q]').forEach(el=>{const q=+el.dataset.q;el.dataset.qAnchor=q});buildNav();updateCount();window.scrollTo({top:0,behavior:'smooth'})}
function collect(){document.querySelectorAll('[data-q]').forEach(el=>{const q=+el.dataset.q;if(el.matches('input[data-q]'))answers[q]=el.value;});for(const group of document.querySelectorAll('[data-multi-group]')){const q=+group.dataset.multiGroup;const vals=[...group.querySelectorAll('input:checked')].map(x=>x.value);answers[q]=vals;if(q===6){answers[7]=vals;answers[8]=vals}if(q===24){answers[25]=vals;answers[26]=vals;answers[27]=vals;answers[28]=vals}}for(let q=1;q<=40;q++){const r=document.querySelector(`input[name="q${q}"]:checked`);if(r)answers[q]=r.value}}
function wire(){document.querySelectorAll('input[data-q]').forEach(i=>i.addEventListener('input',()=>setAnswer(+i.dataset.q,i.value)));document.querySelectorAll('input[type=radio]').forEach(i=>i.addEventListener('change',()=>{const box=i.closest('.mc-question');if(box&&box.dataset.q)setAnswer(+box.dataset.q,i.value);}));document.querySelectorAll('[data-multi-group]').forEach(g=>g.addEventListener('change',e=>{if(!e.target.matches('input'))return;const max=g.dataset.multiGroup==='6'?3:5;let vals=[...g.querySelectorAll('input:checked')];if(vals.length>max){e.target.checked=false;vals=[...g.querySelectorAll('input:checked')]}const a=vals.map(x=>x.value);const q=+g.dataset.multiGroup;setAnswer(q,a);if(q===6){answers[7]=a;answers[8]=a}if(q===24){answers[25]=a;answers[26]=a;answers[27]=a;answers[28]=a}updateNav();updateCount()}));}
function mark(q){const a=answers[q];const exp=ANSWERS[q];if(Array.isArray(exp)&&exp.length>1&&['6','7','8','24','25','26','27','28'].includes(String(q))){if(!Array.isArray(a))return false;return [...a].sort().join('|')===exp.slice().sort().join('|')}return exp.some(x=>norm(x)===norm(a))}
function band(s){if(s>=39)return 9;if(s>=37)return 8.5;if(s>=35)return 8;if(s>=32)return 7.5;if(s>=30)return 7;if(s>=26)return 6.5;if(s>=23)return 6;if(s>=18)return 5.5;if(s>=16)return 5;if(s>=13)return 4.5;if(s>=10)return 4;if(s>=8)return 3.5;if(s>=6)return 3;if(s>=4)return 2.5;if(s>=3)return 2;if(s>=2)return 1.5;if(s>=1)return 1;return 0}
function finish(){
  collect();
  finished=true;
  let score=0;
  const rows=[];
  const partScores=[0,0,0,0];
  const partAnswered=[0,0,0,0];
  const wrong=[];
  for(let q=1;q<=40;q++){
    const ok=mark(q);
    if(ok){score++;partScores[Math.floor((q-1)/10)]++;}
    if(isAnswered(q)) partAnswered[Math.floor((q-1)/10)]++;
    const given=Array.isArray(answers[q])?answers[q].join(', '):(answers[q]||'—');
    if(!ok) wrong.push({q,given,correct:ANSWERS[q].join(', ')});
    rows.push(`<div class="review-item ${ok?'is-correct':'is-wrong'}"><div class="review-q">${q}</div><div class="review-status">${ok?'✓':'✗'}</div><div class="review-answer"><span class="answer-label">Your answer</span><strong>${escape(given)}</strong>${ok?'':`<span class="correct-label">Correct answer: <strong>${escape(ANSWERS[q].join(', '))}</strong></span>`}</div></div>`);
  }
  const answered=Object.keys(answers).length;
  const unanswered=40-answered;
  const pct=Math.round(score/40*100);
  const circumference=2*Math.PI*48;
  const dash=(score/40*circumference).toFixed(1);
  const partCards=partScores.map((s,i)=>`<div class="part-score-card"><div class="part-score-top"><span>Part ${i+1}</span><strong>${s}/10</strong></div><div class="mini-progress"><span style="width:${s*10}%"></span></div><small>${partAnswered[i]}/10 answered</small></div>`).join('');
  const status=score>=30?'Strong result':score>=23?'Good progress':score>=16?'Keep practising':'More practice recommended';
  $('resultArea').innerHTML=`
    <div class="results-page">
      <div class="results-heading">
        <div><span class="results-kicker">TEST COMPLETE</span><h1>Your Listening Result</h1><p>Review your score and check every question below.</p></div>
        <button class="secondary-btn print-btn" onclick="window.print()">Print result</button>
      </div>
      <section class="result-hero">
        <div class="score-ring" style="--progress:${dash}px;--circumference:${circumference.toFixed(1)}px"><div><strong>${score}</strong><span>/ 40</span></div></div>
        <div class="hero-copy"><span class="status-pill">${status}</span><h2>Estimated IELTS Listening Band <strong>${band(score)}</strong></h2><p>${pct}% correct · ${answered}/40 answered · ${wrong.length} incorrect</p><div class="hero-note">This is an approximate practice conversion. Official IELTS band boundaries can vary by test.</div></div>
      </section>
      <section class="result-summary">
        <div><strong>${score}</strong><span>Correct</span></div><div><strong>${wrong.length}</strong><span>Incorrect</span></div><div><strong>${unanswered}</strong><span>Unanswered</span></div><div><strong>${pct}%</strong><span>Accuracy</span></div>
      </section>
      <section class="result-section"><div class="section-title"><div><h2>Part-by-part score</h2><p>See where you performed best.</p></div></div><div class="part-score-grid">${partCards}</div></section>
      <section class="result-section"><div class="section-title"><div><h2>Question review</h2><p>Correct answers are shown for questions you missed.</p></div><div class="legend"><span><i class="legend-dot correct-dot"></i>Correct</span><span><i class="legend-dot wrong-dot"></i>Incorrect</span></div></div><div class="review-grid">${rows.join('')}</div></section>
      <div class="results-actions"><button class="primary-btn" onclick="location.reload()">Start again</button><button class="secondary-btn" onclick="window.print()">Print / Save PDF</button></div>
    </div>`;
  document.querySelectorAll('.part-content').forEach(x=>x.classList.add('hidden-part'));
  $('audioPlayer').pause();
  $('submitBtn').disabled=true;
  $('nextPart').disabled=true;
  $('prevPart').disabled=true;
  document.querySelector('.question-panel').style.display='none';
  document.querySelector('.audio-card').style.display='none';
  document.querySelector('.instructions-bar').style.display='none';
  document.querySelector('.bottom-bar').style.display='none';
  document.body.classList.add('results-mode');
  $('resultArea').scrollIntoView({behavior:'smooth',block:'start'});
}
function escape(v){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
$('audioFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;if(audioURL)URL.revokeObjectURL(audioURL);audioURL=URL.createObjectURL(f);$('audioPlayer').src=audioURL;$('audioStatus').textContent=`Loaded: ${f.name}`});
$('prevPart').onclick=()=>{if(part>0){collect();part--;showPart()}};
$('nextPart').onclick=()=>{if(part<3){collect();part++;showPart()}else finish()};
$('submitBtn').onclick=finish;
let last=Date.now();setInterval(()=>{if(finished)return;const now=Date.now(),d=Math.floor((now-last)/1000);last=now;if(d>0){timeLeft=Math.max(0,timeLeft-d);if(timeLeft===0){finish();return}}$('timer').textContent=`${String(Math.floor(timeLeft/60)).padStart(2,'0')}:${String(timeLeft%60).padStart(2,'0')}`},250);
wire();showPart();
