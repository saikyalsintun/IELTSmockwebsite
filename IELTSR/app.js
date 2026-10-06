/* =========================================================
   IELTS READING PRACTICE
   COMPLETE LOCAL-STORAGE app.js
========================================================= */

const CONFIG={
    TEST_COUNT:8,
    TEST_FOLDER:"./tests/",
    VOCABULARY_FILE:"./vocabulary.json",
    DEFAULT_DURATION:60
};

let currentTest=null;
let currentTestNumber=null;
let currentPartIndex=0;
let studentAnswers={};
let submittedAnswers={};
let vocabulary={};
let timerInterval=null;
let remainingSeconds=0;
let testStartTime=null;
let testElapsedSeconds=0;
let testStarted=false;
let testSubmitted=false;
let scoreData=null;
let selectedDragOption=null;

/* =========================================================
   START
========================================================= */

window.addEventListener("DOMContentLoaded",async()=>{
    injectStyles();
    setupEvents();
    await loadVocabulary();
    removeAdminElements();
    showDashboard();
});

/* =========================================================
   HELPERS
========================================================= */

function $(id){
    return document.getElementById(id);
}

function setText(id,value){
    const el=$(id);
    if(el) el.textContent=value??"";
}

function showScreen(id){
    document.querySelectorAll(".screen").forEach(el=>{
        el.classList.remove("active");
        el.style.display="none";
    });

    const el=$(id);

    if(el){
        el.classList.add("active");
        el.style.display="";
    }
}

function escapeHTML(value){
    if(value===null||value===undefined)return "";

    if(typeof value==="object"){
        return displayValue(value);
    }

    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}

function escapeAttr(value){
    return escapeHTML(value);
}

function escapeRegExp(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
}

function normalize(value){
    return String(value??"")
        .trim()
        .replace(/\s+/g," ")
        .toLowerCase();
}

/* =========================================================
   OBJECT / JSON VALUE HANDLING
========================================================= */

function displayValue(value){

    if(value===null||value===undefined){
        return "";
    }

    if(
        typeof value==="string"||
        typeof value==="number"||
        typeof value==="boolean"
    ){
        return escapeHTML(String(value));
    }

    if(Array.isArray(value)){
        return value
            .map(x=>displayValue(x))
            .filter(Boolean)
            .join(", ");
    }

    if(typeof value==="object"){

        const keys=[
            "text",
            "label",
            "value",
            "name",
            "title",
            "heading",
            "option",
            "answer",
            "content",
            "word",
            "phrase",
            "description"
        ];

        for(const key of keys){
            if(
                value[key]!==undefined &&
                value[key]!==null
            ){
                return displayValue(value[key]);
            }
        }

        const objectKeys=Object.keys(value);

        if(objectKeys.length===1){
            return displayValue(value[objectKeys[0]]);
        }

        return objectKeys
            .map(key=>displayValue(value[key]))
            .filter(Boolean)
            .join(" ");
    }

    return escapeHTML(String(value));
}

function getOptionValue(option){

    if(option===null||option===undefined){
        return "";
    }

    if(
        typeof option==="string"||
        typeof option==="number"||
        typeof option==="boolean"
    ){
        return String(option);
    }

    if(typeof option==="object"){

        return String(
            option.value??
            option.id??
            option.key??
            option.text??
            option.label??
            option.name??
            option.heading??
            option.answer??
            option.word??
            ""
        );
    }

    return String(option);
}

function getOptionLabel(option){

    if(option===null||option===undefined){
        return "";
    }

    if(
        typeof option==="string"||
        typeof option==="number"||
        typeof option==="boolean"
    ){
        return escapeHTML(option);
    }

    if(typeof option==="object"){

        return displayValue(
            option.text??
            option.label??
            option.name??
            option.heading??
            option.title??
            option.value??
            option.option??
            option.answer??
            option.content??
            option.word??
            option
        );
    }

    return escapeHTML(option);
}

function formatAnswer(value){

    if(
        value===undefined||
        value===null||
        value===""
    ){
        return "—";
    }

    if(Array.isArray(value)){
        return value
            .map(x=>displayValue(x))
            .join(", ");
    }

    return displayValue(value);
}

/* =========================================================
   TIME
========================================================= */

