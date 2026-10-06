/* IELTS Reading - local only */

const CONFIG={
    TEST_COUNT:50,
    TEST_FOLDER:"./",
    VOCABULARY_FILE:"./vocabulary.json",
    DEFAULT_DURATION:60
};

let currentTest=null;
let currentTestNumber=null;
let currentPartIndex=0;
let studentAnswers={};
let vocabulary={};
let timerInterval=null;
let remainingSeconds=0;
let testStartTime=null;
let testElapsedSeconds=0;
let testStarted=false;
let testSubmitted=false;
let scoreData=null;
let submittedAnswers={};
let selectedDragOption=null;

document.addEventListener("DOMContentLoaded",async()=>{
    injectDragDropStyles();
    setupGlobalEvents();
    await loadVocabulary();
    showDashboard();
});

function setupGlobalEvents(){
    addClick("startTestButton",startTest);
    addClick("backToDashboardButton",showDashboard);
    addClick("testBackButton",confirmExitTest);
    addClick("submitTestButton",confirmSubmitTest);
    addClick("previousPartButton",previousPart);
    addClick("nextPartButton",nextPart);
    addClick("returnDashboardButton",showDashboard);
    addClick("retakeTestButton",()=>currentTest&&startTest());
    addClick("closeVocabularyPopup",closeVocabularyPopup);
    addClick("closeConfirmModal",closeConfirmModal);
    addClick("cancelSubmitButton",closeConfirmModal);
    addClick("confirmSubmitButton",submitTest);
    document.addEventListener("click",e=>{
        if(e.target.closest(".vocabulary-word"))return;
        const popup=document.getElementById("vocabularyPopup");
        if(popup&&popup.style.display!=="none"&&!popup.contains(e.target)){
            closeVocabularyPopup();
        }
    });
}

function addClick(id,handler){
    const el=document.getElementById(id);
    if(el)el.addEventListener("click",handler);
}

async function showDashboard(){
    stopTimer();
    testStarted=false;
    testSubmitted=false;
    showScreen("dashboardScreen");
    await renderTestCards();
}

async function renderTestCards(){
    const box=document.getElementById("testCards");
    if(!box)return;
    box.innerHTML="";
    const checks=[];
    for(let i=1;i<=CONFIG.TEST_COUNT;i++){
        checks.push(
            fetch(`${CONFIG.TEST_FOLDER}Test${i}.json?${Date.now()}`,{
                method:"HEAD",
                cache:"no-store"
            })
            .then(r=>({number:i,exists:r.ok}))
            .catch(()=>({number:i,exists:false}))
        );
    }
    const results=await Promise.all(checks);
    results.forEach(result=>{
        if(!result.exists)return;
        const i=result.number;
        const card=document.createElement("div");
        card.className="test-card";
        card.dataset.testNumber=i;
        card.innerHTML=`
            <div class="test-card-number">Test ${i}</div>
            <h3>IELTS Reading Test ${i}</h3>
            <div class="test-card-info">
                <span>60 minutes</span>
                <span>40 questions</span>
            </div>
        `;
        card.addEventListener("click",()=>openTest(i));
        box.appendChild(card);
    });
    if(results.every(r=>!r.exists)){
        box.innerHTML=`
            <div style="padding:20px;text-align:center;color:#777">
                No IELTS tests are available yet.
            </div>
        `;
    }
}

async function openTest(testNumber){
    setLoading(true,"Loading test...");
    try{
        const url=`${CONFIG.TEST_FOLDER}Test${testNumber}.json?${Date.now()}`;
        const response=await fetch(url,{cache:"no-store"});
        if(!response.ok){
            throw new Error(`Test${testNumber}.json could not be loaded. HTTP ${response.status}`);
        }
        const data=await response.json();
        validateTest(data);
        currentTest=data;
        currentTestNumber=testNumber;
        currentPartIndex=0;
        studentAnswers={};
        testSubmitted=false;
        loadSavedAnswers();
        showTestIntroduction();
    }catch(error){
        console.error("TEST LOAD ERROR:",error);
        showToast(error.message||"Could not load test.");
    }finally{
        setLoading(false);
    }
}

function validateTest(test){
    if(!test||!Array.isArray(test.parts)||!test.parts.length){
        throw new Error("Invalid test JSON.");
    }
    test.parts.forEach((part,index)=>{
        if(!part.passage){
            throw new Error(`Part ${index+1} is missing passage.`);
        }
        if(!Array.isArray(part.questionGroups)){
            part.questionGroups=[];
        }
        part.questionGroups.forEach(group=>{
            if(!Array.isArray(group.questions))group.questions=[];
            if(!Array.isArray(group.blanks))group.blanks=[];
        });
    });
}

function showTestIntroduction(){
    showScreen("introScreen");
    setText("introTestNumber",currentTest.testId||`Test ${currentTestNumber}`);
    setText("introTitle",currentTest.title||`IELTS Reading Test ${currentTestNumber}`);
    setText("introDuration",`${currentTest.duration||CONFIG.DEFAULT_DURATION} minutes`);
    setText("introQuestions",countTotalQuestions());
    setText("introParts",currentTest.parts.length);
}

function startTest(){
    if(!currentTest)return;
    studentAnswers={};
    loadSavedAnswers();
    currentPartIndex=0;
    testStarted=true;
    testSubmitted=false;
    testStartTime=Date.now();
    remainingSeconds=(Number(currentTest.duration)||CONFIG.DEFAULT_DURATION)*60;
    testElapsedSeconds=0;
    showScreen("testScreen");
    renderCurrentPart();
    startTimer();
}

function startTimer(){
    stopTimer();
    updateTimerDisplay();
    timerInterval=setInterval(()=>{
        remainingSeconds--;
        updateTimerDisplay();
        if(remainingSeconds<=0){
            remainingSeconds=0;
            stopTimer();
            autoSubmitTest();
        }
    },1000);
}

function stopTimer(){
    if(timerInterval){
        clearInterval(timerInterval);
        timerInterval=null;
    }
}

