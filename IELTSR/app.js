/* ============================================================
   IELTS READING PRACTICE APP
   LOCAL STORAGE ONLY
   ============================================================
   Supports:
   - 8 IELTS Reading tests
   - 60 minute timer
   - True / False / Not Given
   - Yes / No / Not Given
   - Fill in the blanks
   - Summary Completion
   - Multiple Choice
   - Multiple Choice Multiple Answers
   - Matching Headings
   - Matching Information
   - Matching Features
   - Answer Box
   - Drag & Drop
   - Mobile click-to-place
   - LocalStorage
   - Question navigator
   - IELTS band score
   - Result review
   - Print / Save PDF
   - No login
   - No API
   - No Google Sheets
   - No Admin / Teacher
============================================================ */

"use strict";

/* ============================================================
   CONFIG
============================================================ */

const CONFIG = {
    TEST_COUNT: 8,
    TEST_FOLDER: "./tests/",
    VOCABULARY_FILE: "./vocabulary.json",
    DEFAULT_DURATION: 60
};

/* ============================================================
   GLOBAL STATE
============================================================ */

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

/* ============================================================
   STARTUP
============================================================ */

window.addEventListener("DOMContentLoaded", async function () {
    try {
        injectDragDropStyles();
        injectResultStyles();
        setupGlobalEvents();
        await loadVocabulary();
        removeTeacherAdminElements();
        showDashboard();
    } catch (error) {
        console.error("IELTS Reading startup error:", error);

        document.body.insertAdjacentHTML(
            "beforeend",
            `
            <div style="
                position:fixed;
                inset:0;
                z-index:999999;
                background:#fff;
                color:#b00020;
                padding:30px;
                font-family:Arial,sans-serif;
                overflow:auto;
            ">
                <h2>IELTS Reading App Error</h2>
                <pre style="white-space:pre-wrap;">${escapeHTML(
                    error.stack || error.message || String(error)
                )}</pre>
            </div>
            `
        );
    }
});

/* ============================================================
   GLOBAL EVENTS
============================================================ */

function setupGlobalEvents() {
    addClick("startTestButton", startTest);
    addClick("backToDashboardButton", showDashboard);
    addClick("testBackButton", confirmExitTest);

    addClick("submitTestButton", confirmSubmitTest);

    addClick("previousPartButton", previousPart);
    addClick("nextPartButton", nextPart);

    addClick("returnDashboardButton", showDashboard);

    addClick("retakeTestButton", function () {
        if (currentTest) {
            startTest();
        }
    });

    addClick("closeVocabularyPopup", closeVocabularyPopup);

    addClick("closeConfirmModal", closeConfirmModal);
    addClick("cancelSubmitButton", closeConfirmModal);
    addClick("confirmSubmitButton", submitTest);

    document.addEventListener("click", function (event) {
        const popup = document.getElementById("vocabularyPopup");

        if (
            popup &&
            popup.style.display !== "none" &&
            !popup.contains(event.target) &&
            !event.target.closest(".vocabulary-word")
        ) {
            closeVocabularyPopup();
        }
    });
}

function addClick(id, handler) {
    const element = document.getElementById(id);

    if (element) {
        element.addEventListener("click", handler);
    }
}

/* ============================================================
   REMOVE LOGIN / ADMIN / TEACHER ELEMENTS
============================================================ */

function removeTeacherAdminElements() {
    const ids = [
        "teacherAdminButton",
        "adminButton",
        "teacherButton",
        "teacherAdminLink",
        "adminLink",
        "teacherLink",
        "teacherAdmin",
        "adminPanelButton",
        "teacherAdminPanel",
        "adminPanel"
    ];

    ids.forEach(function (id) {
        const element = document.getElementById(id);

        if (element) {
            element.remove();
        }
    });

    document
        .querySelectorAll("button, a")
        .forEach(function (element) {
            const text = String(element.textContent || "")
                .trim()
                .toLowerCase();

            if (
                text === "admin" ||
                text === "teacher" ||
                text === "teacher admin" ||
                text === "teacher/admin"
            ) {
                element.remove();
            }
        });

    const loginScreen = document.getElementById("loginScreen");

    if (loginScreen) {
        loginScreen.style.display = "none";
    }

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.remove();
    }
}

/* ============================================================
   SCREEN CONTROL
   IMPORTANT:
   Existing HTML uses display:none.
============================================================ */

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(function (screen) {
        screen.style.display = "none";
        screen.classList.remove("active");
    });

    const target = document.getElementById(id);

    if (!target) {
        console.error("Screen not found:", id);
        return;
    }

    target.style.display = "block";
    target.classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
}

/* ============================================================
   DASHBOARD
============================================================ */

async function showDashboard() {
    stopTimer();

    testStarted = false;
    testSubmitted = false;

    showScreen("dashboardScreen");

    await renderTestCards();
}

async function renderTestCards() {
    const container = document.getElementById("testCards");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    for (let i = 1; i <= CONFIG.TEST_COUNT; i++) {
        const card = document.createElement("div");

        card.className = "test-card";
        card.dataset.testNumber = i;

        card.innerHTML = `
            <div class="test-card-number">TEST ${i}</div>

            <h3>IELTS Reading Test ${i}</h3>

            <div class="test-card-info">
                <span>${CONFIG.DEFAULT_DURATION} minutes</span>
                <span>40 questions</span>
            </div>

            <button type="button" class="test-card-button">
                Start Test
            </button>
        `;

        card.addEventListener("click", function () {
            openTest(i);
        });

        container.appendChild(card);
    }
}

/* ============================================================
   LOAD TEST
============================================================ */

async function openTest(testNumber) {
    setLoading(true, "Loading test...");

    try {
        const url =
            `${CONFIG.TEST_FOLDER}Test${testNumber}.json?${Date.now()}`;

        const response = await fetch(url, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `Test${testNumber}.json could not be loaded. HTTP ${response.status}`
            );
        }

        const data = await response.json();

        validateTest(data);

        currentTest = data;
        currentTestNumber = testNumber;
        currentPartIndex = 0;

        studentAnswers = {};
        submittedAnswers = {};

        testSubmitted = false;

        loadSavedAnswers();

        showTestIntroduction();
    } catch (error) {
        console.error(error);

        showToast(
            error.message || "Could not load the test."
        );
    } finally {
        setLoading(false);
    }
}

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

    test.parts.forEach(function (part, index) {
        if (!part.passage) {
            throw new Error(
                `Part ${index + 1} is missing its passage.`
            );
        }

        if (!Array.isArray(part.questionGroups)) {
            part.questionGroups = [];
        }

        part.questionGroups.forEach(function (group) {
            if (!Array.isArray(group.questions)) {
                group.questions = [];
            }

            if (!Array.isArray(group.blanks)) {
                group.blanks = [];
            }
        });
    });
}

/* ============================================================
   INTRO
============================================================ */