function formatTime(seconds){
    seconds=Math.max(0,Number(seconds)||0);

    const minutes=Math.floor(seconds/60);
    const secs=seconds%60;

    return `${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
}

function calculateTimeUsed(){

    if(!testStartTime){
        return 0;
    }

    const total=
        (Number(currentTest?.duration)||CONFIG.DEFAULT_DURATION)*60;

    return Math.min(
        total,
        Math.max(
            0,
            Math.floor((Date.now()-testStartTime)/1000)
        )
    );
}

/* =========================================================
   EVENTS
========================================================= */

function setupEvents(){

    const events={
        startTestButton:startTest,
        backToDashboardButton:showDashboard,
        testBackButton:confirmExitTest,
        submitTestButton:confirmSubmitTest,
        previousPartButton:previousPart,
        nextPartButton:nextPart,
        returnDashboardButton:showDashboard,
        retakeTestButton:()=>currentTest&&startTest(),
        closeVocabularyPopup:closeVocabularyPopup,
        closeConfirmModal:closeConfirmModal,
        cancelSubmitButton:closeConfirmModal,
        confirmSubmitButton:submitTest
    };

    Object.entries(events).forEach(([id,fn])=>{
        const el=$(id);
        if(el)el.addEventListener("click",fn);
    });

    document.addEventListener("input",e=>{
        if(
            e.target.matches(
                "input[data-question-number],textarea[data-question-number]"
            )
        ){
            saveAnswerFromElement(e.target);
        }
    });

    document.addEventListener("change",e=>{
        if(
            e.target.matches(
                "select[data-question-number],input[type=radio][data-question-number],input[type=checkbox][data-question-number]"
            )
        ){
            saveAnswerFromElement(e.target);
        }
    });
}

/* =========================================================
   REMOVE ADMIN / LOGIN
========================================================= */

function removeAdminElements(){

    [
        "teacherAdminButton",
        "adminButton",
        "teacherButton",
        "teacherAdminLink",
        "adminLink",
        "teacherLink",
        "teacherAdmin",
        "adminPanelButton",
        "loginButton",
        "logoutButton"
    ].forEach(id=>{
        const el=$(id);
        if(el)el.remove();
    });

    document.querySelectorAll("button,a").forEach(el=>{
        const text=normalize(el.textContent);

        if([
            "teacher",
            "admin",
            "teacher admin",
            "teacher/admin",
            "login",
            "log in",
            "logout",
            "log out"
        ].includes(text)){
            el.remove();
        }
    });
}

/* =========================================================
   DASHBOARD
========================================================= */

function showDashboard(){

    stopTimer();

    testStarted=false;
    testSubmitted=false;

    showScreen("dashboardScreen");

    renderTestCards();
}

function renderTestCards(){

    const box=$("testCards");

    if(!box)return;

    box.innerHTML="";

    for(let i=1;i<=CONFIG.TEST_COUNT;i++){

        const card=document.createElement("div");

        card.className="test-card";

        card.innerHTML=`
            <div class="test-card-number">
                Test ${i}
            </div>

            <h3>
                IELTS Reading Test ${i}
            </h3>

            <div class="test-card-info">
                <span>
                    ${CONFIG.DEFAULT_DURATION} minutes
                </span>

                <span>
                    40 questions
                </span>
            </div>
        `;

        card.onclick=()=>openTest(i);

        box.appendChild(card);
    }
}

/* =========================================================
   LOAD TEST
========================================================= */

async function openTest(number){

    try{

        const response=await fetch(
            `${CONFIG.TEST_FOLDER}Test${number}.json?${Date.now()}`,
            {cache:"no-store"}
        );

        if(!response.ok){
            throw new Error(
                `Test${number}.json could not be loaded.`
            );
        }

        const data=await response.json();

        validateTest(data);

        currentTest=data;
        currentTestNumber=number;
        currentPartIndex=0;

        studentAnswers={};
        submittedAnswers={};
        scoreData=null;
        testSubmitted=false;

        loadSavedAnswers();

        showTestIntroduction();

    }catch(error){

        console.error(error);

        alert(
            `Unable to load Test ${number}.\n\n`+
            `${error.message}\n\n`+
            `Please make sure tests/Test${number}.json exists.`
        );
    }
}

function validateTest(test){

    if(
        !test||
        !Array.isArray(test.parts)
    ){
        throw new Error("Invalid test JSON.");
    }

    test.parts.forEach(part=>{

        if(!part.passage){
            part.passage={};
        }

        if(!Array.isArray(part.passage.paragraphs)){

            if(typeof part.passage.text==="string"){

                part.passage.paragraphs=[
                    {
                        id:"",
                        text:part.passage.text
                    }
                ];

            }else{
                part.passage.paragraphs=[];
            }
        }

        if(!Array.isArray(part.questionGroups)){
            part.questionGroups=[];
        }

        part.questionGroups.forEach(group=>{

            if(!Array.isArray(group.questions)){
                group.questions=[];
            }

            if(!Array.isArray(group.blanks)){
                group.blanks=[];
            }
        });
    });
}

/* =========================================================
   INTRO
========================================================= */

function showTestIntroduction(){

    showScreen("introScreen");

    setText(
        "introTestNumber",
        currentTest.testId||
        `Test ${currentTestNumber}`
    );

    setText(
        "introTitle",
        currentTest.title||
        `IELTS Reading Test ${currentTestNumber}`
    );

    setText(
        "introDuration",
        `${currentTest.duration||CONFIG.DEFAULT_DURATION} minutes`
    );

    setText(
        "introQuestions",
        countTotalQuestions()
    );

    setText(
        "introParts",
        currentTest.parts.length
    );
}

/* =========================================================
   START TEST
========================================================= */

function startTest(){

    if(!currentTest)return;

    studentAnswers={};

    loadSavedAnswers();

    currentPartIndex=0;
    testStarted=true;
    testSubmitted=false;

    testStartTime=Date.now();

    remainingSeconds=
        (Number(currentTest.duration)||CONFIG.DEFAULT_DURATION)*60;

    testElapsedSeconds=0;

    showScreen("testScreen");

    renderCurrentPart();

    startTimer();
}

/* =========================================================
   TIMER
========================================================= */

function startTimer(){

    stopTimer();

    updateTimer();

    timerInterval=setInterval(()=>{

        remainingSeconds--;

        updateTimer();

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

function updateTimer(){

    [
        "timer",
        "timerDisplay",
        "testTimer"
    ].some(id=>{

        const el=$(id);

        if(!el)return false;

        el.textContent=
            formatTime(remainingSeconds);

        if(remainingSeconds<=300){
            el.classList.add("timer-warning");
        }else{
            el.classList.remove("timer-warning");
        }

        return true;
    });
}

/* =========================================================
   CURRENT PART
========================================================= */

function renderCurrentPart(){

    if(!currentTest)return;

    const part=
        currentTest.parts[currentPartIndex];

    if(!part)return;

    setText(
        "testHeaderTitle",
        currentTest.title||
        `IELTS Reading Test ${currentTestNumber}`
    );

    setText(
        "testHeaderPart",
        `Part ${part.partNumber||currentPartIndex+1}`
    );

    setText(
        "passagePartLabel",
        `Part ${part.partNumber||currentPartIndex+1}`
    );

    setText(
        "passageTitle",
        getPlainText(part.passage.title||"")
    );

    setText(
        "questionsPartLabel",
        `Questions ${questionRange(part)}`
    );

    setText(
        "partIndicator",
        `Part ${currentPartIndex+1} of ${currentTest.parts.length}`
    );

    renderPassage(part.passage);

    renderQuestions(part);

    renderQuestionNavigator();

    updatePartButtons();

    window.scrollTo({
        top:0,
        behavior:"smooth"
    });
}

function getPlainText(value){

    if(value===null||value===undefined){
        return "";
    }

    if(
        typeof value==="string"||
        typeof value==="number"
    ){
        return String(value);
    }

    if(Array.isArray(value)){
        return value.map(getPlainText).join(", ");
    }

    if(typeof value==="object"){

        return String(
            value.text??
            value.label??
            value.title??
            value.name??
            value.value??
            ""
        );
    }

    return String(value);
}

/* =========================================================
   QUESTION NUMBERS
========================================================= */

function getPartQuestionNumbers(part){

    const numbers=[];

    (part.questionGroups||[]).forEach(group=>{

        (group.questions||[]).forEach(q=>{

            if(Number.isFinite(Number(q.number))){
                numbers.push(Number(q.number));
            }
        });

        (group.blanks||[]).forEach(q=>{

            if(Number.isFinite(Number(q.number))){
                numbers.push(Number(q.number));
            }
        });
    });

    return [...new Set(numbers)]
        .sort((a,b)=>a-b);
}

function questionRange(part){

    const numbers=
        getPartQuestionNumbers(part);

    if(!numbers.length){
        return "";
    }

    if(numbers.length===1){
        return numbers[0];
    }

    return `${numbers[0]}-${numbers[numbers.length-1]}`;
}

/* =========================================================
   PASSAGE
========================================================= */

function renderPassage(passage){

    const box=$("passageContent");

    if(!box)return;

    box.innerHTML=
        (passage.paragraphs||[])
        .map(p=>{

            const id=
                getPlainText(p.id||"");

            const text=
                getPlainText(p.text??p.content??"");

            return `
                <p class="passage-paragraph">

                    ${
                        id
                            ? `
                                <span class="paragraph-label">
                                    ${escapeHTML(id)}
                                </span>
                              `
                            :""
                    }

                    ${highlightVocabulary(text)}

                </p>
            `;
        })
        .join("");

    box
        .querySelectorAll(".vocabulary-word")
        .forEach(el=>{

            el.onclick=e=>{

                e.stopPropagation();

                showVocabularyPopup(
                    el.dataset.word
                );
            };
        });
}

/* =========================================================
   VOCABULARY
========================================================= */

async function loadVocabulary(){

    try{

        const response=await fetch(
            `${CONFIG.VOCABULARY_FILE}?${Date.now()}`,
            {cache:"no-store"}
        );

        if(!response.ok){
            vocabulary={};
            return;
        }

        const data=await response.json();

        vocabulary=
            data.words||
            data||
            {};

    }catch{

        vocabulary={};
    }
}

function highlightVocabulary(text){

    let result=
        escapeHTML(text);

    const words=
        Object.keys(vocabulary||{})
        .sort((a,b)=>b.length-a.length);

    words.forEach(word=>{

        const regex=
            new RegExp(
                `(?<![A-Za-z])(${escapeRegExp(word)})(?![A-Za-z])`,
                "gi"
            );

        result=
            result.replace(
                regex,
                match=>`
                    <span
                        class="vocabulary-word"
                        data-word="${escapeAttr(match)}"
                    >
                        ${match}
                    </span>
                `
            );
    });

    return result;
}

function showVocabularyPopup(word){

    const key=
        Object.keys(vocabulary||{})
        .find(
            x=>
                x.toLowerCase()===
                String(word).toLowerCase()
        );

    if(!key)return;

    const item=vocabulary[key]||{};

    const popup=$("vocabularyPopup");

    if(!popup)return;

    setText(
        "vocabularyWord",
        word
    );

    setText(
        "vocabularyMeaning",
        getPlainText(
            item.meaning||
            item.definition||
            "Meaning unavailable."
        )
    );

    setText(
        "vocabularySimpleMeaning",
        getPlainText(
            item.simpleMeaning||
            item.example||
            ""
        )
    );

    popup.style.display="block";
}

function closeVocabularyPopup(){

    const popup=$("vocabularyPopup");

    if(popup){
        popup.style.display="none";
    }
}

/* =========================================================
   QUESTION TYPE
========================================================= */

function normalizeType(type){

    return String(type||"")
        .trim()
        .toLowerCase()
        .replace(/-/g,"_")
        .replace(/\s+/g,"_");
}

/* =========================================================
   RENDER QUESTIONS
========================================================= */

function renderQuestions(part){

    const box=$("questionsContent");

    if(!box)return;

    box.innerHTML="";

    (part.questionGroups||[])
    .forEach(group=>{

        const wrapper=
            document.createElement("div");

        wrapper.className=
            "question-group";

        if(group.questionRange){

            wrapper.innerHTML+=`
                <h3 class="question-group-title">
                    Questions
                    ${escapeHTML(
                        getPlainText(group.questionRange)
                    )}
                </h3>
            `;
        }

        if(group.instructions){

            wrapper.innerHTML+=`
                <p class="question-instructions">
                    ${escapeHTML(
                        getPlainText(group.instructions)
                    )}
                </p>
            `;
        }

        const content=
            document.createElement("div");

        wrapper.appendChild(content);

        const type=
            normalizeType(group.type);

        switch(type){

            case "true_false_not_given":
                renderChoiceQuestions(
                    content,
                    group,
                    ["TRUE","FALSE","NOT GIVEN"]
                );
                break;

            case "yes_no_not_given":
                renderChoiceQuestions(
                    content,
                    group,
                    ["YES","NO","NOT GIVEN"]
                );
                break;

            case "fill_blank":
            case "answer_box":
                renderFillBlank(
                    content,
                    group
                );
                break;

            case "summary_completion":
                renderSummary(
                    content,
                    group
                );
                break;

            case "multiple_choice":
                renderMultipleChoice(
                    content,
                    group,
                    false
                );
                break;

            case "multiple_choice_multiple":
                renderMultipleChoice(
                    content,
                    group,
                    true
                );
                break;

            case "matching_headings":
                renderMatching(
                    content,
                    group
                );
                break;

            case "matching_information":
                renderMatching(
                    content,
                    group
                );
                break;

            case "matching_features":
                renderMatching(
                    content,
                    group
                );
                break;

            default:
                renderGeneric(
                    content,
                    group
                );
        }

        box.appendChild(wrapper);
    });

    restoreAnswers();
}

/* =========================================================
   CREATE QUESTION
========================================================= */

function createQuestion(question){

    const item=
        document.createElement("div");

    item.className=
        "question-item";

    item.dataset.questionNumber=
        question.number;

    const text=
        question.question||
        question.text||
        question.prompt||
        question.statement||
        "";

    item.innerHTML=`
        <div class="question-number">
            ${escapeHTML(
                getPlainText(question.number)
            )}
        </div>

        <div class="question-body">

            <div class="question-text">
                ${escapeHTML(
                    getPlainText(text)
                )}
            </div>

            <div class="question-control"></div>

        </div>
    `;

    return item;
}

/* =========================================================
   TRUE/FALSE / YES/NO
========================================================= */

function renderChoiceQuestions(
    box,
    group,
    choices
){

    (group.questions||[])
    .forEach(question=>{

        const item=
            createQuestion(question);

        const control=
            item.querySelector(
                ".question-control"
            );

        control.innerHTML=
            choices
            .map(choice=>`

                <label class="choice-option">

                    <input
                        type="radio"
                        name="q_${question.number}"
                        value="${escapeAttr(choice)}"
                        data-question-number="${escapeAttr(
                            question.number
                        )}"
                    >

                    <span>
                        ${escapeHTML(choice)}
                    </span>

                </label>

            `)
            .join("");

        box.appendChild(item);
    });
}

/* =========================================================
   FILL BLANK
========================================================= */

function renderFillBlank(box,group){

    const questions=
        group.questions?.length
            ? group.questions
            : group.blanks||[];

    questions.forEach(question=>{

        const item=
            createQuestion(question);

        const control=
            item.querySelector(
                ".question-control"
            );

        control.innerHTML=`
            <input
                type="text"
                class="answer-input"
                data-question-number="${escapeAttr(
                    question.number
                )}"
                autocomplete="off"
                spellcheck="false"
                placeholder="Type your answer"
            >
        `;

        box.appendChild(item);
    });
}

/* =========================================================
   GENERIC
========================================================= */

function renderGeneric(box,group){

    (group.questions||[])
    .forEach(question=>{

        const item=
            createQuestion(question);

        const control=
            item.querySelector(
                ".question-control"
            );

        const options=
            question.options||
            question.choices||
            group.options||
            group.choices||
            [];

        if(options.length){

            control.innerHTML=
                options
                .map((option,index)=>{

                    const value=
                        getOptionValue(option);

                    const label=
                        getOptionLabel(option);

                    return `
                        <label class="choice-option">

                            <input
                                type="radio"
                                name="q_${question.number}"
                                value="${escapeAttr(value)}"
                                data-question-number="${escapeAttr(
                                    question.number
                                )}"
                            >

                            <span>
                                ${String.fromCharCode(
                                    65+index
                                )}.
                                ${label}
                            </span>

                        </label>
                    `;
                })
                .join("");

        }else{

            control.innerHTML=`
                <input
                    type="text"
                    class="answer-input"
                    data-question-number="${escapeAttr(
                        question.number
                    )}"
                >
            `;
        }

        box.appendChild(item);
    });
}

/* =========================================================
   MULTIPLE CHOICE
========================================================= */

function renderMultipleChoice(
    box,
    group,
    multiple
){

    (group.questions||[])
    .forEach(question=>{

        const item=
            createQuestion(question);

        const control=
            item.querySelector(
                ".question-control"
            );

        const options=
            question.options||
            question.choices||
            group.options||
            group.choices||
            [];

        control.innerHTML=
            options
            .map((option,index)=>{

                const value=
                    getOptionValue(option);

                const label=
                    getOptionLabel(option);

                return `
                    <label class="choice-option">

                        <input
                            type="${multiple?"checkbox":"radio"}"
                            name="q_${question.number}${
                                multiple
                                    ? `_${index}`
                                    :""
                            }"
                            value="${escapeAttr(value)}"
                            data-question-number="${escapeAttr(
                                question.number
                            )}"
                        >

                        <span>
                            ${String.fromCharCode(
                                65+index
                            )}.
                            ${label}
                        </span>

                    </label>
                `;
            })
            .join("");

        box.appendChild(item);
    });
}

/* =========================================================
   SUMMARY COMPLETION
========================================================= */

function renderSummary(box,group){

    const blanks=
        group.blanks?.length
            ? group.blanks
            : group.questions||[];

    const options=
        group.options||
        group.choices||
        group.words||
        group.wordBank||
        getAnswersAsOptions(blanks);

    const wrapper=
        document.createElement("div");

    wrapper.className=
        "summary-completion";

    if(group.summary){

        const summary=
            document.createElement("div");

        summary.className=
            "summary-text";

        let html=
            getPlainText(group.summary);

        blanks.forEach(blank=>{

            const replacement=`
                <span
                    class="drop-answer"
                    data-question-number="${escapeAttr(
                        blank.number
                    )}"
                    tabindex="0"
                >
                    ${getSavedDisplay(
                        blank.number
                    )}
                </span>
            `;

            html=
                html.replace(
                    new RegExp(
                        `\\{\\{${blank.number}\\}\\}`,
                        "g"
                    ),
                    replacement
                );

            html=
                html.replace(
                    new RegExp(
                        `\\[${blank.number}\\]`,
                        "g"
                    ),
                    replacement
                );
        });

        summary.innerHTML=
            escapeHTML(html)
            .replace(
                /&lt;span/g,
                "<span"
            )
            .replace(
                /&gt;/g,
                ">"
            )
            .replace(
                /&lt;\/span&gt;/g,
                "</span>"
            );

        wrapper.appendChild(summary);
    }

    const wordBank=
        document.createElement("div");

    wordBank.className=
        "word-bank";

    wordBank.innerHTML=
        options
        .map(option=>{

            const value=
                getOptionValue(option);

            const label=
                getOptionLabel(option);

            return `
                <button
                    type="button"
                    class="drag-option"
                    draggable="true"
                    data-option="${escapeAttr(
                        value
                    )}"
                >
                    ${label}
                </button>
            `;
        })
        .join("");

    wrapper.appendChild(wordBank);

    const inputs=
        document.createElement("div");

    inputs.className=
        "summary-inputs";

    blanks.forEach(blank=>{

        const item=
            document.createElement("div");

        item.className=
            "summary-blank";

        item.innerHTML=`
            <label>

                ${escapeHTML(
                    getPlainText(blank.number)
                )}.

                <input
                    type="text"
                    class="answer-input"
                    data-question-number="${escapeAttr(
                        blank.number
                    )}"
                    autocomplete="off"
                >

            </label>
        `;

        inputs.appendChild(item);
    });

    wrapper.appendChild(inputs);

    box.appendChild(wrapper);

    setupDragOptions(wrapper);
}

function getAnswersAsOptions(blanks){

    const values=[];

    blanks.forEach(blank=>{

        const answer=
            blank.answer??
            blank.correctAnswer??
            blank.correct;

        if(Array.isArray(answer)){

            answer.forEach(x=>{
                values.push(x);
            });

        }else if(answer!==undefined){

            values.push(answer);
        }
    });

    return [
        ...new Set(
            values.map(getOptionValue)
        )
    ];
}

function getSavedDisplay(number){

    return escapeHTML(
        formatAnswer(
            studentAnswers[number]||
            "Drop answer"
        )
    );
}

/* =========================================================
   DRAG / CLICK
========================================================= */

function setupDragOptions(container){

    container
        .querySelectorAll(".drag-option")
        .forEach(option=>{

            option.addEventListener(
                "dragstart",
                ()=>{
                    selectedDragOption=
                        option.dataset.option;
                }
            );

            option.addEventListener(
                "click",
                ()=>{

                    selectedDragOption=
                        option.dataset.option;

                    container
                        .querySelectorAll(".drag-option")
                        .forEach(x=>
                            x.classList.remove(
                                "selected"
                            )
                        );

                    option.classList.add(
                        "selected"
                    );
                }
            );
        });

    container
        .querySelectorAll(".drop-answer")
        .forEach(drop=>{

            drop.addEventListener(
                "dragover",
                e=>e.preventDefault()
            );

            drop.addEventListener(
                "drop",
                e=>{

                    e.preventDefault();

                    if(
                        selectedDragOption
                    ){

                        setAnswer(
                            drop.dataset.questionNumber,
                            selectedDragOption
                        );

                        drop.textContent=
                            selectedDragOption;

                        drop.classList.add(
                            "filled"
                        );
                    }
                }
            );

            drop.addEventListener(
                "click",
                ()=>{

                    if(
                        selectedDragOption
                    ){

                        setAnswer(
                            drop.dataset.questionNumber,
                            selectedDragOption
                        );

                        drop.textContent=
                            selectedDragOption;

                        drop.classList.add(
                            "filled"
                        );
                    }
                }
            );
        });
}

/* =========================================================
   MATCHING
========================================================= */

function renderMatching(box,group){

    const questions=
        group.questions||[];

    const options=
        group.options||
        group.choices||
        group.headings||
        group.features||
        [];

    const wrapper=
        document.createElement("div");

    wrapper.className=
        "matching-container";

    questions.forEach(question=>{

        const item=
            createQuestion(question);

        const control=
            item.querySelector(
                ".question-control"
            );

        control.innerHTML=`
            <select
                class="answer-select"
                data-question-number="${escapeAttr(
                    question.number
                )}"
            >

                <option value="">
                    Select answer
                </option>

                ${options
                    .map(option=>{

                        const value=
                            getOptionValue(option);

                        const label=
                            getOptionLabel(option);

                        return `
                            <option
                                value="${escapeAttr(
                                    value
                                )}"
                            >
                                ${label}
                            </option>
                        `;
                    })
                    .join("")}

            </select>
        `;

        wrapper.appendChild(item);
    });

    box.appendChild(wrapper);
}

/* =========================================================
   ANSWER STORAGE
========================================================= */

function isAnswered(value){

    if(Array.isArray(value)){
        return value.length>0;
    }

    return String(value??"").trim()!=="";
}

function setAnswer(number,value){

    if(
        value===null||
        value===undefined||
        (
            !Array.isArray(value)&&
            String(value).trim()===""
        )
    ){

        delete studentAnswers[number];

    }else{

        studentAnswers[number]=value;
    }

    saveAnswers();

    updateNavigator();
}

function saveAnswerFromElement(element){

    const number=
        element.dataset.questionNumber;

    if(number===undefined)return;

    let value="";

    if(element.type==="radio"){

        const group=
            document.querySelectorAll(
                `[data-question-number="${CSS.escape(
                    number
                )}"]`
            );

        const checked=
            [...group]
            .find(x=>x.checked);

        value=
            checked?
            checked.value:
            "";

    }else if(element.type==="checkbox"){

        const group=
            document.querySelectorAll(
                `[data-question-number="${CSS.escape(
                    number
                )}"]`
            );

        value=
            [...group]
            .filter(x=>x.checked)
            .map(x=>x.value);

    }else{

        value=element.value;
    }

    setAnswer(
        number,
        value
    );
}