function updateTimerDisplay(){
    const ids=["timer","timerDisplay","testTimer"];
    for(const id of ids){
        const el=document.getElementById(id);
        if(el){
            el.textContent=formatTime(remainingSeconds);
            break;
        }
    }
}

function renderCurrentPart(){
    if(!currentTest)return;
    const part=currentTest.parts[currentPartIndex];
    if(!part)return;
    setText("testHeaderTitle",currentTest.title||`IELTS Reading Test ${currentTestNumber}`);
    setText("testHeaderPart",`Part ${part.partNumber||currentPartIndex+1}`);
    setText("passagePartLabel",`Part ${part.partNumber||currentPartIndex+1}`);
    setText("passageTitle",part.passage.title||"");
    setText("questionsPartLabel",`Questions ${questionRangeForPart(part)}`);
    setText("partIndicator",`Part ${currentPartIndex+1} of ${currentTest.parts.length}`);
    renderPassage(part.passage);
    renderQuestions(part);
    renderQuestionNavigator();
    updatePartButtons();
    scrollTestPanelsToTop();
}

function questionRangeForPart(part){
    const numbers=[];
    (part.questionGroups||[]).forEach(group=>{
        (group.questions||[]).forEach(q=>{
            const n=Number(q.number);
            if(Number.isFinite(n))numbers.push(n);
        });
        (group.blanks||[]).forEach(q=>{
            const n=Number(q.number);
            if(Number.isFinite(n))numbers.push(n);
        });
    });
    if(!numbers.length)return"";
    return`${Math.min(...numbers)}-${Math.max(...numbers)}`;
}

function renderPassage(passage){
    const box=document.getElementById("passageContent");
    if(!box)return;
    box.innerHTML=(passage.paragraphs||[]).map(p=>`
        <p class="passage-paragraph">
            <span class="paragraph-label">${escapeHTML(p.id||"")}</span>
            ${highlightVocabulary(p.text||"")}
        </p>
    `).join("");
    box.querySelectorAll(".vocabulary-word").forEach(el=>{
        el.addEventListener("click",e=>{
            e.stopPropagation();
            showVocabularyPopup(el.dataset.word);
        });
    });
}

async function loadVocabulary(){
    vocabulary={};
    try{
        const response=await fetch(
            `${CONFIG.VOCABULARY_FILE}?${Date.now()}`,
            {cache:"no-store"}
        );
        if(!response.ok)return;
        const data=await response.json();
        vocabulary=data.words||data||{};
    }catch(error){
        vocabulary={};
    }
}

function highlightVocabulary(text){
    if(!vocabulary||!Object.keys(vocabulary).length){
        return escapeHTML(text);
    }
    let result=escapeHTML(text);
    const words=Object.keys(vocabulary).sort((a,b)=>b.length-a.length);
    for(const word of words){
        const regex=new RegExp(
            `(?<![A-Za-z])(${escapeRegExp(word)})(?![A-Za-z])`,
            "gi"
        );
        result=result.replace(regex,match=>`
            <span class="vocabulary-word" data-word="${escapeAttribute(match)}">${match}</span>
        `);
    }
    return result;
}

function showVocabularyPopup(word){
    if(!vocabulary||!Object.keys(vocabulary).length)return;
    const key=Object.keys(vocabulary).find(
        item=>item.toLowerCase()===String(word).toLowerCase()
    );
    if(!key)return;
    const item=vocabulary[key]||{};
    const popup=document.getElementById("vocabularyPopup");
    if(!popup)return;
    setText("vocabularyWord",word);
    setText("vocabularyMeaning",item.meaning||"Meaning not available.");
    setText("vocabularySimpleMeaning",item.simpleMeaning||"");
    popup.style.display="block";
}

function closeVocabularyPopup(){
    const popup=document.getElementById("vocabularyPopup");
    if(popup)popup.style.display="none";
}

function renderQuestions(part){
    const box=document.getElementById("questionsContent");
    if(!box)return;
    box.innerHTML="";
    (part.questionGroups||[]).forEach(group=>{
        const wrapper=document.createElement("div");
        wrapper.className="question-group";
        wrapper.innerHTML=`
            ${group.questionRange?
                `<h3 class="question-group-title">Questions ${escapeHTML(group.questionRange)}</h3>`:""}
            ${group.instructions?
                `<p class="question-instructions">${escapeHTML(group.instructions)}</p>`:""}
        `;
        const content=document.createElement("div");
        wrapper.appendChild(content);
        const type=normalizeQuestionType(group.type);
        switch(type){
            case"true_false_not_given":
                renderTrueFalseNotGiven(content,group);
                break;
            case"yes_no_not_given":
                renderYesNoNotGiven(content,group);
                break;
            case"fill_blank":
                renderFillBlank(content,group);
                break;
            case"summary_completion":
                renderSummaryCompletion(content,group);
                break;
            case"multiple_choice":
                renderMultipleChoice(content,group);
                break;
            case"multiple_choice_multiple":
                renderMultipleChoiceMultiple(content,group);
                break;
            case"matching_headings":
                renderMatchingHeadings(content,group);
                break;
            case"matching_information":
                renderMatchingInformation(content,group);
                break;
            case"matching_features":
                renderMatchingFeatures(content,group);
                break;
            case"answer_box":
                renderAnswerBox(content,group);
                break;
            default:
                renderUnsupportedGroup(content,group);
        }
        box.appendChild(wrapper);
    });
    restoreAnswers();
}

function normalizeQuestionType(type){
    return String(type||"")
        .trim()
        .toLowerCase()
        .replace(/-/g,"_")
        .replace(/\s+/g,"_");
}

function renderTrueFalseNotGiven(box,group){
    (group.questions||[]).forEach(q=>{
        box.appendChild(
            createQuestionItem(q,["TRUE","FALSE","NOT GIVEN"])
        );
    });
}

