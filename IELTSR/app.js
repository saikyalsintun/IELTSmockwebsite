/* =========================================================
   IELTS READING PRACTICE WEBSITE
   COMPLETE LOCAL-STORAGE VERSION

   Replace your entire app.js with this file.

   Supports:
   - true_false_not_given
   - yes_no_not_given
   - fill_blank
   - summary_completion
   - multiple_choice
   - multiple_choice_multiple
   - matching_headings
   - matching_information
   - matching_features
   - answer_box

   Features:
   - 8 tests
   - 60 minute timer
   - localStorage
   - question navigator
   - IELTS band calculation
   - result screen
   - incorrect answer review
   - print / Save as PDF
   - mobile friendly
   - matching paragraph dropdowns
   - no login
   - no API
   - no Google Sheets
   - no teacher/admin
========================================================= */

"use strict";

/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {
    TEST_COUNT: 8,
    TEST_FOLDER: "./tests/",
    VOCABULARY_FILE: "./vocabulary.json",
    DEFAULT_DURATION: 60
};

/* =========================================================
   GLOBAL VARIABLES
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

/* =========================================================
   STARTUP
========================================================= */

window.addEventListener("DOMContentLoaded", function () {

    injectStyles();
    setupGlobalEvents();

    /*
     * IMPORTANT:
     * Do NOT wait for vocabulary before showing dashboard.
     * This prevents a blank screen if vocabulary.json
     * does not exist.
     */
    loadVocabulary();

    removeTeacherAdminElements();

    showDashboard();
});

/* =========================================================
   GLOBAL EVENTS
========================================================= */

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

        const popup = document.getElementById(
            "vocabularyPopup"
        );

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

/* =========================================================
   REMOVE ADMIN / TEACHER ELEMENTS
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

        const element = document.getElementById(id);

        if (element) {
            element.remove();
        }
    });

    document
        .querySelectorAll("button, a")
        .forEach(function (element) {

            const text = (
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

function showDashboard() {

    stopTimer();

    testStarted = false;
    testSubmitted = false;

    showScreen("dashboardScreen");

    renderTestCards();
}

function renderTestCards() {

    const box = document.getElementById("testCards");

    if (!box) {
        return;
    }

    box.innerHTML = "";

    for (
        let i = 1;
        i <= CONFIG.TEST_COUNT;
        i++
    ) {

        const card = document.createElement("div");

        card.className = "test-card";

        card.dataset.testNumber = i;

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

        box.appendChild(card);
    }
}

/* =========================================================
   LOAD TEST
========================================================= */

async function openTest(testNumber) {

    setLoading(true, "Loading test...");

    try {

        const url =
            `${CONFIG.TEST_FOLDER}Test${testNumber}.json?${Date.now()}`;

        const response = await fetch(
            url,
            {
                cache: "no-store"
            }
        );

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

        scoreData = null;

        testSubmitted = false;

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

        setLoading(false);
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
            "Invalid test JSON."
        );
    }

    test.parts.forEach(function (part) {

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
            part.passage.paragraphs = [];
        }

        if (
            !Array.isArray(
                part.questionGroups
            )
        ) {
            part.questionGroups = [];
        }

        part.questionGroups.forEach(
            function (group) {

                if (
                    !Array.isArray(
                        group.questions
                    )
                ) {
                    group.questions = [];
                }

                if (
                    !Array.isArray(
                        group.blanks
                    )
                ) {
                    group.blanks = [];
                }
            }
        );
    });
}

/* =========================================================
   INTRO SCREEN
========================================================= */

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

/* =========================================================
   START TEST
========================================================= */

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
        (
            Number(currentTest.duration) ||
            CONFIG.DEFAULT_DURATION
        ) * 60;

    testElapsedSeconds = 0;

    showScreen("testScreen");

    renderCurrentPart();

    startTimer();
}

/* =========================================================
   TIMER
========================================================= */