function saveAllVisibleAnswers(){

    document
        .querySelectorAll(
            "[data-question-number]"
        )
        .forEach(el=>{

            if(
                el.matches(
                    "input,select,textarea"
                )
            ){
                saveAnswerFromElement(el);
            }
        });
}

function restoreAnswers(){

    document
        .querySelectorAll(
            "[data-question-number]"
        )
        .forEach(el=>{

            const number=
                el.dataset.questionNumber;

            const value=
                studentAnswers[number];

            if(
                value===undefined||
                value===null
            ){
                return;
            }

            if(el.type==="radio"){

                el.checked=
                    normalize(el.value)===
                    normalize(value);

            }else if(
                el.type==="checkbox"
            ){

                const values=
                    Array.isArray(value)
                        ?value
                        :[];

                el.checked=
                    values.some(
                        x=>
                            normalize(x)===
                            normalize(el.value)
                    );

            }else{

                el.value=
                    Array.isArray(value)
                        ?value.join(", ")
                        :value;
            }
        });
}

function saveAnswers(){

    if(!currentTestNumber)return;

    localStorage.setItem(
        `ieltsReadingAnswers_${currentTestNumber}`,
        JSON.stringify(studentAnswers)
    );
}

function loadSavedAnswers(){

    if(!currentTestNumber)return;

    try{

        const saved=
            localStorage.getItem(
                `ieltsReadingAnswers_${currentTestNumber}`
            );

        studentAnswers=
            saved?
            JSON.parse(saved):
            {};

    }catch{

        studentAnswers={};
    }
}