function renderYesNoNotGiven(box,group){
    (group.questions||[]).forEach(q=>{
        box.appendChild(
            createQuestionItem(q,["YES","NO","NOT GIVEN"])
        );
    });
}

function renderFillBlank(box,group){
    (group.questions||[]).forEach(q=>{
        const item=createQuestionItem(q);
        const control=item.querySelector(".question-control");
        control.innerHTML=`
            <input
                type="text"
                class="answer-input"
                data-question-number="${q.number}"
                autocomplete="off"
                spellcheck="false"
                placeholder="Type your answer"
            >
        `;
        attachInputListener(control);
        box.appendChild(item);
    });
}

function renderSummaryCompletion(box,group){
    const container=document.createElement("div");
    container.className="drag-summary-container";
    const blanks=group.blanks?.length?group.blanks:group.questions||[];
    let options=getQuestionOptions(
        null,
        group,
        ["options","choices","answerOptions","words","wordBank"]
    );
    if(!options.length){
        options=blanks
            .map(b=>b.answer)
            .filter(a=>a!==undefined&&a!==null&&String(a).trim()!=="");
    }
    options=uniqueOptions(options);

    const bank=document.createElement("div");
    bank.className="drag-summary-bank";
    bank.innerHTML=`<div class="drag-bank-title">Given words:</div>`;

    const optionContainer=document.createElement("div");
    optionContainer.className="drag-summary-options";

    options.forEach((option,index)=>{
        const normalized=normalizeOption(option);
        if(!normalized.text)return;
        const word=document.createElement("div");
        word.className="summary-drag-word";
        word.draggable=true;
        word.dataset.value=normalized.value||normalized.text;
        word.dataset.text=normalized.text;
        word.dataset.dragId=`summary-word-${Date.now()}-${index}`;
        word.textContent=normalized.text;
        setupDragOption(word);
        optionContainer.appendChild(word);
    });

    bank.appendChild(optionContainer);
    container.appendChild(bank);

    const summary=document.createElement("div");
    summary.className="drag-summary-text";

    const text=group.summary||group.text||group.passageText||"";
    let html=escapeHTML(text);

    html=html.replace(
        /\{\{(\d+)\}\}|\{(\d+)\}|\[(\d+)\]/g,
        (match,a,b,c)=>{
            const number=Number(a||b||c);
            const blank=blanks.find(x=>Number(x.number)===number);
            return blank?createSummaryDropZone(number):match;
        }
    );

    let blankIndex=0;
    html=html.replace(/_{2,}/g,()=>{
        const blank=blanks[blankIndex++];
        return blank?createSummaryDropZone(blank.number):"________";
    });

    summary.innerHTML=html;
    container.appendChild(summary);

    const zones=summary.querySelectorAll(".summary-drop-zone");

    if(zones.length===0&&blanks.length){
        const fallback=document.createElement("div");
        fallback.className="summary-fallback";
        blanks.forEach(blank=>{
            const row=document.createElement("div");
            row.className="summary-fallback-row";
            row.innerHTML=`
                <strong>${blank.number}.</strong>
                ${createSummaryDropZone(blank.number)}
            `;
            fallback.appendChild(row);
        });
        container.appendChild(fallback);
    }

    box.appendChild(container);

    container.querySelectorAll(".summary-drop-zone").forEach(zone=>{
        setupDropZone(zone,Number(zone.dataset.questionNumber));
    });

    restoreDragDropAnswers();
}

function createSummaryDropZone(questionNumber){
    return`
        <span
            class="summary-drop-zone"
            data-question-number="${questionNumber}"
        >
            <span class="summary-drop-placeholder">Drop answer</span>
        </span>
    `;
}

function renderMultipleChoice(box,group){
    (group.questions||[]).forEach(q=>{
        const item=createQuestionItem(q);
        const control=item.querySelector(".question-control");
        const options=q.options||group.options||[];
        control.innerHTML=createSelectOptions(options);
        const select=control.querySelector("select");
        if(select){
            select.dataset.questionNumber=q.number;
            select.addEventListener("change",handleAnswerChange);
        }
        box.appendChild(item);
    });
}

function renderMultipleChoiceMultiple(box,group){
    (group.questions||[]).forEach(q=>{
        const item=createQuestionItem(q);
        const control=item.querySelector(".question-control");
        const options=q.options||group.options||[];
        control.innerHTML=createSelectOptions(options);
        const select=control.querySelector("select");
        if(select){
            select.dataset.questionNumber=q.number;
            select.addEventListener("change",handleAnswerChange);
        }
        box.appendChild(item);
    });
}

function renderMatchingHeadings(box,group){
    let options=group.options||group.headings||[];
    if(!Array.isArray(options))options=[];
    renderMatchingSelects(box,group,options);
}

function renderMatchingInformation(box,group){
    let options=group.options||group.letters||group.paragraphs||[];
    if(!Array.isArray(options))options=[];
    if(!options.length)options=getCurrentPassageOptions();
    renderMatchingSelects(box,group,options);
}

