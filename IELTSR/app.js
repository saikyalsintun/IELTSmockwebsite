/* =========================================================
   IELTS READING PRACTICE
   LOCAL STORAGE VERSION
   =========================================================

   FEATURES
   ---------------------------------------------------------
   ✓ 8 Reading Tests
   ✓ Local JSON test files
   ✓ LocalStorage answers
   ✓ No login
   ✓ No API
   ✓ No Google Sheets
   ✓ No Teacher/Admin
   ✓ 60-minute timer
   ✓ Auto submit
   ✓ True / False / Not Given
   ✓ Yes / No / Not Given
   ✓ Fill in the blanks
   ✓ Summary completion
   ✓ Multiple choice
   ✓ Multiple choice multiple
   ✓ Matching headings
   ✓ Matching information
   ✓ Matching features
   ✓ Answer box
   ✓ Drag & drop
   ✓ Mobile click-to-place
   ✓ Question navigator
   ✓ Score calculation
   ✓ IELTS band calculation
   ✓ Incorrect answer review
   ✓ Print / Save PDF

   IMPORTANT
   ---------------------------------------------------------
   This file is designed to work with:

       tests/Test1.json
       tests/Test2.json
       ...
       tests/Test8.json
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const CONFIG = {
    TEST_COUNT: 8,
    TEST_FOLDER: "./tests/",
    VOCABULARY_FILE: "./vocabulary.json",
    DEFAULT_DURATION: 60,
    ANSWER_PREFIX: "ieltsReadingAnswers_",
    RESULT_PREFIX: "ieltsReadingResult_"
};


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentTest = null;
let currentTestNumber = null;

let currentPartIndex = 0;

let studentAnswers = {};
let submittedAnswers = {};

let vocabulary = {};

let timerInterval = null;
let remainingSeconds = 0;

let testStartTime = null;
let testElapsedSeconds = 0;

let testStarted = false;
let testSubmitted = false;

let scoreData = null;

let selectedDragOption = null;


/* =========================================================
   STARTUP
   ========================================================= */

window.addEventListener("DOMContentLoaded", function () {

    try {

        injectDragDropStyles();
        injectResultStyles();

        setupGlobalEvents();

        removeTeacherAdminElements();

        /*
         * IMPORTANT:
         *
         * Do NOT wait for vocabulary before displaying
         * the dashboard.
         *
         * If vocabulary.json is missing, the website
         * must still work.
         */

        showDashboard();

        loadVocabulary();

    } catch (error) {

        console.error(
            "IELTS Reading startup error:",
            error
        );

        emergencyShowDashboard();

    }

});


/* =========================================================
   GLOBAL EVENTS
========================================================= */

function setupGlobalEvents() {

    addClick(
        "startTestButton",
        startTest
    );

    addClick(
        "backToDashboardButton",
        showDashboard
    );

    addClick(
        "testBackButton",
        confirmExitTest
    );

    addClick(
        "submitTestButton",
        confirmSubmitTest
    );

    addClick(
        "previousPartButton",
        previousPart
    );

    addClick(
        "nextPartButton",
        nextPart
    );

    addClick(
        "returnDashboardButton",
        showDashboard
    );

    addClick(
        "retakeTestButton",
        function () {

            if (currentTest) {
                startTest();
            }

        }
    );

    addClick(
        "closeVocabularyPopup",
        closeVocabularyPopup
    );

    addClick(
        "closeConfirmModal",
        closeConfirmModal
    );

    addClick(
        "cancelSubmitButton",
        closeConfirmModal
    );

    addClick(
        "confirmSubmitButton",
        submitTest
    );

    /*
     * Close vocabulary popup when clicking outside.
     */

    document.addEventListener(
        "click",
        function (event) {

            if (
                event.target.closest(
                    ".vocabulary-word"
                )
            ) {
                return;
            }

            const popup =
                document.getElementById(
                    "vocabularyPopup"
                );

            if (
                popup &&
                popup.style.display !== "none" &&
                !popup.contains(event.target)
            ) {
                closeVocabularyPopup();
            }

        }
    );

}


/* =========================================================
   ADD CLICK SAFELY
========================================================= */

function addClick(id, handler) {

    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.addEventListener(
        "click",
        handler
    );

}


/* =========================================================
   REMOVE TEACHER / ADMIN
========================================================= */

function removeTeacherAdminElements() {

    const ids = [

        "teacherAdminButton",
        "adminButton",
        "teacherButton",
        "teacherAdminLink",
        "adminLink",
        "teacherLink",
        "teacherAdmin",
        "adminPanelButton"

    ];

    ids.forEach(function (id) {

        const element =
            document.getElementById(id);

        if (element) {
            element.remove();
        }

    });


    /*
     * Remove the actual Admin.html link
     * from your existing HTML.
     */

    document
        .querySelectorAll(
            'a[href*="Admin.html"], a[href*="admin.html"]'
        )
        .forEach(function (element) {

            element.remove();

        });


    /*
     * Remove obvious teacher/admin buttons.
     */

    document
        .querySelectorAll(
            "button, a"
        )
        .forEach(function (element) {

            const text =
                (
                    element.textContent || ""
                )
                    .trim()
                    .toLowerCase();

            if (
                text === "teacher" ||
                text === "admin" ||
                text === "teacher admin" ||
                text === "teacher/admin"
            ) {

                element.remove();

            }

        });

}


/* =========================================================
   DASHBOARD
========================================================= */

async function showDashboard() {

    stopTimer();

    testStarted = false;
    testSubmitted = false;

    closeConfirmModal();

    showScreen(
        "dashboardScreen"
    );

    await renderTestCards();

}


/* =========================================================
   EMERGENCY DASHBOARD
   Prevents completely blank page.
========================================================= */

function emergencyShowDashboard() {

    const screens =
        document.querySelectorAll(
            ".screen"
        );

    screens.forEach(function (screen) {

        screen.style.display =
            "none";

        screen.classList.remove(
            "active"
        );

    });


    const dashboard =
        document.getElementById(
            "dashboardScreen"
        );

    if (dashboard) {

        dashboard.style.display =
            "block";

        dashboard.classList.add(
            "active"
        );

    }

}


/* =========================================================
   TEST CARDS
========================================================= */