function showTestIntroduction() {
    showScreen("introScreen");

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

/* ============================================================
   START TEST
============================================================ */

function startTest() {
    if (!currentTest) {
        return;
    }

    loadSavedAnswers();

    currentPartIndex = 0;

    testStarted = true;
    testSubmitted = false;

    testStartTime = Date.now();

    remainingSeconds =
        (Number(currentTest.duration) ||
            CONFIG.DEFAULT_DURATION) *
        60;

    testElapsedSeconds = 0;

    showScreen("testScreen");

    renderCurrentPart();

    startTimer();
}

/* ============================================================
   TIMER
============================================================ */

function startTimer() {
    stopTimer();

    updateTimerDisplay();

    timerInterval = setInterval(function () {
        remainingSeconds--;

        updateTimerDisplay();

        if (remainingSeconds <= 0) {
            remainingSeconds = 0;

            stopTimer();

            autoSubmitTest();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const ids = [
        "timer",
        "timerDisplay",
        "testTimer"
    ];

    for (const id of ids) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent =
                formatTime(remainingSeconds);

            return;
        }
    }
}

/* ============================================================
   CURRENT PART
============================================================ */

function renderCurrentPart() {
    if (!currentTest) {
        return;
    }

    const part =
        currentTest.parts[currentPartIndex];

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
        part.passage.title || ""
    );

    setText(
        "questionsPartLabel",
        `Questions ${questionRangeForPart(part)}`
    );

    setText(
        "partIndicator",
        `Part ${
            currentPartIndex + 1
        } of ${currentTest.parts.length}`
    );

    renderPassage(part.passage);

    renderQuestions(part);

    renderQuestionNavigator();

    updatePartButtons();

    scrollTestPanelsToTop();
}

/* ============================================================
   QUESTION RANGE
============================================================ */

function questionRangeForPart(part) {
    const numbers = [];

    (part.questionGroups || []).forEach(function (group) {
        (group.questions || []).forEach(function (question) {
            const n = Number(question.number);

            if (Number.isFinite(n)) {
                numbers.push(n);
            }
        });

        (group.blanks || []).forEach(function (blank) {
            const n = Number(blank.number);

            if (Number.isFinite(n)) {
                numbers.push(n);
            }
        });
    });

    if (!numbers.length) {
        return "";
    }

    return `${Math.min(...numbers)}-${Math.max(...numbers)}`;
}

/* ============================================================
   PASSAGE
============================================================ */

function renderPassage(passage) {
    const box = document.getElementById(
        "passageContent"
    );

    if (!box) {
        return;
    }

    const paragraphs = passage.paragraphs || [];

    box.innerHTML = paragraphs
        .map(function (paragraph) {
            return `
                <p class="passage-paragraph">
                    <span class="paragraph-label">
                        ${escapeHTML(paragraph.id || "")}
                    </span>
                    ${highlightVocabulary(
                        paragraph.text || ""
                    )}
                </p>
            `;
        })
        .join("");

    box
        .querySelectorAll(".vocabulary-word")
        .forEach(function (element) {
            element.addEventListener(
                "click",
                function (event) {
                    event.stopPropagation();

                    showVocabularyPopup(
                        element.dataset.word
                    );
                }
            );
        });
}

/* ============================================================
   VOCABULARY
============================================================ */

async function loadVocabulary() {
    vocabulary = {};

    try {
        const response = await fetch(
            `${CONFIG.VOCABULARY_FILE}?${Date.now()}`,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            return;
        }

        const data = await response.json();

        vocabulary =
            data.words ||
            data.vocabulary ||
            data ||
            {};
    } catch (error) {
        console.warn(
            "Vocabulary could not be loaded.",
            error
        );

        vocabulary = {};
    }
}

function highlightVocabulary(text) {
    if (
        !vocabulary ||
        typeof vocabulary !== "object" ||
        !Object.keys(vocabulary).length
    ) {
        return escapeHTML(text);
    }

    let result = escapeHTML(text);

    const words = Object.keys(vocabulary).sort(
        function (a, b) {
            return b.length - a.length;
        }
    );

    words.forEach(function (word) {
        if (!word) {
            return;
        }

        const escaped = escapeRegExp(word);

        const regex = new RegExp(
            `(?<![A-Za-z])(${escaped})(?![A-Za-z])`,
            "gi"
        );

        result = result.replace(
            regex,
            function (match) {
                return `
                    <span
                        class="vocabulary-word"
                        data-word="${escapeAttribute(match)}"
                    >${match}</span>
                `;
            }
        );
    });

    return result;
}

function showVocabularyPopup(word) {
    if (!vocabulary) {
        return;
    }

    const key = Object.keys(vocabulary).find(
        function (item) {
            return (
                String(item).toLowerCase() ===
                String(word).toLowerCase()
            );
        }
    );

    if (!key) {
        return;
    }

    const item = vocabulary[key] || {};

    const popup =
        document.getElementById(
            "vocabularyPopup"
        );

    if (!popup) {
        return;
    }

    setText("vocabularyWord", word);

    setText(
        "vocabularyMeaning",
        item.meaning ||
            item.translation ||
            "Meaning not available."
    );

    setText(
        "vocabularySimpleMeaning",
        item.simpleMeaning ||
            item.simple ||
            ""
    );

    popup.style.display = "block";
}

function closeVocabularyPopup() {
    const popup =
        document.getElementById(
            "vocabularyPopup"
        );

    if (popup) {
        popup.style.display = "none";
    }
}

/* ============================================================
   QUESTION RENDERING
============================================================ */

function renderQuestions(part) {
    const box =
        document.getElementById(
            "questionsContent"
        );

    if (!box) {
        return;
    }

    box.innerHTML = "";

    (part.questionGroups || []).forEach(
        function (group) {
            const wrapper =
                document.createElement("div");

            wrapper.className =
                "question-group";

            if (group.questionRange) {
                wrapper.insertAdjacentHTML(
                    "beforeend",
                    `
                    <h3 class="question-group-title">
                        Questions ${escapeHTML(
                            group.questionRange
                        )}
                    </h3>
                    `
                );
            }

            if (group.instructions) {
                wrapper.insertAdjacentHTML(
                    "beforeend",
                    `
                    <p class="question-instructions">
                        ${escapeHTML(
                            group.instructions
                        )}
                    </p>
                    `
                );
            }

            const content =
                document.createElement("div");

            wrapper.appendChild(content);

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
                case "multiple_choice_multiple_answers":
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
                case "short_answer":
                    renderAnswerBox(
                        content,
                        group
                    );
                    break;

                default:
                    renderGenericGroup(
                        content,
                        group
                    );
                    break;
            }

            box.appendChild(wrapper);
        }
    );

    restoreAnswers();

    restoreDragDropAnswers();

    updateQuestionNavigator();
}

function normalizeQuestionType(type) {
    return String(type || "")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_");
}

/* ============================================================
   TRUE / FALSE / NOT GIVEN
============================================================ */