function renderMatchingFeatures(box,group){
    const container=document.createElement("div");
    container.className="drag-matching-container";

    let options=getQuestionOptions(
        null,
        group,
        ["options","choices","answerOptions","features","letters"]
    );

    if(!options.length)options=getCurrentPassageOptions();
    options=uniqueOptions(options);

    const bank=document.createElement("div");
    bank.className="drag-option-bank";
    bank.innerHTML=`
        <div class="drag-bank-title">
            Drag the correct paragraph/topic:
        </div>
    `;

    const optionsContainer=document.createElement("div");
    optionsContainer.className="drag-options";

    options.forEach((option,index)=>{
        const normalized=normalizeOption(option);
        if(!normalized.text)return;

        const draggable=document.createElement("div");
        draggable.className="drag-option";
        draggable.draggable=true;
        draggable.dataset.value=normalized.value;
        draggable.dataset.text=normalized.text;
        draggable.dataset.dragId=`feature-${Date.now()}-${index}`;
        draggable.innerHTML=`
            <span class="drag-option-handle">☰</span>
            <span>${escapeHTML(normalized.text)}</span>
        `;
        setupDragOption(draggable);
        optionsContainer.appendChild(draggable);
    });

    bank.appendChild(optionsContainer);
    container.appendChild(bank);

    const questionsContainer=document.createElement("div");
    questionsContainer.className="drag-questions";

    (group.questions||[]).forEach(q=>{
        const questionBox=document.createElement("div");
        questionBox.className="drag-question";
        questionBox.dataset.questionNumber=q.number;

        const dropZone=document.createElement("div");
        dropZone.className="drag-drop-zone";
        dropZone.dataset.questionNumber=q.number;
        dropZone.innerHTML=`
            <span class="drop-placeholder">
                Drag and drop answer here
            </span>
        `;

        setupDropZone(dropZone,q.number);

        const questionText=document.createElement("div");
        questionText.className="drag-question-text";
        questionText.innerHTML=`
            <span class="question-number">${q.number}.</span>
            ${escapeHTML(q.text||q.question||"")}
        `;

        questionBox.appendChild(dropZone);
        questionBox.appendChild(questionText);
        questionsContainer.appendChild(questionBox);
    });

    container.appendChild(questionsContainer);
    box.appendChild(container);
    restoreDragDropAnswers();
}

function setupDragOption(element){
    element.addEventListener("dragstart",event=>{
        selectedDragOption=element;
        event.dataTransfer.effectAllowed="copy";
        event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                value:element.dataset.value,
                text:element.dataset.text
            })
        );
        element.classList.add("dragging");
    });

    element.addEventListener("dragend",()=>{
        element.classList.remove("dragging");
    });

    element.addEventListener("click",()=>{
        document
            .querySelectorAll(
                ".drag-option.selected,.summary-drag-word.selected"
            )
            .forEach(item=>item.classList.remove("selected"));

        element.classList.add("selected");
        selectedDragOption=element;
    });
}

function setupDropZone(zone,questionNumber){
    zone.addEventListener("dragover",event=>{
        event.preventDefault();
        event.dataTransfer.dropEffect="copy";
        zone.classList.add("drag-over");
    });

    zone.addEventListener("dragleave",()=>{
        zone.classList.remove("drag-over");
    });

    zone.addEventListener("drop",event=>{
        event.preventDefault();
        zone.classList.remove("drag-over");

        const raw=event.dataTransfer.getData("text/plain");
        if(!raw)return;

        try{
            const data=JSON.parse(raw);
            placeDragAnswer(
                zone,
                questionNumber,
                data.value,
                data.text
            );
        }catch(error){
            console.error("Drag/drop error:",error);
        }
    });

    zone.addEventListener("click",()=>{
        if(!selectedDragOption)return;

        const option=selectedDragOption;

        placeDragAnswer(
            zone,
            questionNumber,
            option.dataset.value,
            option.dataset.text
        );

        option.classList.remove("selected");
        selectedDragOption=null;
    });
}

function placeDragAnswer(zone,questionNumber,value,text){
    if(!zone)return;

    studentAnswers[questionNumber]=value;

    zone.innerHTML=`
        <div class="dropped-answer">
            <span class="dropped-answer-text">
                ${escapeHTML(text)}
            </span>
            <button
                type="button"
                class="remove-dropped-answer"
                aria-label="Remove answer"
            >×</button>
        </div>
    `;

    zone.classList.add("has-answer");

    const removeButton=zone.querySelector(".remove-dropped-answer");

    if(removeButton){
        removeButton.addEventListener("click",event=>{
            event.stopPropagation();

            delete studentAnswers[questionNumber];

            zone.classList.remove("has-answer");

            zone.innerHTML=`
                <span class="drop-placeholder">
                    Drag and drop answer here
                </span>
            `;

            saveAnswersToStorage();
            updateQuestionNavigator();
        });
    }

    saveAnswersToStorage();
    updateQuestionNavigator();
}

function restoreDragDropAnswers(){
    document
        .querySelectorAll(".drag-drop-zone,.summary-drop-zone")
        .forEach(zone=>{
            const number=Number(zone.dataset.questionNumber);
            const saved=studentAnswers[number];

            if(
                saved===undefined||
                saved===null||
                String(saved).trim()===""
            ){
                return;
            }

            const option=findVisibleOption(saved);

            if(option){
                placeDragAnswer(
                    zone,
                    number,
                    option.value,
                    option.text
                );
            }
        });
}

function findVisibleOption(value){
    const target=normalizeAnswer(value);
    const elements=document.querySelectorAll(
        ".drag-option,.summary-drag-word"
    );

    for(const element of elements){
        const elementValue=normalizeAnswer(element.dataset.value);
        const elementText=normalizeAnswer(
            element.dataset.text||element.textContent
        );

        if(
            elementValue===target||
            elementText===target
        ){
            return{
                value:element.dataset.value||element.dataset.text,
                text:element.dataset.text||element.textContent.trim()
            };
        }
    }

    return{
        value:String(value),
        text:String(value)
    };
}

function renderMatchingSelects(box,group,options){
    (group.questions||[]).forEach(q=>{
        const item=createQuestionItem(q);
        const control=item.querySelector(".question-control");

        control.innerHTML=createSelectOptions(options);

        const select=control.querySelector("select");

        if(select){
            select.dataset.questionNumber=q.number;
            select.addEventListener("change",handleAnswerChange);
        }

        box.appendChild(item);
    });
}

function renderAnswerBox(box,group){
    (group.questions||[]).forEach(q=>{
        const item=createQuestionItem(q);
        const control=item.querySelector(".question-control");

        control.innerHTML=`
            <input
                type="text"
                class="answer-input"
                data-question-number="${q.number}"
                autocomplete="off"
            >
        `;

        attachInputListener(control);
        box.appendChild(item);
    });
}