function clearCurrentTestAnswers(){

    if(currentTestNumber){

        localStorage.removeItem(
            `ieltsReadingAnswers_${currentTestNumber}`
        );
    }

    studentAnswers={};
}

/* =========================================================
   QUESTION NAVIGATOR
========================================================= */

function renderQuestionNavigator(){

    const box=
        $("questionNavigator")||
        $("questionNav")||
        $("questionNumbers");

    if(!box||!currentTest)return;

    const part=
        currentTest.parts[currentPartIndex];

    const numbers=
        getPartQuestionNumbers(part);

    box.innerHTML=
        numbers
        .map(number=>`

            <button
                type="button"
                class="question-nav-number ${
                    isAnswered(
                        studentAnswers[number]
                    )
                        ?"answered"
                        :""
                }"
                data-nav-question="${number}"
            >
                ${number}
            </button>

        `)
        .join("");

    box
        .querySelectorAll(
            "[data-nav-question]"
        )
        .forEach(button=>{

            button.onclick=()=>{

                const el=
                    document.querySelector(
                        `[data-question-number="${CSS.escape(
                            button.dataset.navQuestion
                        )}"]`
                    );

                if(el){

                    el.closest(
                        ".question-item,.summary-blank,.summary-completion"
                    )?.scrollIntoView({
                        behavior:"smooth",
                        block:"center"
                    });
                }
            };
        });
}