function startTimer() {

    stopTimer();

    updateTimerDisplay();

    timerInterval = setInterval(
        function () {

            remainingSeconds--;

            updateTimerDisplay();

            if (remainingSeconds <= 0) {

                remainingSeconds = 0;

                stopTimer();

                autoSubmitTest();
            }

        },
        1000
    );
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

        const element =
            document.getElementById(id);

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
        } of ${
            currentTest.parts.length
        }`
    );

    renderPassage(part.passage);

    renderQuestions(part);

    renderQuestionNavigator();

    updatePartButtons();

    scrollTestPanelsToTop();
}

/* =========================================================
   QUESTION RANGE
========================================================= */

function questionRangeForPart(part) {

    const numbers = [];

    (part.questionGroups || [])
        .forEach(function (group) {

            (group.questions || [])
                .forEach(function (question) {

                    const number =
                        Number(question.number);

                    if (
                        Number.isFinite(number)
                    ) {
                        numbers.push(number);
                    }
                });

            (group.blanks || [])
                .forEach(function (blank) {

                    const number =
                        Number(blank.number);

                    if (
                        Number.isFinite(number)
                    ) {
                        numbers.push(number);
                    }
                });
        });

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

    box.innerHTML = "";

    (passage.paragraphs || [])
        .forEach(function (paragraph) {

            const p =
                document.createElement("p");

            p.className =
                "passage-paragraph";

            const label =
                escapeHTML(
                    paragraph.id || ""
                );

            p.innerHTML = `
                <span class="paragraph-label">
                    ${label}
                </span>
                ${highlightVocabulary(
                    paragraph.text || ""
                )}
            `;

            box.appendChild(p);
        });

    box
        .querySelectorAll(
            ".vocabulary-word"
        )
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

/* =========================================================
   VOCABULARY
========================================================= */

async function loadVocabulary() {

    try {

        const response =
            await fetch(
                `${CONFIG.VOCABULARY_FILE}?${Date.now()}`,
                {
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
         * Never prevent the test website from loading.
         */

        vocabulary = {};
    }
}

function highlightVocabulary(text) {

    if (
        !vocabulary ||
        !Object.keys(vocabulary).length
    ) {
        return escapeHTML(text);
    }

    let result =
        escapeHTML(text);

    const words =
        Object.keys(vocabulary)
            .sort(function (a, b) {
                return b.length - a.length;
            });

    words.forEach(function (word) {

        const regex =
            new RegExp(
                `(?<![A-Za-z])(${escapeRegExp(word)})(?![A-Za-z])`,
                "gi"
            );

        result =
            result.replace(
                regex,
                function (match) {

                    return `
                        <span
                            class="vocabulary-word"
                            data-word="${escapeAttribute(match)}"
                        >
                            ${match}
                        </span>
                    `;
                }
            );
    });

    return result;
}

function showVocabularyPopup(word) {

    const popup =
        document.getElementById(
            "vocabularyPopup"
        );

    if (!popup) {
        return;
    }

    if (
        !vocabulary ||
        !Object.keys(vocabulary).length
    ) {
        return;
    }

    const key =
        Object.keys(vocabulary)
            .find(function (item) {

                return (
                    item.toLowerCase() ===
                    String(word).toLowerCase()
                );
            });

    if (!key) {
        return;
    }

    const item =
        vocabulary[key] || {};

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

    (part.questionGroups || [])
        .forEach(function (group) {

            const wrapper =
                document.createElement("div");

            wrapper.className =
                "question-group";

            if (group.questionRange) {

                const heading =
                    document.createElement("h3");

                heading.className =
                    "question-group-title";

                heading.textContent =
                    `Questions ${group.questionRange}`;

                wrapper.appendChild(heading);
            }

            if (group.instructions) {

                const instructions =
                    document.createElement("p");

                instructions.className =
                    "question-instructions";

                instructions.textContent =
                    group.instructions;

                wrapper.appendChild(
                    instructions
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

                    /*
                     * IMPORTANT:
                     * These are dropdowns now.
                     */

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
            }

            box.appendChild(wrapper);
        });

    restoreAnswers();
}

/* =========================================================
   NORMALIZE TYPE
========================================================= */

function normalizeQuestionType(type) {

    return String(type || "")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_");
}

/* =========================================================
   TRUE FALSE
========================================================= */

function renderTrueFalseNotGiven(
    box,
    group
) {

    (group.questions || [])
        .forEach(function (question) {

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
        });
}

/* =========================================================
   YES NO
========================================================= */

function renderYesNoNotGiven(
    box,
    group
) {

    (group.questions || [])
        .forEach(function (question) {

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
        });
}

/* =========================================================
   FILL BLANK
========================================================= */

function renderFillBlank(
    box,
    group
) {

    (group.questions || [])
        .forEach(function (question) {

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

            attachInputListener(control);

            box.appendChild(item);
        });
}

/* =========================================================
   SUMMARY COMPLETION
========================================================= */

function renderSummaryCompletion(
    box,
    group
) {

    const blanks =
        group.blanks &&
        group.blanks.length
            ? group.blanks
            : group.questions || [];

    /*
     * Get word bank.
     */

    let options =
        getQuestionOptions(
            null,
            group,
            [
                "options",
                "choices",
                "answerOptions",
                "words",
                "wordBank"
            ]
        );

    /*
     * If JSON does not provide options,
     * use answers as fallback.
     */

    if (!options.length) {

        options =
            blanks
                .map(function (blank) {
                    return blank.answer;
                })
                .filter(function (answer) {

                    return (
                        answer !== undefined &&
                        answer !== null &&
                        String(answer).trim() !== ""
                    );
                });
    }

    options =
        uniqueOptions(options);

    const container =
        document.createElement("div");

    container.className =
        "summary-container";

    /*
     * WORD BANK
     */

    const bank =
        document.createElement("div");

    bank.className =
        "summary-word-bank";

    const bankTitle =
        document.createElement("div");

    bankTitle.className =
        "summary-bank-title";

    bankTitle.textContent =
        "Given words:";

    bank.appendChild(bankTitle);

    const wordContainer =
        document.createElement("div");

    wordContainer.className =
        "summary-word-container";

    options.forEach(function (
        option
    ) {

        const normalized =
            normalizeOption(option);

        if (!normalized.text) {
            return;
        }

        const word =
            document.createElement("button");

        word.type = "button";

        word.className =
            "summary-word";

        word.dataset.value =
            normalized.value;

        word.textContent =
            normalized.text;

        word.addEventListener(
            "click",
            function () {

                const selected =
                    document.querySelector(
                        ".summary-word.selected"
                    );

                if (selected) {
                    selected.classList.remove(
                        "selected"
                    );
                }

                word.classList.add(
                    "selected"
                );

                selectedSummaryWord =
                    word;
            }
        );

        wordContainer.appendChild(word);
    });

    bank.appendChild(
        wordContainer
    );

    container.appendChild(bank);

    /*
     * SUMMARY TEXT
     */

    const summaryText =
        document.createElement("div");

    summaryText.className =
        "summary-text";

    let text =
        group.summary ||
        group.text ||
        group.passageText ||
        "";

    let html =
        escapeHTML(text);

    /*
     * {{23}}, {23}, [23]
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
                        a || b || c
                    );

                const exists =
                    blanks.some(function (blank) {

                        return (
                            Number(blank.number) ===
                            number
                        );
                    });

                if (!exists) {
                    return match;
                }

                return createSummaryDropZone(
                    number
                );
            }
        );

    /*
     * Normal underscores.
     */

    let index = 0;

    html =
        html.replace(
            /_{2,}/g,
            function () {

                const blank =
                    blanks[index++];

                if (!blank) {
                    return "________";
                }

                return createSummaryDropZone(
                    blank.number
                );
            }
        );

    summaryText.innerHTML =
        html;

    container.appendChild(
        summaryText
    );

    /*
     * Fallback if summary text has
     * no visible blanks.
     */

    if (
        !summaryText.querySelector(
            ".summary-drop-zone"
        ) &&
        blanks.length
    ) {

        const fallback =
            document.createElement("div");

        fallback.className =
            "summary-fallback";

        blanks.forEach(function (blank) {

            const row =
                document.createElement("div");

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

            fallback.appendChild(row);
        });

        container.appendChild(
            fallback
        );
    }

    box.appendChild(container);

    setupSummaryDropZones(
        container
    );
}

/* =========================================================
   SUMMARY STATE
========================================================= */

let selectedSummaryWord = null;

/* =========================================================
   SUMMARY DROP ZONE
========================================================= */

function createSummaryDropZone(
    number
) {

    return `
        <button
            type="button"
            class="summary-drop-zone"
            data-question-number="${number}"
        >
            <span>
                Select answer
            </span>
        </button>
    `;
}

function setupSummaryDropZones(
    container
) {

    container
        .querySelectorAll(
            ".summary-drop-zone"
        )
        .forEach(function (zone) {

            zone.addEventListener(
                "click",
                function () {

                    if (!selectedSummaryWord) {
                        return;
                    }

                    const value =
                        selectedSummaryWord.dataset.value;

                    const text =
                        selectedSummaryWord.textContent;

                    const number =
                        Number(
                            zone.dataset.questionNumber
                        );

                    studentAnswers[number] =
                        value;

                    zone.innerHTML =
                        escapeHTML(text);

                    zone.classList.add(
                        "has-answer"
                    );

                    selectedSummaryWord.classList.remove(
                        "selected"
                    );

                    selectedSummaryWord = null;

                    saveAnswersToStorage();

                    updateQuestionNavigator();
                }
            );
        });
}

/* =========================================================
   MULTIPLE CHOICE
========================================================= */

function renderMultipleChoice(
    box,
    group
) {

    (group.questions || [])
        .forEach(function (question) {

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

            box.appendChild(item);
        });
}

/* =========================================================
   MULTIPLE CHOICE MULTIPLE
========================================================= */

function renderMultipleChoiceMultiple(
    box,
    group
) {

    (group.questions || [])
        .forEach(function (question) {

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

            box.appendChild(item);
        });
}

/* =========================================================
   MATCHING HEADINGS
========================================================= */

function renderMatchingHeadings(
    box,
    group
) {

    let options =
        group.options ||
        group.headings ||
        [];

    if (!Array.isArray(options)) {
        options = [];
    }

    renderMatchingSelects(
        box,
        group,
        options
    );
}

/* =========================================================
   GET PARAGRAPH LETTERS
   ========================================================

   THIS IS THE IMPORTANT FIX.

   If a passage contains:

   A
   B
   C
   D
   E
   F

   the function returns:

   A, B, C, D, E, F

   If it contains A-G:

   A, B, C, D, E, F, G

========================================================= */

function getCurrentPassageParagraphLetters() {

    if (
        !currentTest ||
        !Array.isArray(
            currentTest.parts
        )
    ) {
        return [];
    }

    const part =
        currentTest.parts[
            currentPartIndex
        ];

    if (
        !part ||
        !part.passage ||
        !Array.isArray(
            part.passage.paragraphs
        )
    ) {
        return [];
    }

    const letters =
        part.passage.paragraphs
            .map(function (paragraph) {

                if (
                    paragraph &&
                    paragraph.id !== undefined &&
                    paragraph.id !== null
                ) {

                    return String(
                        paragraph.id
                    )
                        .trim()
                        .toUpperCase();
                }

                return "";
            })
            .filter(function (letter) {

                return letter !== "";
            });

    return [
        ...new Set(letters)
    ];
}

/* =========================================================
   CURRENT PASSAGE OPTIONS
========================================================= */

function getCurrentPassageOptions() {

    return getCurrentPassageParagraphLetters()
        .map(function (letter) {

            return {
                value: letter,
                text: letter
            };
        });
}

/* =========================================================
   MATCHING INFORMATION
   ========================================================

   FIXED:

   Instead of depending on:

   group.options

   it automatically uses:

   A B C D E F

   from the passage.

========================================================= */

function renderMatchingInformation(
    box,
    group
) {

    let options =
        getQuestionOptions(
            null,
            group,
            [
                "options",
                "letters",
                "paragraphs"
            ]
        );

    /*
     * IMPORTANT:
     * Matching information normally has
     * no options in the JSON.
     */

    if (!options.length) {

        options =
            getCurrentPassageOptions();
    }

    renderMatchingSelects(
        box,
        group,
        options
    );
}

/* =========================================================
   MATCHING FEATURES
   ========================================================

   FIXED:

   This is now a dropdown.

   Example:

   Match each statement with the
   correct paragraph, A-G.

   The dropdown will contain:

   Select an answer
   A
   B
   C
   D
   E
   F
   G

========================================================= */

function renderMatchingFeatures(
    box,
    group
) {

    let options =
        getQuestionOptions(
            null,
            group,
            [
                "options",
                "choices",
                "answerOptions",
                "features",
                "letters"
            ]
        );

    /*
     * If JSON does not provide options,
     * automatically use passage letters.
     */

    if (!options.length) {

        options =
            getCurrentPassageOptions();
    }

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

    const safeOptions =
        uniqueOptions(options);

    (group.questions || [])
        .forEach(function (question) {

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
                    safeOptions
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

            box.appendChild(item);
        });
}

/* =========================================================
   ANSWER BOX
========================================================= */

function renderAnswerBox(
    box,
    group
) {

    (group.questions || [])
        .forEach(function (question) {

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
                >
            `;

            attachInputListener(control);

            box.appendChild(item);
        });
}