function renderUnsupportedGroup(box,group){
    console.warn("Unsupported question type:",group.type);

    (group.questions||[]).forEach(q=>{
        const item=createQuestionItem(q);
        const control=item.querySelector(".question-control");

        control.innerHTML=`
            <input
                type="text"
                class="answer-input"
                data-question-number="${q.number}"
                autocomplete="off"
            >
        `;

        attachInputListener(control);
        box.appendChild(item);
    });
}

function createQuestionItem(question,radioOptions=null){
    const wrapper=document.createElement("div");

    wrapper.className="question";
    wrapper.dataset.questionNumber=question.number;

    wrapper.innerHTML=`
        <div class="question-text">
            <span class="question-number">
                ${question.number}.
            </span>
            ${escapeHTML(question.text||question.question||"")}
        </div>
        <div class="question-control"></div>
    `;

    const control=wrapper.querySelector(".question-control");

    if(Array.isArray(radioOptions)){
        control.innerHTML=radioOptions.map(option=>`
            <label class="option-item">
                <input
                    type="radio"
                    name="q${question.number}"
                    value="${escapeAttribute(option)}"
                    data-question-number="${question.number}"
                >
                <span>${escapeHTML(option)}</span>
            </label>
        `).join("");

        control.querySelectorAll("input").forEach(input=>{
            input.addEventListener("change",handleAnswerChange);
        });
    }

    return wrapper;
}

function getQuestionOptions(question,group,keys){
    if(question){
        for(const key of keys){
            if(
                Array.isArray(question[key])&&
                question[key].length
            ){
                return question[key];
            }
        }
    }

    if(group){
        for(const key of keys){
            if(
                Array.isArray(group[key])&&
                group[key].length
            ){
                return group[key];
            }
        }
    }

    return[];
}

function normalizeOption(option){
    if(option===undefined||option===null){
        return{value:"",text:""};
    }

    if(typeof option==="string"||typeof option==="number"){
        return{
            value:String(option),
            text:String(option)
        };
    }

    if(typeof option==="object"){
        const value=
            option.value??
            option.letter??
            option.id??
            option.key??
            option.code??
            option.text??
            option.label??
            option.name??
            "";

        const text=
            option.text??
            option.label??
            option.name??
            option.title??
            option.value??
            option.letter??
            option.id??
            option.key??
            option.code??
            "";

        return{
            value:String(value),
            text:String(text)
        };
    }

    return{value:"",text:""};
}

function uniqueOptions(options){
    const seen=new Set();
    const result=[];

    (options||[]).forEach(option=>{
        const normalized=normalizeOption(option);
        const key=normalizeAnswer(
            normalized.value||normalized.text
        );

        if(!key||seen.has(key))return;

        seen.add(key);
        result.push(option);
    });

    return result;
}

function getCurrentPassageOptions(){
    if(!currentTest)return[];

    const part=currentTest.parts[currentPartIndex];
    if(!part)return[];

    return(part.passage?.paragraphs||[]).map(paragraph=>({
        value:String(paragraph.id||""),
        text:String(paragraph.id||"")
    }));
}

function createSelectOptions(options){
    let html=`
        <select class="question-control-select">
            <option value="">Select...</option>
    `;

    (options||[]).forEach(option=>{
        const normalized=normalizeOption(option);

        if(!normalized.value&&!normalized.text)return;

        html+=`
            <option value="${escapeAttribute(normalized.value)}">
                ${escapeHTML(normalized.text)}
            </option>
        `;
    });

    html+=`</select>`;

    return html;
}

function attachInputListener(container){
    container.querySelectorAll("input").forEach(input=>{
        input.addEventListener("input",handleAnswerChange);
        input.addEventListener("change",handleAnswerChange);
    });
}

function handleAnswerChange(event){
    const element=event.target;
    const number=Number(element.dataset.questionNumber);

    if(!number)return;

    if(element.type==="radio"){
        if(element.checked){
            studentAnswers[number]=element.value;
        }
    }else{
        studentAnswers[number]=element.value;
    }

    saveAnswersToStorage();
    updateQuestionNavigator();
}

function saveAllVisibleAnswers(){
    document
        .querySelectorAll("[data-question-number]")
        .forEach(element=>{
            const number=Number(
                element.dataset.questionNumber
            );

            if(!number)return;

            if(element.type==="radio"){
                if(element.checked){
                    studentAnswers[number]=element.value;
                }
            }else if(
                element.tagName==="INPUT"||
                element.tagName==="SELECT"
            ){
                if(element.value!==""){
                    studentAnswers[number]=element.value;
                }
            }
        });

    saveAnswersToStorage();
}

function restoreAnswers(){
    document
        .querySelectorAll(
            "input[data-question-number],select[data-question-number]"
        )
        .forEach(element=>{
            const number=Number(
                element.dataset.questionNumber
            );

            const value=studentAnswers[number];

            if(value===undefined)return;

            if(element.type==="radio"){
                element.checked=
                    normalizeAnswer(element.value)===
                    normalizeAnswer(value);
            }else{
                element.value=value;
            }
        });

    restoreDragDropAnswers();
    updateQuestionNavigator();
}

function getAnswerStorageKey(){
    return`ieltsReadingAnswers_Test${currentTestNumber}`;
}

function saveAnswersToStorage(){
    if(!currentTestNumber)return;

    try{
        localStorage.setItem(
            getAnswerStorageKey(),
            JSON.stringify(studentAnswers)
        );
    }catch(error){
        console.warn("Could not save answers:",error);
    }
}

function loadSavedAnswers(){
    try{
        const raw=localStorage.getItem(
            getAnswerStorageKey()
        );

        if(!raw)return;

        const saved=JSON.parse(raw);

        if(saved&&typeof saved==="object"){
            studentAnswers=saved;
        }
    }catch(error){
        console.warn("Could not load saved answers:",error);
        studentAnswers={};
    }
}