function renderTrueFalseNotGiven(box, group) {
    (group.questions || []).forEach(
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

/* ============================================================
   YES / NO / NOT GIVEN
============================================================ */

function renderYesNoNotGiven(box, group) {
    (group.questions || []).forEach(
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

/* ============================================================
   FILL BLANK
============================================================ */

function renderFillBlank(box, group) {
    const questions =
        group.questions ||
        group.blanks ||
        [];

    questions.forEach(function (question) {
        const item =
            createQuestionItem(question);

        const control =
            item.querySelector(
                ".question-control"
            );

        if (!control) {
            return;
        }

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

        attachInputListener(control);

        box.appendChild(item);
    });
}

/* ============================================================
   SUMMARY COMPLETION
============================================================ */

function renderSummaryCompletion(box, group) {
    const container =
        document.createElement("div");

    container.className =
        "summary-completion";

    const blanks =
        group.blanks &&
        group.blanks.length
            ? group.blanks
            : group.questions || [];

    const options =
        getQuestionOptions(
            null,
            group
        );

    if (options.length) {
        const bank =
            document.createElement("div");

        bank.className =
            "word-bank";

        bank.innerHTML = `
            <div class="word-bank-title">
                Word Bank
            </div>
            <div class="word-bank-options"></div>
        `;

        const optionBox =
            bank.querySelector(
                ".word-bank-options"
            );

        options.forEach(function (option, index) {
            const value =
                getOptionValue(option);

            const label =
                getOptionLabel(option);

            const optionElement =
                document.createElement("button");

            optionElement.type = "button";

            optionElement.className =
                "drag-option";

            optionElement.dataset.value =
                value;

            optionElement.dataset.index =
                index;

            optionElement.textContent =
                label;

            setupDragOption(
                optionElement,
                value
            );

            optionBox.appendChild(
                optionElement
            );
        });

        container.appendChild(bank);
    }

    const summary =
        document.createElement("div");

    summary.className =
        "summary-text";

    if (group.summary) {
        summary.innerHTML =
            renderSummaryHTML(
                group.summary,
                blanks
            );
    } else if (group.text) {
        summary.innerHTML =
            renderSummaryHTML(
                group.text,
                blanks
            );
    }

    if (!summary.innerHTML) {
        blanks.forEach(function (blank) {
            summary.appendChild(
                createSummaryDropZone(
                    blank
                )
            );
        });
    } else {
        summary
            .querySelectorAll(
                "[data-question-number]"
            )
            .forEach(function (zone) {
                setupDropZone(
                    zone,
                    zone.dataset.questionNumber
                );
            });
    }

    container.appendChild(summary);

    box.appendChild(container);
}

function renderSummaryHTML(text, blanks) {
    let html = escapeHTML(
        String(text || "")
    );

    blanks.forEach(function (blank) {
        const number =
            Number(blank.number);

        if (!Number.isFinite(number)) {
            return;
        }

        const token =
            blank.placeholder ||
            `{{${number}}}`;

        const escapedToken =
            escapeRegExp(token);

        html = html.replace(
            new RegExp(
                escapedToken,
                "g"
            ),
            `
            <span
                class="drop-zone"
                data-question-number="${number}"
                tabindex="0"
            >
                ${number}.
                <span class="drop-zone-value">
                    Drop answer here
                </span>
            </span>
            `
        );
    });

    return html;
}

function createSummaryDropZone(blank) {
    const zone =
        document.createElement("span");

    zone.className =
        "drop-zone";

    zone.dataset.questionNumber =
        blank.number;

    zone.tabIndex = 0;

    zone.innerHTML = `
        ${blank.number}.
        <span class="drop-zone-value">
            Drop answer here
        </span>
    `;

    setupDropZone(
        zone,
        blank.number
    );

    return zone;
}

/* ============================================================
   MULTIPLE CHOICE
============================================================ */

function renderMultipleChoice(box, group) {
    (group.questions || []).forEach(
        function (question) {
            const options =
                getQuestionOptions(
                    question,
                    group
                );

            box.appendChild(
                createQuestionItem(
                    question,
                    options,
                    false,
                    true
                )
            );
        }
    );
}

/* ============================================================
   MULTIPLE CHOICE MULTIPLE
============================================================ */

function renderMultipleChoiceMultiple(
    box,
    group
) {
    (group.questions || []).forEach(
        function (question) {
            const item =
                createQuestionItem(
                    question
                );

            const control =
                item.querySelector(
                    ".question-control"
                );

            if (!control) {
                return;
            }

            const options =
                getQuestionOptions(
                    question,
                    group
                );

            control.innerHTML =
                options
                    .map(function (option, index) {
                        const value =
                            getOptionValue(
                                option
                            );

                        const label =
                            getOptionLabel(
                                option
                            );

                        return `
                            <label class="choice-option">
                                <input
                                    type="checkbox"
                                    data-question-number="${question.number}"
                                    value="${escapeAttribute(
                                        value
                                    )}"
                                >
                                <span>
                                    ${escapeHTML(
                                        label
                                    )}
                                </span>
                            </label>
                        `;
                    })
                    .join("");

            control
                .querySelectorAll(
                    "input"
                )
                .forEach(function (input) {
                    input.addEventListener(
                        "change",
                        function () {
                            const number =
                                Number(
                                    input.dataset
                                        .questionNumber
                                );

                            const values =
                                Array.from(
                                    control.querySelectorAll(
                                        "input:checked"
                                    )
                                ).map(
                                    function (
                                        checkbox
                                    ) {
                                        return checkbox.value;
                                    }
                                );

                            setAnswer(
                                number,
                                values
                            );
                        }
                    );
                });

            box.appendChild(item);
        }
    );
}

/* ============================================================
   MATCHING HEADINGS
============================================================ */

function renderMatchingHeadings(
    box,
    group
) {
    (group.questions || []).forEach(
        function (question) {
            const options =
                getQuestionOptions(
                    question,
                    group
                );

            box.appendChild(
                createQuestionItem(
                    question,
                    options,
                    true
                )
            );
        }
    );
}

/* ============================================================
   MATCHING INFORMATION
============================================================ */

function renderMatchingInformation(
    box,
    group
) {
    (group.questions || []).forEach(
        function (question) {
            const options =
                getQuestionOptions(
                    question,
                    group
                );

            box.appendChild(
                createQuestionItem(
                    question,
                    options,
                    true
                )
            );
        }
    );
}

/* ============================================================
   MATCHING FEATURES
============================================================ */

function renderMatchingFeatures(
    box,
    group
) {
    const options =
        getQuestionOptions(
            null,
            group
        );

    const bank =
        document.createElement("div");

    bank.className =
        "matching-features-bank";

    options.forEach(function (option, index) {
        const value =
            getOptionValue(option);

        const label =
            getOptionLabel(option);

        const element =
            document.createElement("button");

        element.type = "button";

        element.className =
            "drag-option";

        element.dataset.value =
            value;

        element.dataset.index =
            index;

        element.textContent =
            label;

        setupDragOption(
            element,
            value
        );

        bank.appendChild(element);
    });

    box.appendChild(bank);

    (group.questions || []).forEach(
        function (question) {
            const wrapper =
                document.createElement("div");

            wrapper.className =
                "drag-question";

            wrapper.dataset.questionNumber =
                question.number;

            wrapper.innerHTML = `
                <div class="question-number">
                    ${question.number}
                </div>

                <div class="question-text">
                    ${escapeHTML(
                        getQuestionText(
                            question
                        )
                    )}
                </div>

                <div
                    class="drop-zone"
                    data-question-number="${question.number}"
                    tabindex="0"
                >
                    <span class="drop-zone-value">
                        Drop / select answer
                    </span>
                </div>
            `;

            const zone =
                wrapper.querySelector(
                    ".drop-zone"
                );

            setupDropZone(
                zone,
                question.number
            );

            box.appendChild(wrapper);
        }
    );
}

/* ============================================================
   ANSWER BOX
============================================================ */

function renderAnswerBox(
    box,
    group
) {
    (group.questions || []).forEach(
        function (question) {
            const item =
                createQuestionItem(
                    question
                );

            const control =
                item.querySelector(
                    ".question-control"
                );

            if (!control) {
                return;
            }

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

            attachInputListener(control);

            box.appendChild(item);
        }
    );
}

/* ============================================================
   GENERIC FALLBACK
============================================================ */

function renderGenericGroup(
    box,
    group
) {
    (group.questions || []).forEach(
        function (question) {
            const options =
                getQuestionOptions(
                    question,
                    group
                );

            box.appendChild(
                createQuestionItem(
                    question,
                    options
                )
            );
        }
    );
}

/* ============================================================
   CREATE QUESTION
============================================================ */

function createQuestionItem(
    question,
    options = [],
    selectMode = false,
    radioMode = false
) {
    const wrapper =
        document.createElement("div");

    wrapper.className =
        "question";

    wrapper.dataset.questionNumber =
        question.number;

    const text =
        getQuestionText(question);

    wrapper.innerHTML = `
        <div class="question-header">
            <span class="question-number">
                ${question.number}
            </span>

            <span class="question-text">
                ${escapeHTML(text)}
            </span>
        </div>

        <div class="question-control"></div>
    `;

    const control =
        wrapper.querySelector(
            ".question-control"
        );

    if (selectMode) {
        const select =
            document.createElement("select");

        select.className =
            "answer-select";

        select.dataset.questionNumber =
            question.number;

        select.innerHTML = `
            <option value="">
                Select an answer
            </option>
        `;

        options.forEach(function (option) {
            const value =
                getOptionValue(option);

            const label =
                getOptionLabel(option);

            const optionElement =
                document.createElement("option");

            optionElement.value =
                value;

            optionElement.textContent =
                label;

            select.appendChild(
                optionElement
            );
        });

        select.addEventListener(
            "change",
            function () {
                setAnswer(
                    Number(
                        select.dataset
                            .questionNumber
                    ),
                    select.value
                );
            }
        );

        control.appendChild(select);

        return wrapper;
    }

    if (options.length) {
        options.forEach(function (option) {
            const value =
                getOptionValue(option);

            const label =
                getOptionLabel(option);

            const optionLabel =
                document.createElement(
                    "label"
                );

            optionLabel.className =
                "choice-option";

            optionLabel.innerHTML = `
                <input
                    type="${
                        radioMode
                            ? "radio"
                            : "radio"
                    }"
                    name="question_${question.number}"
                    value="${escapeAttribute(
                        value
                    )}"
                    data-question-number="${question.number}"
                >

                <span>
                    ${escapeHTML(label)}
                </span>
            `;

            const input =
                optionLabel.querySelector(
                    "input"
                );

            input.addEventListener(
                "change",
                function () {
                    setAnswer(
                        Number(
                            input.dataset
                                .questionNumber
                        ),
                        input.value
                    );
                }
            );

            control.appendChild(
                optionLabel
            );
        });
    }

    return wrapper;
}

/* ============================================================
   QUESTION HELPERS
============================================================ */

function getQuestionText(question) {
    return (
        question.question ||
        question.text ||
        question.statement ||
        question.prompt ||
        question.title ||
        ""
    );
}

function getQuestionOptions(
    question,
    group
) {
    const sources = [
        question &&
            question.options,
        question &&
            question.choices,
        question &&
            question.answerOptions,

        group &&
            group.options,
        group &&
            group.choices,
        group &&
            group.answerOptions,
        group &&
            group.headings,
        group &&
            group.features,
        group &&
            group.words,
        group &&
            group.wordBank
    ];

    for (const source of sources) {
        if (Array.isArray(source) && source.length) {
            return uniqueOptions(source);
        }

        if (
            source &&
            typeof source === "object"
        ) {
            return uniqueOptions(
                Object.entries(source).map(
                    function ([key, value]) {
                        if (
                            typeof value ===
                            "object"
                        ) {
                            return {
                                ...value,
                                value:
                                    value.value ||
                                    key,
                                label:
                                    value.label ||
                                    value.text ||
                                    key
                            };
                        }

                        return {
                            value: key,
                            label: value
                        };
                    }
                )
            );
        }
    }

    return [];
}

function getOptionValue(option) {
    if (
        option &&
        typeof option === "object"
    ) {
        return String(
            option.value ??
                option.id ??
                option.key ??
                option.label ??
                option.text ??
                ""
        );
    }

    return String(option ?? "");
}

function getOptionLabel(option) {
    if (
        option &&
        typeof option === "object"
    ) {
        return String(
            option.label ??
                option.text ??
                option.title ??
                option.value ??
                ""
        );
    }

    return String(option ?? "");
}

function uniqueOptions(options) {
    const seen = new Set();

    return options.filter(function (option) {
        const value =
            getOptionValue(option);

        if (seen.has(value)) {
            return false;
        }

        seen.add(value);

        return true;
    });
}

/* ============================================================
   INPUT HANDLING
============================================================ */

function attachInputListener(container) {
    container
        .querySelectorAll(
            "input[type='text'], textarea"
        )
        .forEach(function (input) {
            input.addEventListener(
                "input",
                function () {
                    const number =
                        Number(
                            input.dataset
                                .questionNumber
                        );

                    setAnswer(
                        number,
                        input.value
                    );
                }
            );
        });
}

function setAnswer(
    number,
    value
) {
    if (
        number === undefined ||
        number === null ||
        !Number.isFinite(Number(number))
    ) {
        return;
    }

    const key = String(number);

    studentAnswers[key] =
        value;

    saveAnswersToStorage();

    updateQuestionNavigator();
}

function handleAnswerChange(
    number,
    value
) {
    setAnswer(number, value);
}

/* ============================================================
   DRAG / DROP
============================================================ */

function setupDragOption(
    element,
    value
) {
    element.draggable = true;

    element.addEventListener(
        "dragstart",
        function (event) {
            selectedDragOption = value;

            event.dataTransfer.setData(
                "text/plain",
                value
            );

            element.classList.add(
                "dragging"
            );
        }
    );

    element.addEventListener(
        "dragend",
        function () {
            element.classList.remove(
                "dragging"
            );
        }
    );

    element.addEventListener(
        "click",
        function () {
            selectedDragOption = value;

            document
                .querySelectorAll(
                    ".drag-option"
                )
                .forEach(function (item) {
                    item.classList.remove(
                        "selected"
                    );
                });

            element.classList.add(
                "selected"
            );

            showToast(
                "Now select a blank to place the answer."
            );
        }
    );
}

function setupDropZone(
    zone,
    questionNumber
) {
    if (!zone) {
        return;
    }

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

            const value =
                event.dataTransfer.getData(
                    "text/plain"
                );

            if (value) {
                placeDragAnswer(
                    questionNumber,
                    value
                );
            }
        }
    );

    zone.addEventListener(
        "click",
        function () {
            if (
                selectedDragOption !==
                null
            ) {
                placeDragAnswer(
                    questionNumber,
                    selectedDragOption
                );

                selectedDragOption =
                    null;

                document
                    .querySelectorAll(
                        ".drag-option"
                    )
                    .forEach(function (
                        item
                    ) {
                        item.classList.remove(
                            "selected"
                        );
                    });
            }
        }
    );
}

function placeDragAnswer(
    questionNumber,
    value
) {
    setAnswer(
        Number(questionNumber),
        value
    );

    const zone =
        document.querySelector(
            `.drop-zone[data-question-number="${CSS.escape(
                String(questionNumber)
            )}"]`
        );

    if (zone) {
        const valueElement =
            zone.querySelector(
                ".drop-zone-value"
            );

        if (valueElement) {
            valueElement.textContent =
                value;
        } else {
            zone.textContent =
                value;
        }

        zone.classList.add(
            "filled"
        );
    }

    updateQuestionNavigator();
}

function restoreDragDropAnswers() {
    Object.keys(
        studentAnswers
    ).forEach(function (number) {
        const value =
            studentAnswers[number];

        if (
            value === undefined ||
            value === null ||
            String(value).trim() === ""
        ) {
            return;
        }

        const zone =
            document.querySelector(
                `.drop-zone[data-question-number="${CSS.escape(
                    String(number)
                )}"]`
            );

        if (!zone) {
            return;
        }

        const valueElement =
            zone.querySelector(
                ".drop-zone-value"
            );

        if (valueElement) {
            valueElement.textContent =
                Array.isArray(value)
                    ? value.join(", ")
                    : value;
        } else {
            zone.textContent =
                Array.isArray(value)
                    ? value.join(", ")
                    : value;
        }

        zone.classList.add(
            "filled"
        );
    });
}

/* ============================================================
   SAVE ANSWERS
============================================================ */

function getAnswerStorageKey() {
    return `ieltsReadingAnswers_${currentTestNumber}`;
}

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
            "Could not save answers.",
            error
        );
    }
}

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
            JSON.parse(raw);

        if (
            saved &&
            typeof saved === "object"
        ) {
            studentAnswers =
                saved;
        }
    } catch (error) {
        console.warn(
            "Could not load saved answers.",
            error
        );

        studentAnswers = {};
    }
}