/* =========================================================
   UNSUPPORTED
========================================================= */

function renderUnsupportedGroup(
    box,
    group
) {

    (group.questions || [])
        .forEach(function (question) {

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
                >
            `;

            attachInputListener(control);

            box.appendChild(item);
        });
}

/* =========================================================
   QUESTION ITEM
========================================================= */

function createQuestionItem(
    question,
    radioOptions = null
) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "question";

    wrapper.dataset.questionNumber =
        question.number;

    wrapper.innerHTML = `
        <div class="question-text">
            <span class="question-number">
                ${escapeHTML(question.number)}
            </span>

            ${escapeHTML(
                question.text ||
                question.question ||
                ""
            )}
        </div>

        <div class="question-control"></div>
    `;

    const control =
        wrapper.querySelector(
            ".question-control"
        );

    if (Array.isArray(radioOptions)) {

        control.innerHTML =
            radioOptions
                .map(function (option) {

                    return `
                        <label class="option-item">

                            <input
                                type="radio"
                                name="q${question.number}"
                                value="${escapeAttribute(option)}"
                                data-question-number="${question.number}"
                            >

                            <span>
                                ${escapeHTML(option)}
                            </span>

                        </label>
                    `;
                })
                .join("");

        control
            .querySelectorAll("input")
            .forEach(function (input) {

                input.addEventListener(
                    "change",
                    handleAnswerChange
                );
            });
    }

    return wrapper;
}

/* =========================================================
   GET QUESTION OPTIONS
========================================================= */

function getQuestionOptions(
    question,
    group,
    keys
) {

    if (question) {

        for (const key of keys) {

            if (
                Array.isArray(
                    question[key]
                ) &&
                question[key].length
            ) {

                return question[key];
            }
        }
    }

    if (group) {

        for (const key of keys) {

            if (
                Array.isArray(
                    group[key]
                ) &&
                group[key].length
            ) {

                return group[key];
            }
        }
    }

    return [];
}

/* =========================================================
   NORMALIZE OPTION
========================================================= */

function normalizeOption(option) {

    if (
        option === undefined ||
        option === null
    ) {

        return {
            value: "",
            text: ""
        };
    }

    if (
        typeof option === "string" ||
        typeof option === "number"
    ) {

        return {
            value: String(option),
            text: String(option)
        };
    }

    if (
        typeof option === "object"
    ) {

        const value =
            option.value ??
            option.letter ??
            option.id ??
            option.key ??
            option.code ??
            option.text ??
            option.label ??
            option.name ??
            "";

        const text =
            option.text ??
            option.label ??
            option.name ??
            option.title ??
            option.value ??
            option.letter ??
            option.id ??
            option.key ??
            option.code ??
            "";

        return {
            value: String(value),
            text: String(text)
        };
    }

    return {
        value: "",
        text: ""
    };
}

/* =========================================================
   UNIQUE OPTIONS
========================================================= */

function uniqueOptions(options) {

    const seen = new Set();

    const result = [];

    (options || [])
        .forEach(function (option) {

            const normalized =
                normalizeOption(option);

            const key =
                normalizeAnswer(
                    normalized.value ||
                    normalized.text
                );

            if (!key) {
                return;
            }

            if (seen.has(key)) {
                return;
            }

            seen.add(key);

            result.push(option);
        });

    return result;
}

/* =========================================================
   CREATE SELECT
========================================================= */

function createSelectOptions(
    options
) {

    let html = `
        <select
            class="question-control-select"
        >
            <option value="">
                Select an answer
            </option>
    `;

    (options || [])
        .forEach(function (option) {

            const normalized =
                normalizeOption(option);

            if (
                !normalized.value &&
                !normalized.text
            ) {
                return;
            }

            html += `
                <option
                    value="${escapeAttribute(
                        normalized.value
                    )}"
                >
                    ${escapeHTML(
                        normalized.text
                    )}
                </option>
            `;
        });

    html += `
        </select>
    `;

    return html;
}

/* =========================================================
   INPUT LISTENER
========================================================= */

function attachInputListener(
    container
) {

    container
        .querySelectorAll("input")
        .forEach(function (input) {

            input.addEventListener(
                "input",
                handleAnswerChange
            );

            input.addEventListener(
                "change",
                handleAnswerChange
            );
        });
}

/* =========================================================
   HANDLE ANSWER
========================================================= */

function handleAnswerChange(event) {

    const element =
        event.target;

    const number =
        Number(
            element.dataset.questionNumber
        );

    if (!number) {
        return;
    }

    if (
        element.type === "radio"
    ) {

        if (element.checked) {

            studentAnswers[number] =
                element.value;
        }

    } else {

        /*
         * IMPORTANT:
         * Select values are saved.
         * Text inputs are saved even if
         * they were just changed.
         */

        studentAnswers[number] =
            element.value;
    }

    saveAnswersToStorage();

    updateQuestionNavigator();
}

/* =========================================================
   SAVE VISIBLE ANSWERS
========================================================= */

function saveAllVisibleAnswers() {

    document
        .querySelectorAll(
            "[data-question-number]"
        )
        .forEach(function (element) {

            const number =
                Number(
                    element.dataset.questionNumber
                );

            if (!number) {
                return;
            }

            if (
                element.type === "radio"
            ) {

                if (element.checked) {

                    studentAnswers[number] =
                        element.value;
                }

            } else if (
                element.tagName === "INPUT" ||
                element.tagName === "SELECT"
            ) {

                /*
                 * Do not overwrite existing
                 * drag/drop or summary answers
                 * with an empty value.
                 */

                if (
                    element.value !== ""
                ) {

                    studentAnswers[number] =
                        element.value;
                }
            }
        });

    saveAnswersToStorage();
}

/* =========================================================
   RESTORE ANSWERS
========================================================= */

function restoreAnswers() {

    document
        .querySelectorAll(
            "input[data-question-number], select[data-question-number]"
        )
        .forEach(function (element) {

            const number =
                Number(
                    element.dataset.questionNumber
                );

            const value =
                studentAnswers[number];

            if (
                value === undefined ||
                value === null
            ) {
                return;
            }

            if (
                element.type === "radio"
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
                    value;
            }
        });

    updateQuestionNavigator();
}

/* =========================================================
   LOCAL STORAGE
========================================================= */

function getAnswerStorageKey() {

    return (
        `ieltsReadingAnswers_Test${currentTestNumber}`
    );
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
            "Could not save answers:",
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

        studentAnswers = {};
    }
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
        .querySelectorAll("button")
        .forEach(function (button) {

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
        });

    updateQuestionNavigator();
}

/* =========================================================
   ALL QUESTION NUMBERS
========================================================= */

function getAllQuestionNumbers() {

    const numbers = [];

    (currentTest?.parts || [])
        .forEach(function (part) {

            (part.questionGroups || [])
                .forEach(function (group) {

                    (group.questions || [])
                        .forEach(function (question) {

                            const number =
                                Number(
                                    question.number
                                );

                            if (
                                Number.isFinite(number)
                            ) {
                                numbers.push(number);
                            }
                        });

                    (group.blanks || [])
                        .forEach(function (blank) {

                            const number =
                                Number(
                                    blank.number
                                );

                            if (
                                Number.isFinite(number)
                            ) {
                                numbers.push(number);
                            }
                        });
                });
        });

    return [
        ...new Set(numbers)
    ].sort(function (a, b) {
        return a - b;
    });
}

/* =========================================================
   NAVIGATOR UPDATE
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
        .forEach(function (button) {

            const number =
                Number(
                    button.dataset.questionNav
                );

            button.classList.toggle(
                "answered",
                isQuestionAnswered(number)
            );
        });
}

function isQuestionAnswered(number) {

    const value =
        studentAnswers[number];

    return (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    );
}

/* =========================================================
   JUMP TO QUESTION
========================================================= */

function jumpToQuestion(number) {

    const elements =
        document.querySelectorAll(
            `[data-question-number="${number}"]`
        );

    if (!elements.length) {
        return;
    }

    const element =
        elements[0];

    const question =
        element.closest(
            ".question, .question-group"
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
   PART NAVIGATION
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

function scrollTestPanelsToTop() {

    [
        "passagePanel",
        "questionsPanel"
    ]
        .forEach(function (id) {

            const element =
                document.getElementById(id);

            if (element) {

                element.scrollTop = 0;
            }
        });
}

/* =========================================================
   SUBMIT
========================================================= */

function confirmSubmitTest() {

    if (testSubmitted) {
        return;
    }

    const modal =
        document.getElementById(
            "confirmModal"
        );

    if (modal) {

        modal.style.display =
            "flex";

    } else {

        if (
            confirm(
                "Are you sure you want to submit the test?"
            )
        ) {

            submitTest();
        }
    }
}

function confirmExitTest() {

    if (
        !testStarted ||
        testSubmitted
    ) {

        showDashboard();

        return;
    }

    const answer =
        confirm(
            "Leave this test? Your current answers will remain saved locally."
        );

    if (answer) {

        stopTimer();

        showDashboard();
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

function autoSubmitTest() {

    if (testSubmitted) {
        return;
    }

    showToast(
        "Time is up. Your test is being submitted."
    );

    submitTest();
}

function submitTest() {

    if (testSubmitted) {
        return;
    }

    saveAllVisibleAnswers();

    closeConfirmModal();

    stopTimer();

    testSubmitted = true;

    testElapsedSeconds =
        calculateTimeUsed();

    submittedAnswers = {
        ...studentAnswers
    };

    scoreData =
        calculateScore(
            submittedAnswers
        );

    renderResult();

    /*
     * Keep submitted answers in memory,
     * but clear current local answer storage
     * so a new attempt starts clean.
     */

    try {

        localStorage.removeItem(
            getAnswerStorageKey()
        );

    } catch (error) {}

    studentAnswers = {};
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

    let total = 0;

    const partScores = [];

    const partTotals = [];

    (
        currentTest?.parts ||
        []
    )
        .forEach(function (part) {

            let partScore = 0;

            let partTotal = 0;

            (
                part.questionGroups ||
                []
            )
                .forEach(function (group) {

                    const questions =
                        group.questions &&
                        group.questions.length
                            ? group.questions
                            : group.blanks || [];

                    questions
                        .forEach(function (question) {

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
                        });
                });

            partScores.push(
                partScore
            );

            partTotals.push(
                partTotal
            );

            total += partScore;
        });

    return {
        totalScore: total,

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
   COUNT QUESTIONS
========================================================= */

function countTotalQuestions() {

    return getAllQuestionNumbers().length;
}

/* =========================================================
   ANSWER MATCHING
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

    const normalizedGiven =
        normalizeAnswer(given);

    if (Array.isArray(correct)) {

        return correct.some(
            function (answer) {

                return (
                    normalizeAnswer(
                        answer
                    ) ===
                    normalizedGiven
                );
            }
        );
    }

    return (
        normalizedGiven ===
        normalizeAnswer(correct)
    );
}

function normalizeAnswer(value) {

    return String(
        value ?? ""
    )
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

/* =========================================================
   IELTS READING BAND
========================================================= */

function calculateIELTSBand(
    score
) {

    if (score >= 39) return 9.0;
    if (score >= 37) return 8.5;
    if (score >= 35) return 8.0;
    if (score >= 33) return 7.5;
    if (score >= 30) return 7.0;
    if (score >= 27) return 6.5;
    if (score >= 23) return 6.0;
    if (score >= 19) return 5.5;
    if (score >= 15) return 5.0;
    if (score >= 13) return 4.5;
    if (score >= 10) return 4.0;
    if (score >= 8) return 3.5;
    if (score >= 6) return 3.0;
    if (score >= 4) return 2.5;
    if (score >= 2) return 2.0;
    if (score === 1) return 1.0;

    return 0;
}

/* =========================================================
   RESULT
========================================================= */

function renderResult() {

    showScreen(
        "resultScreen"
    );

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
                (
                    score /
                    answered
                ) * 100
            )
            : 0;

    const percentage =
        total
            ? Math.round(
                (
                    score /
                    total
                ) * 100
            )
            : 0;

    const title =
        currentTest.title ||
        `IELTS Reading Test ${currentTestNumber}`;

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

    buildResultPage(
        title,
        score,
        total,
        answered,
        incorrect,
        unanswered,
        accuracy,
        percentage
    );
}

/* =========================================================
   RESULT PAGE
========================================================= */

function buildResultPage(
    title,
    score,
    total,
    answered,
    incorrect,
    unanswered,
    accuracy,
    percentage
) {

    const screen =
        document.getElementById(
            "resultScreen"
        );

    if (!screen) {
        return;
    }

    /*
     * Remove our previous generated result
     * but preserve nothing from old result content.
     */

    const old =
        screen.querySelector(
            "#readingResultReport"
        );

    if (old) {
        old.remove();
    }

    const report =
        document.createElement("div");

    report.id =
        "readingResultReport";

    report.className =
        "reading-result-report";

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
                    id="printResultButton"
                >
                    Print / Save PDF
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
                        Percentage:
                        ${percentage}%
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

                <div
                    class="review-grid"
                    id="readingReviewGrid"
                ></div>

            </div>

            <div class="results-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    id="resultDashboardButton"
                >
                    Back to Tests
                </button>

                <button
                    type="button"
                    class="secondary-btn"
                    id="resultRetakeButton"
                >
                    Try Again
                </button>

                <button
                    type="button"
                    class="secondary-btn"
                    id="resultPrintButton"
                >
                    Print / Save PDF
                </button>

            </div>

        </div>
    `;

    /*
     * Put generated report into result screen.
     */

    screen.appendChild(report);

    /*
     * Buttons.
     */

    document
        .getElementById(
            "printResultButton"
        )
        ?.addEventListener(
            "click",
            printScorePDF
        );

    document
        .getElementById(
            "resultPrintButton"
        )
        ?.addEventListener(
            "click",
            printScorePDF
        );

    document
        .getElementById(
            "resultDashboardButton"
        )
        ?.addEventListener(
            "click",
            showDashboard
        );

    document
        .getElementById(
            "resultRetakeButton"
        )
        ?.addEventListener(
            "click",
            startAgainFromResult
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

    submittedAnswers = {};

    studentAnswers = {};

    scoreData = null;

    try {

        localStorage.removeItem(
            getAnswerStorageKey()
        );

    } catch (error) {}

    startTest();
}

/* =========================================================
   PART SCORES
========================================================= */

function populateReadingPartGrid() {

    const grid =
        document.getElementById(
            "readingPartScoreGrid"
        );

    if (!grid || !scoreData) {
        return;
    }

    grid.innerHTML =
        (
            currentTest.parts ||
            []
        )
            .map(function (part, index) {

                const score =
                    scoreData
                        .partScores[index] ||
                    0;

                const total =
                    scoreData
                        .partTotals[index] ||
                    0;

                const answered =
                    getPartAnsweredCount(
                        index
                    );

                const percentage =
                    total
                        ? Math.round(
                            (
                                score /
                                total
                            ) * 100
                        )
                        : 0;

                return `
                    <div
                        class="part-score-card"
                    >

                        <div
                            class="part-score-top"
                        >

                            <strong>
                                Part ${index + 1}
                            </strong>

                            <strong>
                                ${score} / ${total}
                            </strong>

                        </div>

                        <div
                            class="mini-progress"
                        >

                            <span
                                style="width:${percentage}%"
                            ></span>

                        </div>

                        <small>
                            ${answered}
                            of
                            ${total}
                            answered
                        </small>

                    </div>
                `;
            })
            .join("");
}

/* =========================================================
   PART ANSWER COUNT
========================================================= */

function getPartAnsweredCount(
    partIndex
) {

    const part =
        currentTest?.parts?.[
            partIndex
        ];

    if (!part) {
        return 0;
    }

    let count = 0;

    (
        part.questionGroups ||
        []
    )
        .forEach(function (group) {

            const questions =
                group.questions &&
                group.questions.length
                    ? group.questions
                    : group.blanks || [];

            questions
                .forEach(function (question) {

                    if (
                        isQuestionAnsweredFromSet(
                            question.number,
                            submittedAnswers
                        )
                    ) {
                        count++;
                    }
                });
        });

    return count;
}

/* =========================================================
   ANSWERED
========================================================= */

function isQuestionAnsweredFromSet(
    number,
    answerSet
) {

    const value =
        answerSet?.[number];

    return (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    );
}

function countAnsweredAnswers(
    answerSet
) {

    let count = 0;

    getAllQuestionObjects()
        .forEach(function (question) {

            if (
                isQuestionAnsweredFromSet(
                    question.number,
                    answerSet
                )
            ) {

                count++;
            }
        });

    return count;
}

/* =========================================================
   ALL QUESTION OBJECTS
========================================================= */

function getAllQuestionObjects() {

    const result = [];

    const seen =
        new Set();

    (
        currentTest?.parts ||
        []
    )
        .forEach(function (part) {

            (
                part.questionGroups ||
                []
            )
                .forEach(function (group) {

                    const questions =
                        group.questions &&
                        group.questions.length
                            ? group.questions
                            : group.blanks || [];

                    questions
                        .forEach(function (question) {

                            const number =
                                Number(
                                    question.number
                                );

                            if (
                                !Number.isFinite(
                                    number
                                )
                            ) {
                                return;
                            }

                            if (
                                seen.has(number)
                            ) {
                                return;
                            }

                            seen.add(number);

                            result.push({
                                ...question,
                                part: part
                            });
                        });
                });
        });

    return result.sort(
        function (a, b) {

            return (
                Number(a.number) -
                Number(b.number)
            );
        }
    );
}

/* =========================================================
   REVIEW
========================================================= */

function getAllReviewQuestions() {

    return getAllQuestionObjects()
        .map(function (question) {

            const given =
                submittedAnswers[
                    question.number
                ];

            const answered =
                isQuestionAnsweredFromSet(
                    question.number,
                    submittedAnswers
                );

            const correct =
                answersMatch(
                    given,
                    question.answer
                );

            return {
                number:
                    question.number,

                part:
                    (
                        currentTest.parts
                            .indexOf(
                                question.part
                            )
                    ) + 1,

                text:
                    getReviewQuestionText(
                        question
                    ),

                given:
                    formatReviewAnswer(
                        given
                    ),

                correct:
                    formatCorrectAnswer(
                        question.answer
                    ),

                answered:
                    answered,

                correctResult:
                    correct
            };
        });
}

function getReviewQuestionText(
    question
) {

    return (
        question.question ||
        question.text ||
        question.prompt ||
        question.statement ||
        question.title ||
        `Question ${question.number}`
    );
}

function formatReviewAnswer(
    value
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
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

    if (Array.isArray(value)) {
        return value.join(" / ");
    }

    return String(value ?? "");
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

    grid.innerHTML =
        getAllReviewQuestions()
            .map(function (item) {

                const status =
                    !item.answered
                        ? "unanswered"
                        : item.correctResult
                            ? "correct"
                            : "incorrect";

                const statusText =
                    status === "correct"
                        ? "Correct"
                        : status === "incorrect"
                            ? "Incorrect"
                            : "Unanswered";

                return `
                    <article
                        class="review-item ${status}"
                    >

                        <div
                            class="review-item-top"
                        >

                            <span>
                                Q${item.number}
                            </span>

                            <span>
                                ${statusText}
                            </span>

                        </div>

                        <div
                            class="review-question"
                        >
                            ${escapeHTML(
                                item.text
                            )}
                        </div>

                        <div
                            class="review-answer"
                        >
                            <b>
                                Your answer:
                            </b>

                            ${escapeHTML(
                                item.given
                            )}
                        </div>

                        ${
                            !item.correctResult
                                ? `
                                    <div
                                        class="review-correct"
                                    >
                                        <b>
                                            Correct answer:
                                        </b>

                                        ${escapeHTML(
                                            item.correct
                                        )}
                                    </div>
                                `
                                : ""
                        }

                    </article>
                `;
            })
            .join("");
}

/* =========================================================
   PRINT / SAVE PDF
========================================================= */

function printScorePDF() {

    if (
        !scoreData ||
        !currentTest
    ) {

        alert(
            "Please submit the test before printing the result."
        );

        return;
    }

    const printWindow =
        window.open(
            "",
            "_blank",
            "width=1000,height=900"
        );

    if (!printWindow) {

        alert(
            "Please allow pop-ups for this website and try again."
        );

        return;
    }

    const score =
        scoreData.totalScore;

    const total =
        scoreData.totalQuestions;

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
                (
                    score /
                    answered
                ) * 100
            )
            : 0;

    const percentage =
        total
            ? Math.round(
                (
                    score /
                    total
                ) * 100
            )
            : 0;

    const title =
        currentTest.title ||
        `IELTS Reading Test ${currentTestNumber}`;

    const parts =
        (
            currentTest.parts ||
            []
        )
            .map(function (part, index) {

                const partScore =
                    scoreData
                        .partScores[index] ||
                    0;

                const partTotal =
                    scoreData
                        .partTotals[index] ||
                    0;

                const percent =
                    partTotal
                        ? Math.round(
                            (
                                partScore /
                                partTotal
                            ) * 100
                        )
                        : 0;

                return `
                    <div class="part">

                        <div class="part-top">

                            <strong>
                                Part ${index + 1}
                            </strong>

                            <strong>
                                ${partScore}
                                /
                                ${partTotal}
                            </strong>

                        </div>

                        <div class="progress">

                            <span
                                style="width:${percent}%"
                            ></span>

                        </div>

                    </div>
                `;
            })
            .join("");

    const review =
        getAllReviewQuestions()
            .map(function (item) {

                const status =
                    !item.answered
                        ? "unanswered"
                        : item.correctResult
                            ? "correct"
                            : "incorrect";

                return `
                    <div
                        class="review ${status}"
                    >

                        <div
                            class="review-top"
                        >

                            <strong>
                                Q${item.number}
                            </strong>

                            <span>
                                ${
                                    status === "correct"
                                        ? "Correct"
                                        : status === "incorrect"
                                            ? "Incorrect"
                                            : "Unanswered"
                                }
                            </span>

                        </div>

                        <div>
                            ${escapeHTML(
                                item.text
                            )}
                        </div>

                        <div>
                            <b>
                                Your answer:
                            </b>

                            ${escapeHTML(
                                item.given
                            )}
                        </div>

                        ${
                            !item.correctResult
                                ? `
                                    <div class="correct">
                                        <b>
                                            Correct answer:
                                        </b>

                                        ${escapeHTML(
                                            item.correct
                                        )}
                                    </div>
                                `
                                : ""
                        }

                    </div>
                `;
            })
            .join("");

    printWindow.document.write(`
        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <title>
                IELTS Reading Result
            </title>

            <style>

                @page {
                    size: A4;
                    margin: 14mm;
                }

                * {
                    box-sizing: border-box;
                }

                body {
                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;

                    color: #20242a;

                    margin: 0;

                    background: white;

                    font-size: 13px;

                    line-height: 1.5;
                }

                .report {
                    max-width: 900px;
                    margin: auto;
                }

                .header {
                    border-bottom:
                        1px solid #ddd;

                    padding-bottom: 18px;

                    margin-bottom: 20px;
                }

                .header h1 {
                    margin:
                        0 0 5px;

                    font-size: 28px;
                }

                .header p {
                    margin: 0;

                    color: #68717d;
                }

                .hero {
                    border:
                        1px solid #ddd;

                    border-radius: 14px;

                    padding: 22px;

                    display: flex;

                    align-items: center;

                    gap: 25px;

                    margin-bottom: 15px;
                }

                .score {
                    width: 120px;

                    height: 120px;

                    border-radius: 50%;

                    background:
                        #f0f2f5;

                    display: flex;

                    flex-direction:
                        column;

                    align-items:
                        center;

                    justify-content:
                        center;

                    flex-shrink: 0;
                }

                .score strong {
                    font-size: 34px;
                }

                .score span {
                    color:
                        #68717d;
                }

                .hero h2 {
                    margin:
                        0 0 5px;

                    font-size: 21px;
                }

                .hero p {
                    margin: 0;

                    color:
                        #68717d;
                }

                .summary {
                    display:
                        grid;

                    grid-template-columns:
                        repeat(4, 1fr);

                    gap: 10px;

                    margin-bottom:
                        25px;
                }

                .summary-card {
                    border:
                        1px solid #ddd;

                    border-radius:
                        10px;

                    padding:
                        14px;

                    text-align:
                        center;
                }

                .summary-card strong {
                    display:
                        block;

                    font-size:
                        22px;
                }

                .summary-card span {
                    color:
                        #68717d;

                    font-size:
                        11px;
                }

                .section {
                    margin-top:
                        25px;
                }

                .section h2 {
                    font-size:
                        19px;

                    border-bottom:
                        1px solid #ddd;

                    padding-bottom:
                        7px;
                }

                .parts {
                    display:
                        grid;

                    grid-template-columns:
                        repeat(3, 1fr);

                    gap: 10px;
                }

                .part {
                    border:
                        1px solid #ddd;

                    border-radius:
                        10px;

                    padding:
                        13px;
                }

                .part-top {
                    display:
                        flex;

                    justify-content:
                        space-between;

                    margin-bottom:
                        8px;
                }

                .progress {
                    height:
                        7px;

                    background:
                        #e7ebef;

                    border-radius:
                        20px;

                    overflow:
                        hidden;
                }

                .progress span {
                    display:
                        block;

                    height:
                        100%;

                    background:
                        #1d3557;
                }

                .reviews {
                    display:
                        grid;

                    grid-template-columns:
                        1fr 1fr;

                    gap:
                        10px;
                }

                .review {
                    border:
                        1px solid #ddd;

                    border-radius:
                        9px;

                    padding:
                        11px;

                    break-inside:
                        avoid;
                }

                .review.correct {
                    border-left:
                        4px solid #287a4b;
                }

                .review.incorrect {
                    border-left:
                        4px solid #b42318;
                }

                .review.unanswered {
                    border-left:
                        4px solid #8a95a3;
                }

                .review-top {
                    display:
                        flex;

                    justify-content:
                        space-between;

                    margin-bottom:
                        6px;
                }

                .review.correct
                .review-top span {
                    color:
                        #287a4b;
                }

                .review.incorrect
                .review-top span {
                    color:
                        #b42318;
                }

                .review.unanswered
                .review-top span {
                    color:
                        #68717d;
                }

                .review > div {
                    margin-top:
                        5px;
                }

                .correct {
                    color:
                        #287a4b;
                }

                .footer {
                    margin-top:
                        25px;

                    padding-top:
                        12px;

                    border-top:
                        1px solid #ddd;

                    text-align:
                        center;

                    color:
                        #8a95a3;

                    font-size:
                        10px;
                }

                @media print {

                    .review {
                        break-inside:
                            avoid;
                    }

                }

            </style>

        </head>

        <body>

            <div class="report">

                <div class="header">

                    <h1>
                        IELTS Reading Result
                    </h1>

                    <p>
                        ${escapeHTML(title)}
                    </p>

                </div>

                <div class="hero">

                    <div class="score">

                        <strong>
                            ${score}
                        </strong>

                        <span>
                            / ${total}
                        </span>

                    </div>

                    <div>

                        <h2>
                            Estimated IELTS Reading Band
                            ${Number(scoreData.band).toFixed(1)}
                        </h2>

                        <p>
                            Time used:
                            ${escapeHTML(scoreData.timeUsed)}
                        </p>

                        <p>
                            Score:
                            ${percentage}%
                        </p>

                    </div>

                </div>

                <div class="summary">

                    <div class="summary-card">

                        <strong>
                            ${score}
                        </strong>

                        <span>
                            Correct
                        </span>

                    </div>

                    <div class="summary-card">

                        <strong>
                            ${incorrect}
                        </strong>

                        <span>
                            Incorrect
                        </span>

                    </div>

                    <div class="summary-card">

                        <strong>
                            ${unanswered}
                        </strong>

                        <span>
                            Unanswered
                        </span>

                    </div>

                    <div class="summary-card">

                        <strong>
                            ${accuracy}%
                        </strong>

                        <span>
                            Accuracy
                        </span>

                    </div>

                </div>

                <div class="section">

                    <h2>
                        Part-by-part score
                    </h2>

                    <div class="parts">
                        ${parts}
                    </div>

                </div>

                <div class="section">

                    <h2>
                        Question Review
                    </h2>

                    <div class="reviews">
                        ${review}
                    </div>

                </div>

                <div class="footer">

                    IELTS Reading Practice
                    ·
                    Score report generated locally

                </div>

            </div>

            <script>

                window.onload =
                    function () {

                        setTimeout(
                            function () {

                                window.print();

                            },
                            400
                        );

                    };

            <\/script>

        </body>

        </html>
    `);

    printWindow.document.close();
}