function renderQuestionNavigator(){
    const nav=document.getElementById("questionNavigator");

    if(!nav)return;

    const numbers=getAllQuestionNumbers();

    nav.innerHTML=numbers.map(number=>`
        <button
            type="button"
            class="question-nav-item"
            data-question-nav="${number}"
        >
            ${number}
        </button>
    `).join("");

    nav.querySelectorAll("button").forEach(button=>{
        button.addEventListener("click",()=>{
            jumpToQuestion(
                Number(button.dataset.questionNav)
            );
        });
    });

    updateQuestionNavigator();
}

function getAllQuestionNumbers(){
    const numbers=[];

    (currentTest?.parts||[]).forEach(part=>{
        (part.questionGroups||[]).forEach(group=>{
            (group.questions||[]).forEach(question=>{
                const number=Number(question.number);

                if(Number.isFinite(number)){
                    numbers.push(number);
                }
            });

            (group.blanks||[]).forEach(blank=>{
                const number=Number(blank.number);

                if(Number.isFinite(number)){
                    numbers.push(number);
                }
            });
        });
    });

    return[
        ...new Set(numbers)
    ].sort((a,b)=>a-b);
}

function updateQuestionNavigator(){
    const nav=document.getElementById("questionNavigator");

    if(!nav)return;

    nav.querySelectorAll("[data-question-nav]").forEach(button=>{
        const number=Number(button.dataset.questionNav);

        button.classList.toggle(
            "answered",
            isQuestionAnswered(number)
        );
    });
}

function isQuestionAnswered(number){
    const value=studentAnswers[number];

    return(
        value!==undefined&&
        value!==null&&
        String(value).trim()!==""
    );
}

function jumpToQuestion(number){
    const element=document.querySelector(
        `[data-question-number="${number}"]`
    );

    if(!element)return;

    const question=element.closest(
        ".question,.drag-question"
    );

    (question||element).scrollIntoView({
        behavior:"smooth",
        block:"center"
    });
}

function nextPart(){
    saveAllVisibleAnswers();

    if(currentPartIndex<currentTest.parts.length-1){
        currentPartIndex++;
        renderCurrentPart();
    }else{
        confirmSubmitTest();
    }
}

function previousPart(){
    saveAllVisibleAnswers();

    if(currentPartIndex>0){
        currentPartIndex--;
        renderCurrentPart();
    }
}

function updatePartButtons(){
    const previous=document.getElementById(
        "previousPartButton"
    );

    const next=document.getElementById(
        "nextPartButton"
    );

    if(previous){
        previous.disabled=currentPartIndex===0;
    }

    if(next){
        next.textContent=
            currentPartIndex===currentTest.parts.length-1
                ?"Submit Test →"
                :"Next Part →";
    }
}

function scrollTestPanelsToTop(){
    ["passagePanel","questionsPanel"].forEach(id=>{
        const element=document.getElementById(id);

        if(element){
            element.scrollTop=0;
        }
    });
}

function confirmSubmitTest(){
    if(testSubmitted)return;
    openConfirmModal();
}

function confirmExitTest(){
    if(!testStarted||testSubmitted){
        showDashboard();
        return;
    }

    const answer=confirm(
        "Leave this test? Your current test will not be submitted."
    );

    if(answer){
        stopTimer();
        showDashboard();
    }
}

function openConfirmModal(){
    const modal=document.getElementById("confirmModal");

    if(modal){
        modal.style.display="flex";
    }
}

function closeConfirmModal(){
    const modal=document.getElementById("confirmModal");

    if(modal){
        modal.style.display="none";
    }
}

function autoSubmitTest(){
    if(testSubmitted)return;

    showToast(
        "Time is up. Your test is being submitted."
    );

    submitTest();
}

async function submitTest(){
    if(testSubmitted)return;

    saveAllVisibleAnswers();
    closeConfirmModal();
    stopTimer();

    testSubmitted=true;
    testStarted=false;

    testElapsedSeconds=calculateTimeUsed();

    submittedAnswers={
        ...studentAnswers
    };

    scoreData=calculateScore();

    renderResult();

    clearCurrentTestAnswers();
}

function calculateTimeUsed(){
    if(!testStartTime)return 0;

    return Math.max(
        0,
        Math.floor(
            (Date.now()-testStartTime)/1000
        )
    );
}

function calculateScore(){
    let total=0;
    const partScores=[];

    (currentTest.parts||[]).forEach(part=>{
        let partScore=0;

        (part.questionGroups||[]).forEach(group=>{
            const questions=
                group.questions?.length
                    ?group.questions
                    :group.blanks||[];

            questions.forEach(question=>{
                const given=
                    submittedAnswers[question.number];

                if(
                    answersMatch(
                        given,
                        question.answer
                    )
                ){
                    partScore++;
                }
            });
        });

        partScores.push(partScore);
        total+=partScore;
    });

    return{
        totalScore:total,
        totalQuestions:countTotalQuestions(),
        partScores,
        band:calculateIELTSBand(total),
        timeUsed:formatTime(testElapsedSeconds)
    };
}

function countTotalQuestions(){
    return getAllQuestionNumbers().length;
}

function answersMatch(given,correct){
    if(
        given===undefined||
        given===null||
        correct===undefined||
        correct===null
    ){
        return false;
    }

    const normalizedGiven=normalizeAnswer(given);

    if(Array.isArray(correct)){
        return correct.some(answer=>
            normalizeAnswer(answer)===normalizedGiven
        );
    }

    return(
        normalizedGiven===
        normalizeAnswer(correct)
    );
}

function normalizeAnswer(value){
    return String(value??"")
        .trim()
        .replace(/\s+/g," ")
        .toLowerCase();
}

function calculateIELTSBand(score){
    if(score>=39)return 9;
    if(score>=37)return 8.5;
    if(score>=35)return 8;
    if(score>=33)return 7.5;
    if(score>=30)return 7;
    if(score>=27)return 6.5;
    if(score>=23)return 6;
    if(score>=19)return 5.5;
    if(score>=15)return 5;
    if(score>=13)return 4.5;
    if(score>=10)return 4;
    if(score>=8)return 3.5;
    if(score>=6)return 3;
    if(score>=4)return 2.5;
    if(score>=2)return 2;
    if(score===1)return 1;
    return 0;
}

