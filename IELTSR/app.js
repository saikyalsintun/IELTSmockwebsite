/* =========================================================
   IELTS READING PRACTICE
   LOCAL STORAGE ONLY
   Complete compact app.js
========================================================= */

const CONFIG = {
    TEST_COUNT: 8,
    TEST_FOLDER: "./tests/",
    VOCABULARY_FILE: "./vocabulary.json",
    DEFAULT_DURATION: 60
};

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
   START
========================================================= */

window.addEventListener("DOMContentLoaded", async () => {
    injectStyles();
    setupEvents();
    await loadVocabulary();
    removeAdminElements();
    showDashboard();
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

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(el => {
        el.classList.remove("active");
        el.style.display = "none";
    });

    const el = $(id);
    if (el) {
        el.classList.add("active");
        el.style.display = "";
    }
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

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(value) {
    return String(value ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function formatTime(seconds) {
    seconds = Math.max(0, Number(seconds) || 0);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function showToast(message) {
    let toast = $("toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.style.cssText =
            "position:fixed;bottom:25px;left:50%;transform:translateX(-50%);" +
            "background:#383838;color:#fff;padding:12px 18px;border-radius:8px;" +
            "z-index:99999;box-shadow:0 5px 20px #0004;";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.display = "block";

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}

function setupEvents() {
    const events = {
        startTestButton: startTest,
        backToDashboardButton: showDashboard,
        testBackButton: confirmExitTest,
        submitTestButton: confirmSubmitTest,
        previousPartButton: previousPart,
        nextPartButton: nextPart,
        returnDashboardButton: showDashboard,
        retakeTestButton: () => currentTest && startTest(),
        closeVocabularyPopup: closeVocabularyPopup,
        closeConfirmModal: closeConfirmModal,
        cancelSubmitButton: closeConfirmModal,
        confirmSubmitButton: submitTest
    };

    Object.entries(events).forEach(([id, fn]) => {
        const el = $(id);
        if (el) el.addEventListener("click", fn);
    });

    document.addEventListener("input", e => {
        if (
            e.target.matches(
                "input[data-question-number],textarea[data-question-number]"
            )
        ) {
            saveAnswerFromElement(e.target);
        }
    });

    document.addEventListener("change", e => {
        if (
            e.target.matches(
                "select[data-question-number],input[type=radio][data-question-number],input[type=checkbox][data-question-number]"
            )
        ) {
            saveAnswerFromElement(e.target);
        }
    });
}

/* =========================================================
   REMOVE ADMIN / LOGIN
========================================================= */

function removeAdminElements() {
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
        "logoutButton",
        "loginScreen"
    ].forEach(id => {
        const el = $(id);
        if (el) el.remove();
    });

    document.querySelectorAll("button,a").forEach(el => {
        const t = normalize(el.textContent);
        if (
            [
                "teacher",
                "admin",
                "teacher admin",
                "teacher/admin",
                "login",
                "log in",
                "logout",
                "log out"
            ].includes(t)
        ) {
            el.remove();
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
    showScreen("dashboardScreen");
    renderTestCards();
}

function renderTestCards() {
    const box = $("testCards");
    if (!box) return;

    box.innerHTML = "";

    for (let i = 1; i <= CONFIG.TEST_COUNT; i++) {
        const card = document.createElement("div");
        card.className = "test-card";
        card.innerHTML = `
            <div class="test-card-number">Test ${i}</div>
            <h3>IELTS Reading Test ${i}</h3>
            <div class="test-card-info">
                <span>${CONFIG.DEFAULT_DURATION} minutes</span>
                <span>40 questions</span>
            </div>
        `;

        card.onclick = () => openTest(i);
        box.appendChild(card);
    }
}

/* =========================================================
   LOAD TEST
========================================================= */

async function openTest(number) {
    try {
        const response = await fetch(
            `${CONFIG.TEST_FOLDER}Test${number}.json?${Date.now()}`,
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error(`Test${number}.json not found.`);
        }

        const data = await response.json();
        validateTest(data);

        currentTest = data;
        currentTestNumber = number;
        currentPartIndex = 0;
        studentAnswers = {};
        submittedAnswers = {};
        scoreData = null;
        testSubmitted = false;

        loadSavedAnswers();
        showTestIntroduction();
    } catch (error) {
        console.error(error);
        alert(
            `Unable to load Test ${number}.\n\n` +
            `${error.message}\n\n` +
            `Make sure tests/Test${number}.json exists.`
        );
    }
}

function validateTest(test) {
    if (!test || !Array.isArray(test.parts)) {
        throw new Error("Invalid test JSON.");
    }

    test.parts.forEach(part => {
        if (!part.passage) part.passage = {};
        if (!Array.isArray(part.passage.paragraphs)) {
            if (typeof part.passage.text === "string") {
                part.passage.paragraphs = [
                    { id: "", text: part.passage.text }
                ];
            } else {
                part.passage.paragraphs = [];
            }
        }

        if (!Array.isArray(part.questionGroups)) {
            part.questionGroups = [];
        }

        part.questionGroups.forEach(group => {
            if (!Array.isArray(group.questions)) group.questions = [];
            if (!Array.isArray(group.blanks)) group.blanks = [];
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
        currentTest.testId || `Test ${currentTestNumber}`
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

    setText("introQuestions", countTotalQuestions());
    setText("introParts", currentTest.parts.length);
}

/* =========================================================
   START TEST
========================================================= */

function startTest() {
    if (!currentTest) return;

    studentAnswers = {};
    loadSavedAnswers();

    currentPartIndex = 0;
    testStarted = true;
    testSubmitted = false;
    testStartTime = Date.now();

    remainingSeconds =
        (Number(currentTest.duration) || CONFIG.DEFAULT_DURATION) * 60;

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
    updateTimer();

    timerInterval = setInterval(() => {
        remainingSeconds--;
        updateTimer();

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

function updateTimer() {
    ["timer", "timerDisplay", "testTimer"].some(id => {
        const el = $(id);

        if (el) {
            el.textContent = formatTime(remainingSeconds);

            if (remainingSeconds <= 300) {
                el.classList.add("timer-warning");
            } else {
                el.classList.remove("timer-warning");
            }

            return true;
        }

        return false;
    });
}

function calculateTimeUsed() {
    if (!testStartTime) return 0;

    const total =
        (Number(currentTest?.duration) || CONFIG.DEFAULT_DURATION) * 60;

    return Math.min(
        total,
        Math.max(0, Math.floor((Date.now() - testStartTime) / 1000))
    );
}

/* =========================================================
   PART RENDER
========================================================= */

function renderCurrentPart() {
    if (!currentTest) return;

    const part = currentTest.parts[currentPartIndex];
    if (!part) return;

    setText(
        "testHeaderTitle",
        currentTest.title ||
            `IELTS Reading Test ${currentTestNumber}`
    );

    setText(
        "testHeaderPart",
        `Part ${part.partNumber || currentPartIndex + 1}`
    );

    setText(
        "passagePartLabel",
        `Part ${part.partNumber || currentPartIndex + 1}`
    );

    setText(
        "passageTitle",
        part.passage.title || ""
    );

    setText(
        "questionsPartLabel",
        `Questions ${questionRange(part)}`
    );

    setText(
        "partIndicator",
        `Part ${currentPartIndex + 1} of ${currentTest.parts.length}`
    );

    renderPassage(part.passage);
    renderQuestions(part);
    renderQuestionNavigator();
    updatePartButtons();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function questionNumbers(part) {
    const nums = [];

    (part.questionGroups || []).forEach(group => {
        (group.questions || []).forEach(q => {
            if (Number.isFinite(Number(q.number))) {
                nums.push(Number(q.number));
            }
        });

        (group.blanks || []).forEach(q => {
            if (Number.isFinite(Number(q.number))) {
                nums.push(Number(q.number));
            }
        });
    });

    return [...new Set(nums)].sort((a, b) => a - b);
}

function questionRange(part) {
    const nums = questionNumbers(part);

    if (!nums.length) return "";

    return nums.length === 1
        ? nums[0]
        : `${Math.min(...nums)}-${Math.max(...nums)}`;
}

/* =========================================================
   PASSAGE
========================================================= */

function renderPassage(passage) {
    const box = $("passageContent");
    if (!box) return;

    box.innerHTML = (passage.paragraphs || [])
        .map(p => `
            <p class="passage-paragraph">
                ${
                    p.id
                        ? `<span class="paragraph-label">${escapeHTML(
                              p.id
                          )}</span>`
                        : ""
                }
                ${highlightVocabulary(p.text || "")}
            </p>
        `)
        .join("");

    box.querySelectorAll(".vocabulary-word").forEach(el => {
        el.onclick = e => {
            e.stopPropagation();
            showVocabularyPopup(el.dataset.word);
        };
    });
}

/* =========================================================
   VOCABULARY
========================================================= */

async function loadVocabulary() {
    try {
        const response = await fetch(
            `${CONFIG.VOCABULARY_FILE}?${Date.now()}`,
            { cache: "no-store" }
        );

        if (!response.ok) return;

        const data = await response.json();
        vocabulary = data.words || data || {};
    } catch {
        vocabulary = {};
    }
}

function highlightVocabulary(text) {
    let result = escapeHTML(text);

    const words = Object.keys(vocabulary || {}).sort(
        (a, b) => b.length - a.length
    );

    words.forEach(word => {
        const regex = new RegExp(
            `(?<![A-Za-z])(${escapeRegExp(word)})(?![A-Za-z])`,
            "gi"
        );

        result = result.replace(
            regex,
            match =>
                `<span class="vocabulary-word" data-word="${escapeAttr(
                    match
                )}">${match}</span>`
        );
    });

    return result;
}

function showVocabularyPopup(word) {
    const key = Object.keys(vocabulary || {}).find(
        x => x.toLowerCase() === String(word).toLowerCase()
    );

    if (!key) return;

    const item = vocabulary[key] || {};
    const popup = $("vocabularyPopup");

    if (!popup) return;

    setText("vocabularyWord", word);
    setText(
        "vocabularyMeaning",
        item.meaning || item.definition || "Meaning unavailable."
    );

    setText(
        "vocabularySimpleMeaning",
        item.simpleMeaning || item.example || ""
    );

    popup.style.display = "block";
}

function closeVocabularyPopup() {
    const popup = $("vocabularyPopup");
    if (popup) popup.style.display = "none";
}

/* =========================================================
   QUESTIONS
========================================================= */

function normalizeType(type) {
    return String(type || "")
        .toLowerCase()
        .trim()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_");
}

function renderQuestions(part) {
    const box = $("questionsContent");
    if (!box) return;

    box.innerHTML = "";

    (part.questionGroups || []).forEach(group => {
        const wrapper = document.createElement("div");
        wrapper.className = "question-group";

        if (group.questionRange) {
            wrapper.innerHTML += `
                <h3 class="question-group-title">
                    Questions ${escapeHTML(group.questionRange)}
                </h3>
            `;
        }

        if (group.instructions) {
            wrapper.innerHTML += `
                <p class="question-instructions">
                    ${escapeHTML(group.instructions)}
                </p>
            `;
        }

        const content = document.createElement("div");
        wrapper.appendChild(content);

        const type = normalizeType(group.type);

        if (type === "true_false_not_given") {
            renderChoiceQuestions(
                content,
                group,
                ["TRUE", "FALSE", "NOT GIVEN"]
            );
        } else if (type === "yes_no_not_given") {
            renderChoiceQuestions(
                content,
                group,
                ["YES", "NO", "NOT GIVEN"]
            );
        } else if (type === "fill_blank") {
            renderFillBlank(content, group);
        } else if (type === "summary_completion") {
            renderSummary(content, group);
        } else if (type === "multiple_choice") {
            renderMultipleChoice(content, group, false);
        } else if (type === "multiple_choice_multiple") {
            renderMultipleChoice(content, group, true);
        } else if (type === "matching_headings") {
            renderMatching(content, group, "heading");
        } else if (type === "matching_information") {
            renderMatching(content, group, "information");
        } else if (type === "matching_features") {
            renderMatching(content, group, "feature");
        } else if (type === "answer_box") {
            renderFillBlank(content, group);
        } else {
            renderGeneric(content, group);
        }

        box.appendChild(wrapper);
    });

    restoreAnswers();
}

/* =========================================================
   COMMON QUESTION
========================================================= */

function createQuestion(question) {
    const item = document.createElement("div");
    item.className = "question-item";
    item.dataset.questionNumber = question.number;

    const text =
        question.question ||
        question.text ||
        question.prompt ||
        "";

    item.innerHTML = `
        <div class="question-number">
            ${escapeHTML(question.number)}
        </div>
        <div class="question-body">
            <div class="question-text">
                ${escapeHTML(text)}
            </div>
            <div class="question-control"></div>
        </div>
    `;

    return item;
}

/* =========================================================
   TRUE/FALSE / YES/NO
========================================================= */

function renderChoiceQuestions(box, group, choices) {
    (group.questions || []).forEach(question => {
        const item = createQuestion(question);
        const control = item.querySelector(".question-control");

        control.innerHTML = choices
            .map(
                choice => `
                <label class="choice-option">
                    <input
                        type="radio"
                        name="q_${question.number}"
                        value="${escapeAttr(choice)}"
                        data-question-number="${question.number}"
                    >
                    <span>${escapeHTML(choice)}</span>
                </label>
            `
            )
            .join("");

        box.appendChild(item);
    });
}

/* =========================================================
   FILL BLANK
========================================================= */

function renderFillBlank(box, group) {
    (group.questions || []).forEach(question => {
        const item = createQuestion(question);
        const control = item.querySelector(".question-control");

        control.innerHTML = `
            <input
                class="answer-input"
                type="text"
                data-question-number="${question.number}"
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

function renderGeneric(box, group) {
    (group.questions || []).forEach(question => {
        const item = createQuestion(question);
        const control = item.querySelector(".question-control");

        const options =
            question.options ||
            question.choices ||
            group.options ||
            [];

        if (options.length) {
            control.innerHTML = options
                .map(
                    option => `
                    <label class="choice-option">
                        <input
                            type="radio"
                            name="q_${question.number}"
                            value="${escapeAttr(option)}"
                            data-question-number="${question.number}"
                        >
                        <span>${escapeHTML(option)}</span>
                    </label>
                `
                )
                .join("");
        } else {
            control.innerHTML = `
                <input
                    class="answer-input"
                    type="text"
                    data-question-number="${question.number}"
                >
            `;
        }

        box.appendChild(item);
    });
}

/* =========================================================
   MULTIPLE CHOICE
========================================================= */

function renderMultipleChoice(box, group, multiple) {
    (group.questions || []).forEach(question => {
        const item = createQuestion(question);
        const control = item.querySelector(".question-control");

        const options =
            question.options ||
            question.choices ||
            group.options ||
            [];

        control.innerHTML = options
            .map(
                (option, index) => `
                <label class="choice-option">
                    <input
                        type="${multiple ? "checkbox" : "radio"}"
                        name="q_${question.number}${
                            multiple ? `_${index}` : ""
                        }"
                        value="${escapeAttr(option)}"
                        data-question-number="${question.number}"
                    >
                    <span>
                        ${String.fromCharCode(65 + index)}.
                        ${escapeHTML(option)}
                    </span>
                </label>
            `
            )
            .join("");

        box.appendChild(item);
    });
}

/* =========================================================
   SUMMARY COMPLETION
========================================================= */

function renderSummary(box, group) {
    const blanks =
        group.blanks?.length
            ? group.blanks
            : group.questions || [];

    const options =
        group.options ||
        group.choices ||
        group.words ||
        group.wordBank ||
        getAnswersAsOptions(blanks);

    const wrapper = document.createElement("div");
    wrapper.className = "summary-completion";

    if (group.summary) {
        const summary = document.createElement("div");
        summary.className = "summary-text";

        let html = escapeHTML(group.summary);

        blanks.forEach(blank => {
            const token =
                `{{${blank.number}}}` ||
                `[${blank.number}]`;

            html = html.replace(
                new RegExp(
                    escapeRegExp(`{{${blank.number}}}`),
                    "g"
                ),
                `
                <span
                    class="drop-answer"
                    data-question-number="${blank.number}"
                    tabindex="0"
                >
                    ${getSavedDisplay(blank.number)}
                </span>
                `
            );
        });

        summary.innerHTML = html;
        wrapper.appendChild(summary);
    }

    const wordBank = document.createElement("div");
    wordBank.className = "word-bank";

    wordBank.innerHTML = options
        .map(
            option => `
            <button
                type="button"
                class="drag-option"
                draggable="true"
                data-option="${escapeAttr(option)}"
            >
                ${escapeHTML(option)}
            </button>
        `
        )
        .join("");

    wrapper.appendChild(wordBank);

    const fallback = document.createElement("div");
    fallback.className = "summary-inputs";

    blanks.forEach(blank => {
        const item = document.createElement("div");
        item.className = "summary-blank";

        item.innerHTML = `
            <label>
                ${blank.number}.
                <input
                    type="text"
                    class="answer-input"
                    data-question-number="${blank.number}"
                    autocomplete="off"
                >
            </label>
        `;

        fallback.appendChild(item);
    });

    wrapper.appendChild(fallback);
    box.appendChild(wrapper);

    setupDragOptions(wrapper);
}

function getAnswersAsOptions(blanks) {
    const values = [];

    blanks.forEach(blank => {
        const a =
            blank.answer ??
            blank.correctAnswer ??
            blank.correct;

        if (Array.isArray(a)) {
            a.forEach(x => values.push(x));
        } else if (a) {
            values.push(a);
        }
    });

    return [...new Set(values)];
}

function getSavedDisplay(number) {
    return escapeHTML(studentAnswers[number] || "Drop answer");
}

function setupDragOptions(container) {
    container.querySelectorAll(".drag-option").forEach(option => {
        option.addEventListener("dragstart", () => {
            selectedDragOption = option.dataset.option;
        });

        option.addEventListener("click", () => {
            selectedDragOption = option.dataset.option;

            container
                .querySelectorAll(".drag-option")
                .forEach(x => x.classList.remove("selected"));

            option.classList.add("selected");
        });
    });

    container.querySelectorAll(".drop-answer").forEach(drop => {
        drop.addEventListener("dragover", e => e.preventDefault());

        drop.addEventListener("drop", e => {
            e.preventDefault();

            if (selectedDragOption) {
                setAnswer(
                    drop.dataset.questionNumber,
                    selectedDragOption
                );
                drop.textContent = selectedDragOption;
                drop.classList.add("filled");
            }
        });

        drop.addEventListener("click", () => {
            if (selectedDragOption) {
                setAnswer(
                    drop.dataset.questionNumber,
                    selectedDragOption
                );
                drop.textContent = selectedDragOption;
                drop.classList.add("filled");
            }
        });
    });
}

/* =========================================================
   MATCHING
========================================================= */

function renderMatching(box, group) {
    const questions = group.questions || [];
    const options =
        group.options ||
        group.choices ||
        group.headings ||
        group.features ||
        [];

    const wrapper = document.createElement("div");
    wrapper.className = "matching-container";

    questions.forEach(question => {
        const item = createQuestion(question);
        const control = item.querySelector(".question-control");

        control.innerHTML = `
            <select
                class="answer-select"
                data-question-number="${question.number}"
            >
                <option value="">Select answer</option>
                ${options
                    .map(
                        option =>
                            `<option value="${escapeAttr(
                                option
                            )}">${escapeHTML(option)}</option>`
                    )
                    .join("")}
            </select>
        `;

        wrapper.appendChild(item);
    });

    box.appendChild(wrapper);
}

/* =========================================================
   ANSWERS
========================================================= */

function setAnswer(number, value) {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        delete studentAnswers[number];
    } else {
        studentAnswers[number] = value;
    }

    saveAnswers();
    updateNavigator();
}

function saveAnswerFromElement(element) {
    const number = element.dataset.questionNumber;
    if (!number) return;

    let value = "";

    if (
        element.type === "radio" ||
        element.type === "checkbox"
    ) {
        const group = document.querySelectorAll(
            `[data-question-number="${CSS.escape(number)}"]`
        );

        if (element.type === "radio") {
            const checked = [...group].find(x => x.checked);
            value = checked ? checked.value : "";
        } else {
            value = [...group]
                .filter(x => x.checked)
                .map(x => x.value);
        }
    } else {
        value = element.value;
    }

    setAnswer(number, value);
}

function saveAllVisibleAnswers() {
    document
        .querySelectorAll("[data-question-number]")
        .forEach(el => {
            if (
                el.matches(
                    "input,select,textarea"
                )
            ) {
                saveAnswerFromElement(el);
            }
        });
}

function restoreAnswers() {
    document
        .querySelectorAll("[data-question-number]")
        .forEach(el => {
            const number = el.dataset.questionNumber;
            const value = studentAnswers[number];

            if (
                value === undefined ||
                value === null
            ) {
                return;
            }

            if (el.type === "radio") {
                el.checked =
                    normalize(el.value) ===
                    normalize(value);
            } else if (el.type === "checkbox") {
                el.checked =
                    Array.isArray(value) &&
                    value.some(
                        x =>
                            normalize(x) ===
                            normalize(el.value)
                    );
            } else {
                el.value = Array.isArray(value)
                    ? value.join(", ")
                    : value;
            }
        });
}

function saveAnswers() {
    if (!currentTestNumber) return;

    localStorage.setItem(
        `ieltsReadingAnswers_${currentTestNumber}`,
        JSON.stringify(studentAnswers)
    );
}

function loadSavedAnswers() {
    if (!currentTestNumber) return;

    try {
        const saved = localStorage.getItem(
            `ieltsReadingAnswers_${currentTestNumber}`
        );

        studentAnswers = saved
            ? JSON.parse(saved)
            : {};
    } catch {
        studentAnswers = {};
    }
}

function clearCurrentTestAnswers() {
    if (currentTestNumber) {
        localStorage.removeItem(
            `ieltsReadingAnswers_${currentTestNumber}`
        );
    }

    studentAnswers = {};
}

/* =========================================================
   NAVIGATOR
========================================================= */

function renderQuestionNavigator() {
    const box =
        $("questionNavigator") ||
        $("questionNav") ||
        $("questionNumbers");

    if (!box || !currentTest) return;

    const part = currentTest.parts[currentPartIndex];

    box.innerHTML = questionNumbers(part)
        .map(number => {
            const answered =
                isAnswered(studentAnswers[number]);

            return `
                <button
                    type="button"
                    class="question-nav-number ${
                        answered ? "answered" : ""
                    }"
                    data-nav-question="${number}"
                >
                    ${number}
                </button>
            `;
        })
        .join("");

    box.querySelectorAll("[data-nav-question]").forEach(btn => {
        btn.onclick = () => {
            const el = document.querySelector(
                `[data-question-number="${CSS.escape(
                    btn.dataset.navQuestion
                )}"]`
            );

            if (el) {
                el.closest(".question-item, .summary-blank, .summary-completion")
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
            }
        };
    });
}

function updateNavigator() {
    const box =
        $("questionNavigator") ||
        $("questionNav") ||
        $("questionNumbers");

    if (!box) return;

    box.querySelectorAll("[data-nav-question]").forEach(btn => {
        btn.classList.toggle(
            "answered",
            isAnswered(
                studentAnswers[btn.dataset.navQuestion]
            )
        );
    });
}

function isAnswered(value) {
    if (Array.isArray(value)) return value.length > 0;
    return String(value ?? "").trim() !== "";
}

/* =========================================================
   PART NAVIGATION
========================================================= */

function updatePartButtons() {
    const prev = $("previousPartButton");
    const next = $("nextPartButton");

    if (prev) {
        prev.disabled = currentPartIndex === 0;
    }

    if (next) {
        next.textContent =
            currentPartIndex === currentTest.parts.length - 1
                ? "Finish Test"
                : "Next Part";
    }
}

function previousPart() {
    saveAllVisibleAnswers();

    if (currentPartIndex > 0) {
        currentPartIndex--;
        renderCurrentPart();
    }
}

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
   EXIT / SUBMIT
========================================================= */

function confirmExitTest() {
    if (!testStarted || testSubmitted) {
        showDashboard();
        return;
    }

    const ok = confirm(
        "Are you sure you want to leave this test?\n\nYour current answers will remain saved locally."
    );

    if (ok) {
        stopTimer();
        showDashboard();
    }
}

function confirmSubmitTest() {
    if (testSubmitted) return;

    saveAllVisibleAnswers();

    const unanswered =
        countTotalQuestions() -
        countAnsweredAnswers(studentAnswers);

    const message =
        unanswered > 0
            ? `You still have ${unanswered} unanswered question(s).\n\nAre you sure you want to submit?`
            : "Are you sure you want to submit your test?";

    const modal = $("confirmModal");

    if (modal) {
        const text =
            modal.querySelector(".confirm-message") ||
            modal.querySelector("[data-confirm-message]");

        if (text) text.textContent = message;

        modal.style.display = "flex";
    } else {
        if (confirm(message)) submitTest();
    }
}

function closeConfirmModal() {
    const modal = $("confirmModal");
    if (modal) modal.style.display = "none";
}

function autoSubmitTest() {
    saveAllVisibleAnswers();
    submitTest();
}

/* =========================================================
   SCORE
========================================================= */

async function submitTest() {
    if (testSubmitted) return;

    saveAllVisibleAnswers();
    closeConfirmModal();
    stopTimer();

    testElapsedSeconds = calculateTimeUsed();
    testSubmitted = true;

    submittedAnswers = JSON.parse(
        JSON.stringify(studentAnswers)
    );

    scoreData = calculateScore(submittedAnswers);

    clearCurrentTestAnswers();
    renderResult();
}

function countTotalQuestions() {
    if (!currentTest) return 0;

    let total = 0;

    currentTest.parts.forEach(part => {
        (part.questionGroups || []).forEach(group => {
            total += (group.questions || []).length;
            total += (group.blanks || []).length;
        });
    });

    return total;
}

function allQuestions() {
    const result = [];

    if (!currentTest) return result;

    currentTest.parts.forEach((part, partIndex) => {
        (part.questionGroups || []).forEach(group => {
            const questions = [
                ...(group.questions || []),
                ...(group.blanks || [])
            ];

            questions.forEach(q => {
                result.push({
                    ...q,
                    partIndex,
                    group
                });
            });
        });
    });

    return result;
}

function getCorrectAnswer(question) {
    return (
        question.answer ??
        question.correctAnswer ??
        question.correct ??
        question.answers ??
        question.expectedAnswer ??
        question.solution
    );
}

function answersMatch(user, correct) {
    if (
        user === undefined ||
        user === null ||
        String(user).trim() === ""
    ) {
        return false;
    }

    if (
        correct === undefined ||
        correct === null
    ) {
        return false;
    }

    if (Array.isArray(correct)) {
        const u = Array.isArray(user)
            ? user
            : String(user)
                  .split(",")
                  .map(x => x.trim());

        return (
            u.length === correct.length &&
            u.every(x =>
                correct.some(
                    y => normalize(x) === normalize(y)
                )
            )
        );
    }

    return normalize(user) === normalize(correct);
}

function calculateScore(answerSet = studentAnswers) {
    let total = 0;
    let correct = 0;

    const partScores = [];
    const partTotals = [];

    currentTest.parts.forEach((part, partIndex) => {
        let pTotal = 0;
        let pScore = 0;

        (part.questionGroups || []).forEach(group => {
            const questions = [
                ...(group.questions || []),
                ...(group.blanks || [])
            ];

            questions.forEach(question => {
                pTotal++;
                total++;

                const user =
                    answerSet[question.number];

                const answer =
                    getCorrectAnswer(question);

                if (answersMatch(user, answer)) {
                    pScore++;
                    correct++;
                }
            });
        });

        partScores[partIndex] = pScore;
        partTotals[partIndex] = pTotal;
    });

    return {
        totalScore: correct,
        totalQuestions: total,
        partScores,
        partTotals,
        band: calculateIELTSBand(correct),
        timeUsed: formatTime(testElapsedSeconds)
    };
}

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
    if (score >= 1) return 1.0;
    return 0;
}

function countAnsweredAnswers(answers) {
    return allQuestions().filter(q =>
        isAnswered(answers[q.number])
    ).length;
}

/* =========================================================
   RESULT PAGE
========================================================= */

function renderResult() {
    showScreen("resultScreen");

    const score = scoreData.totalScore;
    const total = scoreData.totalQuestions;
    const answered = countAnsweredAnswers(submittedAnswers);
    const incorrect = answered - score;
    const unanswered = total - answered;
    const accuracy = answered
        ? Math.round((score / answered) * 100)
        : 0;

    const title =
        currentTest.title ||
        `IELTS Reading Test ${currentTestNumber}`;

    const screen = $("resultScreen");

    if (!screen) return;

    screen.innerHTML = `
        <div class="reading-result-report">

            <div class="results-heading">
                <div class="results-kicker">TEST COMPLETE</div>

                <h1>Your Reading Result</h1>

                <p>
                    ${escapeHTML(title)}
                </p>

                <button
                    class="print-score-button"
                    id="printResultButton"
                    type="button"
                >
                    Print / Save PDF
                </button>
            </div>

            <div class="result-hero">

                <div class="score-ring">
                    <div class="score-ring-inner">
                        <strong>${score}</strong>
                        <span>/ ${total}</span>
                    </div>
                </div>

                <div class="hero-copy">

                    <div class="status-pill">
                        Completed
                    </div>

                    <h2>
                        Estimated IELTS Band
                        ${Number(scoreData.band).toFixed(1)}
                    </h2>

                    <p>
                        You answered ${answered} of ${total}
                        questions.
                    </p>

                    <p>
                        Time used:
                        <strong>${scoreData.timeUsed}</strong>
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

                <h2>Part-by-Part Score</h2>

                <div class="part-score-grid">
                    ${renderPartScoreHTML()}
                </div>

            </section>

            <section class="result-section">

                <div class="review-header">
                    <div>
                        <h2>Question Review</h2>
                        <p>
                            Review your answers and see the correct answers.
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

    $("printResultButton").onclick = printScorePDF;
}

function renderPartScoreHTML() {
    return currentTest.parts
        .map((part, index) => {
            const score =
                scoreData.partScores[index] || 0;

            const total =
                scoreData.partTotals[index] || 0;

            const percent = total
                ? Math.round((score / total) * 100)
                : 0;

            return `
                <div class="part-score-card">

                    <div class="part-score-top">
                        <strong>
                            Part ${index + 1}
                        </strong>

                        <span>
                            ${score} / ${total}
                        </span>
                    </div>

                    <div class="mini-progress">
                        <span style="width:${percent}%"></span>
                    </div>

                    <small>
                        ${percent}% correct
                    </small>

                </div>
            `;
        })
        .join("");
}

/* =========================================================
   REVIEW
========================================================= */

function renderReviewHTML() {
    return allQuestions()
        .map(question => {
            const number = question.number;
            const user = submittedAnswers[number];
            const correct = getCorrectAnswer(question);
            const answered = isAnswered(user);
            const isCorrect =
                answered &&
                answersMatch(user, correct);

            let status = "unanswered";

            if (isCorrect) status = "correct";
            else if (answered) status = "incorrect";

            return `
                <div class="review-item ${status}">

                    <div class="review-item-top">

                        <span class="review-number">
                            Q${escapeHTML(number)}
                        </span>

                        <span class="review-status">
                            ${
                                status === "correct"
                                    ? "Correct"
                                    : status === "incorrect"
                                    ? "Incorrect"
                                    : "Unanswered"
                            }
                        </span>

                    </div>

                    <div class="review-question">
                        ${escapeHTML(
                            question.question ||
                            question.text ||
                            question.prompt ||
                            ""
                        )}
                    </div>

                    <div class="review-answer">

                        <div>
                            <small>Your answer</small>

                            <strong>
                                ${
                                    answered
                                        ? escapeHTML(
                                              formatAnswer(user)
                                          )
                                        : "No answer"
                                }
                            </strong>
                        </div>

                        <div>
                            <small>Correct answer</small>

                            <strong>
                                ${escapeHTML(
                                    formatAnswer(correct)
                                )}
                            </strong>
                        </div>

                    </div>

                </div>
            `;
        })
        .join("");
}

function formatAnswer(value) {
    if (Array.isArray(value)) {
        return value.join(", ");
    }

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return "—";
    }

    return String(value);
}

/* =========================================================
   START AGAIN
========================================================= */

function startAgainFromResult() {
    if (!currentTest) return;

    studentAnswers = {};
    submittedAnswers = {};
    scoreData = null;
    testSubmitted = false;
    currentPartIndex = 0;

    startTest();
}

/* =========================================================
   PRINT / SAVE PDF
========================================================= */

function printScorePDF() {
    if (!scoreData || !currentTest) {
        alert(
            "Please submit the test before printing the score report."
        );
        return;
    }

    const score = scoreData.totalScore;
    const total = scoreData.totalQuestions;

    const answered =
        countAnsweredAnswers(submittedAnswers);

    const incorrect =
        Math.max(0, answered - score);

    const unanswered =
        Math.max(0, total - answered);

    const accuracy =
        answered
            ? Math.round((score / answered) * 100)
            : 0;

    const title =
        currentTest.title ||
        `IELTS Reading Test ${currentTestNumber}`;

    const parts = currentTest.parts
        .map((part, index) => {
            const s =
                scoreData.partScores[index] || 0;

            const t =
                scoreData.partTotals[index] || 0;

            const percent =
                t
                    ? Math.round((s / t) * 100)
                    : 0;

            return `
                <div class="part-card">
                    <div>
                        <strong>Part ${index + 1}</strong>
                        <span>${s} / ${t}</span>
                    </div>

                    <div class="bar">
                        <span style="width:${percent}%"></span>
                    </div>

                    <small>${percent}% correct</small>
                </div>
            `;
        })
        .join("");

    const reviews = allQuestions()
        .map(question => {
            const number = question.number;
            const user = submittedAnswers[number];
            const correct = getCorrectAnswer(question);

            const answeredQuestion =
                isAnswered(user);

            const isCorrect =
                answeredQuestion &&
                answersMatch(user, correct);

            const status =
                isCorrect
                    ? "Correct"
                    : answeredQuestion
                    ? "Incorrect"
                    : "Unanswered";

            return `
                <div class="review ${status.toLowerCase()}">

                    <div class="review-title">
                        Q${escapeHTML(number)}
                        <span>${status}</span>
                    </div>

                    <p>
                        ${escapeHTML(
                            question.question ||
                            question.text ||
                            question.prompt ||
                            ""
                        )}
                    </p>

                    <div class="answers">

                        <div>
                            <b>Your answer</b>
                            <span>
                                ${
                                    answeredQuestion
                                        ? escapeHTML(
                                              formatAnswer(user)
                                          )
                                        : "No answer"
                                }
                            </span>
                        </div>

                        <div>
                            <b>Correct answer</b>
                            <span>
                                ${escapeHTML(
                                    formatAnswer(correct)
                                )}
                            </span>
                        </div>

                    </div>

                </div>
            `;
        })
        .join("");

    const printWindow = window.open(
        "",
        "_blank",
        "width=1000,height=900"
    );

    if (!printWindow) {
        alert(
            "The print window was blocked by your browser. Please allow pop-ups and try again."
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
IELTS Reading Result - ${escapeHTML(title)}
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
    margin: 0;
    font-family:
        Arial,
        Helvetica,
        sans-serif;
    color: #222;
    background: #fff;
    line-height: 1.5;
}

.report {
    width: 100%;
    max-width: 900px;
    margin: auto;
}

.header {
    text-align: center;
    border-bottom: 2px solid #383838;
    padding-bottom: 20px;
    margin-bottom: 25px;
}

.kicker {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #777;
}

h1 {
    margin: 6px 0;
    font-size: 30px;
}

.subtitle {
    color: #666;
    margin: 0;
}

.hero {
    display: flex;
    align-items: center;
    gap: 30px;
    border: 1px solid #ddd;
    border-radius: 15px;
    padding: 25px;
    margin-bottom: 20px;
}

.score {
    width: 125px;
    height: 125px;
    min-width: 125px;
    border-radius: 50%;
    border: 10px solid #383838;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}

.score strong {
    font-size: 34px;
    line-height: 1;
}

.score span {
    color: #777;
    font-size: 13px;
}

.hero h2 {
    margin: 8px 0;
    font-size: 22px;
}

.hero p {
    margin: 4px 0;
    color: #555;
}

.band {
    display: inline-block;
    background: #383838;
    color: white;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
}

.stats {
    display: grid;
    grid-template-columns:
        repeat(4, 1fr);
    border: 1px solid #ddd;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 28px;
}

.stat {
    text-align: center;
    padding: 18px 8px;
    border-right: 1px solid #ddd;
}

.stat:last-child {
    border-right: 0;
}

.stat strong {
    display: block;
    font-size: 23px;
}

.stat span {
    font-size: 12px;
    color: #777;
}

.section {
    margin-top: 30px;
}

.section h2 {
    font-size: 20px;
    margin-bottom: 15px;
}

.parts {
    display: grid;
    grid-template-columns:
        repeat(3, 1fr);
    gap: 12px;
}

.part-card {
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 14px;
}

.part-card > div:first-child {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
}

.part-card small {
    color: #777;
}

.bar {
    height: 8px;
    background: #eee;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 6px;
}

.bar span {
    display: block;
    height: 100%;
    background: #383838;
}

.review {
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 15px;
    margin-bottom: 12px;
    page-break-inside: avoid;
}

.review-title {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
    margin-bottom: 8px;
}

.review.correct {
    border-left: 5px solid #388e3c;
}

.review.incorrect {
    border-left: 5px solid #d32f2f;
}

.review.unanswered {
    border-left: 5px solid #777;
}

.review-title span {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 15px;
    background: #eee;
}

.review p {
    margin: 7px 0 12px;
}

.answers {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.answers div {
    background: #f7f7f7;
    padding: 10px;
    border-radius: 7px;
}

.answers b,
.answers span {
    display: block;
}

.answers b {
    font-size: 10px;
    text-transform: uppercase;
    color: #777;
    margin-bottom: 4px;
}

.answers span {
    font-weight: 600;
}

.footer {
    margin-top: 30px;
    padding-top: 15px;
    border-top: 1px solid #ddd;
    text-align: center;
    color: #777;
    font-size: 11px;
}

@media print {

    body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .review {
        page-break-inside: avoid;
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
            ${escapeHTML(title)}
        </h1>

        <p class="subtitle">
            Reading Test Result Report
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

            <span class="band">
                Estimated Band
                ${Number(scoreData.band).toFixed(1)}
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
        • Local Result Report
    </div>

</div>

<script>

window.addEventListener("load", function () {

    setTimeout(function () {

        window.focus();

        window.print();

    }, 500);

});

</script>

</body>
</html>
    `);

    printWindow.document.close();

    /*
     * IMPORTANT:
     * Do not depend only on window.onload.
     * This timeout makes the print button much more
     * reliable in Firefox and Chrome.
     */
    setTimeout(() => {
        try {
            printWindow.focus();
            printWindow.print();
        } catch (error) {
            console.error(
                "Print error:",
                error
            );
        }
    }, 1000);
}

/* =========================================================
   GENERIC QUESTION COUNT / PUBLIC API
========================================================= */

function getAllQuestionNumbers() {
    return allQuestions()
        .map(q => Number(q.number))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
}

window.IELTSReading = {
    openTest,
    startTest,
    submitTest,
    calculateScore,
    calculateIELTSBand,
    showDashboard,
    printScorePDF,

    getCurrentTest: () => currentTest,

    getAnswers: () => studentAnswers,

    getSubmittedAnswers: () => submittedAnswers,

    getQuestionNumbers: getAllQuestionNumbers
};

/* =========================================================
   RESULT / DRAG / GENERAL CSS
========================================================= */

function injectStyles() {
    if ($("ieltsReadingInjectedStyles")) return;

    const style = document.createElement("style");
    style.id = "ieltsReadingInjectedStyles";

    style.textContent = `

/* RESULT PAGE */

.reading-result-report {
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
    font-size: 32px;
}

.results-heading p {
    color: #777;
}

.print-score-button,
.primary-btn,
.secondary-btn {
    border: 0;
    border-radius: 9px;
    padding: 11px 18px;
    cursor: pointer;
    font-weight: 600;
}

.print-score-button,
.primary-btn {
    background: #383838;
    color: white;
}

.secondary-btn {
    background: #eee;
    color: #333;
}

.result-hero {
    display: flex;
    align-items: center;
    gap: 30px;
    padding: 30px;
    border: 1px solid #ddd;
    border-radius: 18px;
    margin-bottom: 20px;
}

.score-ring {
    width: 150px;
    height: 150px;
    min-width: 150px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #383838;
}

.score-ring-inner {
    width: 126px;
    height: 126px;
    border-radius: 50%;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}

.score-ring-inner strong {
    font-size: 38px;
    line-height: 1;
}

.score-ring-inner span {
    color: #777;
}

.status-pill {
    display: inline-block;
    padding: 5px 12px;
    border-radius: 20px;
    background: #383838;
    color: white;
    font-size: 12px;
    font-weight: 600;
}

.hero-copy h2 {
    margin: 10px 0;
}

.hero-copy p {
    margin: 5px 0;
    color: #666;
}

.result-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border: 1px solid #ddd;
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 35px;
}

.summary-stat {
    text-align: center;
    padding: 20px 10px;
    border-right: 1px solid #ddd;
}

.summary-stat:last-child {
    border-right: 0;
}

.summary-stat strong {
    display: block;
    font-size: 25px;
}

.summary-stat span {
    font-size: 12px;
    color: #777;
}

.result-section {
    margin-top: 35px;
}

.result-section h2 {
    margin-bottom: 8px;
}

.part-score-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
}

.part-score-card {
    border: 1px solid #ddd;
    border-radius: 12px;
    padding: 16px;
}

.part-score-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
}

.mini-progress {
    width: 100%;
    height: 8px;
    background: #eee;
    border-radius: 20px;
    overflow: hidden;
}

.mini-progress span {
    display: block;
    height: 100%;
    background: #383838;
}

.part-score-card small {
    display: block;
    margin-top: 7px;
    color: #777;
}

.review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    margin-bottom: 15px;
}

.review-header p {
    color: #777;
}

.legend {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 12px;
}

.legend span {
    display: flex;
    align-items: center;
    gap: 5px;
}

.legend-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    display: inline-block;
}

.legend-dot.correct {
    background: #388e3c;
}

.legend-dot.incorrect {
    background: #d32f2f;
}

.legend-dot.unanswered {
    background: #777;
}

.review-grid {
    display: grid;
    gap: 12px;
}

.review-item {
    border: 1px solid #ddd;
    border-left: 5px solid #777;
    border-radius: 10px;
    padding: 15px;
}

.review-item.correct {
    border-left-color: #388e3c;
}

.review-item.incorrect {
    border-left-color: #d32f2f;
}

.review-item.unanswered {
    border-left-color: #777;
}

.review-item-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.review-number {
    font-weight: 700;
}

.review-status {
    font-size: 11px;
    padding: 4px 9px;
    border-radius: 15px;
    background: #eee;
}

.review-question {
    margin-bottom: 12px;
}

.review-answer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.review-answer div {
    background: #f7f7f7;
    padding: 10px;
    border-radius: 8px;
}

.review-answer small,
.review-answer strong {
    display: block;
}

.review-answer small {
    color: #777;
    font-size: 10px;
    text-transform: uppercase;
    margin-bottom: 4px;
}

.results-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 35px;
}

/* QUESTION UI */

.question-item {
    display: flex;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #eee;
}

.question-number {
    font-weight: 700;
    min-width: 30px;
}

.question-body {
    flex: 1;
}

.question-text {
    margin-bottom: 10px;
}

.choice-option {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 7px 0;
    cursor: pointer;
}

.answer-input,
.answer-select {
    width: 100%;
    max-width: 450px;
    padding: 10px 12px;
    border: 1px solid #ccc;
    border-radius: 7px;
    background: white;
}

.word-bank {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 15px 0;
}

.drag-option {
    padding: 8px 12px;
    border: 1px solid #bbb;
    background: white;
    border-radius: 7px;
    cursor: grab;
}

.drag-option.selected {
    background: #383838;
    color: white;
}

.summary-blank {
    margin: 8px 0;
}

.drop-answer {
    display: inline-block;
    min-width: 110px;
    border-bottom: 2px solid #383838;
    padding: 3px 8px;
    cursor: pointer;
}

.vocabulary-word {
    cursor: pointer;
    border-bottom: 1px dotted currentColor;
}

.timer-warning {
    color: #d32f2f !important;
    font-weight: 700;
}

@media (max-width: 700px) {

    .result-hero {
        flex-direction: column;
        text-align: center;
    }

    .result-summary {
        grid-template-columns: repeat(2, 1fr);
    }

    .summary-stat:nth-child(2) {
        border-right: 0;
    }

    .part-score-grid {
        grid-template-columns: 1fr;
    }

    .review-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .review-answer {
        grid-template-columns: 1fr;
    }

    .results-actions {
        flex-direction: column;
    }

    .results-actions button {
        width: 100%;
    }

}

@media print {

    .print-score-button,
    .results-actions {
        display: none !important;
    }

    .reading-result-report {
        padding: 0;
    }

}

`;

    document.head.appendChild(style);
}

/* =========================================================
   FALLBACK FOR TESTS WITH ONLY TEXT
========================================================= */

function renderQuestionText(text) {
    return escapeHTML(text || "");
}

/* =========================================================
   SAFE CSS.escape FALLBACK
========================================================= */

if (!window.CSS) {
    window.CSS = {};
}

if (!window.CSS.escape) {
    window.CSS.escape = value =>
        String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