function updateNavigator(){

    const box=
        $("questionNavigator")||
        $("questionNav")||
        $("questionNumbers");

    if(!box)return;

    box
        .querySelectorAll(
            "[data-nav-question]"
        )
        .forEach(button=>{

            button.classList.toggle(
                "answered",
                isAnswered(
                    studentAnswers[
                        button.dataset.navQuestion
                    ]
                )
            );
        });
}

/* =========================================================
   PART NAVIGATION
========================================================= */

function updatePartButtons(){

    const previous=
        $("previousPartButton");

    const next=
        $("nextPartButton");

    if(previous){

        previous.disabled=
            currentPartIndex===0;
    }

    if(next){

        next.textContent=
            currentPartIndex===
            currentTest.parts.length-1
                ?"Finish Test"
                :"Next Part";
    }
}

function previousPart(){

    saveAllVisibleAnswers();

    if(currentPartIndex>0){

        currentPartIndex--;

        renderCurrentPart();
    }
}

function nextPart(){

    saveAllVisibleAnswers();

    if(
        currentPartIndex<
        currentTest.parts.length-1
    ){

        currentPartIndex++;

        renderCurrentPart();

    }else{

        confirmSubmitTest();
    }
}

/* =========================================================
   SUBMIT
========================================================= */

function confirmExitTest(){

    if(
        !testStarted||
        testSubmitted
    ){

        showDashboard();

        return;
    }

    const ok=
        confirm(
            "Are you sure you want to leave this test?\n\nYour answers are saved locally."
        );

    if(ok){

        stopTimer();

        showDashboard();
    }
}

function confirmSubmitTest(){

    if(testSubmitted)return;

    saveAllVisibleAnswers();

    const total=
        countTotalQuestions();

    const answered=
        countAnsweredAnswers(
            studentAnswers
        );

    const unanswered=
        total-answered;

    const message=
        unanswered>0
            ?`You still have ${unanswered} unanswered question(s).\n\nAre you sure you want to submit?`
            :"Are you sure you want to submit your test?";

    const modal=
        $("confirmModal");

    if(modal){

        const text=
            modal.querySelector(
                ".confirm-message"
            )||
            modal.querySelector(
                "[data-confirm-message]"
            );

        if(text){
            text.textContent=
                message;
        }

        modal.style.display=
            "flex";

    }else{

        if(confirm(message)){
            submitTest();
        }
    }
}

function closeConfirmModal(){

    const modal=
        $("confirmModal");

    if(modal){
        modal.style.display=
            "none";
    }
}

function autoSubmitTest(){

    saveAllVisibleAnswers();

    submitTest();
}

/* =========================================================
   SCORE
========================================================= */

async function submitTest(){

    if(testSubmitted)return;

    saveAllVisibleAnswers();

    closeConfirmModal();

    stopTimer();

    testElapsedSeconds=
        calculateTimeUsed();

    testSubmitted=true;

    submittedAnswers=
        JSON.parse(
            JSON.stringify(
                studentAnswers
            )
        );

    scoreData=
        calculateScore(
            submittedAnswers
        );

    clearCurrentTestAnswers();

    renderResult();
}

function getAllQuestions(){

    const result=[];

    if(!currentTest)return result;

    currentTest.parts.forEach(
        (part,partIndex)=>{

            (part.questionGroups||[])
            .forEach(group=>{

                [
                    ...(group.questions||[]),
                    ...(group.blanks||[])
                ].forEach(question=>{

                    result.push({
                        ...question,
                        partIndex,
                        group
                    });
                });
            });
        }
    );

    return result;
}

function countTotalQuestions(){

    return getAllQuestions().length;
}

function getCorrectAnswer(question){

    return (
        question.answer??
        question.correctAnswer??
        question.correct??
        question.answers??
        question.expectedAnswer??
        question.solution
    );
}

function answersMatch(user,correct){

    if(!isAnswered(user)){
        return false;
    }

    if(
        correct===undefined||
        correct===null
    ){
        return false;
    }

    if(Array.isArray(correct)){

        let userValues=
            Array.isArray(user)
                ?user
                :String(user)
                    .split(",")
                    .map(x=>x.trim())
                    .filter(Boolean);

        const correctValues=
            correct.map(
                x=>getOptionValue(x)
            );

        if(
            userValues.length!==
            correctValues.length
        ){
            return false;
        }

        return userValues.every(
            x=>
                correctValues.some(
                    y=>
                        normalize(
                            getOptionValue(x)
                        )===
                        normalize(
                            getOptionValue(y)
                        )
                )
        );
    }

    if(
        typeof correct==="object"
    ){

        return normalize(
            getOptionValue(user)
        )===
        normalize(
            getOptionValue(correct)
        );
    }

    return normalize(user)===
        normalize(correct);
}

function calculateScore(
    answerSet=studentAnswers
){

    let total=0;
    let correct=0;

    const partScores=[];
    const partTotals=[];

    currentTest.parts.forEach(
        (part,index)=>{

            let partScore=0;
            let partTotal=0;

            (part.questionGroups||[])
            .forEach(group=>{

                const questions=[
                    ...(group.questions||[]),
                    ...(group.blanks||[])
                ];

                questions.forEach(question=>{

                    partTotal++;
                    total++;

                    const user=
                        answerSet[
                            question.number
                        ];

                    const answer=
                        getCorrectAnswer(
                            question
                        );

                    if(
                        answersMatch(
                            user,
                            answer
                        )
                    ){

                        partScore++;
                        correct++;
                    }
                });
            });

            partScores[index]=
                partScore;

            partTotals[index]=
                partTotal;
        }
    );

    return {

        totalScore:correct,

        totalQuestions:total,

        partScores,

        partTotals,

        band:
            calculateIELTSBand(
                correct
            ),

        timeUsed:
            formatTime(
                testElapsedSeconds
            )
    };
}

/* =========================================================
   IELTS READING BAND
========================================================= */

function calculateIELTSBand(score){

    if(score>=39)return 9.0;
    if(score>=37)return 8.5;
    if(score>=35)return 8.0;
    if(score>=33)return 7.5;
    if(score>=30)return 7.0;
    if(score>=27)return 6.5;
    if(score>=23)return 6.0;
    if(score>=19)return 5.5;
    if(score>=15)return 5.0;
    if(score>=13)return 4.5;
    if(score>=10)return 4.0;
    if(score>=8)return 3.5;
    if(score>=6)return 3.0;
    if(score>=4)return 2.5;
    if(score>=2)return 2.0;
    if(score>=1)return 1.0;

    return 0;
}