function renderResult(){
    showScreen("resultScreen");

    setText(
        "resultTestTitle",
        currentTest?.title||
        `Test ${currentTestNumber}`
    );

    setText(
        "resultScore",
        scoreData.totalScore
    );

    setText(
        "resultTotal",
        `/ ${scoreData.totalQuestions}`
    );

    setText(
        "resultBand",
        Number(scoreData.band).toFixed(1)
    );

    setText(
        "resultTime",
        scoreData.timeUsed
    );

    renderPartScores();
    renderIncorrectAnswers();
    ensurePrintButton();
}

function renderPartScores(){
    const box=document.getElementById("partScores");

    if(!box)return;

    box.innerHTML=scoreData.partScores.map(
        (score,index)=>`
            <div class="part-score">
                <span class="part-score-label">
                    Part ${index+1}
                </span>
                <span class="part-score-value">
                    ${score}
                </span>
            </div>
        `
    ).join("");
}

function getReviewQuestions(){
    const list=[];

    (currentTest?.parts||[]).forEach((part,partIndex)=>{
        (part.questionGroups||[]).forEach(group=>{
            const questions=
                group.questions?.length
                    ?group.questions
                    :group.blanks||[];

            questions.forEach(question=>{
                const given=
                    submittedAnswers[question.number];

                if(
                    !answersMatch(
                        given,
                        question.answer
                    )
                ){
                    list.push({
                        number:question.number,
                        text:
                            question.text||
                            question.question||
                            `Question ${question.number}`,
                        given:
                            given===undefined||
                            given===null||
                            String(given).trim()===""
                                ?"Unanswered"
                                :given,
                        correct:
                            Array.isArray(question.answer)
                                ?question.answer.join(" / ")
                                :question.answer??"",
                        part:partIndex+1
                    });
                }
            });
        });
    });

    return list.sort((a,b)=>a.number-b.number);
}

function renderIncorrectAnswers(){
    const ids=[
        "incorrectAnswers",
        "incorrectAnswerReview",
        "wrongAnswers"
    ];

    let box=null;

    for(const id of ids){
        box=document.getElementById(id);

        if(box)break;
    }

    if(!box)return;

    const list=getReviewQuestions();

    if(!list.length){
        box.innerHTML=`
            <div class="incorrect-review">
                <h3>Incorrect Answers</h3>
                <p>Excellent! All answers are correct.</p>
            </div>
        `;
        return;
    }

    box.innerHTML=`
        <div class="incorrect-review">
            <h3>Incorrect Answers</h3>
            <div class="incorrect-count">
                ${list.length} incorrect / ${scoreData.totalQuestions}
            </div>
            ${list.map(item=>`
                <div class="incorrect-item">
                    <div class="incorrect-header">
                        <strong>Question ${item.number}</strong>
                        <span>Part ${item.part}</span>
                    </div>
                    <div class="review-question">
                        ${escapeHTML(item.text)}
                    </div>
                    <div class="review-your">
                        Your answer:
                        <strong>
                            ${escapeHTML(String(item.given))}
                        </strong>
                    </div>
                    <div class="review-correct">
                        Correct answer:
                        <strong>
                            ${escapeHTML(String(item.correct))}
                        </strong>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}

function ensurePrintButton(){
    if(document.getElementById("printScoreButton"))return;

    const result=document.getElementById("resultScreen");

    if(!result)return;

    const button=document.createElement("button");

    button.id="printScoreButton";
    button.type="button";
    button.className="print-score-button";
    button.textContent="Print Score / Save PDF";
    button.addEventListener("click",printScorePDF);

    result.appendChild(button);
}

function printScorePDF(){
    const oldTitle=document.title;

    document.title=
        `IELTS Reading - ${
            currentTest?.title||
            `Test ${currentTestNumber}`
        }`;

    const style=document.createElement("style");

    style.id="ieltsPrintStyle";

    style.textContent=`
        @media print{
            body *{
                visibility:hidden!important;
            }

            #resultScreen,
            #resultScreen *{
                visibility:visible!important;
            }

            #resultScreen{
                display:block!important;
                position:absolute!important;
                left:0!important;
                top:0!important;
                width:100%!important;
                padding:25px!important;
                box-sizing:border-box!important;
                background:#fff!important;
            }

            .print-score-button{
                display:none!important;
            }

            .incorrect-item{
                break-inside:avoid;
                border:1px solid #ccc;
                padding:12px;
                margin:8px 0;
            }

            .incorrect-review{
                break-inside:auto;
            }
        }
    `;

    document.head.appendChild(style);

    window.print();

    setTimeout(()=>{
        style.remove();
        document.title=oldTitle;
    },500);
}

function clearCurrentTestAnswers(){
    try{
        localStorage.removeItem(
            getAnswerStorageKey()
        );
    }catch(error){
        console.warn(
            "Could not clear saved answers:",
            error
        );
    }

    studentAnswers={};
}

function showScreen(id){
    document
        .querySelectorAll(".screen")
        .forEach(element=>{
            element.style.display="none";
        });

    const element=document.getElementById(id);

    if(!element){
        console.warn(`Screen not found: ${id}`);
        return;
    }

    element.style.display="block";
}

function setLoading(show,text="Loading..."){
    const overlay=document.getElementById(
        "loadingOverlay"
    );

    const loadingText=document.getElementById(
        "loadingText"
    );

    if(loadingText){
        loadingText.textContent=text;
    }

    if(overlay){
        overlay.style.display=
            show?"flex":"none";
    }
}

function showToast(message){
    const element=document.getElementById("toast");

    if(!element){
        console.log(message);
        return;
    }

    element.textContent=message;
    element.style.display="block";

    setTimeout(()=>{
        element.style.display="none";
    },3500);
}

