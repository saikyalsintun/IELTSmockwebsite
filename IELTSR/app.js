/* =========================================================
   IELTS READING PRACTICE
   COMPLETE LOCAL-STORAGE app.js
   ---------------------------------------------------------
   NO LOGIN
   NO API
   NO GOOGLE SHEETS
   NO TEACHER / ADMIN
   NO ONLINE ANSWER STORAGE

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
   - drag & drop
   - mobile click-to-place
   - localStorage
   - 60 minute timer
   - question navigator
   - IELTS Reading band
   - result review
   - print / Save as PDF
========================================================= */

"use strict";

/* =========================================================
   CONFIG
========================================================= */

const CONFIG = {
    TEST_COUNT: 8,
    TEST_FOLDER: "./tests/",
    VOCABULARY_FILE: "./vocabulary.json",
    DEFAULT_DURATION: 60,
    STORAGE_PREFIX: "ieltsReading_"
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
let testElapsedSeconds = 0;
let testStartTime = null;

let testStarted = false;
let testSubmitted = false;

let scoreData = null;

let selectedDragOption = null;

/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    injectStyles();
    setupEvents();
    await loadVocabulary();
    renderTestCards();
});

/* =========================================================
   BASIC HELPERS
========================================================= */

function $(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value ?? "";
}

function addClick(id, fn) {
    const el = $(id);
    if (el) el.addEventListener("click", fn);
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
    return escapeHTML(value);
}

function normalizeAnswer(value) {
    if (value === undefined || value === null) return "";

    if (typeof value === "object") {
        if (value.letter !== undefined) {
            return String(value.letter).trim().toLowerCase();
        }

        if (value.text !== undefined) {
            return String(value.text).trim().toLowerCase();
        }

        if (value.value !== undefined) {
            return String(value.value).trim().toLowerCase();
        }

        return JSON.stringify(value)
            .trim()
            .toLowerCase();
    }

    return String(value)
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function formatTime(seconds) {
    seconds = Math.max(0, Number(seconds) || 0);

    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;

    return String(min).padStart(2, "0") +
        ":" +
        String(sec).padStart(2, "0");
}

function showToast(message) {
    let toast = $("appToast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "appToast";

        Object.assign(toast.style, {
            position: "fixed",
            left: "50%",
            bottom: "30px",
            transform: "translateX(-50%)",
            zIndex: "99999",
            padding: "12px 20px",
            borderRadius: "10px",
            background: "#222",
            color: "#fff",
            fontSize: "14px",
            boxShadow: "0 8px 30px rgba(0,0,0,.25)"
        });

        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.display = "block";

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {
        toast.style.display = "none";
    }, 2500);
}

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.style.display = "none";
        screen.classList.remove("active");
    });

    const target = $(id);

    if (target) {
        target.style.display = "";
        target.classList.add("active");
    }
}

/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    addClick("startTestButton", startTest);
    addClick("startExamButton", startTest);

    addClick("previousPartButton", previousPart);
    addClick("nextPartButton", nextPart);

    addClick("submitTestButton", confirmSubmitTest);
    addClick("confirmSubmitButton", submitTest);
    addClick("cancelSubmitButton", closeConfirmModal);

    addClick("backToDashboardButton", backToDashboard);
    addClick("returnDashboardButton", backToDashboard);
    addClick("backDashboard", backToDashboard);

    addClick("retakeTestButton", restartCurrentTest);
    addClick("startAgainButton", restartCurrentTest);

    addClick("printResultButton", printScorePDF);
    addClick("printScoreButton", printScorePDF);

    document.addEventListener("click", event => {

        const testCard = event.target.closest("[data-test-number]");

        if (
            testCard &&
            !event.target.closest("button, a, input, select")
        ) {
            const number = Number(
                testCard.dataset.testNumber
            );

            if (number) {
                openTest(number);
            }
        }

        const navButton =
            event.target.closest("[data-question-nav]");

        if (navButton) {
            const number = Number(
                navButton.dataset.questionNav
            );

            jumpToQuestion(number);
        }

        const dragOption =
            event.target.closest(".drag-option, .summary-drag-word");

        if (dragOption) {
            selectDragOption(dragOption);
        }

        const removeButton =
            event.target.closest(".remove-dropped-answer");

        if (removeButton) {
            removeDroppedAnswer(removeButton);
        }
    });

    document.addEventListener("input", event => {
        const input = event.target;

        if (
            input.matches(
                "input[data-question-number], textarea[data-question-number]"
            )
        ) {
            saveInputAnswer(input);
        }
    });

    document.addEventListener("change", event => {
        const input = event.target;

        if (
            input.matches(
                "select[data-question-number], input[data-question-number]"
            )
        ) {
            saveInputAnswer(input);
        }
    });
}

/* =========================================================
   TEST LIST
========================================================= */

async function renderTestCards() {

    const box =
        $("testCards") ||
        $("testsContainer") ||
        $("testList");

    if (!box) return;

    box.innerHTML = "";

    let found = 0;

    for (let i = 1; i <= CONFIG.TEST_COUNT; i++) {

        try {

            const response = await fetch(
                `${CONFIG.TEST_FOLDER}Test${i}.json?${Date.now()}`,
                { cache: "no-store" }
            );

            if (!response.ok) continue;

            found++;

            const card = document.createElement("div");

            card.className = "test-card";
            card.dataset.testNumber = i;

            card.innerHTML = `
                <div class="test-card-number">TEST ${i}</div>
                <h3>IELTS Reading Test ${i}</h3>
                <div class="test-card-info">
                    <span>60 minutes</span>
                    <span>40 questions</span>
                </div>
                <button type="button" class="test-card-button">
                    Start Test
                </button>
            `;

            card.querySelector("button").addEventListener(
                "click",
                () => openTest(i)
            );

            box.appendChild(card);

        } catch (error) {
            console.warn(`Test ${i} unavailable`, error);
        }
    }

    if (!found) {
        box.innerHTML = `
            <div class="empty-tests">
                No IELTS Reading tests were found.
            </div>
        `;
    }
}

/* =========================================================
   LOAD TEST
========================================================= */

async function openTest(testNumber) {

    try {

        const response = await fetch(
            `${CONFIG.TEST_FOLDER}Test${testNumber}.json?${Date.now()}`,
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error(
                `Test${testNumber}.json could not be loaded.`
            );
        }

        const data = await response.json();

        validateTest(data);

        currentTest = data;
        currentTestNumber = testNumber;

        currentPartIndex = 0;

        studentAnswers = loadSavedAnswers();

        submittedAnswers = {};

        testStarted = false;
        testSubmitted = false;

        showTestIntroduction();

    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "Could not load the test."
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
        throw new Error("Invalid test JSON.");
    }

    test.parts.forEach(part => {

        if (!part.passage) {
            part.passage = {
                title: "",
                paragraphs: []
            };
        }

        if (!Array.isArray(part.questionGroups)) {
            part.questionGroups = [];
        }

        part.questionGroups.forEach(group => {

            if (!Array.isArray(group.questions)) {
                group.questions = [];
            }

            if (!Array.isArray(group.blanks)) {
                group.blanks = [];
            }

        });
    });
}