function clearCurrentTestAnswers() {
    if (!currentTestNumber) {
        return;
    }

    localStorage.removeItem(
        getAnswerStorageKey()
    );

    studentAnswers = {};
}

/* ============================================================
   RESTORE VISIBLE ANSWERS
============================================================ */

function restoreAnswers() {
    Object.keys(
        studentAnswers
    ).forEach(function (number) {
        const value =
            studentAnswers[number];

        const selector =
            `[data-question-number="${CSS.escape(
                String(number)
            )}"]`;

        document
            .querySelectorAll(selector)
            .forEach(function (element) {
                if (
                    element.tagName ===
                    "INPUT"
                ) {
                    if (
                        element.type ===
                        "checkbox"
                    ) {
                        const values =
                            Array.isArray(
                                value
                            )
                                ? value
                                : [value];

                        element.checked =
                            values.some(
                                function (
                                    item
                                ) {
                                    return (
                                        normalizeAnswer(
                                            item
                                        ) ===
                                        normalizeAnswer(
                                            element.value
                                        )
                                    );
                                }
                            );
                    } else if (
                        element.type ===
                        "radio"
                    ) {
                        element.checked =
                            normalizeAnswer(
                                element.value
                            ) ===
                            normalizeAnswer(
                                value
                            );
                    } else {
                        element.value =
                            Array.isArray(
                                value
                            )
                                ? value.join(
                                      ", "
                                  )
                                : value;
                    }
                }

                if (
                    element.tagName ===
                    "SELECT"
                ) {
                    element.value =
                        String(value);
                }
            });
    });

    restoreDragDropAnswers();
}

/* ============================================================
   SAVE ALL VISIBLE ANSWERS
============================================================ */