function countAnsweredAnswers(answers){

    return getAllQuestions()
        .filter(
            q=>
                isAnswered(
                    answers[
                        q.number
                    ]
                )
        )
        .length;
}

/* =========================================================
   RESULT PAGE
========================================================= */

function renderResult(){

    showScreen("resultScreen");

    const score=
        scoreData.totalScore;

    const total=
        scoreData.totalQuestions;

    const answered=
        countAnsweredAnswers(
            submittedAnswers
        );

    const incorrect=
        Math.max(
            0,
            answered-score
        );

    const unanswered=
        Math.max(
            0,
            total-answered
        );

    const accuracy=
        answered
            ?Math.round(
                (score/answered)*100
            )
            :0;

    const title=
        currentTest.title||
        `IELTS Reading Test ${currentTestNumber}`;

    const screen=
        $("resultScreen");

    if(!screen)return;

    screen.innerHTML=`

        <div class="reading-result-report">

            <div class="results-heading">

                <div class="results-kicker">
                    TEST COMPLETE
                </div>

                <h1>
                    Your Reading Result
                </h1>

                <p>
                    ${escapeHTML(
                        getPlainText(title)
                    )}
                </p>

                <button
                    id="printResultButton"
                    class="print-score-button"
                    type="button"
                >
                    Print / Save PDF
                </button>

            </div>

            <div class="result-hero">

                <div class="score-ring">

                    <div class="score-ring-inner">

                        <strong>
                            ${score}
                        </strong>

                        <span>
                            / ${total}
                        </span>

                    </div>

                </div>

                <div class="hero-copy">

                    <div class="status-pill">
                        Completed
                    </div>

                    <h2>
                        Estimated IELTS Band
                        ${Number(
                            scoreData.band
                        ).toFixed(1)}
                    </h2>

                    <p>
                        You answered
                        ${answered}
                        of
                        ${total}
                        questions.
                    </p>

                    <p>
                        Time used:
                        <strong>
                            ${scoreData.timeUsed}
                        </strong>
                    </p>

                </div>

            </div>

            <div class="result-summary">

                <div class="summary-stat">
                    <strong>${score}</strong>
                    <span>Correct</span>
                </div>

                <div class="summary-stat">
                    <strong>${incorrect}</strong>
                    <span>Incorrect</span>
                </div>

                <div class="summary-stat">
                    <strong>${unanswered}</strong>
                    <span>Unanswered</span>
                </div>

                <div class="summary-stat">
                    <strong>${accuracy}%</strong>
                    <span>Accuracy</span>
                </div>

            </div>

            <section class="result-section">

                <h2>
                    Part-by-Part Score
                </h2>

                <div class="part-score-grid">

                    ${renderPartScoreHTML()}

                </div>

            </section>

            <section class="result-section">

                <div class="review-header">

                    <div>

                        <h2>
                            Question Review
                        </h2>

                        <p>
                            Review your answers and compare them with the correct answers.
                        </p>

                    </div>

                    <div class="legend">

                        <span>
                            <i class="legend-dot correct"></i>
                            Correct
                        </span>

                        <span>
                            <i class="legend-dot incorrect"></i>
                            Incorrect
                        </span>

                        <span>
                            <i class="legend-dot unanswered"></i>
                            Unanswered
                        </span>

                    </div>

                </div>

                <div class="review-grid">

                    ${renderReviewHTML()}

                </div>

            </section>

            <div class="results-actions">

                <button
                    class="secondary-btn"
                    type="button"
                    onclick="startAgainFromResult()"
                >
                    Start Again
                </button>

                <button
                    class="primary-btn"
                    type="button"
                    onclick="printScorePDF()"
                >
                    Print / Save PDF
                </button>

            </div>

        </div>
    `;

    const printButton=
        $("printResultButton");

    if(printButton){
        printButton.onclick=
            printScorePDF;
    }
}

function renderPartScoreHTML(){

    return currentTest.parts
        .map((part,index)=>{

            const score=
                scoreData.partScores[index]||0;

            const total=
                scoreData.partTotals[index]||0;

            const percentage=
                total
                    ?Math.round(
                        (score/total)*100
                    )
                    :0;

            return `

                <div class="part-score-card">

                    <div class="part-score-top">

                        <strong>
                            Part ${index+1}
                        </strong>

                        <span>
                            ${score} / ${total}
                        </span>

                    </div>

                    <div class="mini-progress">

                        <span
                            style="width:${percentage}%"
                        ></span>

                    </div>

                    <small>
                        ${percentage}% correct
                    </small>

                </div>

            `;
        })
        .join("");
}

function renderReviewHTML(){

    return getAllQuestions()
        .map(question=>{

            const number=
                question.number;

            const user=
                submittedAnswers[
                    number
                ];

            const correct=
                getCorrectAnswer(
                    question
                );

            const answered=
                isAnswered(user);

            const correctAnswer=
                answered&&
                answersMatch(
                    user,
                    correct
                );

            let status=
                "unanswered";

            if(correctAnswer){
                status="correct";
            }else if(answered){
                status="incorrect";
            }

            return `

                <div class="review-item ${status}">

                    <div class="review-item-top">

                        <span class="review-number">
                            Q${escapeHTML(
                                getPlainText(number)
                            )}
                        </span>

                        <span class="review-status">
                            ${
                                status==="correct"
                                    ?"Correct"
                                    :status==="incorrect"
                                    ?"Incorrect"
                                    :"Unanswered"
                            }
                        </span>

                    </div>

                    <div class="review-question">

                        ${escapeHTML(
                            getPlainText(
                                question.question||
                                question.text||
                                question.prompt||
                                question.statement||
                                ""
                            )
                        )}

                    </div>

                    <div class="review-answer">

                        <div>

                            <small>
                                Your answer
                            </small>

                            <strong>
                                ${
                                    answered
                                        ?escapeHTML(
                                            formatAnswer(user)
                                        )
                                        :"No answer"
                                }
                            </strong>

                        </div>

                        <div>

                            <small>
                                Correct answer
                            </small>

                            <strong>
                                ${escapeHTML(
                                    formatAnswer(
                                        correct
                                    )
                                )}
                            </strong>

                        </div>

                    </div>

                </div>
            `;
        })
        .join("");
}

/* =========================================================
   START AGAIN
========================================================= */

function startAgainFromResult(){

    if(!currentTest)return;

    studentAnswers={};
    submittedAnswers={};
    scoreData=null;
    testSubmitted=false;
    currentPartIndex=0;

    startTest();
}

/* =========================================================
   PRINT RESULT / PDF
========================================================= */

