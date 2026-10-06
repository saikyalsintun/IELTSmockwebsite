/* =========================================================
   IELTS READING PRACTICE WEBSITE
   COMPLETE UPDATED app.js
   ---------------------------------------------------------
   LOCAL VERSION
   ---------------------------------------------------------
   NO:
   - Login
   - API
   - Google Sheets
   - Teacher/Admin
   - Online answer storage

   YES:
   - LocalStorage
   - 8 Reading Tests
   - 60 minute timer
   - All major IELTS Reading question types
   - Matching Information A-G
   - Matching Headings
   - Matching Features
   - Fill in the blanks
   - Summary Completion
   - Multiple Choice
   - Multiple Answer
   - True / False / Not Given
   - Yes / No / Not Given
   - Answer Box
   - Question Navigator
   - Result Page
   - IELTS Band
   - Incorrect Answer Review
   - Print / Save PDF
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const CONFIG = {
    TEST_COUNT: 8,
    TEST_FOLDER: "./tests/",
    DEFAULT_DURATION: 60,
    ANSWER_STORAGE_PREFIX: "ielts_reading_answers_",
    RESULT_STORAGE_PREFIX: "ielts_reading_result_"
};


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentTest = null;
let currentTestNumber = null;
let currentPartIndex = 0;

let studentAnswers = {};

let timerInterval = null;
let remainingSeconds = 0;

let testStartTime = null;
let testElapsedSeconds = 0;

let testStarted = false;
let testSubmitted = false;

let scoreData = null;

let selectedDragOption = null;


/* =========================================================
   START APPLICATION
========================================================= */