function saveAllVisibleAnswers() {
    document
        .querySelectorAll(
            "[data-question-number]"
        )
        .forEach(function (element) {
            const number =
                Number(
                    element.dataset
                        .questionNumber
                );

            if (
                !Number.isFinite(number)
            ) {
                return;
            }

            if (
                element.tagName ===
                    "INPUT" &&
                element.type ===
                    "checkbox"
            ) {
                return;
            }

            if (
                element.tagName ===
                    "INPUT" ||
                element.tagName ===
                    "TEXTAREA" ||
                element.tagName ===
                    "SELECT"
            ) {
                setAnswer(
                    number,
                    element.value
                );
            }
        });

    document
        .querySelectorAll(
            "input[type='checkbox'][data-question-number]"
        )
        .forEach(function (input) {
            const number =
                Number(
                    input.dataset
                        .questionNumber
                );

            const parent =
                input.closest(
                    ".question-control"
                );

            if (!parent) {
                return;
            }

            const values =
                Array.from(
                    parent.querySelectorAll(
                        "input[type='checkbox']:checked"
                    )
                ).map(function (item) {
                    return item.value;
                });

            setAnswer(
                number,
                values
            );
        });

    saveAnswersToStorage();
}

/* ============================================================
   QUESTION NAVIGATOR
============================================================ */

function getAllQuestionNumbers() {
    if (!currentTest) {
        return [];
    }

    const numbers = [];

    currentTest.parts.forEach(
        function (part) {
            (part.questionGroups || [])
                .forEach(function (group) {
                    (group.questions || [])
                        .forEach(
                            function (
                                question
                            ) {
                                const n =
                                    Number(
                                        question.number
                                    );

                                if (
                                    Number.isFinite(
                                        n
                                    )
                                ) {
                                    numbers.push(
                                        n
                                    );
                                }
                            }
                        );

                    (group.blanks || [])
                        .forEach(
                            function (
                                blank
                            ) {
                                const n =
                                    Number(
                                        blank.number
                                    );

                                if (
                                    Number.isFinite(
                                        n
                                    )
                                ) {
                                    numbers.push(
                                        n
                                    );
                                }
                            }
                        );
                });
        }
    );

    return [
        ...new Set(numbers)
    ].sort(function (a, b) {
        return a - b;
    });
}

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
            .map(function (number) {
                return `
                    <button
                        type="button"
                        class="question-nav-item"
                        data-question-nav="${number}"
                    >
                        ${number}
                    </button>
                `;
            })
            .join("");

    nav
        .querySelectorAll(
            "[data-question-nav]"
        )
        .forEach(function (button) {
            button.addEventListener(
                "click",
                function () {
                    jumpToQuestion(
                        Number(
                            button.dataset
                                .questionNav
                        )
                    );
                }
            );
        });

    updateQuestionNavigator();
}

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
        .forEach(function (button) {
            const number =
                Number(
                    button.dataset
                        .questionNav
                );

            button.classList.toggle(
                "answered",
                isQuestionAnswered(
                    number
                )
            );
        });
}

function isQuestionAnswered(number) {
    const value =
        studentAnswers[
            String(number)
        ];

    if (
        value === undefined ||
        value === null
    ) {
        return false;
    }

    if (Array.isArray(value)) {
        return value.some(
            function (item) {
                return (
                    String(
                        item
                    ).trim() !== ""
                );
            }
        );
    }

    return (
        String(value).trim() !== ""
    );
}

function jumpToQuestion(number) {
    const element =
        document.querySelector(
            `[data-question-number="${CSS.escape(
                String(number)
            )}"]`
        );

    if (!element) {
        return;
    }

    const question =
        element.closest(
            ".question, .drag-question"
        );

    (
        question ||
        element
    ).scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

/* ============================================================
   PART NAVIGATION
============================================================ */

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

function previousPart() {
    saveAllVisibleAnswers();

    if (
        currentPartIndex > 0
    ) {
        currentPartIndex--;

        renderCurrentPart();
    }
}

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
        next.textContent =
            currentPartIndex ===
            currentTest.parts.length - 1
                ? "Submit Test →"
                : "Next Part →";
    }
}

function scrollTestPanelsToTop() {
    [
        "passagePanel",
        "questionsPanel",
        "passageContent",
        "questionsContent"
    ].forEach(function (id) {
        const element =
            document.getElementById(id);

        if (element) {
            element.scrollTop = 0;
        }
    });

    window.scrollTo({
        top: 0,
        behavior: "instant"
    });
}

/* ============================================================
   SUBMISSION
============================================================ */

function confirmSubmitTest() {
    if (!currentTest) {
        return;
    }

    saveAllVisibleAnswers();

    openConfirmModal(
        "Submit Test?",
        "Are you sure you want to submit your answers?"
    );
}

function confirmExitTest() {
    openConfirmModal(
        "Leave Test?",
        "Your answers are saved locally. Do you want to leave this test?"
    );
}