function printScorePDF(){

    if(
        !scoreData||
        !currentTest
    ){

        alert(
            "Please submit the test before printing the score report."
        );

        return;
    }

    const score=
        scoreData.totalScore;

    const total=
        scoreData.totalQuestions;

    const answered=
        countAnsweredAnswers(
            submittedAnswers
        );

    const incorrect=
        Math.max(
            0,
            answered-score
        );

    const unanswered=
        Math.max(
            0,
            total-answered
        );

    const accuracy=
        answered
            ?Math.round(
                (score/answered)*100
            )
            :0;

    const title=
        currentTest.title||
        `IELTS Reading Test ${currentTestNumber}`;

    const parts=
        currentTest.parts
        .map((part,index)=>{

            const partScore=
                scoreData.partScores[index]||0;

            const partTotal=
                scoreData.partTotals[index]||0;

            const percentage=
                partTotal
                    ?Math.round(
                        (partScore/partTotal)*100
                    )
                    :0;

            return `

                <div class="part-card">

                    <div class="part-card-header">

                        <strong>
                            Part ${index+1}
                        </strong>

                        <span>
                            ${partScore} /
                            ${partTotal}
                        </span>

                    </div>

                    <div class="bar">

                        <span
                            style="width:${percentage}%"
                        ></span>

                    </div>

                    <small>
                        ${percentage}% correct
                    </small>

                </div>
            `;
        })
        .join("");

    const reviews=
        getAllQuestions()
        .map(question=>{

            const number=
                question.number;

            const user=
                submittedAnswers[number];

            const correct=
                getCorrectAnswer(question);

            const answeredQuestion=
                isAnswered(user);

            const isCorrect=
                answeredQuestion&&
                answersMatch(
                    user,
                    correct
                );

            const status=
                isCorrect
                    ?"Correct"
                    :answeredQuestion
                    ?"Incorrect"
                    :"Unanswered";

            return `

                <div class="print-review ${status.toLowerCase()}">

                    <div class="review-title">

                        <strong>
                            Q${escapeHTML(
                                getPlainText(number)
                            )}
                        </strong>

                        <span>
                            ${status}
                        </span>

                    </div>

                    <p>
                        ${escapeHTML(
                            getPlainText(
                                question.question||
                                question.text||
                                question.prompt||
                                question.statement||
                                ""
                            )
                        )}
                    </p>

                    <div class="answers">

                        <div>

                            <b>
                                Your answer
                            </b>

                            <span>
                                ${
                                    answeredQuestion
                                        ?escapeHTML(
                                            formatAnswer(user)
                                        )
                                        :"No answer"
                                }
                            </span>

                        </div>

                        <div>

                            <b>
                                Correct answer
                            </b>

                            <span>
                                ${escapeHTML(
                                    formatAnswer(
                                        correct
                                    )
                                )}
                            </span>

                        </div>

                    </div>

                </div>
            `;
        })
        .join("");

    const printWindow=
        window.open(
            "",
            "_blank",
            "width=1000,height=900"
        );

    if(!printWindow){

        alert(
            "The print window was blocked. Please allow pop-ups for this website and try again."
        );

        return;
    }

    printWindow.document.open();

    printWindow.document.write(`

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
IELTS Reading Result
</title>

<style>

@page{
    size:A4;
    margin:14mm;
}

*{
    box-sizing:border-box;
}

body{
    margin:0;
    background:#fff;
    color:#222;
    font-family:Arial,Helvetica,sans-serif;
    line-height:1.5;
}

.report{
    width:100%;
    max-width:900px;
    margin:auto;
}

.header{
    text-align:center;
    border-bottom:2px solid #383838;
    padding-bottom:20px;
    margin-bottom:25px;
}

.kicker{
    font-size:11px;
    font-weight:bold;
    letter-spacing:2px;
    color:#777;
}

h1{
    margin:5px 0;
    font-size:30px;
}

.subtitle{
    margin:0;
    color:#777;
}

.hero{
    display:flex;
    align-items:center;
    gap:30px;
    border:1px solid #ddd;
    border-radius:15px;
    padding:25px;
    margin-bottom:20px;
}

.score-circle{
    width:125px;
    height:125px;
    min-width:125px;
    border-radius:50%;
    border:10px solid #383838;
    display:flex;
    align-items:center;
    justify-content:center;
    flex-direction:column;
}

.score-circle strong{
    font-size:34px;
    line-height:1;
}

.score-circle span{
    color:#777;
    font-size:13px;
}

.band{
    display:inline-block;
    background:#383838;
    color:white;
    padding:5px 12px;
    border-radius:20px;
    font-size:12px;
    font-weight:bold;
}

.hero h2{
    margin:8px 0;
}

.hero p{
    margin:4px 0;
    color:#555;
}

.stats{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    border:1px solid #ddd;
    border-radius:12px;
    overflow:hidden;
    margin-bottom:30px;
}

.stat{
    text-align:center;
    padding:18px 8px;
    border-right:1px solid #ddd;
}

.stat:last-child{
    border-right:0;
}

.stat strong{
    display:block;
    font-size:23px;
}

.stat span{
    color:#777;
    font-size:12px;
}

.section{
    margin-top:30px;
}

.section h2{
    font-size:20px;
    margin-bottom:15px;
}

.parts{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:12px;
}

.part-card{
    border:1px solid #ddd;
    border-radius:10px;
    padding:14px;
}

.part-card-header{
    display:flex;
    justify-content:space-between;
    margin-bottom:10px;
}

.bar{
    height:8px;
    background:#eee;
    border-radius:20px;
    overflow:hidden;
    margin-bottom:6px;
}

.bar span{
    display:block;
    height:100%;
    background:#383838;
}

.part-card small{
    color:#777;
}

.print-review{
    border:1px solid #ddd;
    border-radius:10px;
    padding:15px;
    margin-bottom:12px;
    page-break-inside:avoid;
}

.print-review.correct{
    border-left:5px solid #388e3c;
}

.print-review.incorrect{
    border-left:5px solid #d32f2f;
}

.print-review.unanswered{
    border-left:5px solid #777;
}

.review-title{
    display:flex;
    justify-content:space-between;
    margin-bottom:8px;
}

.review-title span{
    font-size:11px;
    padding:3px 8px;
    background:#eee;
    border-radius:15px;
}

.print-review p{
    margin:7px 0 12px;
}

.answers{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:10px;
}

.answers div{
    background:#f7f7f7;
    padding:10px;
    border-radius:7px;
}

.answers b,
.answers span{
    display:block;
}

.answers b{
    font-size:10px;
    color:#777;
    text-transform:uppercase;
    margin-bottom:4px;
}

.footer{
    margin-top:30px;
    padding-top:15px;
    border-top:1px solid #ddd;
    text-align:center;
    font-size:11px;
    color:#777;
}

@media print{

    body{
        -webkit-print-color-adjust:exact;
        print-color-adjust:exact;
    }

    .print-review{
        page-break-inside:avoid;
    }
}

</style>

</head>

<body>

<div class="report">

    <div class="header">

        <div class="kicker">
            IELTS READING
        </div>

        <h1>
            ${escapeHTML(
                getPlainText(title)
            )}
        </h1>

        <p class="subtitle">
            Reading Test Result Report
        </p>

    </div>

    <div class="hero">

        <div class="score-circle">

            <strong>
                ${score}
            </strong>

            <span>
                / ${total}
            </span>

        </div>

        <div>

            <span class="band">
                Estimated Band
                ${Number(
                    scoreData.band
                ).toFixed(1)}
            </span>

            <h2>
                Test Completed
            </h2>

            <p>
                Time used:
                <strong>
                    ${scoreData.timeUsed}
                </strong>
            </p>

            <p>
                Accuracy:
                <strong>
                    ${accuracy}%
                </strong>
            </p>

        </div>

    </div>

    <div class="stats">

        <div class="stat">
            <strong>${score}</strong>
            <span>Correct</span>
        </div>

        <div class="stat">
            <strong>${incorrect}</strong>
            <span>Incorrect</span>
        </div>

        <div class="stat">
            <strong>${unanswered}</strong>
            <span>Unanswered</span>
        </div>

        <div class="stat">
            <strong>${accuracy}%</strong>
            <span>Accuracy</span>
        </div>

    </div>

    <div class="section">

        <h2>
            Part-by-Part Score
        </h2>

        <div class="parts">
            ${parts}
        </div>

    </div>

    <div class="section">

        <h2>
            Question Review
        </h2>

        ${reviews}

    </div>

    <div class="footer">
        IELTS Reading Practice
    </div>

</div>

</body>

</html>

    `);

    printWindow.document.close();

    /*
       Firefox/Chrome:
       Wait until the new document has rendered,
       then explicitly trigger print.
    */

    setTimeout(()=>{

        try{

            printWindow.focus();

            printWindow.print();

        }catch(error){

            console.error(
                "Print error:",
                error
            );
        }

    },1000);
}