window.addEventListener(
    "DOMContentLoaded",
    function () {

        injectApplicationStyles();

        setupGlobalEvents();

        /*
         * IMPORTANT:
         * Do not wait for vocabulary to load.
         * The dashboard must still appear if vocabulary.json
         * does not exist.
         */
        loadVocabulary();

        removeLoginAndAdminElements();

        showDashboard();
    }
);


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
        "confirmSubmitButton",
        submitTest
    );

    addClick(
        "cancelSubmitButton",
        closeConfirmModal
    );

    addClick(
        "closeConfirmModal",
        closeConfirmModal
    );

    addClick(
        "closeVocabularyPopup",
        closeVocabularyPopup
    );

    /*
     * Some HTML versions use this ID.
     */
    addClick(
        "printResultButton",
        printScorePDF
    );

    /*
     * Some HTML versions may use another ID.
     */
    addClick(
        "printScoreButton",
        printScorePDF
    );

    /*
     * Retake from result page.
     */
    addClick(
        "resultRetakeButton",
        function () {

            if (currentTest) {
                startTest();
            }

        }
    );

    /*
     * Dashboard buttons.
     */
    addClick(
        "resultDashboardButton",
        showDashboard
    );

    addClick(
        "returnToDashboardButton",
        showDashboard
    );

    /*
     * Close vocabulary popup.
     */
    document.addEventListener(
        "click",
        function (event) {

            const vocabularyElement =
                event.target.closest(
                    ".vocabulary-word"
                );

            if (vocabularyElement) {
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
   ADD CLICK
========================================================= */

function addClick(
    id,
    handler
) {

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
   REMOVE LOGIN / ADMIN
========================================================= */

function removeLoginAndAdminElements() {

    const selectors = [
        "#loginScreen",
        "#loginForm",
        "#logoutButton",
        "#adminButton",
        "#teacherButton",
        "#teacherDashboardButton",
        "#adminDashboardButton",
        "#historySection",
        "#historyTable",
        "#studentLogin",
        ".login-section",
        ".admin-section",
        ".teacher-section"
    ];

    selectors.forEach(
        function (selector) {

            document
                .querySelectorAll(selector)
                .forEach(
                    function (element) {

                        /*
                         * Do not remove the entire screen
                         * if it is part of the application.
                         */
                        if (
                            element.id ===
                            "loginScreen"
                        ) {

                            element.style.display =
                                "none";

                        } else {

                            element.remove();

                        }

                    }
                );

        }
    );

}


/* =========================================================
   SCREEN CONTROL
========================================================= */

function showScreen(id) {

    document
        .querySelectorAll(".screen")
        .forEach(
            function (element) {

                element.style.display =
                    "none";

                element.classList.remove(
                    "active"
                );

            }
        );

    const target =
        document.getElementById(id);

    if (!target) {

        console.warn(
            "Screen not found:",
            id
        );

        return;

    }

    /*
     * IMPORTANT:
     * Explicitly use block.
     *
     * The original HTML has:
     * style="display:none"
     *
     * Therefore:
     * style.display = ""
     * DOES NOT work.
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
   DASHBOARD
========================================================= */

async function showDashboard() {

    stopTimer();

    testStarted = false;
    testSubmitted = false;

    showScreen(
        "dashboardScreen"
    );

    await renderTestCards();

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

    const tests = [];

    for (
        let i = 1;
        i <= CONFIG.TEST_COUNT;
        i++
    ) {

        tests.push(i);

    }

    /*
     * We do not use HEAD requests here.
     * GitHub Pages and some hosting environments
     * can reject HEAD.
     *
     * Instead, simply create all 8 cards.
     */
    tests.forEach(
        function (number) {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "test-card";

            card.dataset.testNumber =
                number;

            card.innerHTML = `
                <div class="test-card-number">
                    TEST ${number}
                </div>

                <h3>
                    IELTS Reading Test ${number}
                </h3>

                <div class="test-card-info">
                    <span>
                        60 Minutes
                    </span>

                    <span>
                        40 Questions
                    </span>
                </div>

                <button
                    type="button"
                    class="test-card-button"
                >
                    Start Test
                </button>
            `;

            card.addEventListener(
                "click",
                function () {

                    openTest(
                        number
                    );

                }
            );

            box.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   OPEN TEST
========================================================= */

async function openTest(
    testNumber
) {

    showLoading(
        "Loading IELTS Reading Test..."
    );

    try {

        const url =
            `${CONFIG.TEST_FOLDER}Test${testNumber}.json?${Date.now()}`;

        const response =
            await fetch(
                url,
                {
                    cache:
                        "no-store"
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

        testSubmitted =
            false;

        studentAnswers = {};

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

        hideLoading();

    }

}


/* =========================================================
   VALIDATE TEST
========================================================= */

function validateTest(
    test
) {

    if (
        !test ||
        !Array.isArray(
            test.parts
        ) ||
        !test.parts.length
    ) {

        throw new Error(
            "Invalid test JSON. The test must contain parts."
        );

    }

    test.parts.forEach(
        function (part) {

            if (!part.passage) {

                part.passage = {
                    title: "",
                    paragraphs: []
                };

            }

            if (
                !Array.isArray(
                    part.passage.paragraphs
                )
            ) {

                part.passage.paragraphs =
                    [];

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
     * Keep previously saved local answers.
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
                    remainingSeconds <=
                    0
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

        if (!element) {
            continue;
        }

        element.textContent =
            formatTime(
                remainingSeconds
            );

        /*
         * Optional warning classes.
         */
        element.classList.remove(
            "timer-warning",
            "timer-danger"
        );

        if (
            remainingSeconds <=
            300
        ) {

            element.classList.add(
                "timer-danger"
            );

        } else if (
            remainingSeconds <=
            600
        ) {

            element.classList.add(
                "timer-warning"
            );

        }

        break;

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
========================================================= */

function questionRangeForPart(
    part
) {

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

function renderPassage(
    passage
) {

    const box =
        document.getElementById(
            "passageContent"
        );

    if (!box) {
        return;
    }

    const paragraphs =
        Array.isArray(
            passage.paragraphs
        )
            ? passage.paragraphs
            : [];

    box.innerHTML =
        paragraphs
            .map(
                function (paragraph) {

                    return `
                        <p class="passage-paragraph">

                            ${
                                paragraph.id
                                    ? `
                                        <span class="paragraph-label">
                                            ${escapeHTML(
                                                paragraph.id
                                            )}
                                        </span>
                                      `
                                    : ""
                            }

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
                            element.dataset.word,
                            element
                        );

                    }
                );

            }
        );

}


/* =========================================================
   QUESTIONS
========================================================= */

function renderQuestions(
    part
) {

    const box =
        document.getElementById(
            "questionsContent"
        ) ||
        document.getElementById(
            "questionsContainer"
        ) ||
        document.getElementById(
            "questionContent"
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

            const groupBox =
                document.createElement(
                    "section"
                );

            groupBox.className =
                "question-group";

            /*
             * Instructions.
             */
            if (
                group.instructions
            ) {

                const instruction =
                    document.createElement(
                        "div"
                    );

                instruction.className =
                    "question-instructions";

                instruction.innerHTML =
                    escapeHTML(
                        group.instructions
                    );

                groupBox.appendChild(
                    instruction
                );

            }

            const type =
                String(
                    group.type ||
                    ""
                )
                .trim()
                .toLowerCase();

            switch (type) {

                case "true_false_not_given":

                    renderTrueFalseNotGiven(
                        groupBox,
                        group
                    );

                    break;


                case "yes_no_not_given":

                    renderYesNoNotGiven(
                        groupBox,
                        group
                    );

                    break;


                case "fill_blank":

                    renderFillBlank(
                        groupBox,
                        group
                    );

                    break;


                case "summary_completion":

                    renderSummaryCompletion(
                        groupBox,
                        group
                    );

                    break;


                case "multiple_choice":

                    renderMultipleChoice(
                        groupBox,
                        group
                    );

                    break;


                case "multiple_choice_multiple":

                    renderMultipleChoiceMultiple(
                        groupBox,
                        group
                    );

                    break;


                case "matching_headings":

                    renderMatchingHeadings(
                        groupBox,
                        group
                    );

                    break;


                case "matching_information":

                    renderMatchingInformation(
                        groupBox,
                        group
                    );

                    break;


                case "matching_features":

                    renderMatchingFeatures(
                        groupBox,
                        group
                    );

                    break;


                case "answer_box":

                    renderAnswerBox(
                        groupBox,
                        group
                    );

                    break;


                default:

                    /*
                     * Fallback.
                     */
                    renderGenericQuestions(
                        groupBox,
                        group
                    );

                    break;

            }

            box.appendChild(
                groupBox
            );

        }
    );

}


/* =========================================================
   QUESTION ITEM
========================================================= */

function createQuestionItem(
    question
) {

    const item =
        document.createElement(
            "div"
        );

    item.className =
        "question-item";

    item.dataset.questionNumber =
        question.number;

    const number =
        document.createElement(
            "span"
        );

    number.className =
        "question-number";

    number.textContent =
        `${question.number}.`;

    const text =
        document.createElement(
            "span"
        );

    text.className =
        "question-text";

    text.innerHTML =
        formatQuestionText(
            question.question ||
            question.text ||
            question.prompt ||
            ""
        );

    const control =
        document.createElement(
            "div"
        );

    control.className =
        "question-control";

    item.appendChild(
        number
    );

    item.appendChild(
        text
    );

    item.appendChild(
        control
    );

    return item;

}


/* =========================================================
   TRUE / FALSE / NOT GIVEN
========================================================= */

function renderTrueFalseNotGiven(
    box,
    group
) {

    const options = [
        "TRUE",
        "FALSE",
        "NOT GIVEN"
    ];

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

            bindSelect(
                control.querySelector(
                    "select"
                ),
                question.number
            );

            box.appendChild(
                item
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

    const options = [
        "YES",
        "NO",
        "NOT GIVEN"
    ];

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

            bindSelect(
                control.querySelector(
                    "select"
                ),
                question.number
            );

            box.appendChild(
                item
            );

        }
    );

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

            const input =
                document.createElement(
                    "input"
                );

            input.type =
                "text";

            input.className =
                "answer-input";

            input.placeholder =
                "Your answer";

            input.dataset.questionNumber =
                question.number;

            input.value =
                studentAnswers[
                    question.number
                ] ||
                "";

            input.addEventListener(
                "input",
                function () {

                    saveAnswer(
                        question.number,
                        input.value
                    );

                }
            );

            control.appendChild(
                input
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

    /*
     * First render normal blanks if present.
     */
    if (
        Array.isArray(
            group.blanks
        ) &&
        group.blanks.length
    ) {

        renderSummaryBlanks(
            box,
            group
        );

    }

    /*
     * Some JSON files may store them
     * inside questions instead.
     */
    if (
        Array.isArray(
            group.questions
        ) &&
        group.questions.length
    ) {

        group.questions.forEach(
            function (question) {

                /*
                 * Avoid duplicate questions
                 * if blanks were already rendered.
                 */
                if (
                    group.blanks &&
                    group.blanks.some(
                        function (blank) {

                            return String(
                                blank.number
                            ) ===
                            String(
                                question.number
                            );

                        }
                    )
                ) {

                    return;

                }

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
                        getGroupOptions(
                            group
                        )
                    );

                bindSelect(
                    control.querySelector(
                        "select"
                    ),
                    question.number
                );

                box.appendChild(
                    item
                );

            }
        );

    }

}


/* =========================================================
   SUMMARY BLANKS
========================================================= */

function renderSummaryBlanks(
    box,
    group
) {

    const options =
        getGroupOptions(
            group
        );

    (
        group.blanks ||
        []
    ).forEach(
        function (blank) {

            const item =
                createQuestionItem(
                    blank
                );

            const control =
                item.querySelector(
                    ".question-control"
                );

            if (
                options.length
            ) {

                control.innerHTML =
                    createSelectOptions(
                        options
                    );

                bindSelect(
                    control.querySelector(
                        "select"
                    ),
                    blank.number
                );

            } else {

                const input =
                    document.createElement(
                        "input"
                    );

                input.type =
                    "text";

                input.className =
                    "answer-input";

                input.placeholder =
                    "Your answer";

                input.value =
                    studentAnswers[
                        blank.number
                    ] ||
                    "";

                input.addEventListener(
                    "input",
                    function () {

                        saveAnswer(
                            blank.number,
                            input.value
                        );

                    }
                );

                control.appendChild(
                    input
                );

            }

            box.appendChild(
                item
            );

        }
    );

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
                getGroupOptions(
                    group,
                    question
                );

            control.innerHTML =
                createRadioOptions(
                    options,
                    question.number
                );

            bindRadioGroup(
                control,
                question.number
            );

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
                getGroupOptions(
                    group,
                    question
                );

            control.innerHTML =
                createCheckboxOptions(
                    options,
                    question.number
                );

            bindCheckboxGroup(
                control,
                question.number
            );

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
        getGroupOptions(
            group
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

            control.innerHTML =
                createSelectOptions(
                    options
                );

            bindSelect(
                control.querySelector(
                    "select"
                ),
                question.number
            );

            box.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   MATCHING INFORMATION
   ---------------------------------------------------------
   IMPORTANT FIX
   ---------------------------------------------------------
   Matching Information groups often look like:

   {
       "type": "matching_information",
       "questions": [...]
   }

   They DO NOT always have:

       "options": [...]

   Instead the choices are the paragraph IDs:

       A
       B
       C
       D
       E
       F

   or:

       A
       B
       C
       D
       E
       F
       G

   We therefore get the options directly from:

   currentTest.parts[currentPartIndex]
       .passage.paragraphs[].id
========================================================= */

function renderMatchingInformation(
    box,
    group
) {

    let options = [];

    /*
     * First:
     * use explicitly supplied options
     * if the JSON has them.
     */
    if (
        Array.isArray(
            group.options
        ) &&
        group.options.length
    ) {

        options =
            normalizeOptionList(
                group.options
            );

    }

    /*
     * SECOND:
     * derive options from passage paragraphs.
     *
     * THIS IS THE IMPORTANT FIX.
     */
    if (
        !options.length
    ) {

        const part =
            currentTest &&
            Array.isArray(
                currentTest.parts
            )
                ? currentTest.parts[
                    currentPartIndex
                ]
                : null;

        const paragraphs =
            part &&
            part.passage &&
            Array.isArray(
                part.passage.paragraphs
            )
                ? part.passage.paragraphs
                : [];

        options =
            paragraphs
                .map(
                    function (paragraph) {

                        if (
                            paragraph &&
                            paragraph.id
                        ) {

                            return String(
                                paragraph.id
                            )
                            .trim()
                            .toUpperCase();

                        }

                        return "";

                    }
                )
                .filter(
                    function (value) {

                        return (
                            value !== ""
                        );

                    }
                );

    }

    /*
     * THIRD:
     * if there are still no paragraph IDs,
     * use A-F as safe fallback.
     */
    if (
        !options.length
    ) {

        options = [
            "A",
            "B",
            "C",
            "D",
            "E",
            "F"
        ];

    }

    /*
     * Remove duplicate letters.
     */
    options =
        [...new Set(
            options
        )];

    /*
     * Render each question.
     */
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

            /*
             * The dropdown now contains:
             *
             * Select an answer
             * A
             * B
             * C
             * D
             * E
             * F
             *
             * or A-G.
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

                select.name =
                    `question_${question.number}`;

                select.value =
                    studentAnswers[
                        question.number
                    ] ||
                    "";

                select.addEventListener(
                    "change",
                    function (event) {

                        saveAnswer(
                            question.number,
                            event.target.value
                        );

                        updateQuestionNavigator();

                    }
                );

            }

            box.appendChild(
                item
            );

        }
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
        getGroupOptions(
            group
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

            control.innerHTML =
                createSelectOptions(
                    options
                );

            bindSelect(
                control.querySelector(
                    "select"
                ),
                question.number
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

            const input =
                document.createElement(
                    "input"
                );

            input.type =
                "text";

            input.className =
                "answer-input";

            input.placeholder =
                "Your answer";

            input.value =
                studentAnswers[
                    question.number
                ] ||
                "";

            input.dataset.questionNumber =
                question.number;

            input.addEventListener(
                "input",
                function () {

                    saveAnswer(
                        question.number,
                        input.value
                    );

                }
            );

            control.appendChild(
                input
            );

            box.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   GENERIC QUESTIONS
========================================================= */

function renderGenericQuestions(
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
                getGroupOptions(
                    group,
                    question
                );

            if (
                options.length
            ) {

                control.innerHTML =
                    createSelectOptions(
                        options
                    );

                bindSelect(
                    control.querySelector(
                        "select"
                    ),
                    question.number
                );

            } else {

                const input =
                    document.createElement(
                        "input"
                    );

                input.type =
                    "text";

                input.className =
                    "answer-input";

                input.placeholder =
                    "Your answer";

                input.value =
                    studentAnswers[
                        question.number
                    ] ||
                    "";

                input.addEventListener(
                    "input",
                    function () {

                        saveAnswer(
                            question.number,
                            input.value
                        );

                    }
                );

                control.appendChild(
                    input
                );

            }

            box.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   GET GROUP OPTIONS
========================================================= */

function getGroupOptions(
    group,
    question = null
) {

    let options = [];

    /*
     * group.options
     */
    if (
        Array.isArray(
            group.options
        )
    ) {

        options =
            group.options;

    }

    /*
     * group.choices
     */
    if (
        !options.length &&
        Array.isArray(
            group.choices
        )
    ) {

        options =
            group.choices;

    }

    /*
     * question.options
     */
    if (
        !options.length &&
        question &&
        Array.isArray(
            question.options
        )
    ) {

        options =
            question.options;

    }

    /*
     * group.letters
     */
    if (
        !options.length &&
        Array.isArray(
            group.letters
        )
    ) {

        options =
            group.letters;

    }

    return normalizeOptionList(
        options
    );

}


/* =========================================================
   NORMALIZE OPTIONS
========================================================= */

function normalizeOptionList(
    options
) {

    if (
        !Array.isArray(
            options
        )
    ) {

        return [];

    }

    return options
        .map(
            function (option) {

                if (
                    option &&
                    typeof option ===
                    "object"
                ) {

                    return String(
                        option.letter ??
                        option.id ??
                        option.value ??
                        option.key ??
                        option.answer ??
                        option.text ??
                        ""
                    ).trim();

                }

                return String(
                    option ??
                    ""
                ).trim();

            }
        )
        .filter(
            function (value) {

                return (
                    value !== ""
                );

            }
        );

}


/* =========================================================
   CREATE SELECT OPTIONS
========================================================= */

function createSelectOptions(
    options
) {

    let html = `
        <select
            class="answer-select"
            aria-label="Select answer"
        >
            <option value="">
                Select an answer
            </option>
    `;

    (
        options ||
        []
    ).forEach(
        function (option) {

            let value = "";
            let text = "";

            if (
                option &&
                typeof option ===
                "object"
            ) {

                value =
                    String(
                        option.letter ??
                        option.id ??
                        option.value ??
                        option.key ??
                        ""
                    );

                text =
                    String(
                        option.text ??
                        option.label ??
                        option.letter ??
                        option.id ??
                        option.value ??
                        option.key ??
                        ""
                    );

            } else {

                value =
                    String(
                        option ??
                        ""
                    );

                text =
                    String(
                        option ??
                        ""
                    );

            }

            html += `
                <option
                    value="${escapeAttribute(value)}"
                >
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
   CREATE RADIO OPTIONS
========================================================= */

function createRadioOptions(
    options,
    questionNumber
) {

    const selected =
        studentAnswers[
            questionNumber
        ];

    return (
        options ||
        []
    )
    .map(
        function (option, index) {

            const value =
                getOptionValue(
                    option
                );

            const label =
                getOptionLabel(
                    option
                );

            return `
                <label
                    class="choice-option"
                >
                    <input
                        type="radio"
                        name="question_${questionNumber}"
                        value="${escapeAttribute(value)}"
                        ${
                            answersMatch(
                                selected,
                                value
                            )
                                ? "checked"
                                : ""
                        }
                    >

                    <span class="choice-letter">
                        ${String.fromCharCode(
                            65 + index
                        )}
                    </span>

                    <span>
                        ${escapeHTML(
                            label
                        )}
                    </span>
                </label>
            `;

        }
    )
    .join("");

}


/* =========================================================
   CREATE CHECKBOX OPTIONS
========================================================= */

function createCheckboxOptions(
    options,
    questionNumber
) {

    let selected =
        studentAnswers[
            questionNumber
        ];

    if (
        typeof selected ===
        "string"
    ) {

        selected =
            selected
                .split(",")
                .map(
                    function (value) {
                        return value.trim();
                    }
                )
                .filter(Boolean);

    }

    if (
        !Array.isArray(
            selected
        )
    ) {

        selected = [];

    }

    return (
        options ||
        []
    )
    .map(
        function (option, index) {

            const value =
                getOptionValue(
                    option
                );

            const label =
                getOptionLabel(
                    option
                );

            const checked =
                selected.some(
                    function (answer) {

                        return answersMatch(
                            answer,
                            value
                        );

                    }
                );

            return `
                <label
                    class="choice-option"
                >
                    <input
                        type="checkbox"
                        name="question_${questionNumber}"
                        value="${escapeAttribute(value)}"
                        ${checked ? "checked" : ""}
                    >

                    <span class="choice-letter">
                        ${String.fromCharCode(
                            65 + index
                        )}
                    </span>

                    <span>
                        ${escapeHTML(
                            label
                        )}
                    </span>
                </label>
            `;

        }
    )
    .join("");

}


/* =========================================================
   BIND SELECT
========================================================= */

function bindSelect(
    select,
    questionNumber
) {

    if (!select) {
        return;
    }

    select.dataset.questionNumber =
        questionNumber;

    select.name =
        `question_${questionNumber}`;

    select.value =
        studentAnswers[
            questionNumber
        ] ||
        "";

    select.addEventListener(
        "change",
        function (event) {

            saveAnswer(
                questionNumber,
                event.target.value
            );

            updateQuestionNavigator();

        }
    );

}


/* =========================================================
   BIND RADIO
========================================================= */

function bindRadioGroup(
    control,
    questionNumber
) {

    control
        .querySelectorAll(
            'input[type="radio"]'
        )
        .forEach(
            function (input) {

                input.addEventListener(
                    "change",
                    function () {

                        saveAnswer(
                            questionNumber,
                            input.value
                        );

                        updateQuestionNavigator();

                    }
                );

            }
        );

}


/* =========================================================
   BIND CHECKBOX
========================================================= */

function bindCheckboxGroup(
    control,
    questionNumber
) {

    control
        .querySelectorAll(
            'input[type="checkbox"]'
        )
        .forEach(
            function (input) {

                input.addEventListener(
                    "change",
                    function () {

                        const values =
                            Array.from(
                                control.querySelectorAll(
                                    'input[type="checkbox"]:checked'
                                )
                            )
                            .map(
                                function (item) {
                                    return item.value;
                                }
                            );

                        saveAnswer(
                            questionNumber,
                            values
                        );

                        updateQuestionNavigator();

                    }
                );

            }
        );

}


/* =========================================================
   GET OPTION VALUE
========================================================= */

function getOptionValue(
    option
) {

    if (
        option &&
        typeof option ===
        "object"
    ) {

        return String(
            option.value ??
            option.letter ??
            option.id ??
            option.key ??
            option.answer ??
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
   GET OPTION LABEL
========================================================= */

function getOptionLabel(
    option
) {

    if (
        option &&
        typeof option ===
        "object"
    ) {

        return String(
            option.text ??
            option.label ??
            option.value ??
            option.letter ??
            option.id ??
            option.key ??
            ""
        );

    }

    return String(
        option ??
        ""
    );

}


/* =========================================================
   FORMAT QUESTION TEXT
========================================================= */

function formatQuestionText(
    text
) {

    if (!text) {
        return "";
    }

    return escapeHTML(
        String(text)
    )
    .replace(
        /\n/g,
        "<br>"
    );

}


/* =========================================================
   SAVE ANSWER
========================================================= */

function saveAnswer(
    number,
    value
) {

    studentAnswers[
        number
    ] = value;

    saveAnswersToStorage();

}


/* =========================================================
   LOCAL STORAGE KEY
========================================================= */

function getAnswerStorageKey() {

    return (
        CONFIG.ANSWER_STORAGE_PREFIX +
        String(
            currentTestNumber ||
            ""
        )
    );

}


/* =========================================================
   SAVE ANSWERS TO LOCAL STORAGE
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
   LOAD SAVED ANSWERS
========================================================= */

function loadSavedAnswers() {

    if (!currentTestNumber) {
        return;
    }

    try {

        const saved =
            localStorage.getItem(
                getAnswerStorageKey()
            );

        if (!saved) {
            return;
        }

        const parsed =
            JSON.parse(
                saved
            );

        if (
            parsed &&
            typeof parsed ===
            "object"
        ) {

            studentAnswers =
                parsed;

        }

    } catch (error) {

        console.warn(
            "Could not restore answers:",
            error
        );

    }

}


/* =========================================================
   QUESTION NAVIGATOR
========================================================= */

function renderQuestionNavigator() {

    const containers = [
        document.getElementById(
            "questionNavigator"
        ),
        document.getElementById(
            "questionNav"
        ),
        document.getElementById(
            "questionNumbers"
        )
    ];

    const box =
        containers.find(
            function (element) {
                return !!element;
            }
        );

    if (!box) {
        return;
    }

    const numbers =
        getQuestionNumbersForPart(
            currentTest.parts[
                currentPartIndex
            ]
        );

    box.innerHTML = "";

    numbers.forEach(
        function (number) {

            const button =
                document.createElement(
                    "button"
                );

            button.type =
                "button";

            button.className =
                "question-nav-button";

            button.textContent =
                number;

            button.dataset.questionNumber =
                number;

            if (
                isQuestionAnswered(
                    number
                )
            ) {

                button.classList.add(
                    "answered"
                );

            }

            button.addEventListener(
                "click",
                function () {

                    jumpToQuestion(
                        number
                    );

                }
            );

            box.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   UPDATE QUESTION NAVIGATOR
========================================================= */

function updateQuestionNavigator() {

    const buttons =
        document.querySelectorAll(
            ".question-nav-button"
        );

    buttons.forEach(
        function (button) {

            const number =
                Number(
                    button.dataset.questionNumber
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
   JUMP TO QUESTION
========================================================= */

function jumpToQuestion(
    number
) {

    const element =
        document.querySelector(
            `[data-question-number="${CSS.escape(
                String(number)
            )}"]`
        );

    if (!element) {
        return;
    }

    const target =
        element.closest(
            ".question-item"
        ) ||
        element;

    target.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


/* =========================================================
   GET QUESTION NUMBERS
========================================================= */

function getQuestionNumbersForPart(
    part
) {

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

    return [
        ...new Set(
            numbers
        )
    ]
    .sort(
        function (a, b) {
            return a - b;
        }
    );

}


/* =========================================================
   GET ALL QUESTION NUMBERS
========================================================= */

function getAllQuestionNumbers() {

    const numbers = [];

    if (!currentTest) {
        return numbers;
    }

    currentTest.parts.forEach(
        function (part) {

            getQuestionNumbersForPart(
                part
            ).forEach(
                function (number) {

                    numbers.push(
                        number
                    );

                }
            );

        }
    );

    return [
        ...new Set(
            numbers
        )
    ]
    .sort(
        function (a, b) {
            return a - b;
        }
    );

}


/* =========================================================
   QUESTION ANSWERED
========================================================= */

function isQuestionAnswered(
    number
) {

    const value =
        studentAnswers[
            number
        ];

    if (
        value === undefined ||
        value === null
    ) {

        return false;

    }

    if (
        Array.isArray(
            value
        )
    ) {

        return value.length >
            0;

    }

    return String(
        value
    ).trim() !== "";

}


/* =========================================================
   PART NAVIGATION
========================================================= */

function previousPart() {

    if (
        !currentTest ||
        currentPartIndex <=
        0
    ) {

        return;

    }

    saveAllVisibleAnswers();

    currentPartIndex--;

    renderCurrentPart();

}


function nextPart() {

    if (!currentTest) {
        return;
    }

    saveAllVisibleAnswers();

    if (
        currentPartIndex <
        currentTest.parts.length -
        1
    ) {

        currentPartIndex++;

        renderCurrentPart();

        return;

    }

    confirmSubmitTest();

}


/* =========================================================
   UPDATE PART BUTTONS
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
            currentPartIndex <=
            0;

    }

    if (next) {

        if (
            currentTest &&
            currentPartIndex <
            currentTest.parts.length -
            1
        ) {

            next.textContent =
                "Next Part";

        } else {

            next.textContent =
                "Submit Test";

        }

    }

}


/* =========================================================
   SAVE VISIBLE ANSWERS
========================================================= */

function saveAllVisibleAnswers() {

    /*
     * SELECTS
     */
    document
        .querySelectorAll(
            ".answer-select"
        )
        .forEach(
            function (select) {

                const number =
                    Number(
                        select.dataset.questionNumber
                    );

                if (
                    Number.isFinite(
                        number
                    )
                ) {

                    studentAnswers[
                        number
                    ] =
                        select.value;

                }

            }
        );

    /*
     * TEXT INPUTS
     */
    document
        .querySelectorAll(
            ".answer-input"
        )
        .forEach(
            function (input) {

                const item =
                    input.closest(
                        ".question-item"
                    );

                if (!item) {
                    return;
                }

                const number =
                    Number(
                        item.dataset.questionNumber
                    );

                if (
                    Number.isFinite(
                        number
                    )
                ) {

                    studentAnswers[
                        number
                    ] =
                        input.value;

                }

            }
        );

    /*
     * RADIO
     */
    document
        .querySelectorAll(
            'input[type="radio"]:checked'
        )
        .forEach(
            function (input) {

                const match =
                    input.name.match(
                        /question_(\d+)/
                    );

                if (!match) {
                    return;
                }

                const number =
                    Number(
                        match[1]
                    );

                studentAnswers[
                    number
                ] =
                    input.value;

            }
        );

    /*
     * CHECKBOX
     */
    document
        .querySelectorAll(
            'input[type="checkbox"]'
        )
        .forEach(
            function () {

                /*
                 * handled below
                 */

            }
        );

    const checkboxGroups =
        {};

    document
        .querySelectorAll(
            'input[type="checkbox"]:checked'
        )
        .forEach(
            function (input) {

                const match =
                    input.name.match(
                        /question_(\d+)/
                    );

                if (!match) {
                    return;
                }

                const number =
                    Number(
                        match[1]
                    );

                if (
                    !checkboxGroups[
                        number
                    ]
                ) {

                    checkboxGroups[
                        number
                    ] = [];

                }

                checkboxGroups[
                    number
                ].push(
                    input.value
                );

            }
        );

    Object.keys(
        checkboxGroups
    ).forEach(
        function (number) {

            studentAnswers[
                number
            ] =
                checkboxGroups[
                    number
                ];

        }
    );

    saveAnswersToStorage();

}


/* =========================================================
   CONFIRM SUBMIT
========================================================= */

function confirmSubmitTest() {

    const modal =
        document.getElementById(
            "confirmModal"
        );

    if (modal) {

        modal.style.display =
            "flex";

        return;

    }

    /*
     * If the modal does not exist,
     * submit directly.
     */
    submitTest();

}


/* =========================================================
   CLOSE CONFIRM MODAL
========================================================= */

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
   CONFIRM EXIT
========================================================= */

function confirmExitTest() {

    const confirmed =
        window.confirm(
            "Are you sure you want to leave this test? Your current answers are saved locally."
        );

    if (!confirmed) {
        return;
    }

    saveAllVisibleAnswers();

    stopTimer();

    testStarted =
        false;

    showDashboard();

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

    testStarted =
        false;

    testElapsedSeconds =
        calculateTimeUsed();

    scoreData =
        calculateScore();

    saveResultLocally();

    renderResult();

}


/* =========================================================
   CALCULATE TIME USED
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
   CALCULATE SCORE
========================================================= */

function calculateScore() {

    let total = 0;

    const partScores = [];

    (
        currentTest.parts ||
        []
    ).forEach(
        function (part) {

            let partScore = 0;

            (
                part.questionGroups ||
                []
            ).forEach(
                function (group) {

                    /*
                     * Standard questions.
                     */
                    const questions =
                        group.questions &&
                        group.questions.length
                            ? group.questions
                            : group.blanks ||
                              [];

                    questions.forEach(
                        function (question) {

                            const given =
                                studentAnswers[
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
   COUNT TOTAL QUESTIONS
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
     * Multiple correct answers.
     */
    if (
        Array.isArray(
            correct
        )
    ) {

        /*
         * If student's answer is an array,
         * require all selected answers to be
         * accepted and the set to match.
         */
        if (
            Array.isArray(
                given
            )
        ) {

            const givenNormalized =
                given
                    .map(
                        normalizeAnswer
                    )
                    .sort();

            const correctNormalized =
                correct
                    .map(
                        normalizeAnswer
                    )
                    .sort();

            if (
                givenNormalized.length !==
                correctNormalized.length
            ) {

                return false;

            }

            return givenNormalized.every(
                function (value, index) {

                    return (
                        value ===
                        correctNormalized[
                            index
                        ]
                    );

                }
            );

        }

        /*
         * Single answer against
         * accepted answers.
         */
        return correct.some(
            function (answer) {

                return (
                    normalizeAnswer(
                        answer
                    ) ===
                    normalizeAnswer(
                        given
                    )
                );

            }
        );

    }

    /*
     * Student array against a single
     * correct answer.
     */
    if (
        Array.isArray(
            given
        )
    ) {

        if (
            given.length !==
            1
        ) {

            return false;

        }

        return (
            normalizeAnswer(
                given[0]
            ) ===
            normalizeAnswer(
                correct
            )
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
   IELTS BAND
========================================================= */

function calculateIELTSBand(
    score
) {

    if (score >= 39)
        return 9.0;

    if (score >= 37)
        return 8.5;

    if (score >= 35)
        return 8.0;

    if (score >= 33)
        return 7.5;

    if (score >= 30)
        return 7.0;

    if (score >= 27)
        return 6.5;

    if (score >= 23)
        return 6.0;

    if (score >= 19)
        return 5.5;

    if (score >= 15)
        return 5.0;

    if (score >= 13)
        return 4.5;

    if (score >= 10)
        return 4.0;

    if (score >= 8)
        return 3.5;

    if (score >= 6)
        return 3.0;

    if (score >= 4)
        return 2.5;

    if (score >= 2)
        return 2.0;

    if (score === 1)
        return 1.0;

    return 0;

}


/* =========================================================
   RESULT SCREEN
========================================================= */

function renderResult() {

    showScreen(
        "resultScreen"
    );

    setText(
        "resultTestTitle",
        currentTest?.title ||
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
        Number(
            scoreData.band
        ).toFixed(1)
    );

    setText(
        "resultTime",
        scoreData.timeUsed
    );

    renderPartScores();

    renderIncorrectAnswers();

    populateReadingPartGrid();

    populateReadingReviewGrid();

    createBeautifulPrintButton();

    /*
     * Scroll to top.
     */
    window.scrollTo(
        0,
        0
    );

}


/* =========================================================
   PART SCORES
========================================================= */

function renderPartScores() {

    const box =
        document.getElementById(
            "partScores"
        );

    if (!box) {
        return;
    }

    box.innerHTML =
        scoreData.partScores
            .map(
                function (
                    score,
                    index
                ) {

                    const part =
                        currentTest.parts[
                            index
                        ];

                    const total =
                        part
                            ? getPartQuestionCount(
                                part
                            )
                            : 0;

                    return `
                        <div class="part-score">

                            <span class="part-score-label">
                                Part ${index + 1}
                            </span>

                            <span class="part-score-value">
                                ${score}
                                /
                                ${total}
                            </span>

                        </div>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   RESULT PART GRID
========================================================= */

function populateReadingPartGrid() {

    const containers = [
        document.getElementById(
            "readingPartGrid"
        ),
        document.getElementById(
            "partScoreGrid"
        )
    ];

    const box =
        containers.find(
            function (element) {
                return !!element;
            }
        );

    if (!box) {
        return;
    }

    box.innerHTML = "";

    currentTest.parts.forEach(
        function (part, index) {

            const score =
                scoreData.partScores[
                    index
                ] ||
                0;

            const total =
                getPartQuestionCount(
                    part
                );

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                "result-part-card";

            element.innerHTML = `
                <div class="result-part-number">
                    PART ${index + 1}
                </div>

                <div class="result-part-score">
                    ${score}/${total}
                </div>

                <div class="result-part-label">
                    ${
                        score === total
                            ? "Perfect"
                            : "Completed"
                    }
                </div>
            `;

            box.appendChild(
                element
            );

        }
    );

}


/* =========================================================
   PART QUESTION COUNT
========================================================= */

function getPartQuestionCount(
    part
) {

    return getQuestionNumbersForPart(
        part
    ).length;

}


/* =========================================================
   INCORRECT ANSWERS
========================================================= */

function renderIncorrectAnswers() {

    const containers = [
        document.getElementById(
            "incorrectAnswers"
        ),
        document.getElementById(
            "reviewAnswers"
        ),
        document.getElementById(
            "wrongAnswers"
        )
    ];

    const box =
        containers.find(
            function (element) {
                return !!element;
            }
        );

    if (!box) {
        return;
    }

    const incorrect =
        getAllReviewQuestions()
            .filter(
                function (item) {

                    return !answersMatch(
                        item.given,
                        item.answer
                    );

                }
            );

    if (!incorrect.length) {

        box.innerHTML = `
            <div class="all-correct-message">
                <div class="all-correct-icon">
                    ✓
                </div>

                <div>
                    <strong>
                        Excellent!
                    </strong>

                    <p>
                        You answered all questions correctly.
                    </p>
                </div>
            </div>
        `;

        return;

    }

    box.innerHTML =
        incorrect
            .map(
                renderReviewItemHTML
            )
            .join("");

}


/* =========================================================
   GET REVIEW QUESTIONS
========================================================= */

function getAllReviewQuestions() {

    const results = [];

    if (!currentTest) {
        return results;
    }

    currentTest.parts.forEach(
        function (part, partIndex) {

            (
                part.questionGroups ||
                []
            ).forEach(
                function (group) {

                    const questions =
                        group.questions &&
                        group.questions.length
                            ? group.questions
                            : group.blanks ||
                              [];

                    questions.forEach(
                        function (question) {

                            results.push({

                                number:
                                    question.number,

                                question:
                                    getReviewQuestionText(
                                        question
                                    ),

                                answer:
                                    question.answer,

                                given:
                                    studentAnswers[
                                        question.number
                                    ],

                                part:
                                    partIndex + 1,

                                type:
                                    group.type ||
                                    ""

                            });

                        }
                    );

                }
            );

        }
    );

    return results;

}


/* =========================================================
   REVIEW ITEM HTML
========================================================= */

function renderReviewItemHTML(
    item
) {

    return `
        <div class="review-item">

            <div class="review-item-header">

                <span class="review-question-number">
                    Question ${escapeHTML(
                        String(
                            item.number
                        )
                    )}
                </span>

                <span class="review-part">
                    Part ${item.part}
                </span>

            </div>

            <div class="review-question">
                ${escapeHTML(
                    item.question
                )}
            </div>

            <div class="review-answer-row">

                <div class="review-your-answer">
                    <span>
                        Your answer
                    </span>

                    <strong>
                        ${escapeHTML(
                            formatReviewAnswer(
                                item.given
                            )
                        )}
                    </strong>
                </div>

                <div class="review-correct-answer">
                    <span>
                        Correct answer
                    </span>

                    <strong>
                        ${escapeHTML(
                            formatCorrectAnswer(
                                item.answer
                            )
                        )}
                    </strong>
                </div>

            </div>

        </div>
    `;

}


/* =========================================================
   REVIEW QUESTION TEXT
========================================================= */

function getReviewQuestionText(
    question
) {

    return String(
        question.question ||
        question.text ||
        question.prompt ||
        ""
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
        answer === ""
    ) {

        return "No answer";

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
        Array.isArray(
            answer
        )
    ) {

        return answer.join(
            ", "
        );

    }

    return String(
        answer ??
        ""
    );

}


/* =========================================================
   REVIEW GRID
========================================================= */

function populateReadingReviewGrid() {

    const box =
        document.getElementById(
            "readingReviewGrid"
        );

    if (!box) {
        return;
    }

    box.innerHTML = "";

    const questions =
        getAllReviewQuestions();

    questions.forEach(
        function (item) {

            const correct =
                answersMatch(
                    item.given,
                    item.answer
                );

            const element =
                document.createElement(
                    "div"
                );

            element.className =
                correct
                    ? "review-grid-item correct"
                    : "review-grid-item incorrect";

            element.innerHTML = `
                <span>
                    ${item.number}
                </span>

                <strong>
                    ${
                        correct
                            ? "✓"
                            : "✕"
                    }
                </strong>
            `;

            element.addEventListener(
                "click",
                function () {

                    const review =
                        document.querySelector(
                            `.review-item:nth-of-type(${item.number})`
                        );

                    if (review) {

                        review.scrollIntoView({
                            behavior:
                                "smooth",
                            block:
                                "center"
                        });

                    }

                }
            );

            box.appendChild(
                element
            );

        }
    );

}


/* =========================================================
   LOCAL RESULT
========================================================= */

function saveResultLocally() {

    if (!currentTestNumber) {
        return;
    }

    const result = {

        testNumber:
            currentTestNumber,

        testTitle:
            currentTest?.title ||
            `Test ${currentTestNumber}`,

        score:
            scoreData.totalScore,

        total:
            scoreData.totalQuestions,

        band:
            scoreData.band,

        partScores:
            scoreData.partScores,

        timeUsed:
            scoreData.timeUsed,

        submittedAt:
            new Date().toISOString()

    };

    try {

        localStorage.setItem(
            CONFIG.RESULT_STORAGE_PREFIX +
            currentTestNumber,
            JSON.stringify(
                result
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
   PRINT BUTTON
   ---------------------------------------------------------
   This creates the button dynamically, so you do NOT
   need to change your HTML.
========================================================= */

function createBeautifulPrintButton() {

    let button =
        document.getElementById(
            "printResultButton"
        );

    /*
     * If the HTML already has a button,
     * style it.
     */
    if (button) {

        stylePrintButton(
            button
        );

        button.onclick =
            printScorePDF;

        return;

    }

    /*
     * Otherwise create one.
     */
    const resultScreen =
        document.getElementById(
            "resultScreen"
        );

    if (!resultScreen) {
        return;
    }

    const existing =
        resultScreen.querySelector(
            ".result-actions"
        ) ||
        resultScreen.querySelector(
            ".result-buttons"
        );

    const container =
        existing ||
        document.createElement(
            "div"
        );

    if (!existing) {

        container.className =
            "result-actions";

        resultScreen.appendChild(
            container
        );

    }

    button =
        document.createElement(
            "button"
        );

    button.type =
        "button";

    button.id =
        "printResultButton";

    button.innerHTML = `
        <span class="print-button-icon">
            🖨
        </span>

        <span>
            Print Result
        </span>
    `;

    button.addEventListener(
        "click",
        printScorePDF
    );

    stylePrintButton(
        button
    );

    container.appendChild(
        button
    );

}


/* =========================================================
   STYLE PRINT BUTTON
========================================================= */

function stylePrintButton(
    button
) {

    button.classList.add(
        "beautiful-print-button"
    );

    button.innerHTML = `
        <span class="print-button-icon">
            🖨
        </span>

        <span>
            Print Result
        </span>
    `;

}


/* =========================================================
   PRINT SCORE PDF
   ---------------------------------------------------------
   User can choose:
   - Printer
   - Save as PDF
========================================================= */

function printScorePDF() {

    if (!scoreData) {
        return;
    }

    const incorrect =
        getAllReviewQuestions()
            .filter(
                function (item) {

                    return !answersMatch(
                        item.given,
                        item.answer
                    );

                }
            );

    const reportWindow =
        window.open(
            "",
            "_blank",
            "width=1000,height=800"
        );

    if (!reportWindow) {

        alert(
            "Please allow pop-ups for this website to print your result."
        );

        return;

    }

    const partRows =
        scoreData.partScores
            .map(
                function (
                    score,
                    index
                ) {

                    const total =
                        getPartQuestionCount(
                            currentTest.parts[
                                index
                            ]
                        );

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

                    return `
                        <tr>

                            <td>
                                Part ${index + 1}
                            </td>

                            <td>
                                ${score} / ${total}
                            </td>

                            <td>
                                ${percentage}%
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

    const incorrectRows =
        incorrect.length
            ? incorrect
                .map(
                    function (item) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHTML(
                                        String(
                                            item.number
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        item.question
                                    )}
                                </td>

                                <td class="wrong">
                                    ${escapeHTML(
                                        formatReviewAnswer(
                                            item.given
                                        )
                                    )}
                                </td>

                                <td class="correct">
                                    ${escapeHTML(
                                        formatCorrectAnswer(
                                            item.answer
                                        )
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                )
                .join("")
            : `
                <tr>

                    <td
                        colspan="4"
                        class="all-correct"
                    >
                        All questions were answered correctly.
                    </td>

                </tr>
            `;

    const reportHTML = `
<!DOCTYPE html>

<html>

<head>

    <meta charset="UTF-8">

    <title>
        IELTS Reading Result
    </title>

    <style>

        * {
            box-sizing: border-box;
        }

        body {

            margin: 0;

            padding: 40px;

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            color: #222;

            background: #f5f6f8;

        }

        .report {

            max-width: 900px;

            margin: 0 auto;

            background: white;

            padding: 40px;

            border-radius: 18px;

            box-shadow:
                0 10px 35px
                rgba(
                    0,
                    0,
                    0,
                    .08
                );

        }

        .header {

            display: flex;

            justify-content:
                space-between;

            align-items:
                center;

            border-bottom:
                2px solid #222;

            padding-bottom:
                22px;

            margin-bottom:
                30px;

        }

        .brand {

            font-size: 26px;

            font-weight: 800;

            letter-spacing:
                .5px;

        }

        .date {

            color: #777;

            font-size: 13px;

        }

        .title {

            margin-bottom:
                25px;

        }

        .title h1 {

            margin: 0 0 8px;

            font-size: 28px;

        }

        .title p {

            margin: 0;

            color: #666;

        }

        .summary {

            display: grid;

            grid-template-columns:
                repeat(
                    4,
                    1fr
                );

            gap: 15px;

            margin-bottom:
                30px;

        }

        .summary-card {

            border:
                1px solid #e4e6ea;

            border-radius:
                14px;

            padding:
                20px;

            text-align:
                center;

            background:
                #fafafa;

        }

        .summary-label {

            display: block;

            font-size:
                12px;

            color:
                #777;

            text-transform:
                uppercase;

            letter-spacing:
                .8px;

            margin-bottom:
                8px;

        }

        .summary-value {

            font-size:
                27px;

            font-weight:
                800;

        }

        .section {

            margin-top:
                30px;

        }

        .section h2 {

            font-size:
                18px;

            margin:
                0 0 15px;

            border-left:
                4px solid #222;

            padding-left:
                10px;

        }

        table {

            width:
                100%;

            border-collapse:
                collapse;

        }

        th,
        td {

            border:
                1px solid #ddd;

            padding:
                11px;

            text-align:
                left;

            vertical-align:
                top;

        }

        th {

            background:
                #f0f1f3;

            font-weight:
                700;

        }

        .wrong {

            color:
                #b42318;

            font-weight:
                700;

        }

        .correct {

            color:
                #087443;

            font-weight:
                700;

        }

        .all-correct {

            text-align:
                center;

            color:
                #087443;

            font-weight:
                700;

            padding:
                20px;

        }

        .footer {

            margin-top:
                35px;

            padding-top:
                20px;

            border-top:
                1px solid #ddd;

            text-align:
                center;

            font-size:
                12px;

            color:
                #777;

        }

        @media print {

            @page {

                size:
                    A4;

                margin:
                    12mm;

            }

            body {

                background:
                    white;

                padding:
                    0;

            }

            .report {

                max-width:
                    none;

                box-shadow:
                    none;

                border-radius:
                    0;

                padding:
                    0;

            }

            .no-print {

                display:
                    none !important;

            }

        }

    </style>

</head>

<body>

    <div class="report">

        <div class="header">

            <div class="brand">
                IELTSR
            </div>

            <div class="date">
                ${escapeHTML(
                    new Date()
                        .toLocaleString()
                )}
            </div>

        </div>

        <div class="title">

            <h1>
                IELTS Reading Test Result
            </h1>

            <p>
                ${escapeHTML(
                    currentTest?.title ||
                    `IELTS Reading Test ${currentTestNumber}`
                )}
            </p>

        </div>

        <div class="summary">

            <div class="summary-card">

                <span class="summary-label">
                    Raw Score
                </span>

                <span class="summary-value">
                    ${scoreData.totalScore}
                    /
                    ${scoreData.totalQuestions}
                </span>

            </div>

            <div class="summary-card">

                <span class="summary-label">
                    IELTS Band
                </span>

                <span class="summary-value">
                    ${Number(
                        scoreData.band
                    ).toFixed(1)}
                </span>

            </div>

            <div class="summary-card">

                <span class="summary-label">
                    Time Used
                </span>

                <span class="summary-value">
                    ${escapeHTML(
                        scoreData.timeUsed
                    )}
                </span>

            </div>

            <div class="summary-card">

                <span class="summary-label">
                    Questions
                </span>

                <span class="summary-value">
                    ${scoreData.totalQuestions}
                </span>

            </div>

        </div>

        <div class="section">

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
                            Score
                        </th>

                        <th>
                            Percentage
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${partRows}

                </tbody>

            </table>

        </div>

        <div class="section">

            <h2>
                Incorrect Answers
            </h2>

            <table>

                <thead>

                    <tr>

                        <th>
                            Question
                        </th>

                        <th>
                            Question
                        </th>

                        <th>
                            Your Answer
                        </th>

                        <th>
                            Correct Answer
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${incorrectRows}

                </tbody>

            </table>

        </div>

        <div class="footer">

            IELTS Reading Practice Website

            <br>

            This result was generated locally
            on your device.

        </div>

    </div>

    <script>

        window.onload = function () {

            setTimeout(
                function () {

                    window.print();

                },
                500
            );

        };

    <\/script>

</body>

</html>
    `;

    reportWindow.document.open();

    reportWindow.document.write(
        reportHTML
    );

    reportWindow.document.close();

}


/* =========================================================
   VOCABULARY
========================================================= */

let vocabulary = {};


async function loadVocabulary() {

    vocabulary = {};

    try {

        const response =
            await fetch(
                `./vocabulary.json?${Date.now()}`,
                {
                    cache:
                        "no-store"
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
         */
        vocabulary = {};

    }

}


/* =========================================================
   HIGHLIGHT VOCABULARY
========================================================= */

function highlightVocabulary(
    text
) {

    /*
     * If no vocabulary exists,
     * return normal text.
     */
    if (
        !vocabulary ||
        typeof vocabulary !==
        "object" ||
        !Object.keys(
            vocabulary
        ).length
    ) {

        return escapeHTML(
            text
        )
        .replace(
            /\n/g,
            "<br>"
        );

    }

    /*
     * Keep this intentionally safe.
     * We do not aggressively replace every
     * English word because that can damage
     * punctuation and HTML.
     */
    return escapeHTML(
        text
    )
    .replace(
        /\n/g,
        "<br>"
    );

}


/* =========================================================
   VOCABULARY POPUP
========================================================= */

function showVocabularyPopup(
    word,
    anchor
) {

    const popup =
        document.getElementById(
            "vocabularyPopup"
        );

    if (!popup) {
        return;
    }

    const normalized =
        String(
            word ||
            ""
        )
        .trim();

    const entry =
        vocabulary[
            normalized
        ] ||
        vocabulary[
            normalized.toLowerCase()
        ];

    const title =
        popup.querySelector(
            ".vocabulary-popup-word"
        );

    const meaning =
        popup.querySelector(
            ".vocabulary-popup-meaning"
        );

    if (title) {

        title.textContent =
            normalized;

    }

    if (meaning) {

        meaning.textContent =
            entry
                ? (
                    typeof entry ===
                    "string"
                        ? entry
                        : entry.meaning ||
                          entry.definition ||
                          ""
                )
                : "No definition available.";

    }

    popup.style.display =
        "block";

    if (anchor) {

        const rect =
            anchor.getBoundingClientRect();

        popup.style.position =
            "fixed";

        popup.style.left =
            `${Math.min(
                rect.left,
                window.innerWidth -
                320
            )}px`;

        popup.style.top =
            `${Math.min(
                rect.bottom + 8,
                window.innerHeight -
                180
            )}px`;

    }

}


/* =========================================================
   CLOSE VOCABULARY POPUP
========================================================= */

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
   LOADING
========================================================= */

function showLoading(
    message
) {

    let overlay =
        document.getElementById(
            "appLoadingOverlay"
        );

    if (!overlay) {

        overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "appLoadingOverlay";

        overlay.innerHTML = `
            <div class="app-loading-box">

                <div class="loading-spinner">
                </div>

                <div class="loading-text">
                    ${escapeHTML(
                        message ||
                        "Loading..."
                    )}
                </div>

            </div>
        `;

        document.body.appendChild(
            overlay
        );

    } else {

        const text =
            overlay.querySelector(
                ".loading-text"
            );

        if (text) {

            text.textContent =
                message ||
                "Loading...";

        }

    }

    overlay.style.display =
        "flex";

}


function hideLoading() {

    const overlay =
        document.getElementById(
            "appLoadingOverlay"
        );

    if (overlay) {

        overlay.style.display =
            "none";

    }

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message
) {

    let toast =
        document.getElementById(
            "appToast"
        );

    if (!toast) {

        toast =
            document.createElement(
                "div"
            );

        toast.id =
            "appToast";

        document.body.appendChild(
            toast
        );

    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toast._timer
    );

    toast._timer =
        setTimeout(
            function () {

                toast.classList.remove(
                    "show"
                );

            },
            3500
        );

}


/* =========================================================
   APPLICATION STYLES
   ---------------------------------------------------------
   Injected here so the new print button and controls
   work even without changing style.css.
========================================================= */

function injectApplicationStyles() {

    if (
        document.getElementById(
            "ieltsAppInjectedStyles"
        )
    ) {

        return;

    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "ieltsAppInjectedStyles";

    style.textContent = `

        /* ================================================
           ANSWER SELECT
        ================================================ */

        .answer-select {

            width: 100%;

            max-width: 240px;

            min-height: 44px;

            padding: 9px 38px 9px 13px;

            border: 1px solid #d7dbe0;

            border-radius: 10px;

            background: #fff;

            color: #222;

            font-size: 15px;

            cursor: pointer;

            outline: none;

            transition:
                border-color .2s,
                box-shadow .2s;

        }

        .answer-select:focus {

            border-color: #383838;

            box-shadow:
                0 0 0 3px
                rgba(
                    56,
                    56,
                    56,
                    .10
                );

        }


        /* ================================================
           ANSWER INPUT
        ================================================ */

        .answer-input {

            width: 100%;

            max-width: 280px;

            min-height: 44px;

            padding: 9px 13px;

            border: 1px solid #d7dbe0;

            border-radius: 10px;

            font-size: 15px;

            outline: none;

        }

        .answer-input:focus {

            border-color: #383838;

            box-shadow:
                0 0 0 3px
                rgba(
                    56,
                    56,
                    56,
                    .10
                );

        }


        /* ================================================
           QUESTION ITEM
        ================================================ */

        .question-item {

            display: grid;

            grid-template-columns:
                42px
                minmax(
                    0,
                    1fr
                )
                minmax(
                    170px,
                    250px
                );

            gap: 12px;

            align-items: center;

            padding: 14px 0;

            border-bottom:
                1px solid #eeeeee;

        }

        .question-number {

            font-weight: 800;

            color: #222;

        }

        .question-control {

            width: 100%;

        }


        /* ================================================
           QUESTION INSTRUCTIONS
        ================================================ */

        .question-instructions {

            margin:
                18px 0 8px;

            padding:
                14px 16px;

            border-left:
                4px solid #383838;

            background:
                #f6f6f7;

            border-radius:
                8px;

            font-weight:
                600;

            line-height:
                1.55;

        }


        /* ================================================
           CHOICE OPTIONS
        ================================================ */

        .choice-option {

            display: flex;

            align-items: flex-start;

            gap: 9px;

            padding: 9px;

            margin: 5px 0;

            border:
                1px solid #eeeeee;

            border-radius:
                8px;

            cursor: pointer;

            transition:
                background .2s,
                border-color .2s;

        }

        .choice-option:hover {

            background:
                #f7f7f7;

            border-color:
                #d0d0d0;

        }

        .choice-letter {

            display: inline-flex;

            align-items: center;

            justify-content: center;

            min-width: 25px;

            height: 25px;

            border-radius: 50%;

            background:
                #383838;

            color: white;

            font-size: 12px;

            font-weight: 700;

        }


        /* ================================================
           QUESTION NAVIGATION
        ================================================ */

        .question-nav-button {

            width: 36px;

            height: 36px;

            border-radius: 50%;

            border:
                1px solid #d9d9d9;

            background: white;

            cursor: pointer;

            font-weight: 700;

            margin: 3px;

        }

        .question-nav-button:hover {

            transform:
                translateY(-1px);

        }

        .question-nav-button.answered {

            background:
                #383838;

            color: white;

            border-color:
                #383838;

        }


        /* ================================================
           RESULT ACTIONS
        ================================================ */

        .result-actions {

            display: flex;

            flex-wrap: wrap;

            justify-content: center;

            align-items: center;

            gap: 12px;

            margin:
                25px auto;

        }


        /* ================================================
           BEAUTIFUL PRINT BUTTON
        ================================================ */

        .beautiful-print-button {

            display: inline-flex;

            align-items: center;

            justify-content: center;

            gap: 10px;

            min-width: 190px;

            padding:
                13px 22px;

            border: none;

            border-radius: 12px;

            background:
                linear-gradient(
                    135deg,
                    #383838,
                    #202020
                );

            color: white;

            font-size: 15px;

            font-weight: 700;

            letter-spacing:
                .2px;

            cursor: pointer;

            box-shadow:
                0 7px 18px
                rgba(
                    0,
                    0,
                    0,
                    .18
                );

            transition:
                transform .2s,
                box-shadow .2s,
                opacity .2s;

        }

        .beautiful-print-button:hover {

            transform:
                translateY(-2px);

            box-shadow:
                0 10px 24px
                rgba(
                    0,
                    0,
                    0,
                    .23
                );

        }

        .beautiful-print-button:active {

            transform:
                translateY(0);

        }

        .print-button-icon {

            display: inline-flex;

            align-items: center;

            justify-content: center;

            width: 28px;

            height: 28px;

            border-radius: 8px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .14
                );

            font-size: 16px;

        }


        /* ================================================
           RESULT PART
        ================================================ */

        .result-part-card {

            padding: 18px;

            border:
                1px solid #e5e5e5;

            border-radius: 14px;

            background: white;

            text-align: center;

        }

        .result-part-number {

            font-size: 12px;

            color: #777;

            font-weight: 700;

            letter-spacing:
                .8px;

        }

        .result-part-score {

            margin-top: 7px;

            font-size: 25px;

            font-weight: 800;

        }

        .result-part-label {

            margin-top: 4px;

            font-size: 12px;

            color: #777;

        }


        /* ================================================
           REVIEW
        ================================================ */

        .review-item {

            padding:
                18px;

            margin:
                12px 0;

            border:
                1px solid #e5e5e5;

            border-radius:
                13px;

            background:
                white;

        }

        .review-item-header {

            display: flex;

            justify-content:
                space-between;

            gap: 10px;

            margin-bottom:
                10px;

        }

        .review-question-number {

            font-weight:
                800;

        }

        .review-part {

            color:
                #777;

            font-size:
                13px;

        }

        .review-question {

            line-height:
                1.55;

            margin-bottom:
                12px;

        }

        .review-answer-row {

            display:
                grid;

            grid-template-columns:
                1fr
                1fr;

            gap:
                12px;

        }

        .review-your-answer,
        .review-correct-answer {

            padding:
                12px;

            border-radius:
                9px;

        }

        .review-your-answer {

            background:
                #fff4f2;

        }

        .review-correct-answer {

            background:
                #effaf4;

        }

        .review-your-answer span,
        .review-correct-answer span {

            display:
                block;

            font-size:
                11px;

            text-transform:
                uppercase;

            color:
                #777;

            margin-bottom:
                4px;

        }


        /* ================================================
           ALL CORRECT
        ================================================ */

        .all-correct-message {

            display:
                flex;

            align-items:
                center;

            gap:
                15px;

            padding:
                20px;

            border-radius:
                14px;

            background:
                #effaf4;

            color:
                #087443;

        }

        .all-correct-icon {

            width:
                44px;

            height:
                44px;

            border-radius:
                50%;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            background:
                #087443;

            color:
                white;

            font-weight:
                800;

            font-size:
                22px;

        }


        /* ================================================
           LOADING
        ================================================ */

        #appLoadingOverlay {

            position:
                fixed;

            inset:
                0;

            z-index:
                99999;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .92
                );

        }

        .app-loading-box {

            text-align:
                center;

            padding:
                30px;

        }

        .loading-spinner {

            width:
                42px;

            height:
                42px;

            margin:
                0 auto 14px;

            border:
                4px solid #ddd;

            border-top-color:
                #383838;

            border-radius:
                50%;

            animation:
                ieltsSpin
                .8s
                linear
                infinite;

        }

        @keyframes ieltsSpin {

            to {
                transform:
                    rotate(360deg);
            }

        }


        /* ================================================
           TOAST
        ================================================ */

        #appToast {

            position:
                fixed;

            left:
                50%;

            bottom:
                25px;

            transform:
                translate(
                    -50%,
                    20px
                );

            opacity:
                0;

            pointer-events:
                none;

            z-index:
                99999;

            background:
                #222;

            color:
                white;

            padding:
                12px 18px;

            border-radius:
                10px;

            font-size:
                14px;

            transition:
                opacity .25s,
                transform .25s;

        }

        #appToast.show {

            opacity:
                1;

            transform:
                translate(
                    -50%,
                    0
                );

        }


        /* ================================================
           TIMER
        ================================================ */

        .timer-warning {

            color:
                #b54708 !important;

        }

        .timer-danger {

            color:
                #b42318 !important;

            font-weight:
                800;

        }


        /* ================================================
           MOBILE
        ================================================ */

        @media (
            max-width: 700px
        ) {

            .question-item {

                grid-template-columns:
                    34px
                    1fr;

            }

            .question-control {

                grid-column:
                    1 / -1;

            }

            .answer-select,
            .answer-input {

                max-width:
                    100%;

            }

            .review-answer-row {

                grid-template-columns:
                    1fr;

            }

            .summary {

                grid-template-columns:
                    repeat(
                        2,
                        1fr
                    );

            }

            .beautiful-print-button {

                width:
                    100%;

            }

        }

    `;

    document.head.appendChild(
        style
    );

}


/* =========================================================
   SCROLL TEST PANELS
========================================================= */

function scrollTestPanelsToTop() {

    const passage =
        document.getElementById(
            "passageContent"
        );

    const questions =
        document.getElementById(
            "questionsContent"
        );

    if (passage) {
        passage.scrollTop = 0;
    }

    if (questions) {
        questions.scrollTop = 0;
    }

}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
    totalSeconds
) {

    const seconds =
        Math.max(
            0,
            Number(
                totalSeconds
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
        ) +
        ":" +
        String(
            remaining
        ).padStart(
            2,
            "0"
        )
    );

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

    if (!element) {
        return;
    }

    element.textContent =
        value ??
        "";

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ??
        ""
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
   END OF app.js
========================================================= */