function openConfirmModal(
    title,
    message
) {
    const modal =
        document.getElementById(
            "confirmModal"
        );

    if (!modal) {
        if (
            confirm(
                `${title}\n\n${message}`
            )
        ) {
            if (
                title.toLowerCase().includes(
                    "submit"
                )
            ) {
                submitTest();
            } else {
                showDashboard();
            }
        }

        return;
    }

    setText(
        "confirmModalTitle",
        title
    );

    setText(
        "confirmModalMessage",
        message
    );

    modal.style.display = "flex";

    modal.dataset.action =
        title.toLowerCase().includes(
            "submit"
        )
            ? "submit"
            : "exit";
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

function submitTest() {
    closeConfirmModal();

    saveAllVisibleAnswers();

    stopTimer();

    testElapsedSeconds =
        calculateTimeUsed();

    submittedAnswers =
        JSON.parse(
            JSON.stringify(
                studentAnswers
            )
        );

    scoreData =
        calculateScore(
            submittedAnswers
        );

    testSubmitted = true;
    testStarted = false;

    renderResult();
}

function autoSubmitTest() {
    if (testSubmitted) {
        return;
    }

    saveAllVisibleAnswers();

    submittedAnswers =
        JSON.parse(
            JSON.stringify(
                studentAnswers
            )
        );

    testElapsedSeconds =
        calculateTimeUsed();

    scoreData =
        calculateScore(
            submittedAnswers
        );

    testSubmitted = true;
    testStarted = false;

    renderResult();
}

/* ============================================================
   TIME
============================================================ */

function calculateTimeUsed() {
    if (!testStartTime) {
        return testElapsedSeconds;
    }

    const duration =
        Math.floor(
            (Date.now() -
                testStartTime) /
                1000
        );

    const totalDuration =
        (
            Number(
                currentTest?.duration
            ) ||
            CONFIG.DEFAULT_DURATION
        ) * 60;

    return Math.min(
        duration,
        totalDuration
    );
}

function formatTime(seconds) {
    seconds =
        Math.max(
            0,
            Number(seconds) || 0
        );

    const minutes =
        Math.floor(
            seconds / 60
        );

    const remaining =
        seconds % 60;

    return `${String(
        minutes
    ).padStart(2, "0")}:${String(
        remaining
    ).padStart(2, "0")}`;
}

/* ============================================================
   SCORING
============================================================ */

function calculateScore(
    answerSet = studentAnswers
) {
    let total = 0;

    const partScores = [];
    const partTotals = [];

    currentTest.parts.forEach(
        function (part, partIndex) {
            let partScore = 0;
            let partTotal = 0;

            (
                part.questionGroups ||
                []
            ).forEach(
                function (group) {
                    (
                        group.questions ||
                        []
                    ).forEach(
                        function (
                            question
                        ) {
                            partTotal++;

                            if (
                                answersMatch(
                                    answerSet[
                                        question.number
                                    ],
                                    question.answer ??
                                        question.correctAnswer ??
                                        question.correct
                                )
                            ) {
                                partScore++;
                                total++;
                            }
                        }
                    );

                    (
                        group.blanks ||
                        []
                    ).forEach(
                        function (
                            blank
                        ) {
                            partTotal++;

                            if (
                                answersMatch(
                                    answerSet[
                                        blank.number
                                    ],
                                    blank.answer ??
                                        blank.correctAnswer ??
                                        blank.correct
                                )
                            ) {
                                partScore++;
                                total++;
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
        }
    );

    const totalQuestions =
        partTotals.reduce(
            function (a, b) {
                return a + b;
            },
            0
        );

    return {
        totalScore: total,
        totalQuestions,
        partScores,
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

function countTotalQuestions() {
    if (!currentTest) {
        return 0;
    }

    return getAllQuestionObjects().length;
}

/* ============================================================
   ANSWER MATCHING
============================================================ */

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

    if (
        Array.isArray(correct)
    ) {
        if (
            Array.isArray(given)
        ) {
            const givenValues =
                given.map(
                    normalizeAnswer
                );

            const correctValues =
                correct.map(
                    normalizeAnswer
                );

            if (
                givenValues.length !==
                correctValues.length
            ) {
                return false;
            }

            return (
                givenValues.every(
                    function (value) {
                        return correctValues.includes(
                            value
                        );
                    }
                )
            );
        }

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

    if (
        Array.isArray(given)
    ) {
        return given.some(
            function (answer) {
                return (
                    normalizeAnswer(
                        answer
                    ) ===
                    normalizeAnswer(
                        correct
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

function normalizeAnswer(value) {
    return String(
        value ?? ""
    )
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase()
        .replace(/[.,!?;:]+$/g, "");
}

/* ============================================================
   IELTS BAND
============================================================ */

function calculateIELTSBand(score) {
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
        9: 3.5,
        8: 3.5,
        7: 3.0,
        6: 3.0,
        5: 2.5,
        4: 2.5,
        3: 2.0,
        2: 1.5,
        1: 1.0,
        0: 0.0
    };

    if (
        Object.prototype.hasOwnProperty.call(
            bands,
            score
        )
    ) {
        return bands[score];
    }

    const percentage =
        score / 40;

    if (percentage >= 0.9)
        return 9.0;

    if (percentage >= 0.85)
        return 8.5;

    if (percentage >= 0.8)
        return 8.0;

    if (percentage >= 0.75)
        return 7.5;

    if (percentage >= 0.7)
        return 7.0;

    if (percentage >= 0.65)
        return 6.5;

    if (percentage >= 0.6)
        return 6.0;

    if (percentage >= 0.55)
        return 5.5;

    if (percentage >= 0.45)
        return 5.0;

    return 4.5;
}

/* ============================================================
   RESULT
============================================================ */

function renderResult() {
    showScreen("resultScreen");

    if (!scoreData) {
        return;
    }

    const title =
        currentTest?.title ||
        `IELTS Reading Test ${currentTestNumber}`;

    const total =
        scoreData.totalQuestions;

    const score =
        scoreData.totalScore;

    const answered =
        countAnsweredAnswers(
            submittedAnswers
        );

    const incorrect =
        Math.max(
            0,
            answered - score
        );

    const unanswered =
        Math.max(
            0,
            total - answered
        );

    const accuracy =
        answered
            ? Math.round(
                  (score /
                      answered) *
                      100
              )
            : 0;

    setText(
        "resultTestTitle",
        title
    );

    setText(
        "resultScore",
        score
    );

    setText(
        "resultTotal",
        `/ ${total}`
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

    setText(
        "resultAnswered",
        answered
    );

    setText(
        "resultIncorrect",
        incorrect
    );

    setText(
        "resultUnanswered",
        unanswered
    );

    setText(
        "resultAccuracy",
        `${accuracy}%`
    );

    renderPartScores();

    renderIncorrectAnswers();

    buildReadingResultScreen(
        title,
        score,
        total,
        answered,
        incorrect,
        unanswered,
        accuracy
    );

    ensurePrintButton();
}

/* ============================================================
   RESULT PAGE
============================================================ */

function buildReadingResultScreen(
    title,
    score,
    total,
    answered,
    incorrect,
    unanswered,
    accuracy
) {
    const existing =
        document.getElementById(
            "readingResultReport"
        );

    if (existing) {
        existing.remove();
    }

    const resultScreen =
        document.getElementById(
            "resultScreen"
        );

    if (!resultScreen) {
        return;
    }

    const report =
        document.createElement("div");

    report.id =
        "readingResultReport";

    report.className =
        "results-page";

    report.innerHTML = `
        <div class="results-heading">
            <div class="results-kicker">
                TEST COMPLETE
            </div>

            <h1>Your Reading Result</h1>

            <p>
                ${escapeHTML(title)}
            </p>

            <button
                type="button"
                id="readingPrintButton"
                class="print-result-button"
            >
                Print / Save PDF
            </button>
        </div>

        <div class="result-hero">
            <div class="score-ring">
                <strong>
                    ${score}/${total}
                </strong>
                <span>Correct</span>
            </div>

            <div class="hero-copy">
                <div class="status-pill">
                    Completed
                </div>

                <h2>
                    IELTS Band ${Number(
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
            </div>
        </div>

        <div class="result-summary">
            <div>
                <strong>${score}</strong>
                <span>Correct</span>
            </div>

            <div>
                <strong>${incorrect}</strong>
                <span>Incorrect</span>
            </div>

            <div>
                <strong>${unanswered}</strong>
                <span>Unanswered</span>
            </div>

            <div>
                <strong>${accuracy}%</strong>
                <span>Accuracy</span>
            </div>
        </div>

        <div class="result-section">
            <h2>Part-by-Part Score</h2>

            <div
                id="readingPartGrid"
                class="result-part-grid"
            ></div>
        </div>

        <div class="result-section">
            <h2>Question Review</h2>

            <div class="review-legend">
                <span>✓ Correct</span>
                <span>✕ Incorrect</span>
                <span>— Unanswered</span>
            </div>

            <div
                id="readingReviewGrid"
                class="review-grid"
            ></div>
        </div>

        <div class="result-actions">
            <button
                type="button"
                id="resultStartAgain"
            >
                Start Again
            </button>

            <button
                type="button"
                id="resultDashboard"
            >
                Dashboard
            </button>
        </div>
    `;

    resultScreen.appendChild(
        report
    );

    populateReadingPartGrid();

    populateReadingReviewGrid();

    const printButton =
        document.getElementById(
            "readingPrintButton"
        );

    if (printButton) {
        printButton.addEventListener(
            "click",
            printScorePDF
        );
    }

    const startAgain =
        document.getElementById(
            "resultStartAgain"
        );

    if (startAgain) {
        startAgain.addEventListener(
            "click",
            startAgainFromResult
        );
    }

    const dashboard =
        document.getElementById(
            "resultDashboard"
        );

    if (dashboard) {
        dashboard.addEventListener(
            "click",
            showDashboard
        );
    }
}

function startAgainFromResult() {
    clearCurrentTestAnswers();

    submittedAnswers = {};

    scoreData = null;

    currentPartIndex = 0;

    showTestIntroduction();
}

/* ============================================================
   PART RESULTS
============================================================ */

function renderPartScores() {
    populateReadingPartGrid();
}

function populateReadingPartGrid() {
    const grid =
        document.getElementById(
            "readingPartGrid"
        );

    if (!grid || !scoreData) {
        return;
    }

    grid.innerHTML =
        scoreData.partScores
            .map(
                function (
                    score,
                    index
                ) {
                    const total =
                        scoreData
                            .partTotals[
                            index
                        ];

                    const percent =
                        total
                            ? Math.round(
                                  (score /
                                      total) *
                                      100
                              )
                            : 0;

                    return `
                        <div class="result-part-card">
                            <div>
                                Part ${
                                    index +
                                    1
                                }
                            </div>

                            <strong>
                                ${score}/${total}
                            </strong>

                            <span>
                                ${percent}%
                            </span>
                        </div>
                    `;
                }
            )
            .join("");
}

/* ============================================================
   QUESTION REVIEW
============================================================ */

function getAllQuestionObjects() {
    const result = [];

    if (!currentTest) {
        return result;
    }

    currentTest.parts.forEach(
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
                        function (
                            question
                        ) {
                            result.push({
                                ...question,
                                partNumber:
                                    part.partNumber ||
                                    currentTest.parts.indexOf(
                                        part
                                    ) +
                                        1
                            });
                        }
                    );

                    (
                        group.blanks ||
                        []
                    ).forEach(
                        function (blank) {
                            result.push({
                                ...blank,
                                partNumber:
                                    part.partNumber ||
                                    currentTest.parts.indexOf(
                                        part
                                    ) +
                                        1
                            });
                        }
                    );
                }
            );
        }
    );

    return result.sort(
        function (a, b) {
            return (
                Number(a.number) -
                Number(b.number)
            );
        }
    );
}

function getAllReviewQuestions() {
    return getAllQuestionObjects();
}

function countAnsweredAnswers(
    answerSet
) {
    return getAllQuestionObjects().filter(
        function (question) {
            return isQuestionAnsweredFromSet(
                question.number,
                answerSet
            );
        }
    ).length;
}

function isQuestionAnsweredFromSet(
    number,
    answerSet
) {
    const value =
        answerSet[
            String(number)
        ];

    if (
        value === undefined ||
        value === null
    ) {
        return false;
    }

    if (Array.isArray(value)) {
        return value.length > 0;
    }

    return (
        String(value).trim() !== ""
    );
}

function renderIncorrectAnswers() {
    populateReadingReviewGrid();
}

function populateReadingReviewGrid() {
    const grid =
        document.getElementById(
            "readingReviewGrid"
        );

    if (!grid) {
        return;
    }

    const questions =
        getAllReviewQuestions();

    grid.innerHTML =
        questions
            .map(function (question) {
                const number =
                    question.number;

                const given =
                    submittedAnswers[
                        String(number)
                    ];

                const correct =
                    question.answer ??
                    question.correctAnswer ??
                    question.correct;

                const answered =
                    isQuestionAnsweredFromSet(
                        number,
                        submittedAnswers
                    );

                const isCorrect =
                    answered &&
                    answersMatch(
                        given,
                        correct
                    );

                let status =
                    "unanswered";

                let symbol = "—";

                if (answered) {
                    if (isCorrect) {
                        status = "correct";
                        symbol = "✓";
                    } else {
                        status = "incorrect";
                        symbol = "✕";
                    }
                }

                return `
                    <div class="
                        review-item
                        ${status}
                    ">
                        <div class="review-number">
                            ${number}
                        </div>

                        <div class="review-symbol">
                            ${symbol}
                        </div>

                        <div class="review-content">
                            <strong>
                                ${escapeHTML(
                                    getQuestionText(
                                        question
                                    )
                                )}
                            </strong>

                            <div>
                                <span>
                                    Your answer:
                                </span>
                                ${escapeHTML(
                                    formatReviewAnswer(
                                        given
                                    )
                                )}
                            </div>

                            <div>
                                <span>
                                    Correct answer:
                                </span>
                                ${escapeHTML(
                                    formatCorrectAnswer(
                                        correct
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                `;
            })
            .join("");
}

function getReviewQuestionText(
    question
) {
    return getQuestionText(
        question
    );
}

function formatReviewAnswer(
    value
) {
    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return "Not answered";
    }

    if (Array.isArray(value)) {
        return value.join(", ");
    }

    return String(value);
}

function formatCorrectAnswer(
    value
) {
    if (
        value === undefined ||
        value === null
    ) {
        return "Not available";
    }

    if (Array.isArray(value)) {
        return value.join(", ");
    }

    return String(value);
}

/* ============================================================
   PRINT / SAVE PDF
============================================================ */

function ensurePrintButton() {
    const button =
        document.getElementById(
            "printScoreButton"
        );

    if (button) {
        button.onclick =
            printScorePDF;
    }
}

function printScorePDF() {
    if (!scoreData) {
        return;
    }

    const title =
        currentTest?.title ||
        `IELTS Reading Test ${currentTestNumber}`;

    const questions =
        getAllReviewQuestions();

    const reviewHTML =
        questions
            .map(function (question) {
                const number =
                    question.number;

                const given =
                    submittedAnswers[
                        String(number)
                    ];

                const correct =
                    question.answer ??
                    question.correctAnswer ??
                    question.correct;

                const answered =
                    isQuestionAnsweredFromSet(
                        number,
                        submittedAnswers
                    );

                const isCorrect =
                    answered &&
                    answersMatch(
                        given,
                        correct
                    );

                return `
                    <tr>
                        <td>${number}</td>

                        <td>
                            ${escapeHTML(
                                getQuestionText(
                                    question
                                )
                            )}
                        </td>

                        <td class="${
                            isCorrect
                                ? "correct"
                                : "wrong"
                        }">
                            ${escapeHTML(
                                formatReviewAnswer(
                                    given
                                )
                            )}
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
            })
            .join("");

    const partHTML =
        scoreData.partScores
            .map(
                function (
                    score,
                    index
                ) {
                    return `
                        <tr>
                            <td>
                                Part ${
                                    index +
                                    1
                                }
                            </td>

                            <td>
                                ${score}
                                /
                                ${
                                    scoreData
                                        .partTotals[
                                        index
                                    ]
                                }
                            </td>
                        </tr>
                    `;
                }
            )
            .join("");

    const win =
        window.open(
            "",
            "_blank",
            "width=1000,height=800"
        );

    if (!win) {
        showToast(
            "Please allow pop-ups to print the result."
        );
        return;
    }

    win.document.open();

    win.document.write(`
        <!DOCTYPE html>

        <html>
        <head>

            <meta charset="UTF-8">

            <title>
                IELTS Reading Result
            </title>

            <style>

                body {
                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;

                    margin: 40px;

                    color: #222;
                }

                h1 {
                    margin-bottom: 5px;
                }

                h2 {
                    margin-top: 30px;
                }

                .subtitle {
                    color: #666;
                    margin-bottom: 30px;
                }

                .score {
                    font-size: 42px;
                    font-weight: 700;
                }

                .band {
                    font-size: 28px;
                    margin-top: 10px;
                }

                .summary {
                    display: grid;
                    grid-template-columns:
                        repeat(
                            4,
                            1fr
                        );

                    gap: 12px;

                    margin:
                        30px 0;
                }

                .summary-box {
                    border:
                        1px solid
                        #ddd;

                    padding: 15px;

                    text-align:
                        center;
                }

                .summary-box strong {
                    display: block;

                    font-size: 24px;
                }

                table {
                    width: 100%;

                    border-collapse:
                        collapse;

                    margin-top: 15px;
                }

                th,
                td {
                    border:
                        1px solid
                        #ddd;

                    padding: 9px;

                    text-align:
                        left;

                    vertical-align:
                        top;
                }

                th {
                    background:
                        #f2f2f2;
                }

                .correct {
                    font-weight: 700;
                }

                .wrong {
                    font-weight: 700;
                }

                @media print {

                    body {
                        margin: 15mm;
                    }

                }

            </style>

        </head>

        <body>

            <h1>
                IELTS Reading Result
            </h1>

            <div class="subtitle">
                ${escapeHTML(title)}
            </div>

            <div class="score">
                ${scoreData.totalScore}
                /
                ${scoreData.totalQuestions}
            </div>

            <div class="band">
                Estimated IELTS Band:
                ${Number(
                    scoreData.band
                ).toFixed(1)}
            </div>

            <div class="summary">

                <div class="summary-box">
                    <strong>
                        ${scoreData.totalScore}
                    </strong>
                    Correct
                </div>

                <div class="summary-box">
                    <strong>
                        ${
                            scoreData
                                .totalQuestions -
                            countAnsweredAnswers(
                                submittedAnswers
                            )
                        }
                    </strong>
                    Unanswered
                </div>

                <div class="summary-box">
                    <strong>
                        ${
                            countAnsweredAnswers(
                                submittedAnswers
                            ) -
                            scoreData.totalScore
                        }
                    </strong>
                    Incorrect
                </div>

                <div class="summary-box">
                    <strong>
                        ${scoreData.timeUsed}
                    </strong>
                    Time Used
                </div>

            </div>

            <h2>
                Part Scores
            </h2>

            <table>

                <thead>
                    <tr>
                        <th>Part</th>
                        <th>Score</th>
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
                        <th>No.</th>
                        <th>Question</th>
                        <th>Your Answer</th>
                        <th>Correct Answer</th>
                    </tr>
                </thead>

                <tbody>
                    ${reviewHTML}
                </tbody>

            </table>

            <script>

                window.onload =
                    function () {

                        setTimeout(
                            function () {

                                window.focus();

                                window.print();

                            },
                            500
                        );

                    };

            <\/script>

        </body>
        </html>
    `);

    win.document.close();
}

/* ============================================================
   LOADING
============================================================ */

function setLoading(
    loading,
    message
) {
    const ids = [
        "loadingOverlay",
        "loadingScreen"
    ];

    for (const id of ids) {
        const element =
            document.getElementById(id);

        if (element) {
            element.style.display =
                loading
                    ? "flex"
                    : "none";

            const text =
                element.querySelector(
                    ".loading-text"
                );

            if (text && message) {
                text.textContent =
                    message;
            }

            return;
        }
    }
}

/* ============================================================
   TOAST
============================================================ */

function showToast(message) {
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

        toast.style.cssText = `
            position:fixed;
            left:50%;
            bottom:25px;
            transform:translateX(-50%);
            z-index:999999;
            background:#222;
            color:#fff;
            padding:12px 18px;
            border-radius:10px;
            font-family:Arial,sans-serif;
            font-size:14px;
            box-shadow:0 8px 25px rgba(0,0,0,.2);
        `;

        document.body.appendChild(
            toast
        );
    }

    toast.textContent =
        message;

    toast.style.display =
        "block";

    clearTimeout(
        toast._timer
    );

    toast._timer =
        setTimeout(
            function () {
                toast.style.display =
                    "none";
            },
            2500
        );
}

/* ============================================================
   GENERAL HELPERS
============================================================ */

function setText(
    id,
    value
) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            value ?? "";
    }
}

function escapeHTML(value) {
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

function escapeAttribute(value) {
    return escapeHTML(value);
}

function escapeRegExp(value) {
    return String(value)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
}

/* ============================================================
   DRAG / RESULT STYLES
============================================================ */

function injectDragDropStyles() {
    if (
        document.getElementById(
            "readingAppStyles"
        )
    ) {
        return;
    }

    const style =
        document.createElement(
            "style"
        );

    style.id =
        "readingAppStyles";

    style.textContent = `

        .screen.active {
            display: block !important;
        }

        .drag-option {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 9px 14px;
            margin: 5px;
            border: 1px solid #ccc;
            border-radius: 8px;
            background: #fff;
            cursor: grab;
            user-select: none;
        }

        .drag-option:hover {
            border-color: #333;
        }

        .drag-option.selected {
            outline: 3px solid rgba(50,100,255,.2);
            border-color: #3366ff;
        }

        .drag-option.dragging {
            opacity: .5;
        }

        .word-bank,
        .matching-features-bank {
            padding: 15px;
            margin: 15px 0;
            border: 1px solid #ddd;
            border-radius: 12px;
            background: #fafafa;
        }

        .word-bank-title {
            font-weight: 700;
            margin-bottom: 8px;
        }

        .drop-zone {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            min-width: 120px;
            min-height: 36px;
            padding: 4px 9px;
            margin: 3px;
            border: 2px dashed #aaa;
            border-radius: 6px;
            background: #fff;
            cursor: pointer;
        }

        .drop-zone.drag-over {
            border-color: #333;
            background: #f2f2f2;
        }

        .drop-zone.filled {
            border-style: solid;
        }

        .drop-zone-value {
            font-weight: 600;
        }

        .choice-option {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 7px 0;
            cursor: pointer;
        }

        .choice-option input {
            margin-top: 4px;
        }

        .question {
            margin: 18px 0;
            padding: 15px;
            border: 1px solid #e2e2e2;
            border-radius: 10px;
        }

        .question-header {
            display: flex;
            gap: 10px;
            align-items: flex-start;
            margin-bottom: 10px;
        }

        .question-number {
            flex: 0 0 auto;
            font-weight: 700;
        }

        .question-text {
            line-height: 1.6;
        }

        .question-control {
            margin-left: 25px;
        }

        .answer-input,
        .answer-select {
            width: min(100%, 350px);
            padding: 9px 11px;
            border: 1px solid #bbb;
            border-radius: 7px;
            font-size: 15px;
        }

        .question-nav-item {
            min-width: 34px;
            min-height: 34px;
            margin: 3px;
            border: 1px solid #ccc;
            border-radius: 7px;
            background: #fff;
            cursor: pointer;
        }

        .question-nav-item.answered {
            font-weight: 700;
            border-color: #222;
            background: #eee;
        }

        .vocabulary-word {
            cursor: pointer;
            text-decoration: underline;
            text-decoration-style: dotted;
        }

        .results-page {
            max-width: 1100px;
            margin: 0 auto;
            padding: 30px 20px 60px;
        }

        .results-heading {
            text-align: center;
            margin-bottom: 30px;
        }

        .results-kicker {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 2px;
            opacity: .6;
        }

        .results-heading h1 {
            margin: 8px 0;
        }

        .print-result-button,
        .result-actions button {
            padding: 11px 18px;
            border: 0;
            border-radius: 8px;
            cursor: pointer;
        }

        .result-hero {
            display: flex;
            gap: 30px;
            align-items: center;
            padding: 25px;
            border: 1px solid #ddd;
            border-radius: 18px;
            margin-bottom: 20px;
        }

        .score-ring {
            width: 150px;
            height: 150px;
            min-width: 150px;
            border-radius: 50%;
            border: 8px solid #333;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }

        .score-ring strong {
            font-size: 30px;
        }

        .score-ring span {
            font-size: 13px;
        }

        .status-pill {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 20px;
            background: #eee;
            font-size: 12px;
            font-weight: 700;
        }

        .result-summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin: 20px 0;
        }

        .result-summary > div {
            padding: 18px;
            border: 1px solid #ddd;
            border-radius: 12px;
            text-align: center;
        }

        .result-summary strong {
            display: block;
            font-size: 25px;
        }

        .result-summary span {
            font-size: 13px;
            opacity: .7;
        }

        .result-section {
            margin-top: 30px;
        }

        .result-part-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }

        .result-part-card {
            padding: 18px;
            border: 1px solid #ddd;
            border-radius: 12px;
            text-align: center;
        }

        .result-part-card strong {
            display: block;
            font-size: 25px;
            margin: 8px;
        }

        .review-legend {
            display: flex;
            gap: 15px;
            margin-bottom: 12px;
            font-size: 13px;
        }

        .review-grid {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .review-item {
            display: grid;
            grid-template-columns: 45px 35px 1fr;
            gap: 10px;
            padding: 13px;
            border: 1px solid #ddd;
            border-radius: 10px;
        }

        .review-item.correct {
            border-left: 5px solid #333;
        }

        .review-item.incorrect {
            border-left: 5px solid #888;
        }

        .review-item.unanswered {
            border-left: 5px solid #ccc;
        }

        .review-number,
        .review-symbol {
            font-weight: 700;
        }

        .review-content > div {
            margin-top: 5px;
            font-size: 14px;
        }

        .review-content > div span {
            font-weight: 700;
        }

        .result-actions {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 30px;
        }

        @media (max-width: 700px) {

            .result-hero {
                flex-direction: column;
                text-align: center;
            }

            .result-summary {
                grid-template-columns: repeat(2, 1fr);
            }

            .result-part-grid {
                grid-template-columns: 1fr;
            }

            .review-item {
                grid-template-columns: 35px 25px 1fr;
            }

            .question-control {
                margin-left: 0;
            }

            .drop-zone {
                min-width: 100px;
            }

        }

    `;

    document.head.appendChild(
        style
    );
}

function injectResultStyles() {
    injectDragDropStyles();
}

/* ============================================================
   MODAL CONFIRMATION HANDLER
============================================================ */

document.addEventListener(
    "click",
    function (event) {
        const modal =
            document.getElementById(
                "confirmModal"
            );

        if (
            !modal ||
            modal.style.display ===
                "none"
        ) {
            return;
        }

        const target =
            event.target.closest(
                "#confirmSubmitButton, #confirmExitButton"
            );

        if (!target) {
            return;
        }

        if (
            target.id ===
            "confirmSubmitButton"
        ) {
            submitTest();
            return;
        }

        if (
            target.id ===
            "confirmExitButton"
        ) {
            closeConfirmModal();
            showDashboard();
        }
    }
);

/* ============================================================
   KEYBOARD SUPPORT
============================================================ */

document.addEventListener(
    "keydown",
    function (event) {
        if (
            event.key === "Escape"
        ) {
            closeVocabularyPopup();
            closeConfirmModal();
        }
    }
);