async function renderTestCards() {

    const box =
        document.getElementById(
            "testCards"
        );

    if (!box) {
        return;
    }


    box.innerHTML = "";


    for (
        let i = 1;
        i <= CONFIG.TEST_COUNT;
        i++
    ) {

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "test-card";

        card.dataset.testNumber =
            i;


        card.innerHTML = `

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


        card.addEventListener(
            "click",
            function () {

                openTest(i);

            }
        );


        box.appendChild(
            card
        );

    }

}


/* =========================================================
   OPEN TEST
========================================================= */

async function openTest(testNumber) {

    setLoading(
        true,
        "Loading test..."
    );


    try {

        const url =
            `${CONFIG.TEST_FOLDER}Test${testNumber}.json?cache=${Date.now()}`;


        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Test${testNumber}.json could not be loaded. HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        validateTest(
            data
        );


        currentTest =
            data;

        currentTestNumber =
            testNumber;


        currentPartIndex =
            0;


        studentAnswers =
            {};


        submittedAnswers =
            {};


        scoreData =
            null;


        testSubmitted =
            false;


        loadSavedAnswers();


        showTestIntroduction();


    } catch (error) {

        console.error(
            "TEST LOAD ERROR:",
            error
        );


        showToast(
            error.message ||
            "Could not load test."
        );


    } finally {

        setLoading(
            false
        );

    }

}


/* =========================================================
   VALIDATE TEST
========================================================= */

function validateTest(test) {

    if (
        !test ||
        !Array.isArray(test.parts) ||
        !test.parts.length
    ) {

        throw new Error(
            "Invalid test JSON: parts are missing."
        );

    }


    test.parts.forEach(
        function (part, index) {

            if (!part.passage) {

                throw new Error(
                    `Part ${index + 1} is missing passage.`
                );

            }


            if (
                !Array.isArray(
                    part.questionGroups
                )
            ) {

                part.questionGroups =
                    [];

            }


            part.questionGroups.forEach(
                function (group) {

                    if (
                        !Array.isArray(
                            group.questions
                        )
                    ) {

                        group.questions =
                            [];

                    }


                    if (
                        !Array.isArray(
                            group.blanks
                        )
                    ) {

                        group.blanks =
                            [];

                    }

                }
            );

        }
    );

}


/* =========================================================
   INTRODUCTION
========================================================= */

function showTestIntroduction() {

    showScreen(
        "introScreen"
    );


    setText(
        "introTestNumber",
        currentTest.testId ||
        `Test ${currentTestNumber}`
    );


    setText(
        "introTitle",
        currentTest.title ||
        `IELTS Reading Test ${currentTestNumber}`
    );


    setText(
        "introDuration",
        `${currentTest.duration || CONFIG.DEFAULT_DURATION} minutes`
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

function startTest() {

    if (!currentTest) {
        return;
    }


    /*
     * Keep saved answers.
     */

    studentAnswers = {};

    loadSavedAnswers();


    currentPartIndex =
        0;


    testStarted =
        true;

    testSubmitted =
        false;


    testStartTime =
        Date.now();


    remainingSeconds =
        (
            Number(
                currentTest.duration
            ) ||
            CONFIG.DEFAULT_DURATION
        ) * 60;


    testElapsedSeconds =
        0;


    showScreen(
        "testScreen"
    );


    renderCurrentPart();


    startTimer();

}


/* =========================================================
   TIMER
========================================================= */

function startTimer() {

    stopTimer();

    updateTimerDisplay();


    timerInterval =
        setInterval(
            function () {

                remainingSeconds--;

                updateTimerDisplay();


                if (
                    remainingSeconds <= 0
                ) {

                    remainingSeconds =
                        0;

                    stopTimer();

                    autoSubmitTest();

                }

            },
            1000
        );

}


function stopTimer() {

    if (timerInterval) {

        clearInterval(
            timerInterval
        );

        timerInterval =
            null;

    }

}


function updateTimerDisplay() {

    const ids = [

        "timer",
        "timerDisplay",
        "testTimer"

    ];


    for (
        const id of ids
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                formatTime(
                    remainingSeconds
                );

            break;

        }

    }

}


/* =========================================================
   CURRENT PART
========================================================= */

function renderCurrentPart() {

    if (!currentTest) {
        return;
    }


    const part =
        currentTest.parts[
            currentPartIndex
        ];


    if (!part) {
        return;
    }


    setText(
        "testHeaderTitle",
        currentTest.title ||
        `IELTS Reading Test ${currentTestNumber}`
    );


    setText(
        "testHeaderPart",
        `Part ${
            part.partNumber ||
            currentPartIndex + 1
        }`
    );


    setText(
        "passagePartLabel",
        `Part ${
            part.partNumber ||
            currentPartIndex + 1
        }`
    );


    setText(
        "passageTitle",
        part.passage.title ||
        ""
    );


    setText(
        "questionsPartLabel",
        `Questions ${questionRangeForPart(part)}`
    );


    setText(
        "partIndicator",
        `Part ${
            currentPartIndex + 1
        } of ${
            currentTest.parts.length
        }`
    );


    renderPassage(
        part.passage
    );


    renderQuestions(
        part
    );


    renderQuestionNavigator();


    updatePartButtons();


    scrollTestPanelsToTop();

}


/* =========================================================
   QUESTION RANGE
   Includes group.questions AND group.blanks.
========================================================= */

function questionRangeForPart(part) {

    const numbers = [];


    (
        part.questionGroups ||
        []
    ).forEach(
        function (group) {

            (
                group.questions ||
                []
            ).forEach(
                function (question) {

                    const number =
                        Number(
                            question.number
                        );


                    if (
                        Number.isFinite(
                            number
                        )
                    ) {

                        numbers.push(
                            number
                        );

                    }

                }
            );


            (
                group.blanks ||
                []
            ).forEach(
                function (blank) {

                    const number =
                        Number(
                            blank.number
                        );


                    if (
                        Number.isFinite(
                            number
                        )
                    ) {

                        numbers.push(
                            number
                        );

                    }

                }
            );

        }
    );


    if (!numbers.length) {
        return "";
    }


    return `${Math.min(...numbers)}-${Math.max(...numbers)}`;

}


/* =========================================================
   PASSAGE
========================================================= */

function renderPassage(passage) {

    const box =
        document.getElementById(
            "passageContent"
        );


    if (!box) {
        return;
    }


    const paragraphs =
        passage.paragraphs ||
        [];


    box.innerHTML =
        paragraphs
            .map(
                function (paragraph) {

                    return `

                        <p class="passage-paragraph">

                            <span class="paragraph-label">

                                ${escapeHTML(
                                    paragraph.id ||
                                    ""
                                )}

                            </span>

                            ${highlightVocabulary(
                                paragraph.text ||
                                ""
                            )}

                        </p>

                    `;

                }
            )
            .join("");


    box
        .querySelectorAll(
            ".vocabulary-word"
        )
        .forEach(
            function (element) {

                element.addEventListener(
                    "click",
                    function (event) {

                        event.stopPropagation();

                        showVocabularyPopup(
                            element.dataset.word
                        );

                    }
                );

            }
        );

}


/* =========================================================
   VOCABULARY
========================================================= */

async function loadVocabulary() {

    vocabulary = {};


    try {

        const response =
            await fetch(
                `${CONFIG.VOCABULARY_FILE}?cache=${Date.now()}`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {
            return;
        }


        const data =
            await response.json();


        vocabulary =
            data.words ||
            data ||
            {};


    } catch (error) {

        /*
         * Vocabulary is optional.
         *
         * Do NOT stop the website if the file
         * does not exist.
         */

        vocabulary = {};

    }

}


/* =========================================================
   VOCABULARY HIGHLIGHT
========================================================= */

function highlightVocabulary(text) {

    if (
        !vocabulary ||
        !Object.keys(vocabulary).length
    ) {

        return escapeHTML(
            text
        );

    }


    let result =
        escapeHTML(
            text
        );


    const words =
        Object.keys(
            vocabulary
        )
        .sort(
            function (a, b) {

                return (
                    b.length -
                    a.length
                );

            }
        );


    words.forEach(
        function (word) {

            try {

                const regex =
                    new RegExp(
                        `(^|[^A-Za-z])(${escapeRegExp(word)})(?![A-Za-z])`,
                        "gi"
                    );


                result =
                    result.replace(
                        regex,
                        function (
                            match,
                            before,
                            actual
                        ) {

                            return `
                                ${before}
                                <span
                                    class="vocabulary-word"
                                    data-word="${escapeAttribute(actual)}"
                                >
                                    ${actual}
                                </span>
                            `;

                        }
                    );

            } catch (error) {

                /*
                 * Ignore invalid vocabulary entries.
                 */

            }

        }
    );


    return result;

}


/* =========================================================
   VOCABULARY POPUP
========================================================= */

function showVocabularyPopup(word) {

    if (
        !vocabulary ||
        !Object.keys(vocabulary).length
    ) {
        return;
    }


    const key =
        Object.keys(
            vocabulary
        )
        .find(
            function (item) {

                return (
                    item.toLowerCase() ===
                    String(
                        word
                    ).toLowerCase()
                );

            }
        );


    if (!key) {
        return;
    }


    const item =
        vocabulary[key] ||
        {};


    const popup =
        document.getElementById(
            "vocabularyPopup"
        );


    if (!popup) {
        return;
    }


    setText(
        "vocabularyWord",
        word
    );


    setText(
        "vocabularyMeaning",
        item.meaning ||
        "Meaning not available."
    );


    setText(
        "vocabularySimpleMeaning",
        item.simpleMeaning ||
        ""
    );


    popup.style.display =
        "block";

}


function closeVocabularyPopup() {

    const popup =
        document.getElementById(
            "vocabularyPopup"
        );


    if (popup) {

        popup.style.display =
            "none";

    }

}


/* =========================================================
   RENDER QUESTIONS
========================================================= */

function renderQuestions(part) {

    const box =
        document.getElementById(
            "questionsContent"
        );


    if (!box) {
        return;
    }


    box.innerHTML = "";


    (
        part.questionGroups ||
        []
    ).forEach(
        function (group) {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "question-group";


            wrapper.innerHTML = `

                ${
                    group.questionRange
                        ? `
                            <h3 class="question-group-title">
                                Questions ${escapeHTML(
                                    group.questionRange
                                )}
                            </h3>
                        `
                        : ""
                }

                ${
                    group.instructions
                        ? `
                            <p class="question-instructions">
                                ${escapeHTML(
                                    group.instructions
                                )}
                            </p>
                        `
                        : ""
                }

            `;


            const content =
                document.createElement(
                    "div"
                );


            wrapper.appendChild(
                content
            );


            const type =
                normalizeQuestionType(
                    group.type
                );


            switch (type) {

                case "true_false_not_given":

                    renderTrueFalseNotGiven(
                        content,
                        group
                    );

                    break;


                case "yes_no_not_given":

                    renderYesNoNotGiven(
                        content,
                        group
                    );

                    break;


                case "fill_blank":

                    renderFillBlank(
                        content,
                        group
                    );

                    break;


                case "summary_completion":

                    renderSummaryCompletion(
                        content,
                        group
                    );

                    break;


                case "multiple_choice":

                    renderMultipleChoice(
                        content,
                        group
                    );

                    break;


                case "multiple_choice_multiple":

                    renderMultipleChoiceMultiple(
                        content,
                        group
                    );

                    break;


                case "matching_headings":

                    renderMatchingHeadings(
                        content,
                        group
                    );

                    break;


                case "matching_information":

                    renderMatchingInformation(
                        content,
                        group
                    );

                    break;


                case "matching_features":

                    renderMatchingFeatures(
                        content,
                        group
                    );

                    break;


                case "answer_box":

                    renderAnswerBox(
                        content,
                        group
                    );

                    break;


                default:

                    renderUnsupportedGroup(
                        content,
                        group
                    );

                    break;

            }


            box.appendChild(
                wrapper
            );

        }
    );


    restoreAnswers();

}


/* =========================================================
   NORMALIZE QUESTION TYPE
========================================================= */

function normalizeQuestionType(type) {

    return String(
        type || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /-/g,
            "_"
        )
        .replace(
            /\s+/g,
            "_"
        );

}


/* =========================================================
   TRUE / FALSE / NOT GIVEN
========================================================= */

function renderTrueFalseNotGiven(
    box,
    group
) {

    (
        group.questions ||
        []
    ).forEach(
        function (question) {

            box.appendChild(
                createQuestionItem(
                    question,
                    [
                        "TRUE",
                        "FALSE",
                        "NOT GIVEN"
                    ]
                )
            );

        }
    );

}


/* =========================================================
   YES / NO / NOT GIVEN
========================================================= */

function renderYesNoNotGiven(
    box,
    group
) {

    (
        group.questions ||
        []
    ).forEach(
        function (question) {

            box.appendChild(
                createQuestionItem(
                    question,
                    [
                        "YES",
                        "NO",
                        "NOT GIVEN"
                    ]
                )
            );

        }
    );

}


/* =========================================================
   CREATE BASIC QUESTION
========================================================= */

function createQuestionItem(
    question,
    options
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "question";


    item.dataset.questionNumber =
        question.number;


    const questionText =
        question.text ||
        question.question ||
        question.prompt ||
        "";


    item.innerHTML = `

        <div class="question-main">

            <div class="question-number">
                ${escapeHTML(
                    String(
                        question.number
                    )
                )}
            </div>

            <div class="question-body">

                <div class="question-text">
                    ${escapeHTML(
                        questionText
                    )}
                </div>

                <div class="question-control"></div>

            </div>

        </div>

    `;


    const control =
        item.querySelector(
            ".question-control"
        );


    if (
        Array.isArray(options) &&
        options.length
    ) {

        control.innerHTML =
            createRadioOptions(
                question.number,
                options
            );


        control
            .querySelectorAll(
                "input"
            )
            .forEach(
                function (input) {

                    input.addEventListener(
                        "change",
                        handleAnswerChange
                    );

                }
            );

    }


    return item;

}


/* =========================================================
   FILL BLANK
========================================================= */

function renderFillBlank(
    box,
    group
) {

    (
        group.questions ||
        []
    ).forEach(
        function (question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            control.innerHTML = `

                <input
                    type="text"
                    class="answer-input"
                    data-question-number="${question.number}"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="Type your answer"
                >

            `;


            attachInputListener(
                control
            );


            box.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   ANSWER BOX
========================================================= */

function renderAnswerBox(
    box,
    group
) {

    (
        group.questions ||
        []
    ).forEach(
        function (question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            control.innerHTML = `

                <input
                    type="text"
                    class="answer-input"
                    data-question-number="${question.number}"
                    autocomplete="off"
                    spellcheck="false"
                    placeholder="Type your answer"
                >

            `;


            attachInputListener(
                control
            );


            box.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   SUMMARY COMPLETION
========================================================= */

function renderSummaryCompletion(
    box,
    group
) {

    const container =
        document.createElement(
            "div"
        );


    container.className =
        "drag-summary-container";


    const blanks =
        (
            group.blanks &&
            group.blanks.length
        )
            ? group.blanks
            : (
                group.questions ||
                []
            );


    let options =
        getQuestionOptions(
            null,
            group
        );


    /*
     * If no options exist,
     * use the answers as fallback.
     */

    if (!options.length) {

        options =
            blanks
                .map(
                    function (blank) {

                        return blank.answer;

                    }
                )
                .filter(
                    function (answer) {

                        return (
                            answer !==
                            undefined &&
                            answer !==
                            null &&
                            String(
                                answer
                            ).trim() !== ""
                        );

                    }
                );

    }


    options =
        uniqueOptions(
            options
        );


    /*
     * Word bank.
     */

    const bank =
        document.createElement(
            "div"
        );


    bank.className =
        "summary-word-bank";


    bank.innerHTML = `

        <div class="summary-word-bank-title">
            Choose an answer
        </div>

        <div class="summary-word-options"></div>

    `;


    const bankOptions =
        bank.querySelector(
            ".summary-word-options"
        );


    options.forEach(
        function (option) {

            const value =
                optionValue(
                    option
                );


            const text =
                optionText(
                    option
                );


            const word =
                document.createElement(
                    "button"
                );


            word.type =
                "button";


            word.className =
                "summary-drag-word";


            word.dataset.value =
                value;


            word.dataset.text =
                text;


            word.textContent =
                text;


            word.addEventListener(
                "click",
                function () {

                    selectedDragOption = {

                        value: value,
                        text: text

                    };


                    document
                        .querySelectorAll(
                            ".summary-drag-word"
                        )
                        .forEach(
                            function (element) {

                                element.classList.remove(
                                    "selected"
                                );

                            }
                        );


                    word.classList.add(
                        "selected"
                    );

                }
            );


            word.draggable =
                true;


            word.addEventListener(
                "dragstart",
                function (event) {

                    event.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({

                            value: value,
                            text: text

                        })
                    );

                }
            );


            bankOptions.appendChild(
                word
            );

        }
    );


    container.appendChild(
        bank
    );


    /*
     * Summary text.
     */

    const summary =
        document.createElement(
            "div"
        );


    summary.className =
        "summary-question";


    let html =
        group.summary ||
        group.text ||
        group.content ||
        group.passage ||
        "";


    html =
        escapeHTML(
            html
        );


    /*
     * Replace {{23}}, {23}, [23]
     */

    html =
        html.replace(
            /\{\{(\d+)\}\}|\{(\d+)\}|\[(\d+)\]/g,
            function (
                match,
                a,
                b,
                c
            ) {

                const number =
                    Number(
                        a ||
                        b ||
                        c
                    );


                const exists =
                    blanks.some(
                        function (blank) {

                            return (
                                Number(
                                    blank.number
                                ) ===
                                number
                            );

                        }
                    );


                if (!exists) {
                    return match;
                }


                return createSummaryDropZone(
                    number
                );

            }
        );


    /*
     * Replace underscores.
     */

    let blankIndex =
        0;


    html =
        html.replace(
            /_{2,}/g,
            function () {

                const blank =
                    blanks[
                        blankIndex
                    ];


                blankIndex++;


                if (!blank) {
                    return "________";
                }


                return createSummaryDropZone(
                    blank.number
                );

            }
        );


    summary.innerHTML =
        html;


    container.appendChild(
        summary
    );


    /*
     * If no zones exist,
     * show fallback rows.
     */

    const zones =
        summary.querySelectorAll(
            ".summary-drop-zone"
        );


    if (
        zones.length === 0 &&
        blanks.length
    ) {

        const fallback =
            document.createElement(
                "div"
            );


        fallback.className =
            "summary-fallback";


        blanks.forEach(
            function (blank) {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "summary-fallback-row";


                row.innerHTML = `

                    <strong>
                        ${blank.number}.
                    </strong>

                    ${createSummaryDropZone(
                        blank.number
                    )}

                `;


                fallback.appendChild(
                    row
                );

            }
        );


        container.appendChild(
            fallback
        );

    }


    box.appendChild(
        container
    );


    /*
     * Setup zones.
     */

    container
        .querySelectorAll(
            ".summary-drop-zone"
        )
        .forEach(
            function (zone) {

                setupDropZone(
                    zone,
                    Number(
                        zone.dataset.questionNumber
                    )
                );

            }
        );


    restoreDragDropAnswers();

}


/* =========================================================
   CREATE SUMMARY DROP ZONE
========================================================= */

function createSummaryDropZone(
    questionNumber
) {

    return `

        <span
            class="summary-drop-zone"
            data-question-number="${questionNumber}"
        >

            <span class="summary-drop-placeholder">
                Select
            </span>

        </span>

    `;

}


/* =========================================================
   MULTIPLE CHOICE
========================================================= */

function renderMultipleChoice(
    box,
    group
) {

    (
        group.questions ||
        []
    ).forEach(
        function (question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            const options =
                question.options ||
                group.options ||
                [];


            control.innerHTML =
                createSelectOptions(
                    options
                );


            const select =
                control.querySelector(
                    "select"
                );


            if (select) {

                select.dataset.questionNumber =
                    question.number;


                select.addEventListener(
                    "change",
                    handleAnswerChange
                );

            }


            box.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   MULTIPLE CHOICE MULTIPLE
========================================================= */

function renderMultipleChoiceMultiple(
    box,
    group
) {

    (
        group.questions ||
        []
    ).forEach(
        function (question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            const options =
                question.options ||
                group.options ||
                [];


            /*
             * If the JSON has "answersRequired",
             * display a select for the question.
             */

            control.innerHTML =
                createSelectOptions(
                    options
                );


            const select =
                control.querySelector(
                    "select"
                );


            if (select) {

                select.dataset.questionNumber =
                    question.number;


                select.addEventListener(
                    "change",
                    handleAnswerChange
                );

            }


            box.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   MATCHING HEADINGS
========================================================= */

function renderMatchingHeadings(
    box,
    group
) {

    const options =
        group.options ||
        group.headings ||
        [];


    renderMatchingSelects(
        box,
        group,
        options
    );

}


/* =========================================================
   MATCHING INFORMATION
========================================================= */

function renderMatchingInformation(
    box,
    group
) {

    const options =
        group.options ||
        group.letters ||
        group.paragraphs ||
        [];


    renderMatchingSelects(
        box,
        group,
        options
    );

}


/* =========================================================
   MATCHING FEATURES
========================================================= */

function renderMatchingFeatures(
    box,
    group
) {

    const options =
        group.options ||
        group.features ||
        group.people ||
        [];


    renderMatchingSelects(
        box,
        group,
        options
    );

}


/* =========================================================
   MATCHING SELECTS
========================================================= */

function renderMatchingSelects(
    box,
    group,
    options
) {

    (
        group.questions ||
        []
    ).forEach(
        function (question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            control.innerHTML =
                createSelectOptions(
                    options
                );


            const select =
                control.querySelector(
                    "select"
                );


            if (select) {

                select.dataset.questionNumber =
                    question.number;


                select.addEventListener(
                    "change",
                    handleAnswerChange
                );

            }


            box.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   UNSUPPORTED GROUP
========================================================= */

function renderUnsupportedGroup(
    box,
    group
) {

    console.warn(
        "Unsupported question type:",
        group.type
    );


    (
        group.questions ||
        []
    ).forEach(
        function (question) {

            const item =
                createQuestionItem(
                    question
                );


            const control =
                item.querySelector(
                    ".question-control"
                );


            control.innerHTML = `

                <input
                    type="text"
                    class="answer-input"
                    data-question-number="${question.number}"
                    placeholder="Answer"
                >

            `;


            attachInputListener(
                control
            );


            box.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   CREATE RADIO OPTIONS
========================================================= */

function createRadioOptions(
    questionNumber,
    options
) {

    if (!options.length) {
        return "";
    }


    return `

        <div class="radio-options">

            ${options
                .map(
                    function (option, index) {

                        const value =
                            optionValue(
                                option
                            );


                        const text =
                            optionText(
                                option
                            );


                        return `

                            <label class="radio-option">

                                <input
                                    type="radio"
                                    name="question_${questionNumber}"
                                    value="${escapeAttribute(value)}"
                                    data-question-number="${questionNumber}"
                                >

                                <span>
                                    ${escapeHTML(text)}
                                </span>

                            </label>

                        `;

                    }
                )
                .join("")}

        </div>

    `;

}


/* =========================================================
   CREATE SELECT
========================================================= */

function createSelectOptions(
    options
) {

    let html = `

        <select class="answer-select">

            <option value="">
                Select an answer
            </option>

    `;


    (
        options ||
        []
    ).forEach(
        function (option) {

            const value =
                optionValue(
                    option
                );


            const text =
                optionText(
                    option
                );


            html += `

                <option value="${escapeAttribute(value)}">

                    ${escapeHTML(text)}

                </option>

            `;

        }
    );


    html += `

        </select>

    `;


    return html;

}


/* =========================================================
   OPTION VALUE
========================================================= */

function optionValue(option) {

    if (
        option &&
        typeof option === "object"
    ) {

        return String(
            option.value ??
            option.id ??
            option.letter ??
            option.key ??
            option.text ??
            ""
        );

    }


    return String(
        option ??
        ""
    );

}


/* =========================================================
   OPTION TEXT
========================================================= */

function optionText(option) {

    if (
        option &&
        typeof option === "object"
    ) {

        return String(
            option.text ??
            option.label ??
            option.title ??
            option.value ??
            option.id ??
            ""
        );

    }


    return String(
        option ??
        ""
    );

}


/* =========================================================
   GET QUESTION OPTIONS
========================================================= */

function getQuestionOptions(
    question,
    group
) {

    const sources = [];


    if (
        question &&
        Array.isArray(
            question.options
        )
    ) {

        sources.push(
            question.options
        );

    }


    if (
        group &&
        Array.isArray(
            group.options
        )
    ) {

        sources.push(
            group.options
        );

    }


    if (
        group &&
        Array.isArray(
            group.choices
        )
    ) {

        sources.push(
            group.choices
        );

    }


    if (
        group &&
        Array.isArray(
            group.answerOptions
        )
    ) {

        sources.push(
            group.answerOptions
        );

    }


    if (
        group &&
        Array.isArray(
            group.words
        )
    ) {

        sources.push(
            group.words
        );

    }


    if (
        group &&
        Array.isArray(
            group.wordBank
        )
    ) {

        sources.push(
            group.wordBank
        );

    }


    if (!sources.length) {
        return [];
    }


    return sources[0];

}


/* =========================================================
   UNIQUE OPTIONS
========================================================= */

function uniqueOptions(
    options
) {

    const result = [];
    const seen = new Set();


    (
        options ||
        []
    ).forEach(
        function (option) {

            const value =
                normalizeAnswer(
                    optionValue(
                        option
                    )
                );


            if (!seen.has(value)) {

                seen.add(
                    value
                );

                result.push(
                    option
                );

            }

        }
    );


    return result;

}


/* =========================================================
   INPUT LISTENER
========================================================= */

function attachInputListener(
    control
) {

    const input =
        control.querySelector(
            "input"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        handleAnswerChange
    );


    input.addEventListener(
        "change",
        handleAnswerChange
    );

}


/* =========================================================
   HANDLE ANSWER CHANGE
========================================================= */

function handleAnswerChange(event) {

    const element =
        event.target;


    const number =
        Number(
            element.dataset.questionNumber
        );


    if (
        !Number.isFinite(
            number
        )
    ) {
        return;
    }


    let value = "";


    if (
        element.type === "radio"
    ) {

        if (!element.checked) {
            return;
        }

        value =
            element.value;

    } else {

        value =
            element.value;

    }


    studentAnswers[
        number
    ] =
        value;


    saveAnswersToStorage();


    updateQuestionNavigator();

}


/* =========================================================
   SAVE ALL VISIBLE ANSWERS
========================================================= */

function saveAllVisibleAnswers() {

    /*
     * Inputs
     */

    document
        .querySelectorAll(
            "[data-question-number]"
        )
        .forEach(
            function (element) {

                const number =
                    Number(
                        element.dataset.questionNumber
                    );


                if (
                    !Number.isFinite(
                        number
                    )
                ) {
                    return;
                }


                /*
                 * Skip drag zones.
                 */

                if (
                    element.classList.contains(
                        "summary-drop-zone"
                    ) ||
                    element.classList.contains(
                        "drag-drop-zone"
                    )
                ) {
                    return;
                }


                /*
                 * Radio.
                 */

                if (
                    element.type ===
                    "radio"
                ) {

                    if (
                        element.checked
                    ) {

                        studentAnswers[
                            number
                        ] =
                            element.value;

                    }

                    return;

                }


                /*
                 * Select/input.
                 */

                if (
                    "value" in element
                ) {

                    studentAnswers[
                        number
                    ] =
                        element.value;

                }

            }
        );


    saveAnswersToStorage();

    updateQuestionNavigator();

}


/* =========================================================
   RESTORE ANSWERS
========================================================= */

function restoreAnswers() {

    document
        .querySelectorAll(
            "[data-question-number]"
        )
        .forEach(
            function (element) {

                const number =
                    Number(
                        element.dataset.questionNumber
                    );


                if (
                    !Number.isFinite(
                        number
                    )
                ) {
                    return;
                }


                const saved =
                    studentAnswers[
                        number
                    ];


                if (
                    saved ===
                    undefined ||
                    saved === null
                ) {
                    return;
                }


                if (
                    element.type ===
                    "radio"
                ) {

                    element.checked =
                        normalizeAnswer(
                            element.value
                        ) ===
                        normalizeAnswer(
                            saved
                        );

                    return;

                }


                if (
                    element.tagName ===
                    "SELECT"
                ) {

                    element.value =
                        String(
                            saved
                        );

                    return;

                }


                if (
                    "value" in element
                ) {

                    element.value =
                        String(
                            saved
                        );

                }

            }
        );


    restoreDragDropAnswers();


    updateQuestionNavigator();

}


/* =========================================================
   DRAG/DROP SUMMARY
========================================================= */

function setupDropZone(
    zone,
    number
) {

    zone.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();

            zone.classList.add(
                "drag-over"
            );

        }
    );


    zone.addEventListener(
        "dragleave",
        function () {

            zone.classList.remove(
                "drag-over"
            );

        }
    );


    zone.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();


            zone.classList.remove(
                "drag-over"
            );


            let data = null;


            try {

                data =
                    JSON.parse(
                        event.dataTransfer.getData(
                            "text/plain"
                        )
                    );

            } catch (error) {

                data = null;

            }


            if (!data) {
                return;
            }


            placeDragAnswer(
                zone,
                number,
                data.value,
                data.text
            );

        }
    );


    zone.addEventListener(
        "click",
        function () {

            if (
                selectedDragOption
            ) {

                placeDragAnswer(
                    zone,
                    number,
                    selectedDragOption.value,
                    selectedDragOption.text
                );


                selectedDragOption =
                    null;


                document
                    .querySelectorAll(
                        ".summary-drag-word"
                    )
                    .forEach(
                        function (element) {

                            element.classList.remove(
                                "selected"
                            );

                        }
                    );

            }

        }
    );

}


/* =========================================================
   PLACE DRAG ANSWER
========================================================= */

function placeDragAnswer(
    zone,
    number,
    value,
    text
) {

    studentAnswers[
        number
    ] =
        value;


    zone.innerHTML = `

        <span class="summary-drop-answer">

            ${escapeHTML(
                text
            )}

        </span>

    `;


    zone.classList.add(
        "has-answer"
    );


    saveAnswersToStorage();


    updateQuestionNavigator();

}


/* =========================================================
   RESTORE DRAG ANSWERS
========================================================= */

function restoreDragDropAnswers() {

    document
        .querySelectorAll(
            ".summary-drop-zone"
        )
        .forEach(
            function (zone) {

                const number =
                    Number(
                        zone.dataset.questionNumber
                    );


                const saved =
                    studentAnswers[
                        number
                    ];


                if (
                    saved ===
                    undefined ||
                    saved === null ||
                    String(
                        saved
                    ).trim() === ""
                ) {
                    return;
                }


                const option =
                    findVisibleOption(
                        saved
                    );


                if (option) {

                    placeDragAnswer(
                        zone,
                        number,
                        option.value,
                        option.text
                    );

                }

            }
        );

}


/* =========================================================
   FIND VISIBLE OPTION
========================================================= */

function findVisibleOption(
    value
) {

    const target =
        normalizeAnswer(
            value
        );


    const elements =
        document.querySelectorAll(
            ".summary-drag-word, .drag-option"
        );


    for (
        const element of elements
    ) {

        const elementValue =
            normalizeAnswer(
                element.dataset.value
            );


        const elementText =
            normalizeAnswer(
                element.dataset.text ||
                element.textContent
            );


        if (
            elementValue ===
                target ||
            elementText ===
                target
        ) {

            return {

                value:
                    element.dataset.value ||
                    element.dataset.text,

                text:
                    element.dataset.text ||
                    element.textContent.trim()

            };

        }

    }


    return {

        value: String(value),

        text: String(value)

    };

}


/* =========================================================
   QUESTION NAVIGATOR
========================================================= */

function renderQuestionNavigator() {

    const nav =
        document.getElementById(
            "questionNavigator"
        );


    if (!nav) {
        return;
    }


    const numbers =
        getAllQuestionNumbers();


    nav.innerHTML =
        numbers
            .map(
                function (number) {

                    return `

                        <button
                            type="button"
                            class="question-nav-item"
                            data-question-nav="${number}"
                        >
                            ${number}
                        </button>

                    `;

                }
            )
            .join("");


    nav
        .querySelectorAll(
            "button"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        jumpToQuestion(
                            Number(
                                button.dataset.questionNav
                            )
                        );

                    }
                );

            }
        );


    updateQuestionNavigator();

}


/* =========================================================
   GET ALL QUESTION NUMBERS
========================================================= */

function getAllQuestionNumbers() {

    const numbers = [];


    (
        currentTest?.parts ||
        []
    ).forEach(
        function (part) {

            (
                part.questionGroups ||
                []
            ).forEach(
                function (group) {

                    (
                        group.questions ||
                        []
                    ).forEach(
                        function (question) {

                            const number =
                                Number(
                                    question.number
                                );


                            if (
                                Number.isFinite(
                                    number
                                )
                            ) {

                                numbers.push(
                                    number
                                );

                            }

                        }
                    );


                    (
                        group.blanks ||
                        []
                    ).forEach(
                        function (blank) {

                            const number =
                                Number(
                                    blank.number
                                );


                            if (
                                Number.isFinite(
                                    number
                                )
                            ) {

                                numbers.push(
                                    number
                                );

                            }

                        }
                    );

                }
            );

        }
    );


    return [
        ...new Set(
            numbers
        )
    ].sort(
        function (a, b) {

            return a - b;

        }
    );

}


/* =========================================================
   UPDATE QUESTION NAVIGATOR
========================================================= */

function updateQuestionNavigator() {

    const nav =
        document.getElementById(
            "questionNavigator"
        );


    if (!nav) {
        return;
    }


    nav
        .querySelectorAll(
            "[data-question-nav]"
        )
        .forEach(
            function (button) {

                const number =
                    Number(
                        button.dataset.questionNav
                    );


                button.classList.toggle(
                    "answered",
                    isQuestionAnswered(
                        number
                    )
                );

            }
        );

}


/* =========================================================
   IS ANSWERED
========================================================= */

function isQuestionAnswered(
    number
) {

    const value =
        studentAnswers[
            number
        ];


    return (
        value !== undefined &&
        value !== null &&
        String(
            value
        ).trim() !== ""
    );

}


/* =========================================================
   JUMP TO QUESTION
========================================================= */

function jumpToQuestion(
    number
) {

    const element =
        document.querySelector(
            `[data-question-number="${number}"]`
        );


    if (!element) {
        return;
    }


    const question =
        element.closest(
            ".question, .drag-question, .summary-drop-zone"
        );


    (
        question ||
        element
    ).scrollIntoView({

        behavior: "smooth",

        block: "center"

    });

}


/* =========================================================
   NEXT PART
========================================================= */

function nextPart() {

    saveAllVisibleAnswers();


    if (
        currentPartIndex <
        currentTest.parts.length - 1
    ) {

        currentPartIndex++;

        renderCurrentPart();

    } else {

        confirmSubmitTest();

    }

}


/* =========================================================
   PREVIOUS PART
========================================================= */

function previousPart() {

    saveAllVisibleAnswers();


    if (
        currentPartIndex >
        0
    ) {

        currentPartIndex--;

        renderCurrentPart();

    }

}


/* =========================================================
   PART BUTTONS
========================================================= */

function updatePartButtons() {

    const previous =
        document.getElementById(
            "previousPartButton"
        );


    const next =
        document.getElementById(
            "nextPartButton"
        );


    if (previous) {

        previous.disabled =
            currentPartIndex === 0;

    }


    if (next) {

        if (
            currentPartIndex ===
            currentTest.parts.length - 1
        ) {

            next.textContent =
                "Submit Test →";

        } else {

            next.textContent =
                "Next Part →";

        }

    }

}


/* =========================================================
   SCROLL PANELS
========================================================= */

function scrollTestPanelsToTop() {

    [
        "passagePanel",
        "questionsPanel"
    ]
        .forEach(
            function (id) {

                const element =
                    document.getElementById(
                        id
                    );


                if (element) {

                    element.scrollTop =
                        0;

                }

            }
        );

}


/* =========================================================
   CONFIRM SUBMIT
========================================================= */

function confirmSubmitTest() {

    if (testSubmitted) {
        return;
    }


    openConfirmModal();

}


/* =========================================================
   CONFIRM EXIT
========================================================= */

function confirmExitTest() {

    if (
        !testStarted ||
        testSubmitted
    ) {

        showDashboard();

        return;

    }


    const answer =
        window.confirm(
            "Leave this test? Your current test will not be submitted."
        );


    if (answer) {

        stopTimer();

        showDashboard();

    }

}


/* =========================================================
   MODAL
========================================================= */

function openConfirmModal() {

    const modal =
        document.getElementById(
            "confirmModal"
        );


    if (modal) {

        modal.style.display =
            "flex";

    }

}


function closeConfirmModal() {

    const modal =
        document.getElementById(
            "confirmModal"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


/* =========================================================
   AUTO SUBMIT
========================================================= */

function autoSubmitTest() {

    if (testSubmitted) {
        return;
    }


    showToast(
        "Time is up. Your test is being submitted."
    );


    submitTest();

}


/* =========================================================
   SUBMIT TEST
========================================================= */

function submitTest() {

    if (testSubmitted) {
        return;
    }


    saveAllVisibleAnswers();


    closeConfirmModal();


    stopTimer();


    testSubmitted =
        true;


    testElapsedSeconds =
        calculateTimeUsed();


    submittedAnswers =
        {
            ...studentAnswers
        };


    scoreData =
        calculateScore(
            submittedAnswers
        );


    saveResultToLocalStorage();


    renderResult();


    clearCurrentTestAnswers();

}


/* =========================================================
   TIME USED
========================================================= */

function calculateTimeUsed() {

    if (!testStartTime) {
        return 0;
    }


    return Math.max(
        0,
        Math.floor(
            (
                Date.now() -
                testStartTime
            ) / 1000
        )
    );

}


/* =========================================================
   SCORE
========================================================= */

function calculateScore(
    answerSet
) {

    answerSet =
        answerSet ||
        studentAnswers;


    let total =
        0;


    const partScores =
        [];


    const partTotals =
        [];


    (
        currentTest?.parts ||
        []
    ).forEach(
        function (part) {

            let partScore =
                0;


            let partTotal =
                0;


            (
                part.questionGroups ||
                []
            ).forEach(
                function (group) {

                    const questions =
                        getGroupQuestions(
                            group
                        );


                    questions.forEach(
                        function (question) {

                            partTotal++;


                            const given =
                                answerSet[
                                    question.number
                                ];


                            if (
                                answersMatch(
                                    given,
                                    question.answer
                                )
                            ) {

                                partScore++;

                            }

                        }
                    );

                }
            );


            partScores.push(
                partScore
            );


            partTotals.push(
                partTotal
            );


            total +=
                partScore;

        }
    );


    return {

        totalScore:
            total,

        totalQuestions:
            countTotalQuestions(),

        partScores:
            partScores,

        partTotals:
            partTotals,

        band:
            calculateIELTSBand(
                total
            ),

        timeUsed:
            formatTime(
                testElapsedSeconds
            )

    };

}


/* =========================================================
   GET GROUP QUESTIONS
   Always includes blanks.
========================================================= */

function getGroupQuestions(
    group
) {

    const result = [];


    (
        group.questions ||
        []
    ).forEach(
        function (question) {

            result.push(
                question
            );

        }
    );


    (
        group.blanks ||
        []
    ).forEach(
        function (blank) {

            /*
             * Avoid duplicate question numbers.
             */

            const exists =
                result.some(
                    function (item) {

                        return (
                            Number(
                                item.number
                            ) ===
                            Number(
                                blank.number
                            )
                        );

                    }
                );


            if (!exists) {

                result.push(
                    blank
                );

            }

        }
    );


    return result;

}


/* =========================================================
   COUNT QUESTIONS
========================================================= */

function countTotalQuestions() {

    return getAllQuestionNumbers()
        .length;

}


/* =========================================================
   ANSWERS MATCH
========================================================= */

function answersMatch(
    given,
    correct
) {

    if (
        given === undefined ||
        given === null ||
        correct === undefined ||
        correct === null
    ) {

        return false;

    }


    /*
     * Multiple accepted answers.
     */

    if (
        Array.isArray(
            correct
        )
    ) {

        return correct.some(
            function (answer) {

                return (
                    normalizeAnswer(
                        given
                    ) ===
                    normalizeAnswer(
                        answer
                    )
                );

            }
        );

    }


    /*
     * Object answer.
     */

    if (
        correct &&
        typeof correct === "object"
    ) {

        const values =
            [
                correct.value,
                correct.answer,
                correct.text,
                correct.id,
                correct.letter
            ]
            .filter(
                function (value) {

                    return (
                        value !==
                        undefined &&
                        value !==
                        null
                    );

                }
            );


        return values.some(
            function (value) {

                return (
                    normalizeAnswer(
                        given
                    ) ===
                    normalizeAnswer(
                        value
                    )
                );

            }
        );

    }


    return (
        normalizeAnswer(
            given
        ) ===
        normalizeAnswer(
            correct
        )
    );

}


/* =========================================================
   NORMALIZE ANSWER
========================================================= */

function normalizeAnswer(
    value
) {

    return String(
        value ?? ""
    )
        .trim()
        .replace(
            /\s+/g,
            " "
        )
        .toLowerCase();

}


/* =========================================================
   IELTS READING BAND
========================================================= */

function calculateIELTSBand(
    score
) {

    /*
     * Academic Reading approximate IELTS conversion.
     */

    const bands = {

        40: 9.0,
        39: 9.0,
        38: 8.5,
        37: 8.5,
        36: 8.0,
        35: 8.0,
        34: 7.5,
        33: 7.5,
        32: 7.5,
        31: 7.0,
        30: 7.0,
        29: 6.5,
        28: 6.5,
        27: 6.5,
        26: 6.0,
        25: 6.0,
        24: 6.0,
        23: 6.0,
        22: 5.5,
        21: 5.5,
        20: 5.5,
        19: 5.5,
        18: 5.0,
        17: 5.0,
        16: 5.0,
        15: 4.5,
        14: 4.5,
        13: 4.5,
        12: 4.0,
        11: 4.0,
        10: 4.0,
        9: 4.0,
        8: 3.5,
        7: 3.5,
        6: 3.5,
        5: 3.0,
        4: 3.0,
        3: 2.5,
        2: 2.5,
        1: 2.0,
        0: 1.0

    };


    const safeScore =
        Math.max(
            0,
            Math.min(
                40,
                Number(score) || 0
            )
        );


    return (
        bands[
            safeScore
        ] ??
        1.0
    );

}


/* =========================================================
   LOCAL STORAGE ANSWER KEY
========================================================= */

function getAnswerStorageKey() {

    return (
        CONFIG.ANSWER_PREFIX +
        String(
            currentTestNumber
        )
    );

}


/* =========================================================
   SAVE ANSWERS
========================================================= */

function saveAnswersToStorage() {

    if (!currentTestNumber) {
        return;
    }


    try {

        localStorage.setItem(
            getAnswerStorageKey(),
            JSON.stringify(
                studentAnswers
            )
        );

    } catch (error) {

        console.warn(
            "Could not save answers:",
            error
        );

    }

}


/* =========================================================
   LOAD ANSWERS
========================================================= */

function loadSavedAnswers() {

    if (!currentTestNumber) {
        return;
    }


    try {

        const raw =
            localStorage.getItem(
                getAnswerStorageKey()
            );


        if (!raw) {
            return;
        }


        const saved =
            JSON.parse(
                raw
            );


        if (
            saved &&
            typeof saved === "object"
        ) {

            studentAnswers =
                saved;

        }

    } catch (error) {

        console.warn(
            "Could not load saved answers:",
            error
        );


        studentAnswers =
            {};

    }

}


/* =========================================================
   SAVE RESULT LOCALLY
========================================================= */

function saveResultToLocalStorage() {

    if (!currentTestNumber) {
        return;
    }


    try {

        const key =
            CONFIG.RESULT_PREFIX +
            currentTestNumber;


        const results =
            JSON.parse(
                localStorage.getItem(
                    key
                ) ||
                "[]"
            );


        results.unshift({

            date:
                new Date().toISOString(),

            test:
                currentTestNumber,

            title:
                currentTest?.title ||
                `IELTS Reading Test ${currentTestNumber}`,

            score:
                scoreData.totalScore,

            total:
                scoreData.totalQuestions,

            band:
                scoreData.band,

            timeUsed:
                scoreData.timeUsed

        });


        localStorage.setItem(
            key,
            JSON.stringify(
                results.slice(
                    0,
                    20
                )
            )
        );

    } catch (error) {

        console.warn(
            "Could not save result:",
            error
        );

    }

}


/* =========================================================
   CLEAR CURRENT ANSWERS
========================================================= */

function clearCurrentTestAnswers() {

    /*
     * Do NOT delete submittedAnswers.
     *
     * The result screen needs them.
     */

    try {

        localStorage.removeItem(
            getAnswerStorageKey()
        );

    } catch (error) {

        console.warn(
            "Could not clear answers:",
            error
        );

    }

}


/* =========================================================
   RESULT SCREEN
========================================================= */

function renderResult() {

    if (!scoreData) {
        return;
    }


    showScreen(
        "resultScreen"
    );


    const screen =
        document.getElementById(
            "resultScreen"
        );


    if (!screen) {
        return;
    }


    /*
     * Use the existing result content if available.
     */

    let oldContent =
        screen.querySelector(
            ".result-content"
        );


    if (!oldContent) {

        oldContent =
            screen.querySelector(
                ".result-card"
            );

    }


    if (!oldContent) {

        oldContent =
            screen;

    }


    const report =
        document.createElement(
            "div"
        );


    report.id =
        "readingResultReport";


    report.className =
        "reading-result-report";


    const score =
        scoreData.totalScore;


    const total =
        scoreData.totalQuestions;


    const incorrect =
        countIncorrectAnswers();


    const unanswered =
        countUnansweredAnswers();


    const accuracy =
        total
            ? Math.round(
                (
                    score /
                    total
                ) *
                100
            )
            : 0;


    const percentage =
        total
            ? Math.round(
                (
                    score /
                    total
                ) *
                100
            )
            : 0;


    const title =
        currentTest?.title ||
        `IELTS Reading Test ${currentTestNumber}`;


    report.innerHTML = `

        <div class="results-page">

            <div class="results-heading">

                <div>

                    <div class="results-kicker">
                        TEST COMPLETE
                    </div>

                    <h1>
                        Your Reading Result
                    </h1>

                    <p>
                        ${escapeHTML(title)}
                    </p>

                </div>

                <button
                    type="button"
                    class="print-score-button"
                    onclick="printScorePDF()"
                >
                    Print result
                </button>

            </div>


            <div class="result-hero">

                <div
                    class="score-ring"
                    style="--score-percent:${percentage}%"
                >

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
                        Reading test completed
                    </div>

                    <h2>
                        Estimated IELTS Reading Band
                        ${Number(scoreData.band).toFixed(1)}
                    </h2>

                    <p>
                        Time used:
                        ${escapeHTML(scoreData.timeUsed)}
                    </p>

                    <small>
                        Your result is calculated from
                        the answers submitted at the end
                        of the test.
                    </small>

                </div>

            </div>


            <div class="result-summary">

                <div>
                    <strong>
                        ${score}
                    </strong>
                    <span>
                        Correct
                    </span>
                </div>

                <div>
                    <strong>
                        ${incorrect}
                    </strong>
                    <span>
                        Incorrect
                    </span>
                </div>

                <div>
                    <strong>
                        ${unanswered}
                    </strong>
                    <span>
                        Unanswered
                    </span>
                </div>

                <div>
                    <strong>
                        ${accuracy}%
                    </strong>
                    <span>
                        Accuracy
                    </span>
                </div>

            </div>


            <div class="result-section">

                <div class="result-section-heading">

                    <h2>
                        Part-by-part score
                    </h2>

                    <span>
                        ${score} / ${total}
                    </span>

                </div>

                <div
                    class="part-score-grid"
                    id="readingPartScoreGrid"
                ></div>

            </div>


            <div class="result-section">

                <div class="result-section-heading">

                    <h2>
                        Question review
                    </h2>

                    <span>
                        ${total} questions
                    </span>

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


                <div
                    class="review-grid"
                    id="readingReviewGrid"
                ></div>

            </div>


            <div class="results-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="startAgainFromResult()"
                >
                    Start again
                </button>

                <button
                    type="button"
                    class="secondary-btn print-score-button"
                    onclick="printScorePDF()"
                >
                    Print / Save PDF
                </button>

            </div>

        </div>

    `;


    /*
     * Replace old report.
     */

    oldContent.innerHTML =
        "";

    oldContent.appendChild(
        report
    );


    populateReadingPartGrid();

    populateReadingReviewGrid();

}


/* =========================================================
   START AGAIN
========================================================= */

function startAgainFromResult() {

    if (!currentTest) {
        return;
    }


    submittedAnswers =
        {};


    scoreData =
        null;


    studentAnswers =
        {};


    try {

        localStorage.removeItem(
            getAnswerStorageKey()
        );

    } catch (error) {

        console.warn(
            error
        );

    }


    startTest();

}


/* =========================================================
   PART SCORE GRID
========================================================= */

function populateReadingPartGrid() {

    const grid =
        document.getElementById(
            "readingPartScoreGrid"
        );


    if (!grid || !scoreData) {
        return;
    }


    grid.innerHTML = "";


    scoreData.partScores.forEach(
        function (partScore, index) {

            const total =
                scoreData.partTotals[
                    index
                ];


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "part-score-card";


            const percentage =
                total
                    ? Math.round(
                        (
                            partScore /
                            total
                        ) *
                        100
                    )
                    : 0;


            card.innerHTML = `

                <div class="part-score-title">
                    Part ${index + 1}
                </div>

                <strong>
                    ${partScore} / ${total}
                </strong>

                <span>
                    ${percentage}%
                </span>

                <div class="part-score-bar">

                    <span
                        style="width:${percentage}%"
                    ></span>

                </div>

            `;


            grid.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   REVIEW GRID
========================================================= */

function populateReadingReviewGrid() {

    const grid =
        document.getElementById(
            "readingReviewGrid"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML = "";


    const questions =
        getAllQuestionObjects();


    questions.forEach(
        function (question) {

            const number =
                Number(
                    question.number
                );


            const given =
                submittedAnswers[
                    number
                ];


            const correct =
                question.answer;


            let status =
                "unanswered";


            if (
                given !==
                    undefined &&
                given !==
                    null &&
                String(
                    given
                ).trim() !== ""
            ) {

                status =
                    answersMatch(
                        given,
                        correct
                    )
                        ? "correct"
                        : "incorrect";

            }


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                `review-item ${status}`;


            item.innerHTML = `

                <div class="review-number">
                    ${number}
                </div>

                <div class="review-status">
                    ${
                        status === "correct"
                            ? "✓"
                            : status === "incorrect"
                                ? "✕"
                                : "—"
                    }
                </div>

                <div class="review-content">

                    <strong>
                        ${escapeHTML(
                            getReviewQuestionText(
                                question
                            )
                        )}
                    </strong>

                    <div class="review-answer">

                        <span>
                            Your answer:
                        </span>

                        <b>
                            ${escapeHTML(
                                formatReviewAnswer(
                                    given
                                )
                            )}
                        </b>

                    </div>

                    ${
                        status !== "correct"
                            ? `
                                <div class="review-correct">

                                    <span>
                                        Correct answer:
                                    </span>

                                    <b>
                                        ${escapeHTML(
                                            formatCorrectAnswer(
                                                correct
                                            )
                                        )}
                                    </b>

                                </div>
                            `
                            : ""
                    }

                </div>

            `;


            grid.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   GET ALL QUESTIONS
========================================================= */

function getAllQuestionObjects() {

    const result =
        [];


    (
        currentTest?.parts ||
        []
    ).forEach(
        function (part) {

            (
                part.questionGroups ||
                []
            ).forEach(
                function (group) {

                    getGroupQuestions(
                        group
                    ).forEach(
                        function (question) {

                            const number =
                                Number(
                                    question.number
                                );


                            if (
                                Number.isFinite(
                                    number
                                )
                            ) {

                                const exists =
                                    result.some(
                                        function (item) {

                                            return (
                                                Number(
                                                    item.number
                                                ) ===
                                                number
                                            );

                                        }
                                    );


                                if (!exists) {

                                    result.push(
                                        question
                                    );

                                }

                            }

                        }
                    );

                }
            );

        }
    );


    return result.sort(
        function (a, b) {

            return (
                Number(
                    a.number
                ) -
                Number(
                    b.number
                )
            );

        }
    );

}


/* =========================================================
   QUESTION TEXT FOR REVIEW
========================================================= */

function getReviewQuestionText(
    question
) {

    return (
        question.text ||
        question.question ||
        question.prompt ||
        question.statement ||
        `Question ${question.number}`
    );

}


/* =========================================================
   FORMAT REVIEW ANSWER
========================================================= */

function formatReviewAnswer(
    answer
) {

    if (
        answer === undefined ||
        answer === null ||
        String(
            answer
        ).trim() === ""
    ) {

        return "Not answered";

    }


    if (
        Array.isArray(
            answer
        )
    ) {

        return answer.join(
            ", "
        );

    }


    if (
        typeof answer ===
        "object"
    ) {

        return (
            answer.text ||
            answer.value ||
            answer.answer ||
            JSON.stringify(
                answer
            )
        );

    }


    return String(
        answer
    );

}


/* =========================================================
   FORMAT CORRECT ANSWER
========================================================= */

function formatCorrectAnswer(
    answer
) {

    if (
        answer === undefined ||
        answer === null
    ) {

        return "Not available";

    }


    if (
        Array.isArray(
            answer
        )
    ) {

        return answer.join(
            " / "
        );

    }


    if (
        typeof answer ===
        "object"
    ) {

        return (
            answer.text ||
            answer.value ||
            answer.answer ||
            JSON.stringify(
                answer
            )
        );

    }


    return String(
        answer
    );

}


/* =========================================================
   INCORRECT COUNT
========================================================= */

function countIncorrectAnswers() {

    let count =
        0;


    getAllQuestionObjects()
        .forEach(
            function (question) {

                const given =
                    submittedAnswers[
                        question.number
                    ];


                if (
                    given !==
                        undefined &&
                    given !==
                        null &&
                    String(
                        given
                    ).trim() !== ""
                ) {

                    if (
                        !answersMatch(
                            given,
                            question.answer
                        )
                    ) {

                        count++;

                    }

                }

            }
        );


    return count;

}


/* =========================================================
   UNANSWERED COUNT
========================================================= */

function countUnansweredAnswers() {

    let count =
        0;


    getAllQuestionObjects()
        .forEach(
            function (question) {

                const given =
                    submittedAnswers[
                        question.number
                    ];


                if (
                    given ===
                        undefined ||
                    given ===
                        null ||
                    String(
                        given
                    ).trim() === ""
                ) {

                    count++;

                }

            }
        );


    return count;

}


/* =========================================================
   CLEAR RESULT HISTORY
========================================================= */

function clearResultHistory() {

    for (
        let i = 1;
        i <= CONFIG.TEST_COUNT;
        i++
    ) {

        try {

            localStorage.removeItem(
                CONFIG.RESULT_PREFIX +
                i
            );

        } catch (error) {

            console.warn(
                error
            );

        }

    }

}


/* =========================================================
   PRINT / SAVE PDF
========================================================= */

function printScorePDF() {

    if (!scoreData) {
        return;
    }


    const title =
        currentTest?.title ||
        `IELTS Reading Test ${currentTestNumber}`;


    const score =
        scoreData.totalScore;


    const total =
        scoreData.totalQuestions;


    const band =
        Number(
            scoreData.band
        ).toFixed(1);


    const incorrect =
        countIncorrectAnswers();


    const unanswered =
        countUnansweredAnswers();


    const accuracy =
        total
            ? Math.round(
                (
                    score /
                    total
                ) *
                100
            )
            : 0;


    const questions =
        getAllQuestionObjects();


    const reviewHTML =
        questions
            .map(
                function (question) {

                    const given =
                        submittedAnswers[
                            question.number
                        ];


                    const correct =
                        question.answer;


                    const answered =
                        (
                            given !==
                                undefined &&
                            given !==
                                null &&
                            String(
                                given
                            ).trim() !== ""
                        );


                    const isCorrect =
                        answered &&
                        answersMatch(
                            given,
                            correct
                        );


                    return `

                        <tr>

                            <td>
                                ${question.number}
                            </td>

                            <td>
                                ${escapeHTML(
                                    getReviewQuestionText(
                                        question
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    formatReviewAnswer(
                                        given
                                    )
                                )}
                            </td>

                            <td>
                                ${isCorrect
                                    ? "Correct"
                                    : "Incorrect"}
                            </td>

                            <td>
                                ${escapeHTML(
                                    formatCorrectAnswer(
                                        correct
                                    )
                                )}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    const partHTML =
        scoreData.partScores
            .map(
                function (
                    value,
                    index
                ) {

                    return `

                        <tr>

                            <td>
                                Part ${index + 1}
                            </td>

                            <td>
                                ${value}
                            </td>

                            <td>
                                ${scoreData.partTotals[index]}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    const printWindow =
        window.open(
            "",
            "_blank"
        );


    if (!printWindow) {

        showToast(
            "Please allow pop-ups to print the result."
        );

        return;

    }


    printWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <title>
                IELTS Reading Result
            </title>

            <style>

                * {
                    box-sizing: border-box;
                }

                body {
                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;

                    margin: 0;
                    padding: 30px;

                    color: #222;
                    background: white;
                }

                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;

                    border-bottom:
                        2px solid #222;

                    padding-bottom: 18px;

                    margin-bottom: 25px;
                }

                h1 {
                    margin: 0 0 8px;
                }

                h2 {
                    margin-top: 30px;
                }

                .meta {
                    color: #666;
                }

                .summary {
                    display: grid;

                    grid-template-columns:
                        repeat(
                            4,
                            1fr
                        );

                    gap: 12px;

                    margin: 20px 0;
                }

                .summary-box {
                    border:
                        1px solid #ddd;

                    padding: 18px;

                    border-radius: 10px;

                    text-align: center;
                }

                .summary-box strong {
                    display: block;

                    font-size: 28px;

                    margin-bottom: 5px;
                }

                .summary-box span {
                    color: #666;
                }

                table {
                    width: 100%;

                    border-collapse:
                        collapse;

                    margin-top: 15px;

                    font-size: 12px;
                }

                th,
                td {
                    border:
                        1px solid #ddd;

                    padding: 8px;

                    text-align: left;

                    vertical-align: top;
                }

                th {
                    background:
                        #f1f1f1;
                }

                .band {
                    font-size: 42px;
                    font-weight: bold;
                }

                .footer {
                    margin-top: 30px;

                    color: #777;

                    font-size: 11px;
                }

                @media print {

                    body {
                        padding: 10px;
                    }

                    .no-print {
                        display: none;
                    }

                    table {
                        page-break-inside: auto;
                    }

                    tr {
                        page-break-inside: avoid;
                    }

                }

            </style>

        </head>

        <body>

            <div class="header">

                <div>

                    <h1>
                        IELTS Reading Result
                    </h1>

                    <div class="meta">
                        ${escapeHTML(title)}
                    </div>

                    <div class="meta">
                        ${formatDate(
                            new Date()
                        )}
                    </div>

                </div>

                <div>

                    <div class="meta">
                        IELTS Band
                    </div>

                    <div class="band">
                        ${band}
                    </div>

                </div>

            </div>


            <div class="summary">

                <div class="summary-box">

                    <strong>
                        ${score}
                    </strong>

                    <span>
                        Correct
                    </span>

                </div>


                <div class="summary-box">

                    <strong>
                        ${incorrect}
                    </strong>

                    <span>
                        Incorrect
                    </span>

                </div>


                <div class="summary-box">

                    <strong>
                        ${unanswered}
                    </strong>

                    <span>
                        Unanswered
                    </span>

                </div>


                <div class="summary-box">

                    <strong>
                        ${accuracy}%
                    </strong>

                    <span>
                        Accuracy
                    </span>

                </div>

            </div>


            <h2>
                Part Scores
            </h2>


            <table>

                <thead>

                    <tr>

                        <th>
                            Part
                        </th>

                        <th>
                            Correct
                        </th>

                        <th>
                            Total
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${partHTML}

                </tbody>

            </table>


            <h2>
                Question Review
            </h2>


            <table>

                <thead>

                    <tr>

                        <th>
                            Q
                        </th>

                        <th>
                            Question
                        </th>

                        <th>
                            Your Answer
                        </th>

                        <th>
                            Status
                        </th>

                        <th>
                            Correct Answer
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${reviewHTML}

                </tbody>

            </table>


            <div class="footer">

                IELTS Reading Practice

            </div>


            <script>

                window.onload =
                    function () {

                        setTimeout(
                            function () {

                                window.print();

                            },
                            300
                        );

                    };

            <\/script>

        </body>

        </html>

    `);


    printWindow.document.close();

}


/* =========================================================
   SCREEN MANAGEMENT
   IMPORTANT FIX
   ---------------------------------------------------------
   Your HTML has:

   style="display: none;"

   Therefore:

       element.style.display = ""

   DOES NOT WORK.

   We explicitly use "block".
========================================================= */

function showScreen(id) {

    const screens =
        document.querySelectorAll(
            ".screen"
        );


    screens.forEach(
        function (screen) {

            screen.style.display =
                "none";

            screen.classList.remove(
                "active"
            );

        }
    );


    const target =
        document.getElementById(
            id
        );


    if (!target) {

        console.error(
            "Screen not found:",
            id
        );

        return;

    }


    /*
     * THIS IS THE IMPORTANT FIX.
     */

    target.style.display =
        "block";


    target.classList.add(
        "active"
    );


    window.scrollTo(
        0,
        0
    );

}


/* =========================================================
   LOADING
========================================================= */

function setLoading(
    visible,
    text
) {

    const overlay =
        document.getElementById(
            "loadingOverlay"
        );


    if (!overlay) {
        return;
    }


    if (text) {

        setText(
            "loadingText",
            text
        );

    }


    overlay.style.display =
        visible
            ? "flex"
            : "none";

}


/* =========================================================
   TOAST
========================================================= */

let toastTimeout =
    null;


function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {

        console.warn(
            message
        );

        return;

    }


    toast.textContent =
        message;


    toast.style.display =
        "block";


    clearTimeout(
        toastTimeout
    );


    toastTimeout =
        setTimeout(
            function () {

                toast.style.display =
                    "none";

            },
            3500
        );

}


/* =========================================================
   TIME FORMAT
========================================================= */

function formatTime(
    seconds
) {

    seconds =
        Math.max(
            0,
            Number(
                seconds
            ) || 0
        );


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remaining =
        seconds % 60;


    return (

        String(
            minutes
        ).padStart(
            2,
            "0"
        )

        +

        ":"

        +

        String(
            remaining
        ).padStart(
            2,
            "0"
        )

    );

}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(
    date
) {

    if (!date) {
        return "";
    }


    try {

        return new Intl.DateTimeFormat(
            "en-US",
            {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        ).format(
            new Date(date)
        );

    } catch (error) {

        return String(
            date
        );

    }

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value ?? "";

    }

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


/* =========================================================
   ESCAPE REGEX
========================================================= */

function escapeRegExp(
    value
) {

    return String(
        value
    ).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

}


/* =========================================================
   DRAG/DROP STYLES
========================================================= */

function injectDragDropStyles() {

    if (
        document.getElementById(
            "readingDragStyles"
        )
    ) {
        return;
    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "readingDragStyles";


    style.textContent = `

        .summary-word-options {

            display: flex;

            flex-wrap: wrap;

            gap: 8px;

            margin:
                12px 0 20px;

        }


        .summary-drag-word {

            border:
                1px solid #d0d0d0;

            background:
                #ffffff;

            padding:
                8px 13px;

            border-radius:
                8px;

            cursor:
                pointer;

            font-size:
                14px;

        }


        .summary-drag-word:hover {

            transform:
                translateY(-1px);

        }


        .summary-drag-word.selected {

            outline:
                3px solid
                rgba(
                    70,
                    100,
                    220,
                    .25
                );

        }


        .summary-drop-zone {

            display:
                inline-flex;

            align-items:
                center;

            justify-content:
                center;

            min-width:
                110px;

            min-height:
                34px;

            margin:
                0 4px;

            padding:
                4px 10px;

            border:
                2px dashed #aaa;

            border-radius:
                6px;

            background:
                #fafafa;

            vertical-align:
                middle;

            cursor:
                pointer;

        }


        .summary-drop-zone.drag-over {

            border-color:
                #333;

        }


        .summary-drop-zone.has-answer {

            border-style:
                solid;

        }


        .summary-drop-placeholder {

            color:
                #888;

        }


        .summary-drop-answer {

            font-weight:
                600;

        }


        .summary-fallback-row {

            display:
                flex;

            align-items:
                center;

            gap:
                10px;

            margin:
                10px 0;

        }


        .radio-options {

            display:
                flex;

            flex-direction:
                column;

            gap:
                8px;

            margin-top:
                10px;

        }


        .radio-option {

            display:
                flex;

            align-items:
                flex-start;

            gap:
                8px;

            cursor:
                pointer;

        }


        .radio-option input {

            margin-top:
                4px;

        }


        .answer-input,
        .answer-select {

            width:
                100%;

            max-width:
                500px;

            padding:
                10px 12px;

            border:
                1px solid #ccc;

            border-radius:
                8px;

            font-size:
                15px;

        }


        .question-nav-item.answered {

            font-weight:
                700;

        }

    `;


    document.head.appendChild(
        style
    );

}


/* =========================================================
   RESULT STYLES
========================================================= */

function injectResultStyles() {

    if (
        document.getElementById(
            "readingResultStyles"
        )
    ) {
        return;
    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "readingResultStyles";


    style.textContent = `

        .reading-result-report {

            width:
                100%;

        }


        .results-page {

            width:
                100%;

            max-width:
                1100px;

            margin:
                0 auto;

            padding:
                20px;

        }


        .results-heading {

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                flex-start;

            gap:
                20px;

            margin-bottom:
                25px;

        }


        .results-heading h1 {

            margin:
                0 0 6px;

        }


        .results-kicker {

            font-size:
                12px;

            font-weight:
                700;

            letter-spacing:
                .12em;

            opacity:
                .65;

        }


        .result-hero {

            display:
                flex;

            align-items:
                center;

            gap:
                30px;

            padding:
                25px;

            border-radius:
                18px;

            background:
                #f6f6f6;

            margin-bottom:
                20px;

        }


        .score-ring {

            --score-percent: 0%;

            width:
                150px;

            height:
                150px;

            border-radius:
                50%;

            display:
                grid;

            place-items:
                center;

            background:
                conic-gradient(
                    #222
                    var(--score-percent),
                    #ddd
                    var(--score-percent)
                );

            flex:
                0 0 auto;

        }


        .score-ring-inner {

            width:
                112px;

            height:
                112px;

            border-radius:
                50%;

            background:
                white;

            display:
                flex;

            flex-direction:
                column;

            align-items:
                center;

            justify-content:
                center;

        }


        .score-ring-inner strong {

            font-size:
                32px;

        }


        .score-ring-inner span {

            opacity:
                .6;

        }


        .status-pill {

            display:
                inline-block;

            padding:
                5px 10px;

            border-radius:
                999px;

            background:
                #e9e9e9;

            font-size:
                12px;

            margin-bottom:
                8px;

        }


        .result-summary {

            display:
                grid;

            grid-template-columns:
                repeat(
                    4,
                    1fr
                );

            gap:
                12px;

            margin:
                20px 0;

        }


        .result-summary > div {

            border:
                1px solid #ddd;

            border-radius:
                12px;

            padding:
                18px;

            text-align:
                center;

        }


        .result-summary strong {

            display:
                block;

            font-size:
                26px;

        }


        .result-summary span {

            opacity:
                .65;

            font-size:
                13px;

        }


        .result-section {

            margin-top:
                25px;

        }


        .result-section-heading {

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                center;

            margin-bottom:
                12px;

        }


        .part-score-grid {

            display:
                grid;

            grid-template-columns:
                repeat(
                    auto-fit,
                    minmax(
                        180px,
                        1fr
                    )
                );

            gap:
                12px;

        }


        .part-score-card {

            border:
                1px solid #ddd;

            border-radius:
                12px;

            padding:
                15px;

        }


        .part-score-title {

            font-weight:
                700;

            margin-bottom:
                5px;

        }


        .part-score-card strong {

            font-size:
                24px;

        }


        .part-score-card span {

            display:
                block;

            opacity:
                .65;

            margin-top:
                3px;

        }


        .part-score-bar {

            height:
                7px;

            border-radius:
                99px;

            background:
                #e5e5e5;

            margin-top:
                12px;

            overflow:
                hidden;

        }


        .part-score-bar span {

            display:
                block;

            height:
                100%;

            background:
                #222;

        }


        .review-grid {

            display:
                flex;

            flex-direction:
                column;

            gap:
                10px;

        }


        .review-item {

            display:
                grid;

            grid-template-columns:
                45px 35px 1fr;

            gap:
                10px;

            align-items:
                flex-start;

            padding:
                14px;

            border:
                1px solid #ddd;

            border-radius:
                10px;

        }


        .review-item.correct {

            border-left:
                5px solid #4caf50;

        }


        .review-item.incorrect {

            border-left:
                5px solid #e53935;

        }


        .review-item.unanswered {

            border-left:
                5px solid #999;

        }


        .review-number {

            font-weight:
                700;

        }


        .review-status {

            font-weight:
                800;

        }


        .review-answer,
        .review-correct {

            margin-top:
                7px;

            font-size:
                13px;

        }


        .review-answer span,
        .review-correct span {

            opacity:
                .65;

        }


        .legend {

            display:
                flex;

            flex-wrap:
                wrap;

            gap:
                15px;

            margin-bottom:
                15px;

            font-size:
                13px;

        }


        .legend-dot {

            display:
                inline-block;

            width:
                9px;

            height:
                9px;

            border-radius:
                50%;

            margin-right:
                5px;

        }


        .legend-dot.correct {

            background:
                #4caf50;

        }


        .legend-dot.incorrect {

            background:
                #e53935;

        }


        .legend-dot.unanswered {

            background:
                #999;

        }


        .results-actions {

            display:
                flex;

            flex-wrap:
                wrap;

            gap:
                10px;

            margin-top:
                30px;

        }


        @media (
            max-width: 700px
        ) {

            .result-hero {

                flex-direction:
                    column;

                text-align:
                    center;

            }


            .result-summary {

                grid-template-columns:
                    repeat(
                        2,
                        1fr
                    );

            }


            .results-heading {

                flex-direction:
                    column;

            }


            .review-item {

                grid-template-columns:
                    35px 25px 1fr;

            }

        }


        @media print {

            .print-score-button,
            .results-actions {

                display:
                    none !important;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* =========================================================
   GLOBAL ERROR HANDLER
   ---------------------------------------------------------
   If something unexpected happens, don't leave a blank
   page. Show the dashboard and log the error.
========================================================= */

window.addEventListener(
    "error",
    function (event) {

        console.error(
            "IELTS Reading error:",
            event.error ||
            event.message
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    function (event) {

        console.error(
            "IELTS Reading promise error:",
            event.reason
        );

    }
);


/* =========================================================
   END
========================================================= */