/* =========================================================
   PUBLIC API
========================================================= */

function getAllQuestionNumbers(){

    return getAllQuestions()
        .map(q=>Number(q.number))
        .filter(Number.isFinite)
        .sort((a,b)=>a-b);
}

window.IELTSReading={

    openTest,

    startTest,

    submitTest,

    calculateScore,

    calculateIELTSBand,

    showDashboard,

    printScorePDF,

    getCurrentTest:
        ()=>currentTest,

    getAnswers:
        ()=>studentAnswers,

    getSubmittedAnswers:
        ()=>submittedAnswers,

    getQuestionNumbers:
        getAllQuestionNumbers
};

/* =========================================================
   STYLES
========================================================= */

function injectStyles(){

    if($("ieltsReadingInjectedStyles")){
        return;
    }

    const style=
        document.createElement("style");

    style.id=
        "ieltsReadingInjectedStyles";

    style.textContent=`

.reading-result-report{
    max-width:1100px;
    margin:0 auto;
    padding:30px 20px 60px;
}

.results-heading{
    text-align:center;
    margin-bottom:30px;
}

.results-kicker{
    font-size:12px;
    font-weight:700;
    letter-spacing:2px;
    opacity:.6;
}

.results-heading h1{
    margin:8px 0;
    font-size:32px;
}

.results-heading p{
    color:#777;
}

.print-score-button,
.primary-btn,
.secondary-btn{
    border:0;
    border-radius:9px;
    padding:11px 18px;
    cursor:pointer;
    font-weight:600;
}

.print-score-button,
.primary-btn{
    background:#383838;
    color:white;
}

.secondary-btn{
    background:#eee;
    color:#333;
}

.result-hero{
    display:flex;
    align-items:center;
    gap:30px;
    padding:30px;
    border:1px solid #ddd;
    border-radius:18px;
    margin-bottom:20px;
}

.score-ring{
    width:150px;
    height:150px;
    min-width:150px;
    border-radius:50%;
    display:flex;
    justify-content:center;
    align-items:center;
    background:#383838;
}

.score-ring-inner{
    width:126px;
    height:126px;
    border-radius:50%;
    background:white;
    display:flex;
    align-items:center;
    justify-content:center;
    flex-direction:column;
}

.score-ring-inner strong{
    font-size:38px;
    line-height:1;
}

.score-ring-inner span{
    color:#777;
}

.status-pill{
    display:inline-block;
    padding:5px 12px;
    border-radius:20px;
    background:#383838;
    color:white;
    font-size:12px;
    font-weight:600;
}

.hero-copy h2{
    margin:10px 0;
}

.hero-copy p{
    margin:5px 0;
    color:#666;
}

.result-summary{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    border:1px solid #ddd;
    border-radius:14px;
    overflow:hidden;
    margin-bottom:35px;
}

.summary-stat{
    text-align:center;
    padding:20px 10px;
    border-right:1px solid #ddd;
}

.summary-stat:last-child{
    border-right:0;
}

.summary-stat strong{
    display:block;
    font-size:25px;
}

.summary-stat span{
    font-size:12px;
    color:#777;
}

.result-section{
    margin-top:35px;
}

.result-section h2{
    margin-bottom:8px;
}

.part-score-grid{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:15px;
}

.part-score-card{
    border:1px solid #ddd;
    border-radius:12px;
    padding:16px;
}

.part-score-top{
    display:flex;
    justify-content:space-between;
    margin-bottom:12px;
}

.mini-progress{
    width:100%;
    height:8px;
    background:#eee;
    border-radius:20px;
    overflow:hidden;
}

.mini-progress span{
    display:block;
    height:100%;
    background:#383838;
}

.part-score-card small{
    display:block;
    margin-top:7px;
    color:#777;
}

.review-header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:20px;
    margin-bottom:15px;
}

.review-header p{
    color:#777;
}

.legend{
    display:flex;
    gap:12px;
    flex-wrap:wrap;
    font-size:12px;
}

.legend span{
    display:flex;
    align-items:center;
    gap:5px;
}

.legend-dot{
    width:9px;
    height:9px;
    border-radius:50%;
    display:inline-block;
}

.legend-dot.correct{
    background:#388e3c;
}

.legend-dot.incorrect{
    background:#d32f2f;
}

.legend-dot.unanswered{
    background:#777;
}

.review-grid{
    display:grid;
    gap:12px;
}

.review-item{
    border:1px solid #ddd;
    border-left:5px solid #777;
    border-radius:10px;
    padding:15px;
}

.review-item.correct{
    border-left-color:#388e3c;
}

.review-item.incorrect{
    border-left-color:#d32f2f;
}

.review-item.unanswered{
    border-left-color:#777;
}

.review-item-top{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:10px;
}

.review-number{
    font-weight:700;
}

.review-status{
    font-size:11px;
    padding:4px 9px;
    border-radius:15px;
    background:#eee;
}

.review-question{
    margin-bottom:12px;
}

.review-answer{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:10px;
}

.review-answer div{
    background:#f7f7f7;
    padding:10px;
    border-radius:8px;
}

.review-answer small,
.review-answer strong{
    display:block;
}

.review-answer small{
    color:#777;
    font-size:10px;
    text-transform:uppercase;
    margin-bottom:4px;
}

.results-actions{
    display:flex;
    justify-content:center;
    gap:12px;
    margin-top:35px;
}

.question-item{
    display:flex;
    gap:12px;
    padding:12px 0;
    border-bottom:1px solid #eee;
}

.question-number{
    font-weight:700;
    min-width:30px;
}

.question-body{
    flex:1;
}

.question-text{
    margin-bottom:10px;
}

.choice-option{
    display:flex;
    align-items:flex-start;
    gap:8px;
    margin:7px 0;
    cursor:pointer;
}

.answer-input,
.answer-select{
    width:100%;
    max-width:450px;
    padding:10px 12px;
    border:1px solid #ccc;
    border-radius:7px;
    background:white;
}

.word-bank{
    display:flex;
    flex-wrap:wrap;
    gap:8px;
    margin:15px 0;
}

.drag-option{
    padding:8px 12px;
    border:1px solid #bbb;
    background:white;
    border-radius:7px;
    cursor:grab;
}

.drag-option.selected{
    background:#383838;
    color:white;
}

.summary-blank{
    margin:8px 0;
}

.drop-answer{
    display:inline-block;
    min-width:110px;
    border-bottom:2px solid #383838;
    padding:3px 8px;
    cursor:pointer;
}

.vocabulary-word{
    cursor:pointer;
    border-bottom:1px dotted currentColor;
}

.timer-warning{
    color:#d32f2f!important;
    font-weight:700;
}

@media(max-width:700px){

    .result-hero{
        flex-direction:column;
        text-align:center;
    }

    .result-summary{
        grid-template-columns:repeat(2,1fr);
    }

    .summary-stat:nth-child(2){
        border-right:0;
    }

    .part-score-grid{
        grid-template-columns:1fr;
    }

    .review-header{
        flex-direction:column;
        align-items:flex-start;
    }

    .review-answer{
        grid-template-columns:1fr;
    }

    .results-actions{
        flex-direction:column;
    }

    .results-actions button{
        width:100%;
    }
}

@media print{

    .print-score-button,
    .results-actions{
        display:none!important;
    }

    .reading-result-report{
        padding:0;
    }
}

`;

    document.head.appendChild(style);
}

/* =========================================================
   CSS ESCAPE FALLBACK
========================================================= */

if(!window.CSS){
    window.CSS={};
}

if(!window.CSS.escape){

    window.CSS.escape=function(value){

        return String(value)
            .replace(
                /[^a-zA-Z0-9_-]/g,
                "\\$&"
            );
    };
}