/* =========================================================
   INTRO
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
   START
========================================================= */

function startTest() {

    if (!currentTest) return;

    testStarted = true;
    testSubmitted = false;

    currentPartIndex = 0;

    testStartTime = Date.now();

    testElapsedSeconds = 0;

    remainingSeconds =
        (
            Number(currentTest.duration) ||
            CONFIG.DEFAULT_DURATION
        ) * 60;

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

    timerInterval = setInterval(() => {

        remainingSeconds--;

        testElapsedSeconds =
            Math.floor(
                (Date.now() - testStartTime) / 1000
            );

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

        const element = $(id);

        if (element) {

            element.textContent =
                formatTime(remainingSeconds);

            if (remainingSeconds <= 300) {
                element.classList.add("timer-warning");
            } else {
                element.classList.remove("timer-warning");
            }

            break;
        }
    }
}

/* =========================================================
   PART RENDERING
========================================================= */

function renderCurrentPart() {

    if (!currentTest) return;

    const part =
        currentTest.parts[currentPartIndex];

    if (!part) return;

    const partNumber =
        part.partNumber ||
        currentPartIndex + 1;

    setText(
        "testHeaderTitle",
        currentTest.title ||
        `IELTS Reading Test ${currentTestNumber}`
    );

    setText(
        "testHeaderPart",
        `Part ${partNumber}`
    );

    setText(
        "passagePartLabel",
        `Part ${partNumber}`
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
        `Part ${currentPartIndex + 1} of ${currentTest.parts.length}`
    );

    renderPassage(part.passage);

    renderQuestions(part);

    renderQuestionNavigator();

    updatePartButtons();

    restoreAnswersToDOM();

    scrollPanelsTop();
}

/* =========================================================
   QUESTION NUMBER COLLECTION
   IMPORTANT:
   includes questions AND blanks
========================================================= */

function getPartQuestionNumbers(part) {

    const numbers = [];

    (part.questionGroups || []).forEach(group => {

        (group.questions || []).forEach(question => {

            const n = Number(question.number);

            if (Number.isFinite(n)) {
                numbers.push(n);
            }
        });

        (group.blanks || []).forEach(blank => {

            const n = Number(blank.number);

            if (Number.isFinite(n)) {
                numbers.push(n);
            }
        });
    });

    return [...new Set(numbers)].sort((a, b) => a - b);
}

function getAllQuestionNumbers() {

    const numbers = [];

    (currentTest?.parts || []).forEach(part => {
        numbers.push(
            ...getPartQuestionNumbers(part)
        );
    });

    return [...new Set(numbers)].sort((a, b) => a - b);
}

function countTotalQuestions() {
    return getAllQuestionNumbers().length;
}

function questionRangeForPart(part) {

    const numbers =
        getPartQuestionNumbers(part);

    if (!numbers.length) return "";

    return `${numbers[0]}-${numbers[numbers.length - 1]}`;
}

/* =========================================================
   PASSAGE
========================================================= */

function renderPassage(passage) {

    const box =
        $("passageContent") ||
        $("passage");

    if (!box) return;

    box.innerHTML =
        (passage.paragraphs || [])
        .map(paragraph => {

            const id =
                escapeHTML(paragraph.id || "");

            const text =
                highlightVocabulary(
                    paragraph.text || ""
                );

            return `
                <p class="passage-paragraph">
                    ${
                        id
                            ? `<strong class="paragraph-label">${id}</strong>`
                            : ""
                    }
                    ${text}
                </p>
            `;

        })
        .join("");

    box.querySelectorAll(
        ".vocabulary-word"
    ).forEach(word => {

        word.addEventListener("click", event => {

            event.stopPropagation();

            showVocabularyPopup(
                word.dataset.word,
                word
            );
        });
    });
}

/* =========================================================
   VOCABULARY
========================================================= */

async function loadVocabulary() {

    vocabulary = {};

    try {

        const response = await fetch(
            `${CONFIG.VOCABULARY_FILE}?${Date.now()}`,
            { cache: "no-store" }
        );

        if (!response.ok) return;

        const data = await response.json();

        if (Array.isArray(data)) {

            data.forEach(item => {

                const word =
                    item.word ||
                    item.term ||
                    item.chinese ||
                    item.text;

                if (word) {
                    vocabulary[
                        normalizeAnswer(word)
                    ] = item;
                }
            });

        } else if (
            data &&
            typeof data === "object"
        ) {

            vocabulary = data;
        }

    } catch (error) {

        console.warn(
            "Vocabulary file unavailable."
        );
    }
}

function highlightVocabulary(text) {

    let html = escapeHTML(text);

    const words =
        Object.keys(vocabulary)
            .filter(Boolean)
            .sort((a, b) => b.length - a.length);

    if (!words.length) return html;

    words.forEach(word => {

        const safe =
            word.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

        const regex =
            new RegExp(
                `(${safe})`,
                "gi"
            );

        html =
            html.replace(
                regex,
                `<span class="vocabulary-word" data-word="$1">$1</span>`
            );
    });

    return html;
}

function showVocabularyPopup(word, target) {

    const key =
        normalizeAnswer(word);

    let item =
        vocabulary[key];

    if (!item) {

        const found =
            Object.keys(vocabulary)
                .find(
                    k =>
                        normalizeAnswer(k) === key
                );

        if (found) {
            item = vocabulary[found];
        }
    }

    if (!item) return;

    let popup = $("vocabularyPopup");

    if (!popup) {

        popup = document.createElement("div");

        popup.id = "vocabularyPopup";

        document.body.appendChild(popup);
    }

    const meaning =
        item.meaning ||
        item.definition ||
        item.english ||
        item.translation ||
        "";

    popup.innerHTML = `
        <button class="vocab-close" type="button">×</button>
        <strong>${escapeHTML(word)}</strong>
        ${
            item.pinyin
                ? `<div>${escapeHTML(item.pinyin)}</div>`
                : ""
        }
        ${
            meaning
                ? `<p>${escapeHTML(meaning)}</p>`
                : ""
        }
    `;

    popup.style.display = "block";

    popup.querySelector(
        ".vocab-close"
    ).onclick = () => {
        popup.style.display = "none";
    };
}

/* =========================================================
   QUESTION RENDERING
========================================================= */

function renderQuestions(part) {

    const box =
        $("questionsContent") ||
        $("questionContent");

    if (!box) return;

    box.innerHTML = "";

    (part.questionGroups || []).forEach(
        group => {

            const wrapper =
                document.createElement("section");

            wrapper.className =
                "question-group";

            const heading =
                document.createElement("div");

            heading.className =
                "group-heading";

            heading.innerHTML = `
                <h3>
                    ${escapeHTML(
                        group.questionRange ||
                        rangeForGroup(group)
                    )}
                </h3>

                ${
                    group.instructions
                        ? `<p>${escapeHTML(group.instructions)}</p>`
                        : ""
                }
            `;

            wrapper.appendChild(heading);

            const type =
                normalizeType(group.type);

            switch (type) {

                case "true_false_not_given":
                    renderTFNG(wrapper, group);
                    break;

                case "yes_no_not_given":
                    renderYNNG(wrapper, group);
                    break;

                case "fill_blank":
                    renderFillBlank(wrapper, group);
                    break;

                case "summary_completion":
                    renderSummaryCompletion(wrapper, group);
                    break;

                case "multiple_choice":
                    renderMultipleChoice(wrapper, group);
                    break;

                case "multiple_choice_multiple":
                    renderMultipleChoiceMultiple(wrapper, group);
                    break;

                case "matching_headings":
                    renderMatchingHeadings(wrapper, group);
                    break;

                case "matching_information":
                    renderMatchingInformation(wrapper, group);
                    break;

                case "matching_features":
                    renderMatchingFeatures(wrapper, group);
                    break;

                case "answer_box":
                    renderAnswerBox(wrapper, group);
                    break;

                default:
                    renderGenericQuestions(wrapper, group);
                    break;
            }

            box.appendChild(wrapper);
        }
    );
}

function normalizeType(type) {

    return String(type || "")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_");
}

function rangeForGroup(group) {

    const numbers = [
        ...(group.questions || []),
        ...(group.blanks || [])
    ]
    .map(q => Number(q.number))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

    if (!numbers.length) return "";

    return `Questions ${numbers[0]}-${numbers[numbers.length - 1]}`;
}

/* =========================================================
   BASIC QUESTION CARD
========================================================= */

function createQuestionCard(question) {

    const card =
        document.createElement("div");

    card.className =
        "question-card";

    card.dataset.questionNumber =
        question.number;

    const number =
        question.number;

    card.innerHTML = `
        <div class="question-number">
            ${escapeHTML(number)}
        </div>

        <div class="question-body">

            <div class="question-text">
                ${formatQuestionText(question.text || "")}
            </div>

            <div class="question-control"></div>

        </div>
    `;

    return card;
}

function formatQuestionText(text) {

    let result =
        escapeHTML(text);

    result =
        result.replace(
            /_{2,}/g,
            `<span class="inline-blank">______</span>`
        );

    return result;
}

/* =========================================================
   TFNG
========================================================= */

function renderTFNG(box, group) {

    (group.questions || []).forEach(question => {

        const card =
            createQuestionCard(question);

        const control =
            card.querySelector(".question-control");

        control.appendChild(
            createSelect(
                question.number,
                [
                    "TRUE",
                    "FALSE",
                    "NOT GIVEN"
                ]
            )
        );

        box.appendChild(card);
    });
}

/* =========================================================
   YES / NO / NG
========================================================= */

function renderYNNG(box, group) {

    (group.questions || []).forEach(question => {

        const card =
            createQuestionCard(question);

        const control =
            card.querySelector(".question-control");

        control.appendChild(
            createSelect(
                question.number,
                [
                    "YES",
                    "NO",
                    "NOT GIVEN"
                ]
            )
        );

        box.appendChild(card);
    });
}

/* =========================================================
   FILL BLANK
========================================================= */

function renderFillBlank(box, group) {

    (group.questions || []).forEach(question => {

        const card =
            createQuestionCard(question);

        const control =
            card.querySelector(".question-control");

        const input =
            document.createElement("input");

        input.type = "text";

        input.className =
            "answer-input";

        input.dataset.questionNumber =
            question.number;

        input.placeholder =
            "Type your answer";

        input.autocomplete = "off";

        control.appendChild(input);

        box.appendChild(card);
    });
}

/* =========================================================
   SUMMARY COMPLETION
========================================================= */

function renderSummaryCompletion(box, group) {

    const blanks =
        group.blanks?.length
            ? group.blanks
            : group.questions || [];

    let options =
        normalizeOptions(
            group.options ||
            group.words ||
            group.wordBank ||
            group.choices ||
            []
        );

    if (!options.length) {

        options =
            blanks
                .map(
                    blank => blank.answer
                )
                .filter(Boolean)
                .map(
                    value => ({
                        value: String(value),
                        text: String(value)
                    })
                );
    }

    const container =
        document.createElement("div");

    container.className =
        "summary-completion";

    container.innerHTML = `
        <div class="drag-bank-title">
            Given words:
        </div>

        <div class="drag-option-bank"></div>

        <div class="summary-text"></div>
    `;

    const bank =
        container.querySelector(
            ".drag-option-bank"
        );

    options.forEach(option => {

        const item =
            createDragOption(
                option,
                "summary-drag-word"
            );

        bank.appendChild(item);
    });

    const summary =
        container.querySelector(
            ".summary-text"
        );

    blanks.forEach(blank => {

        const row =
            document.createElement("div");

        row.className =
            "summary-blank-row";

        row.innerHTML = `
            <span class="summary-question-number">
                ${escapeHTML(blank.number)}
            </span>

            <span class="summary-blank-text">
                ${formatQuestionText(
                    blank.text || ""
                )}
            </span>

            <div
                class="summary-drop-zone"
                data-question-number="${escapeAttr(blank.number)}"
            >
                <span class="drop-placeholder">
                    Drop / select answer
                </span>
            </div>
        `;

        summary.appendChild(row);

        setupDropZone(
            row.querySelector(".summary-drop-zone")
        );
    });

    box.appendChild(container);
}

/* =========================================================
   MULTIPLE CHOICE
========================================================= */

function renderMultipleChoice(box, group) {

    (group.questions || []).forEach(question => {

        const card =
            createQuestionCard(question);

        const control =
            card.querySelector(".question-control");

        const options =
            getOptions(question, group);

        const select =
            createSelect(
                question.number,
                options,
                true
            );

        control.appendChild(select);

        box.appendChild(card);
    });
}

/* =========================================================
   MULTIPLE CHOICE MULTIPLE
========================================================= */

function renderMultipleChoiceMultiple(box, group) {

    (group.questions || []).forEach(question => {

        const card =
            createQuestionCard(question);

        const control =
            card.querySelector(".question-control");

        const options =
            getOptions(question, group);

        options.forEach(option => {

            const normalized =
                normalizeOption(option);

            const label =
                document.createElement("label");

            label.className =
                "multiple-option";

            label.innerHTML = `
                <input
                    type="checkbox"
                    data-question-number="${escapeAttr(question.number)}"
                    value="${escapeAttr(normalized.value)}"
                >
                <span>
                    ${escapeHTML(normalized.text)}
                </span>
            `;

            control.appendChild(label);
        });

        box.appendChild(card);
    });
}

/* =========================================================
   MATCHING HEADINGS
========================================================= */

function renderMatchingHeadings(box, group) {

    const headings =
        normalizeOptions(
            group.headings ||
            group.options ||
            group.choices ||
            []
        );

    (group.questions || []).forEach(question => {

        const card =
            createQuestionCard(question);

        const control =
            card.querySelector(".question-control");

        control.appendChild(
            createSelect(
                question.number,
                headings,
                true
            )
        );

        box.appendChild(card);
    });
}

/* =========================================================
   MATCHING INFORMATION
========================================================= */

function renderMatchingInformation(box, group) {

    const options =
        normalizeOptions(
            group.options ||
            group.paragraphs ||
            group.choices ||
            []
        );

    (group.questions || []).forEach(question => {

        const card =
            createQuestionCard(question);

        const control =
            card.querySelector(".question-control");

        control.appendChild(
            createSelect(
                question.number,
                options,
                true
            )
        );

        box.appendChild(card);
    });
}

/* =========================================================
   MATCHING FEATURES
   DRAG + DROP + CLICK
========================================================= */

function renderMatchingFeatures(box, group) {

    const options =
        normalizeOptions(
            group.options ||
            group.features ||
            group.choices ||
            []
        );

    const container =
        document.createElement("div");

    container.className =
        "matching-features-container";

    const bank =
        document.createElement("div");

    bank.className =
        "drag-option-bank";

    bank.innerHTML = `
        <div class="drag-bank-title">
            Choose an option:
        </div>
    `;

    const bankItems =
        document.createElement("div");

    bankItems.className =
        "drag-options";

    options.forEach(option => {

        bankItems.appendChild(
            createDragOption(
                option,
                "drag-option"
            )
        );
    });

    bank.appendChild(bankItems);

    container.appendChild(bank);

    (group.questions || []).forEach(question => {

        const row =
            document.createElement("div");

        row.className =
            "drag-question";

        row.innerHTML = `
            <div class="drag-question-text">
                <strong>${escapeHTML(question.number)}</strong>
                ${formatQuestionText(question.text || "")}
            </div>

            <div
                class="drag-drop-zone"
                data-question-number="${escapeAttr(question.number)}"
            >
                <span class="drop-placeholder">
                    Drop / select answer
                </span>
            </div>
        `;

        container.appendChild(row);

        setupDropZone(
            row.querySelector(".drag-drop-zone")
        );
    });

    box.appendChild(container);
}

/* =========================================================
   ANSWER BOX
========================================================= */

function renderAnswerBox(box, group) {

    (group.questions || []).forEach(question => {

        const card =
            createQuestionCard(question);

        const control =
            card.querySelector(".question-control");

        const input =
            document.createElement("input");

        input.type = "text";

        input.className =
            "answer-input";

        input.dataset.questionNumber =
            question.number;

        input.placeholder =
            "Your answer";

        control.appendChild(input);

        box.appendChild(card);
    });
}

/* =========================================================
   GENERIC
========================================================= */

function renderGenericQuestions(box, group) {

    const questions =
        group.questions || [];

    questions.forEach(question => {

        const card =
            createQuestionCard(question);

        const control =
            card.querySelector(".question-control");

        const options =
            getOptions(question, group);

        if (options.length) {

            control.appendChild(
                createSelect(
                    question.number,
                    options,
                    true
                )
            );

        } else {

            const input =
                document.createElement("input");

            input.type = "text";

            input.className =
                "answer-input";

            input.dataset.questionNumber =
                question.number;

            input.placeholder =
                "Your answer";

            control.appendChild(input);
        }

        box.appendChild(card);
    });
}

/* =========================================================
   SELECT
========================================================= */

function createSelect(
    number,
    options,
    allowLetters = false
) {

    const select =
        document.createElement("select");

    select.dataset.questionNumber =
        number;

    select.className =
        "question-select";

    const placeholder =
        document.createElement("option");

    placeholder.value = "";

    placeholder.textContent =
        "Select your answer";

    placeholder.disabled = false;

    placeholder.selected = true;

    select.appendChild(placeholder);

    normalizeOptions(options).forEach(option => {

        const opt =
            document.createElement("option");

        const normalized =
            normalizeOption(option);

        opt.value =
            normalized.value;

        opt.textContent =
            normalized.text;

        select.appendChild(opt);
    });

    return select;
}

/* =========================================================
   OPTIONS
========================================================= */

function getOptions(question, group) {

    return normalizeOptions(
        question.options ||
        question.choices ||
        question.answerOptions ||
        group.options ||
        group.choices ||
        group.answerOptions ||
        []
    );
}

function normalizeOptions(options) {

    if (!Array.isArray(options)) {

        if (
            options &&
            typeof options === "object"
        ) {

            return Object.entries(options)
                .map(([key, value]) => ({
                    value: key,
                    text: String(value)
                }));
        }

        return [];
    }

    return options
        .map(normalizeOption)
        .filter(option => option.text);
}

function normalizeOption(option) {

    if (
        option === null ||
        option === undefined
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

    if (typeof option === "object") {

        const value =
            option.value ??
            option.letter ??
            option.id ??
            option.key ??
            option.text ??
            "";

        const text =
            option.text ??
            option.label ??
            option.name ??
            option.value ??
            option.letter ??
            option.id ??
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
   DRAG OPTIONS
========================================================= */

function createDragOption(
    option,
    className
) {

    const normalized =
        normalizeOption(option);

    const element =
        document.createElement("div");

    element.className =
        className;

    element.draggable = true;

    element.dataset.value =
        normalized.value;

    element.dataset.text =
        normalized.text;

    element.innerHTML =
        escapeHTML(normalized.text);

    element.addEventListener(
        "dragstart",
        event => {

            selectedDragOption =
                element;

            event.dataTransfer.effectAllowed =
                "copy";

            event.dataTransfer.setData(
                "text/plain",
                JSON.stringify({
                    value:
                        normalized.value,
                    text:
                        normalized.text
                })
            );

            element.classList.add(
                "dragging"
            );
        }
    );

    element.addEventListener(
        "dragend",
        () => {

            element.classList.remove(
                "dragging"
            );

            selectedDragOption = null;
        }
    );

    return element;
}

/* =========================================================
   DROP ZONES
========================================================= */

function setupDropZone(zone) {

    zone.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            zone.classList.add(
                "drag-over"
            );
        }
    );

    zone.addEventListener(
        "dragleave",
        () => {

            zone.classList.remove(
                "drag-over"
            );
        }
    );

    zone.addEventListener(
        "drop",
        event => {

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

            } catch (error) {}

            if (!data && selectedDragOption) {

                data = {
                    value:
                        selectedDragOption.dataset.value,
                    text:
                        selectedDragOption.dataset.text
                };
            }

            if (data) {

                placeDroppedAnswer(
                    zone,
                    data.value,
                    data.text
                );
            }
        }
    );

    zone.addEventListener(
        "click",
        () => {

            if (selectedDragOption) {

                placeDroppedAnswer(
                    zone,
                    selectedDragOption.dataset.value,
                    selectedDragOption.dataset.text
                );

                selectedDragOption.classList.remove(
                    "selected"
                );

                selectedDragOption = null;
            }
        }
    );
}

/* =========================================================
   CLICK-TO-SELECT
========================================================= */

function selectDragOption(element) {

    document
        .querySelectorAll(
            ".drag-option.selected, .summary-drag-word.selected"
        )
        .forEach(item => {
            item.classList.remove("selected");
        });

    element.classList.add("selected");

    selectedDragOption =
        element;

    showToast(
        "Now click the answer box."
    );
}

/* =========================================================
   PLACE ANSWER
========================================================= */

function placeDroppedAnswer(
    zone,
    value,
    text
) {

    const number =
        zone.dataset.questionNumber;

    if (!number) return;

    studentAnswers[number] =
        value;

    saveAnswers();

    zone.innerHTML = `
        <span class="dropped-answer">
            ${escapeHTML(text)}
            <button
                type="button"
                class="remove-dropped-answer"
                data-question-number="${escapeAttr(number)}"
                aria-label="Remove answer"
            >
                ×
            </button>
        </span>
    `;

    updateQuestionNavigator();
}

/* =========================================================
   REMOVE DROP
========================================================= */

function removeDroppedAnswer(button) {

    const number =
        button.dataset.questionNumber;

    delete studentAnswers[number];

    saveAnswers();

    const zone =
        document.querySelector(
            `[data-question-number="${CSS.escape(number)}"].drag-drop-zone,
             [data-question-number="${CSS.escape(number)}"].summary-drop-zone`
        );

    if (zone) {

        zone.innerHTML = `
            <span class="drop-placeholder">
                Drop / select answer
            </span>
        `;
    }

    updateQuestionNavigator();
}

/* =========================================================
   SAVE INPUT
========================================================= */

function saveInputAnswer(input) {

    const number =
        input.dataset.questionNumber;

    if (!number) return;

    if (
        input.type === "checkbox"
    ) {

        const boxes =
            document.querySelectorAll(
                `input[type="checkbox"][data-question-number="${CSS.escape(number)}"]`
            );

        const values =
            [...boxes]
                .filter(box => box.checked)
                .map(box => box.value);

        studentAnswers[number] =
            values;

    } else {

        studentAnswers[number] =
            input.value;
    }

    saveAnswers();

    updateQuestionNavigator();
}

/* =========================================================
   RESTORE ANSWERS
========================================================= */

function restoreAnswersToDOM() {

    Object.entries(studentAnswers)
        .forEach(([number, answer]) => {

            const value =
                answer;

            const input =
                document.querySelector(
                    `[data-question-number="${CSS.escape(number)}"]`
                );

            if (!input) return;

            if (input.tagName === "SELECT") {

                input.value =
                    Array.isArray(value)
                        ? value[0] || ""
                        : String(value);

            } else if (
                input.type === "checkbox"
            ) {

                const values =
                    Array.isArray(value)
                        ? value
                        : [value];

                document
                    .querySelectorAll(
                        `input[type="checkbox"][data-question-number="${CSS.escape(number)}"]`
                    )
                    .forEach(box => {

                        box.checked =
                            values
                                .map(String)
                                .includes(
                                    String(box.value)
                                );
                    });

            } else if (
                input.type !== "radio"
            ) {

                input.value =
                    Array.isArray(value)
                        ? value[0] || ""
                        : value;
            }
        });

    restoreDropZones();

    updateQuestionNavigator();
}

function restoreDropZones() {

    document
        .querySelectorAll(
            ".drag-drop-zone, .summary-drop-zone"
        )
        .forEach(zone => {

            const number =
                zone.dataset.questionNumber;

            const answer =
                studentAnswers[number];

            if (
                answer === undefined ||
                answer === null ||
                answer === ""
            ) return;

            const text =
                String(answer);

            zone.innerHTML = `
                <span class="dropped-answer">
                    ${escapeHTML(text)}
                    <button
                        type="button"
                        class="remove-dropped-answer"
                        data-question-number="${escapeAttr(number)}"
                    >
                        ×
                    </button>
                </span>
            `;
        });
}

/* =========================================================
   LOCAL STORAGE
========================================================= */

function storageKey() {

    return (
        CONFIG.STORAGE_PREFIX +
        "test_" +
        currentTestNumber
    );
}

function saveAnswers() {

    if (!currentTestNumber) return;

    try {

        localStorage.setItem(
            storageKey(),
            JSON.stringify(studentAnswers)
        );

    } catch (error) {
        console.warn(
            "Could not save answers."
        );
    }
}

function loadSavedAnswers() {

    try {

        const data =
            localStorage.getItem(
                storageKey()
            );

        if (!data) return {};

        const parsed =
            JSON.parse(data);

        return parsed &&
            typeof parsed === "object"
            ? parsed
            : {};

    } catch (error) {

        return {};
    }
}

function clearSavedAnswers() {

    try {
        localStorage.removeItem(
            storageKey()
        );
    } catch (error) {}
}

/* =========================================================
   QUESTION NAVIGATOR
========================================================= */

function renderQuestionNavigator() {

    const containers = [
        $("questionNavigator"),
        $("questionNav"),
        $("questionNumberNav"),
        $("questionNumbers")
    ].filter(Boolean);

    if (!containers.length) return;

    containers.forEach(container => {

        container.innerHTML = "";

        const numbers =
            getPartQuestionNumbers(
                currentTest.parts[
                    currentPartIndex
                ]
            );

        numbers.forEach(number => {

            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "question-nav-button";

            button.dataset.questionNav =
                number;

            button.textContent =
                number;

            container.appendChild(button);
        });
    });

    updateQuestionNavigator();
}

function updateQuestionNavigator() {

    document
        .querySelectorAll(
            "[data-question-nav]"
        )
        .forEach(button => {

            const number =
                button.dataset.questionNav;

            const answer =
                studentAnswers[number];

            const answered =
                isAnswered(answer);

            button.classList.toggle(
                "answered",
                answered
            );

            button.classList.toggle(
                "current",
                questionIsVisible(number)
            );
        });
}

function questionIsVisible(number) {

    const element =
        document.querySelector(
            `[data-question-number="${CSS.escape(String(number))}"]`
        );

    if (!element) return false;

    const card =
        element.closest(
            ".question-card, .drag-question, .summary-blank-row"
        );

    return !!card;
}

function jumpToQuestion(number) {

    const selector =
        `[data-question-number="${CSS.escape(String(number))}"]`;

    const element =
        document.querySelector(selector);

    if (!element) return;

    const card =
        element.closest(
            ".question-card, .drag-question, .summary-blank-row"
        ) || element;

    card.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    card.classList.add(
        "question-highlight"
    );

    setTimeout(() => {
        card.classList.remove(
            "question-highlight"
        );
    }, 1000);
}

/* =========================================================
   NAVIGATION
========================================================= */

function previousPart() {

    if (currentPartIndex <= 0) return;

    currentPartIndex--;

    renderCurrentPart();
}

function nextPart() {

    if (
        currentPartIndex >=
        currentTest.parts.length - 1
    ) {
        return;
    }

    currentPartIndex++;

    renderCurrentPart();
}

function updatePartButtons() {

    const previous =
        $("previousPartButton");

    const next =
        $("nextPartButton");

    if (previous) {
        previous.disabled =
            currentPartIndex === 0;
    }

    if (next) {

        next.disabled =
            currentPartIndex ===
            currentTest.parts.length - 1;
    }
}

/* =========================================================
   ANSWER STATUS
========================================================= */

function isAnswered(value) {

    if (value === undefined || value === null) {
        return false;
    }

    if (Array.isArray(value)) {
        return value.some(
            item =>
                String(item).trim() !== ""
        );
    }

    return String(value).trim() !== "";
}

function countAnsweredAnswers(answerSet) {

    return getAllQuestionNumbers()
        .filter(
            number =>
                isAnswered(
                    answerSet[number]
                )
        )
        .length;
}

/* =========================================================
   SUBMIT
========================================================= */

function confirmSubmitTest() {

    if (testSubmitted) return;

    const unanswered =
        getAllQuestionNumbers()
            .filter(
                number =>
                    !isAnswered(
                        studentAnswers[number]
                    )
            ).length;

    const message =
        unanswered > 0
            ? `You have ${unanswered} unanswered question(s). Submit anyway?`
            : "Submit your Reading test?";

    if (
        window.confirm(message)
    ) {
        submitTest();
    }
}

function closeConfirmModal() {

    const modal =
        $("confirmModal");

    if (modal) {
        modal.style.display = "none";
    }
}

function autoSubmitTest() {

    if (testSubmitted) return;

    submitTest();
}

function submitTest() {

    if (testSubmitted) return;

    testSubmitted = true;

    stopTimer();

    testElapsedSeconds =
        Math.max(
            0,
            Math.floor(
                (Date.now() - testStartTime) / 1000
            )
        );

    submittedAnswers =
        JSON.parse(
            JSON.stringify(studentAnswers)
        );

    scoreData =
        calculateScore(
            submittedAnswers
        );

    clearSavedAnswers();

    renderResult();
}

/* =========================================================
   SCORE
========================================================= */

function calculateScore(answerSet) {

    let total = 0;

    const partScores = [];
    const partTotals = [];

    (currentTest.parts || []).forEach(part => {

        let partScore = 0;
        let partTotal = 0;

        (part.questionGroups || [])
            .forEach(group => {

                const questions = [
                    ...(group.questions || []),
                    ...(group.blanks || [])
                ];

                questions.forEach(question => {

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

        partScores.push(partScore);
        partTotals.push(partTotal);

        total += partScore;
    });

    return {
        totalScore: total,
        totalQuestions: countTotalQuestions(),
        partScores,
        partTotals,
        band: calculateIELTSBand(total),
        timeUsed:
            formatTime(
                testElapsedSeconds
            )
    };
}

/* =========================================================
   ANSWER MATCHING
========================================================= */

function answersMatch(given, correct) {

    if (
        given === undefined ||
        given === null ||
        correct === undefined ||
        correct === null
    ) {
        return false;
    }

    const givenArray =
        Array.isArray(given)
            ? given
            : [given];

    const correctArray =
        Array.isArray(correct)
            ? correct
            : [correct];

    const normalizedGiven =
        givenArray
            .map(normalizeAnswer)
            .filter(Boolean);

    const normalizedCorrect =
        correctArray
            .map(normalizeAnswer)
            .filter(Boolean);

    if (
        normalizedGiven.length !==
        normalizedCorrect.length
    ) {
        return false;
    }

    return normalizedGiven
        .every(
            value =>
                normalizedCorrect.includes(value)
        );
}

/* =========================================================
   IELTS READING BAND
========================================================= */

function calculateIELTSBand(score) {

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

    showScreen("resultScreen");

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
                score /
                answered *
                100
            )
            : 0;

    const percentage =
        total
            ? Math.round(
                score /
                total *
                100
            )
            : 0;

    setText(
        "resultTestTitle",
        currentTest.title ||
        `IELTS Reading Test ${currentTestNumber}`
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

    buildResultFallback(
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
   RESULT FALLBACK / REPORT
========================================================= */

function buildResultFallback(
    score,
    total,
    answered,
    incorrect,
    unanswered,
    accuracy,
    percentage
) {

    const screen =
        $("resultScreen");

    if (!screen) return;

    let report =
        $("readingResultReport");

    if (!report) {

        report =
            document.createElement("div");

        report.id =
            "readingResultReport";

        screen.appendChild(report);
    }

    report.innerHTML = `
        <div class="results-page">

            <div class="results-heading">
                <div class="results-kicker">
                    TEST COMPLETE
                </div>

                <h1>
                    Your Reading Result
                </h1>

                <p>
                    ${
                        escapeHTML(
                            currentTest.title ||
                            `IELTS Reading Test ${currentTestNumber}`
                        )
                    }
                </p>

                <button
                    type="button"
                    id="generatedPrintButton"
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
                    <span>
                        ${percentage}%
                    </span>
                </div>

                <div class="hero-copy">

                    <div class="status-pill">
                        ${score >= total * .7
                            ? "Strong Result"
                            : "Keep Practising"}
                    </div>

                    <h2>
                        Estimated IELTS Band
                        ${Number(scoreData.band).toFixed(1)}
                    </h2>

                    <p>
                        You answered ${answered}
                        of ${total} questions.
                    </p>

                </div>

            </div>

            <div class="result-summary">

                ${resultStat(
                    "Correct",
                    score
                )}

                ${resultStat(
                    "Incorrect",
                    incorrect
                )}

                ${resultStat(
                    "Unanswered",
                    unanswered
                )}

                ${resultStat(
                    "Accuracy",
                    `${accuracy}%`
                )}

            </div>

            <section class="result-section">

                <h2>
                    Part-by-Part Score
                </h2>

                <div class="part-score-list">

                    ${
                        scoreData.partScores
                            .map(
                                (partScore, index) => `
                                    <div class="part-score-row">

                                        <span>
                                            Part ${index + 1}
                                        </span>

                                        <strong>
                                            ${partScore}
                                            /
                                            ${scoreData.partTotals[index]}
                                        </strong>

                                    </div>
                                `
                            )
                            .join("")
                    }

                </div>

            </section>

            <section class="result-section">

                <h2>
                    Question Review
                </h2>

                <div class="review-grid">

                    ${
                        getAllReviewQuestions()
                            .map(
                                item =>
                                    renderReviewItem(
                                        item
                                    )
                            )
                            .join("")
                    }

                </div>

            </section>

            <div class="result-actions">

                <button
                    type="button"
                    id="generatedRestartButton"
                >
                    Start Again
                </button>

                <button
                    type="button"
                    id="generatedPrintButton2"
                >
                    Print / Save PDF
                </button>

            </div>

        </div>
    `;

    $("generatedPrintButton")
        ?.addEventListener(
            "click",
            printScorePDF
        );

    $("generatedPrintButton2")
        ?.addEventListener(
            "click",
            printScorePDF
        );

    $("generatedRestartButton")
        ?.addEventListener(
            "click",
            restartCurrentTest
        );
}

function resultStat(label, value) {

    return `
        <div class="result-stat">

            <span>
                ${escapeHTML(label)}
            </span>

            <strong>
                ${escapeHTML(value)}
            </strong>

        </div>
    `;
}

/* =========================================================
   REVIEW QUESTIONS
========================================================= */

function getAllReviewQuestions() {

    const result = [];

    (currentTest.parts || [])
        .forEach(part => {

            (part.questionGroups || [])
                .forEach(group => {

                    const questions = [
                        ...(group.questions || []),
                        ...(group.blanks || [])
                    ];

                    questions.forEach(question => {

                        result.push({
                            number:
                                question.number,

                            text:
                                question.text || "",

                            given:
                                submittedAnswers[
                                    question.number
                                ],

                            correct:
                                question.answer
                        });
                    });
                });
        });

    return result.sort(
        (a, b) =>
            Number(a.number) -
            Number(b.number)
    );
}

function renderReviewItem(item) {

    const correct =
        answersMatch(
            item.given,
            item.correct
        );

    const answered =
        isAnswered(item.given);

    const status =
        correct
            ? "correct"
            : answered
                ? "incorrect"
                : "unanswered";

    return `
        <div class="review-item ${status}">

            <div class="review-number">
                ${escapeHTML(item.number)}
            </div>

            <div class="review-content">

                <div class="review-question">
                    ${formatQuestionText(item.text)}
                </div>

                <div class="review-answer">

                    <strong>
                        Your answer:
                    </strong>

                    <span>
                        ${
                            answered
                                ? escapeHTML(
                                    formatAnswer(
                                        item.given
                                    )
                                )
                                : "(No answer)"
                        }
                    </span>

                </div>

                <div class="review-answer">

                    <strong>
                        Correct answer:
                    </strong>

                    <span>
                        ${escapeHTML(
                            formatAnswer(
                                item.correct
                            )
                        )}
                    </span>

                </div>

            </div>

        </div>
    `;
}

function formatAnswer(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return "(No answer)";
    }

    if (Array.isArray(value)) {
        return value.join(", ");
    }

    if (
        typeof value === "object"
    ) {

        return (
            value.letter ??
            value.text ??
            value.value ??
            JSON.stringify(value)
        );
    }

    return String(value);
}

/* =========================================================
   RESTART / DASHBOARD
========================================================= */

function restartCurrentTest() {

    if (!currentTest) return;

    clearSavedAnswers();

    studentAnswers = {};

    submittedAnswers = {};

    testSubmitted = false;

    currentPartIndex = 0;

    testStarted = false;

    showTestIntroduction();
}

function backToDashboard() {

    stopTimer();

    currentTest = null;

    currentTestNumber = null;

    studentAnswers = {};

    submittedAnswers = {};

    testSubmitted = false;

    testStarted = false;

    renderTestCards();

    showScreen("dashboardScreen");
}

/* =========================================================
   PRINT / SAVE PDF
========================================================= */

function printScorePDF() {

    if (!scoreData) return;

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
                score /
                answered *
                100
            )
            : 0;

    const review =
        getAllReviewQuestions();

    const html = `
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
    font-family:
        Arial,
        Helvetica,
        sans-serif;

    margin: 0;

    padding: 35px;

    color: #222;

    background: #fff;
}

h1 {
    margin: 0 0 8px;
}

h2 {
    margin-top: 30px;
}

.header {
    border-bottom:
        2px solid #222;

    padding-bottom: 20px;
}

.kicker {
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 2px;
}

.subtitle {
    color: #666;
}

.score {
    margin-top: 25px;
    padding: 25px;
    border: 1px solid #ddd;
    border-radius: 15px;
}

.score-number {
    font-size: 42px;
    font-weight: bold;
}

.band {
    font-size: 24px;
    margin-top: 10px;
}

.stats {
    display: grid;
    grid-template-columns:
        repeat(4, 1fr);

    gap: 12px;

    margin-top: 20px;
}

.stat {
    border:
        1px solid #ddd;

    border-radius:
        10px;

    padding:
        15px;
}

.stat strong {
    display: block;
    font-size: 22px;
    margin-top: 5px;
}

.part {
    display: flex;
    justify-content: space-between;
    border-bottom:
        1px solid #ddd;
    padding: 10px 0;
}

.review {
    border:
        1px solid #ddd;

    border-radius:
        10px;

    padding:
        15px;

    margin:
        10px 0;

    page-break-inside:
        avoid;
}

.review.correct {
    border-left:
        5px solid #222;
}

.review.incorrect {
    border-left:
        5px solid #777;
}

.review.unanswered {
    border-left:
        5px solid #bbb;
}

.answer {
    margin-top: 8px;
}

@media print {

    body {
        padding: 15px;
    }

    button {
        display: none !important;
    }

}

</style>

</head>

<body>

<div class="header">

    <div class="kicker">
        IELTS READING
    </div>

    <h1>
        Test Result
    </h1>

    <div class="subtitle">
        ${escapeHTML(
            currentTest.title ||
            `IELTS Reading Test ${currentTestNumber}`
        )}
    </div>

</div>

<div class="score">

    <div class="score-number">
        ${score} / ${total}
    </div>

    <div>
        Accuracy: ${accuracy}%
    </div>

    <div class="band">
        Estimated IELTS Band:
        <strong>
            ${Number(scoreData.band).toFixed(1)}
        </strong>
    </div>

    <div>
        Time used:
        ${escapeHTML(scoreData.timeUsed)}
    </div>

</div>

<div class="stats">

    <div class="stat">
        Correct
        <strong>${score}</strong>
    </div>

    <div class="stat">
        Incorrect
        <strong>${incorrect}</strong>
    </div>

    <div class="stat">
        Unanswered
        <strong>${unanswered}</strong>
    </div>

    <div class="stat">
        Accuracy
        <strong>${accuracy}%</strong>
    </div>

</div>

<h2>
    Part Scores
</h2>

${
    scoreData.partScores
        .map(
            (value, index) => `
                <div class="part">
                    <span>
                        Part ${index + 1}
                    </span>
                    <strong>
                        ${value}
                        /
                        ${scoreData.partTotals[index]}
                    </strong>
                </div>
            `
        )
        .join("")
}

<h2>
    Question Review
</h2>

${
    review
        .map(item => {

            const correct =
                answersMatch(
                    item.given,
                    item.correct
                );

            const answered =
                isAnswered(
                    item.given
                );

            const status =
                correct
                    ? "correct"
                    : answered
                        ? "incorrect"
                        : "unanswered";

            return `
                <div class="review ${status}">

                    <strong>
                        Question ${escapeHTML(item.number)}
                    </strong>

                    <p>
                        ${formatQuestionText(item.text)}
                    </p>

                    <div class="answer">
                        <strong>
                            Your answer:
                        </strong>
                        ${
                            answered
                                ? escapeHTML(
                                    formatAnswer(
                                        item.given
                                    )
                                )
                                : "(No answer)"
                        }
                    </div>

                    <div class="answer">
                        <strong>
                            Correct answer:
                        </strong>
                        ${escapeHTML(
                            formatAnswer(
                                item.correct
                            )
                        )}
                    </div>

                </div>
            `;

        })
        .join("")
}

</body>

</html>
`;

    const printWindow =
        window.open(
            "",
            "_blank",
            "width=1000,height=800"
        );

    if (!printWindow) {

        showToast(
            "Please allow pop-ups to print the result."
        );

        return;
    }

    printWindow.document.open();

    printWindow.document.write(
        html
    );

    printWindow.document.close();

    setTimeout(() => {

        printWindow.focus();

        printWindow.print();

    }, 500);
}

/* =========================================================
   PANEL SCROLL
========================================================= */

function scrollPanelsTop() {

    [
        "passagePanel",
        "questionPanel",
        "passageContent",
        "questionsContent"
    ]
    .forEach(id => {

        const el = $(id);

        if (el) {
            el.scrollTop = 0;
        }
    });
}

/* =========================================================
   CSS FIXES
   These are injected so the JS works even if the existing
   CSS is missing some drag/drop/select styles.
========================================================= */

function injectStyles() {

    if ($("appJsFixStyles")) return;

    const style =
        document.createElement("style");

    style.id =
        "appJsFixStyles";

    style.textContent = `

        .question-group {
            margin-bottom: 30px;
        }

        .group-heading {
            margin-bottom: 18px;
        }

        .question-card {
            display: flex;
            gap: 14px;
            margin: 12px 0;
            padding: 15px;
            border-radius: 10px;
        }

        .question-number {
            min-width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-weight: 700;
            background: #383838;
            color: white;
        }

        .question-body {
            flex: 1;
            min-width: 0;
        }

        .question-text {
            margin-bottom: 10px;
            line-height: 1.6;
        }

        .question-control {
            width: 100%;
        }

        .question-select,
        .answer-input {
            width: 100%;
            max-width: 420px;
            min-height: 42px;
            padding: 9px 12px;
            border: 1px solid #bbb;
            border-radius: 8px;
            background: white;
            font-size: 15px;
        }

        .multiple-option {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 8px 0;
            cursor: pointer;
        }

        .drag-option-bank {
            margin: 15px 0;
            padding: 15px;
            border-radius: 12px;
            border: 1px solid #ddd;
        }

        .drag-bank-title {
            font-weight: 700;
            margin-bottom: 12px;
        }

        .drag-options,
        .drag-option-bank > div:not(.drag-bank-title) {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .drag-option,
        .summary-drag-word {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 40px;
            padding: 8px 14px;
            border-radius: 8px;
            border: 1px solid #aaa;
            background: white;
            cursor: grab;
            user-select: none;
        }

        .drag-option:hover,
        .summary-drag-word:hover,
        .drag-option.selected,
        .summary-drag-word.selected {
            transform: translateY(-1px);
            border-color: #383838;
        }

        .drag-option.dragging,
        .summary-drag-word.dragging {
            opacity: .45;
        }

        .drag-question,
        .summary-blank-row {
            margin: 14px 0;
        }

        .drag-question-text,
        .summary-blank-text {
            margin-bottom: 8px;
            line-height: 1.6;
        }

        .drag-drop-zone,
        .summary-drop-zone {
            min-height: 48px;
            border: 2px dashed #aaa;
            border-radius: 8px;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            cursor: pointer;
            background: #fafafa;
        }

        .drag-drop-zone.drag-over,
        .summary-drop-zone.drag-over {
            border-color: #383838;
            background: #f0f0f0;
        }

        .drop-placeholder {
            color: #888;
        }

        .dropped-answer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            gap: 10px;
        }

        .remove-dropped-answer {
            border: 0;
            background: transparent;
            cursor: pointer;
            font-size: 20px;
            line-height: 1;
        }

        .question-nav-button {
            min-width: 34px;
            min-height: 34px;
            margin: 3px;
            border: 1px solid #bbb;
            background: white;
            border-radius: 7px;
            cursor: pointer;
        }

        .question-nav-button.answered {
            background: #383838;
            color: white;
        }

        .question-nav-button.current {
            outline: 2px solid #d0a557;
        }

        .question-highlight {
            animation: questionHighlight 1s ease;
        }

        @keyframes questionHighlight {
            0% {
                background: rgba(208,165,87,.25);
            }
            100% {
                background: transparent;
            }
        }

        .timer-warning {
            color: #c62828 !important;
            font-weight: 700;
        }

        .results-page {
            max-width: 1000px;
            margin: 0 auto;
            padding: 30px 20px;
        }

        .results-heading {
            margin-bottom: 25px;
        }

        .results-kicker {
            font-size: 12px;
            letter-spacing: 2px;
            font-weight: 700;
        }

        .result-hero {
            display: flex;
            align-items: center;
            gap: 25px;
            padding: 25px;
            border-radius: 18px;
            border: 1px solid #ddd;
        }

        .score-ring {
            width: 130px;
            height: 130px;
            border-radius: 50%;
            border: 10px solid #383838;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .score-ring strong {
            font-size: 25px;
        }

        .score-ring span {
            font-size: 13px;
            color: #777;
        }

        .status-pill {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            background: #383838;
            color: white;
            font-size: 12px;
        }

        .result-summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin: 20px 0;
        }

        .result-stat {
            padding: 18px;
            border-radius: 12px;
            border: 1px solid #ddd;
        }

        .result-stat span {
            display: block;
            color: #777;
            font-size: 13px;
        }

        .result-stat strong {
            display: block;
            margin-top: 5px;
            font-size: 24px;
        }

        .part-score-row {
            display: flex;
            justify-content: space-between;
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }

        .review-grid {
            display: grid;
            gap: 12px;
        }

        .review-item {
            display: flex;
            gap: 14px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 12px;
        }

        .review-item.correct {
            border-left: 5px solid #333;
        }

        .review-item.incorrect {
            border-left: 5px solid #999;
        }

        .review-item.unanswered {
            border-left: 5px solid #ccc;
        }

        .review-number {
            font-weight: 700;
            min-width: 30px;
        }

        .review-answer {
            margin-top: 7px;
        }

        .result-actions {
            display: flex;
            gap: 10px;
            margin-top: 25px;
        }

        .result-actions button,
        .print-result-button {
            padding: 11px 18px;
            border-radius: 8px;
            border: 1px solid #333;
            cursor: pointer;
            background: #383838;
            color: white;
        }

        .vocabulary-word {
            cursor: pointer;
            border-bottom: 1px dotted currentColor;
        }

        #vocabularyPopup {
            position: fixed;
            z-index: 99999;
            max-width: 320px;
            padding: 18px;
            border-radius: 12px;
            background: white;
            color: #222;
            box-shadow: 0 10px 40px rgba(0,0,0,.25);
            border: 1px solid #ddd;
            right: 20px;
            bottom: 20px;
        }

        .vocab-close {
            float: right;
            border: 0;
            background: transparent;
            font-size: 20px;
            cursor: pointer;
        }

        @media (max-width: 700px) {

            .result-summary {
                grid-template-columns:
                    repeat(2, 1fr);
            }

            .result-hero {
                flex-direction: column;
                align-items: flex-start;
            }

            .question-card {
                padding: 10px;
            }

            .question-number {
                min-width: 30px;
            }

            .result-actions {
                flex-direction: column;
            }

            .drag-option,
            .summary-drag-word {
                flex: 1 1 auto;
            }
        }

        @media print {

            .print-result-button,
            .result-actions {
                display: none !important;
            }
        }
    `;

    document.head.appendChild(style);
}

/* =========================================================
   END
========================================================= */