/* =========================================================
   SHOW SCREEN
   ========================================================

   IMPORTANT FIX FOR YOUR BLANK SCREEN.

   Your HTML has:

   style="display:none"

   Therefore:

   element.style.display = ""

   DOES NOT FIX IT.

   We explicitly use:

   element.style.display = "block"

========================================================= */

function showScreen(id) {

    document
        .querySelectorAll(".screen")
        .forEach(function (element) {

            element.style.display =
                "none";
        });

    const element =
        document.getElementById(id);

    if (!element) {

        console.warn(
            `Screen not found: ${id}`
        );

        return;
    }

    element.style.display =
        "block";
}

/* =========================================================
   LOADING
========================================================= */

function setLoading(
    show,
    text = "Loading..."
) {

    const overlay =
        document.getElementById(
            "loadingOverlay"
        );

    const loadingText =
        document.getElementById(
            "loadingText"
        );

    if (loadingText) {

        loadingText.textContent =
            text;
    }

    if (overlay) {

        overlay.style.display =
            show
                ? "flex"
                : "none";
    }
}

/* =========================================================
   TOAST
========================================================= */

function showToast(message) {

    const element =
        document.getElementById(
            "toast"
        );

    if (!element) {

        console.log(message);

        return;
    }

    element.textContent =
        message;

    element.style.display =
        "block";

    setTimeout(
        function () {

            element.style.display =
                "none";

        },
        3500
    );
}