function formatTime(seconds){
    seconds=Math.max(
        0,
        Number(seconds)||0
    );

    const hours=Math.floor(seconds/3600);
    const minutes=Math.floor(
        (seconds%3600)/60
    );
    const secs=Math.floor(seconds%60);

    if(hours){
        return`${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
    }

    return`${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
}

function setText(id,value){
    const element=document.getElementById(id);

    if(element){
        element.textContent=value??"";
    }
}

function escapeHTML(value){
    return String(value??"")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function escapeAttribute(value){
    return escapeHTML(value);
}

function escapeRegExp(value){
    return String(value)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
}

function injectDragDropStyles(){
    if(document.getElementById("dragDropStyles"))return;

    const style=document.createElement("style");

    style.id="dragDropStyles";

    style.textContent=`
        .drag-matching-container,
        .drag-summary-container{
            width:100%;
            box-sizing:border-box;
        }

        .drag-option-bank,
        .drag-summary-bank{
            background:#f7f8fa;
            border:1px solid #d8dde5;
            border-radius:12px;
            padding:16px;
            margin-bottom:20px;
        }

        .drag-bank-title{
            font-size:15px;
            font-weight:700;
            color:#20242a;
            margin-bottom:12px;
        }

        .drag-options,
        .drag-summary-options{
            display:flex;
            flex-wrap:wrap;
            gap:10px;
        }

        .drag-option,
        .summary-drag-word{
            display:inline-flex;
            align-items:center;
            gap:6px;
            background:#fff;
            border:1px solid #cbd2db;
            border-radius:8px;
            padding:10px 13px;
            cursor:grab;
            user-select:none;
            font-size:14px;
            line-height:1.4;
        }

        .drag-option:hover,
        .summary-drag-word:hover{
            border-color:#2563eb;
        }

        .drag-option.dragging,
        .summary-drag-word.dragging{
            opacity:.45;
        }

        .drag-option.selected,
        .summary-drag-word.selected{
            border-color:#2563eb;
            background:#eff6ff;
        }

        .drag-option-handle{
            opacity:.5;
        }

        .drag-question{
            background:#fff;
            border:1px solid #e1e5ea;
            border-radius:12px;
            padding:16px;
            margin-bottom:18px;
        }

        .drag-drop-zone{
            width:100%;
            min-height:50px;
            box-sizing:border-box;
            border:2px dashed #b8c1cc;
            border-radius:8px;
            background:#fafbfc;
            display:flex;
            align-items:center;
            padding:8px 12px;
            margin-bottom:13px;
        }

        .drag-drop-zone.drag-over{
            border-color:#2563eb;
            background:#eff6ff;
        }

        .drag-drop-zone.has-answer{
            border-style:solid;
            border-color:#9aa4b2;
        }

        .drop-placeholder{
            color:#8a95a3;
        }

        .drag-question-text{
            font-size:16px;
            line-height:1.6;
        }

        .dropped-answer{
            width:100%;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
        }

        .dropped-answer-text{
            font-weight:600;
            color:#20242a;
        }

        .remove-dropped-answer{
            border:none;
            background:transparent;
            color:#b42318;
            font-size:21px;
            cursor:pointer;
        }

        .drag-summary-text{
            font-size:16px;
            line-height:2.3;
            color:#20242a;
        }

        .summary-drop-zone{
            display:inline-flex;
            vertical-align:middle;
            align-items:center;
            justify-content:center;
            min-width:125px;
            min-height:38px;
            box-sizing:border-box;
            margin:0 5px;
            padding:3px 8px;
            border:2px dashed #adb7c3;
            border-radius:7px;
            background:#fafbfc;
            cursor:pointer;
        }

        .summary-drop-zone.drag-over{
            border-color:#2563eb;
            background:#eff6ff;
        }

        .summary-drop-zone.has-answer{
            border-style:solid;
            border-color:#9aa4b2;
        }

        .summary-drop-placeholder{
            color:#8a95a3;
            font-size:13px;
            white-space:nowrap;
        }

        .summary-fallback{
            margin-top:20px;
        }

        .summary-fallback-row{
            display:flex;
            align-items:center;
            gap:10px;
            margin-bottom:12px;
        }

        .incorrect-review{
            margin-top:30px;
            padding:20px;
            border-radius:12px;
            background:#f8f9fb;
            border:1px solid #e1e5ea;
        }

        .incorrect-review h3{
            margin-top:0;
            margin-bottom:8px;
        }

        .incorrect-count{
            margin-bottom:15px;
            color:#666;
        }

        .incorrect-item{
            background:#fff;
            border:1px solid #ddd;
            border-radius:10px;
            padding:14px;
            margin:10px 0;
        }

        .incorrect-header{
            display:flex;
            justify-content:space-between;
            margin-bottom:8px;
        }

        .review-question{
            font-weight:600;
            margin-bottom:10px;
            line-height:1.5;
        }

        .review-your{
            color:#b42318;
            margin-top:5px;
        }

        .review-correct{
            color:#18794e;
            margin-top:5px;
        }

        .print-score-button{
            margin-top:20px;
            padding:12px 20px;
            border:0;
            border-radius:8px;
            background:#1d3557;
            color:#fff;
            font-size:15px;
            cursor:pointer;
        }

        .print-score-button:hover{
            opacity:.9;
        }

        @media(max-width:700px){
            .drag-options,
            .drag-summary-options{
                display:grid;
                grid-template-columns:1fr;
            }

            .drag-option,
            .summary-drag-word{
                width:100%;
                box-sizing:border-box;
            }

            .drag-summary-text{
                font-size:15px;
                line-height:2.1;
            }

            .summary-drop-zone{
                min-width:100px;
            }

            .drag-question-text{
                font-size:15px;
            }
        }
    `;

    document.head.appendChild(style);
}

window.IELTSReading={
    openTest,
    startTest,
    submitTest,
    calculateScore,
    showDashboard,
    getCurrentTest:()=>currentTest,
    getAnswers:()=>studentAnswers,
    getQuestionNumbers:()=>getAllQuestionNumbers()
};