/* =========================================================
   FORMAT TIME
========================================================= */

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

    const secs =
        Math.floor(
            seconds % 60
        );

    return (
        String(minutes).padStart(
            2,
            "0"
        ) +
        ":" +
        String(secs).padStart(
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
        document.getElementById(id);

    if (element) {

        element.textContent =
            value ?? "";
    }
}

/* =========================================================
   ESCAPE HTML
========================================================= */

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

/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(value) {

    return escapeHTML(value);
}

/* =========================================================
   ESCAPE REGEX
========================================================= */

function escapeRegExp(value) {

    return String(value)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
}

/* =========================================================
   INJECT CSS
========================================================= */

function injectStyles() {

    if (
        document.getElementById(
            "ieltsReadingAppStyles"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "ieltsReadingAppStyles";

    style.textContent = `

        /* =========================================
           SELECT
        ========================================= */

        .question-control-select {

            width: 100%;

            max-width: 280px;

            min-height: 42px;

            padding:
                8px 12px;

            border:
                1px solid #cbd2db;

            border-radius:
                8px;

            background:
                #fff;

            color:
                #20242a;

            font-size:
                14px;

            cursor:
                pointer;

        }

        .question-control-select:focus {

            outline:
                none;

            border-color:
                #2563eb;

            box-shadow:
                0 0 0 3px
                rgba(
                    37,
                    99,
                    235,
                    .10
                );

        }

        /* =========================================
           QUESTION
        ========================================= */

        .question {

            padding:
                12px 0;

        }

        .question-text {

            line-height:
                1.6;

            margin-bottom:
                9px;

        }

        .question-number {

            font-weight:
                700;

            margin-right:
                5px;

        }

        .question-control {

            width:
                100%;

        }

        .answer-input {

            width:
                100%;

            max-width:
                400px;

            min-height:
                42px;

            padding:
                9px 12px;

            border:
                1px solid #cbd2db;

            border-radius:
                8px;

            font-size:
                14px;

            box-sizing:
                border-box;

        }

        .option-item {

            display:
                flex;

            align-items:
                center;

            gap:
                8px;

            margin:
                8px 0;

            cursor:
                pointer;

        }

        /* =========================================
           SUMMARY
        ========================================= */

        .summary-container {

            width:
                100%;

        }

        .summary-word-bank {

            border:
                1px solid #d9dee5;

            border-radius:
                10px;

            background:
                #f7f8fa;

            padding:
                15px;

            margin-bottom:
                20px;

        }

        .summary-bank-title {

            font-weight:
                700;

            margin-bottom:
                10px;

        }

        .summary-word-container {

            display:
                flex;

            flex-wrap:
                wrap;

            gap:
                8px;

        }

        .summary-word {

            border:
                1px solid #cbd2db;

            border-radius:
                7px;

            background:
                #fff;

            padding:
                9px 13px;

            cursor:
                pointer;

            font-size:
                14px;

        }

        .summary-word.selected {

            border-color:
                #2563eb;

            background:
                #eff6ff;

        }

        .summary-text {

            line-height:
                2.2;

            font-size:
                16px;

        }

        .summary-drop-zone {

            border:
                2px dashed #adb7c3;

            border-radius:
                7px;

            background:
                #fafbfc;

            min-width:
                110px;

            min-height:
                38px;

            display:
                inline-flex;

            align-items:
                center;

            justify-content:
                center;

            padding:
                3px 10px;

            margin:
                0 5px;

            cursor:
                pointer;

            vertical-align:
                middle;

        }

        .summary-drop-zone.has-answer {

            border-style:
                solid;

            border-color:
                #9aa4b2;

            background:
                #f8fafc;

        }

        .summary-fallback {

            margin-top:
                20px;

        }

        .summary-fallback-row {

            display:
                flex;

            align-items:
                center;

            gap:
                10px;

            margin-bottom:
                10px;

        }

        /* =========================================
           RESULTS
        ========================================= */

        .reading-result-report {

            width:
                100%;

        }

        .results-page {

            max-width:
                1000px;

            margin:
                0 auto;

            padding:
                25px 20px 40px;

        }

        .results-heading {

            display:
                flex;

            justify-content:
                space-between;

            gap:
                20px;

            margin-bottom:
                22px;

        }

        .results-heading h1 {

            margin:
                0 0 5px;

            font-size:
                30px;

        }

        .results-heading p {

            margin:
                0;

            color:
                #68717d;

        }

        .results-kicker {

            font-size:
                11px;

            font-weight:
                800;

            letter-spacing:
                2px;

            color:
                #7b8490;

            margin-bottom:
                6px;

        }

        .print-score-button,
        .secondary-btn {

            border:
                1px solid #d5dbe2;

            background:
                #fff;

            border-radius:
                8px;

            padding:
                10px 16px;

            cursor:
                pointer;

            font-weight:
                600;

        }

        .result-hero {

            display:
                flex;

            align-items:
                center;

            gap:
                25px;

            border:
                1px solid #e1e5ea;

            border-radius:
                15px;

            padding:
                24px;

            margin-bottom:
                15px;

        }

        .score-ring {

            width:
                140px;

            height:
                140px;

            border-radius:
                50%;

            background:
                conic-gradient(
                    #1d3557
                    var(--score-percent),
                    #e7ebef 0
                );

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            flex-shrink:
                0;

        }

        .score-ring-inner {

            width:
                108px;

            height:
                108px;

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

            color:
                #7b8490;

        }

        .hero-copy h2 {

            margin:
                0 0 6px;

            font-size:
                21px;

        }

        .hero-copy p {

            margin:
                0 0 5px;

            color:
                #68717d;

        }

        .hero-copy small {

            color:
                #7b8490;

        }

        .status-pill {

            display:
                inline-block;

            border:
                1px solid #d9dee5;

            border-radius:
                999px;

            padding:
                5px 10px;

            font-size:
                11px;

            margin-bottom:
                8px;

        }

        .result-summary {

            display:
                grid;

            grid-template-columns:
                repeat(4, 1fr);

            gap:
                10px;

            margin-bottom:
                25px;

        }

        .result-summary > div {

            border:
                1px solid #e1e5ea;

            border-radius:
                10px;

            padding:
                15px;

            text-align:
                center;

        }

        .result-summary strong {

            display:
                block;

            font-size:
                23px;

        }

        .result-summary span {

            color:
                #7b8490;

            font-size:
                12px;

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
                end;

            border-bottom:
                1px solid #e1e5ea;

            padding-bottom:
                8px;

            margin-bottom:
                12px;

        }

        .result-section-heading h2 {

            margin:
                0;

            font-size:
                19px;

        }

        .result-section-heading span {

            color:
                #7b8490;

            font-size:
                12px;

        }

        .part-score-grid {

            display:
                grid;

            grid-template-columns:
                repeat(3, 1fr);

            gap:
                12px;

        }

        .part-score-card {

            border:
                1px solid #e1e5ea;

            border-radius:
                10px;

            padding:
                15px;

        }

        .part-score-top {

            display:
                flex;

            justify-content:
                space-between;

            margin-bottom:
                10px;

        }

        .mini-progress {

            height:
                7px;

            background:
                #e7ebef;

            border-radius:
                20px;

            overflow:
                hidden;

            margin-bottom:
                8px;

        }

        .mini-progress span {

            display:
                block;

            height:
                100%;

            background:
                #1d3557;

        }

        .part-score-card small {

            color:
                #7b8490;

        }

        .review-grid {

            display:
                grid;

            grid-template-columns:
                1fr 1fr;

            gap:
                10px;

        }

        .review-item {

            border:
                1px solid #e1e5ea;

            border-radius:
                9px;

            padding:
                13px;

        }

        .review-item.correct {

            border-left:
                4px solid #287a4b;

        }

        .review-item.incorrect {

            border-left:
                4px solid #b42318;

        }

        .review-item.unanswered {

            border-left:
                4px solid #8a95a3;

        }

        .review-item-top {

            display:
                flex;

            justify-content:
                space-between;

            margin-bottom:
                7px;

        }

        .review-question {

            font-weight:
                600;

            margin-bottom:
                8px;

        }

        .review-answer,
        .review-correct {

            font-size:
                12px;

            margin-top:
                4px;

        }

        .review-correct {

            color:
                #287a4b;

        }

        .results-actions {

            display:
                flex;

            justify-content:
                center;

            gap:
                10px;

            margin-top:
                25px;

        }

        /* =========================================
           MOBILE
        ========================================= */

        @media (
            max-width: 700px
        ) {

            .question-control-select {

                max-width:
                    100%;

            }

            .summary-word-container {

                display:
                    grid;

                grid-template-columns:
                    1fr;

            }

            .summary-word {

                width:
                    100%;

            }

            .summary-text {

                font-size:
                    15px;

            }

            .summary-drop-zone {

                min-width:
                    95px;

            }

            .results-heading {

                flex-direction:
                    column;

            }

            .result-hero {

                flex-direction:
                    column;

                align-items:
                    flex-start;

            }

            .result-summary {

                grid-template-columns:
                    1fr 1fr;

            }

            .part-score-grid,
            .review-grid {

                grid-template-columns:
                    1fr;

            }

            .results-actions {

                flex-direction:
                    column;

            }

            .results-actions button {

                width:
                    100%;

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

    document.head.appendChild(style);
}

/* =========================================================
   PUBLIC API
========================================================= */

window.IELTSReading = {

    openTest:
        openTest,

    startTest:
        startTest,

    submitTest:
        submitTest,

    calculateScore:
        calculateScore,

    calculateIELTSBand:
        calculateIELTSBand,

    showDashboard:
        showDashboard,

    printScorePDF:
        printScorePDF,

    getCurrentTest:
        function () {
            return currentTest;
        },

    getAnswers:
        function () {
            return studentAnswers;
        },

    getSubmittedAnswers:
        function () {
            return submittedAnswers;
        },

    getQuestionNumbers:
        function () {
            return getAllQuestionNumbers();
        }

};

/* =========================================================
   END
========================================================= */
