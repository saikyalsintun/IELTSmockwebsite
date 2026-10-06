/* ============================================================
   IELTS READING TEST APPLICATION
   ============================================================ */

/* ============================================================
   GLOBAL STATE
   ============================================================ */

let currentTest = null;
let currentTestIndex = 0;
let currentPartIndex = 0;
let currentQuestionIndex = 0;

let studentAnswers = {};
let testStartTime = null;
let testEndTime = null;
let timerInterval = null;

let currentUser = {
    username: getAnonymousUsername(),
    studentId: getAnonymousStudentId()
};

let vocabularyData = {};

/* ============================================================
   ANONYMOUS USER
   ============================================================ */

function getAnonymousStudentId() {
    let id = localStorage.getItem("ieltsAnonymousStudentId");

    if (!id) {
        id =
            "STU-" +
            Date.now().toString(36).toUpperCase() +
            "-" +
            Math.random().toString(36).substring(2, 7).toUpperCase();

        localStorage.setItem("ieltsAnonymousStudentId", id);
    }

    return id;
}

function getAnonymousUsername() {
    let username = localStorage.getItem("ieltsAnonymousUsername");

    if (!username) {
        username = "Student";
        localStorage.setItem("ieltsAnonymousUsername", username);
    }

    return username;
}

/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    injectScoreReportStyles();
    setupGlobalEvents();

    try {
        await loadVocabulary();

        await showDashboard();
    } catch (error) {
        console.error("Application initialization error:", error);

        const loadingScreen = document.getElementById("loadingScreen");

        if (loadingScreen) {
            loadingScreen.style.display = "none";
        }

        const dashboard = document.getElementById("dashboard");

        if (dashboard) {
            dashboard.style.display = "block";
        }
    }
});

/* ============================================================
   GLOBAL EVENTS
   ============================================================ */

function setupGlobalEvents() {
    const printButton = document.getElementById("printScoreReportButton");

    if (printButton) {
        printButton.addEventListener("click", printScoreReport);
    }

    const backDashboardButton =
        document.getElementById("backDashboardButton");

    if (backDashboardButton) {
        backDashboardButton.addEventListener("click", async () => {
            await showDashboard();
        });
    }

    const retakeButton =
        document.getElementById("retakeTestButton");

    if (retakeButton) {
        retakeButton.addEventListener("click", () => {
            if (currentTest) {
                startTest(currentTest);
            }
        });
    }
}

/* ============================================================
   VOCABULARY
   ============================================================ */

async function loadVocabulary() {
    try {
        const response = await fetch("vocabulary.json");

        if (!response.ok) {
            console.warn("Vocabulary file not found.");
            return;
        }

        vocabularyData = await response.json();

    } catch (error) {
        console.warn("Could not load vocabulary:", error);
    }
}

/* ============================================================
   DASHBOARD
   ============================================================ */

async function showDashboard() {
    stopTimer();

    const loginScreen = document.getElementById("loginScreen");

    if (loginScreen) {
        loginScreen.style.display = "none";
    }

    const testScreen = document.getElementById("testScreen");

    if (testScreen) {
        testScreen.style.display = "none";
    }

    const resultScreen = document.getElementById("resultScreen");

    if (resultScreen) {
        resultScreen.style.display = "none";
    }

    const dashboard = document.getElementById("dashboard");

    if (dashboard) {
        dashboard.style.display = "block";
    }

    const loadingScreen = document.getElementById("loadingScreen");

    if (loadingScreen) {
        loadingScreen.style.display = "none";
    }

    await loadHistory();

    initializeDashboardEvents();
}

/* ============================================================
   DASHBOARD EVENTS
   ============================================================ */

function initializeDashboardEvents() {
    const testCards =
        document.querySelectorAll("[data-test-index]");

    testCards.forEach(card => {
        if (card.dataset.listenerAttached === "true") {
            return;
        }

        card.dataset.listenerAttached = "true";

        card.addEventListener("click", async () => {
            const index =
                parseInt(card.dataset.testIndex, 10);

            if (!Number.isNaN(index)) {
                await openTestByIndex(index);
            }
        });
    });
}

/* ============================================================
   TEST LOADING
   ============================================================ */

async function openTestByIndex(index) {
    currentTestIndex = index;

    try {
        const tests = await loadAvailableTests();

        if (!tests || !tests[index]) {
            console.error("Test not found:", index);
            return;
        }

        await startTest(tests[index]);

    } catch (error) {
        console.error("Unable to open test:", error);
        alert("Unable to load this test.");
    }
}

async function loadAvailableTests() {
    const tests = [];

    /*
     * Keep your existing test-loading logic here.
     * The application will also try common test file names.
     */

    const possibleFiles = [
        "test.json",
        "reading.json",
        "questions.json",
        "data.json",
        "tests.json"
    ];

    for (const file of possibleFiles) {
        try {
            const response = await fetch(file);

            if (!response.ok) {
                continue;
            }

            const data = await response.json();

            if (Array.isArray(data)) {
                return data;
            }

            if (Array.isArray(data.tests)) {
                return data.tests;
            }

            if (data.parts) {
                tests.push(data);
            }

        } catch (error) {
            // Try next file
        }
    }

    return tests;
}

/* ============================================================
   START TEST
   ============================================================ */

async function startTest(test) {
    currentTest = test;

    currentPartIndex = 0;
    currentQuestionIndex = 0;

    studentAnswers = {};

    testStartTime = Date.now();
    testEndTime = null;

    const dashboard =
        document.getElementById("dashboard");

    if (dashboard) {
        dashboard.style.display = "none";
    }

    const resultScreen =
        document.getElementById("resultScreen");

    if (resultScreen) {
        resultScreen.style.display = "none";
    }

    const testScreen =
        document.getElementById("testScreen");

    if (testScreen) {
        testScreen.style.display = "block";
    }

    renderTest();

    startTimer();
}

/* ============================================================
   TEST RENDERING
   ============================================================ */

function renderTest() {
    if (!currentTest) {
        return;
    }

    const titleElement =
        document.getElementById("testTitle");

    if (titleElement) {
        titleElement.textContent =
            currentTest.title ||
            currentTest.name ||
            "IELTS Reading Test";
    }

    renderParts();
    renderCurrentPart();
}

/* ============================================================
   PARTS
   ============================================================ */

function renderParts() {
    const container =
        document.getElementById("partsContainer");

    if (!container || !currentTest.parts) {
        return;
    }

    container.innerHTML = "";

    currentTest.parts.forEach((part, index) => {
        const button =
            document.createElement("button");

        button.className =
            "part-button" +
            (index === currentPartIndex
                ? " active"
                : "");

        button.textContent =
            part.title ||
            `Part ${index + 1}`;

        button.dataset.partIndex = index;

        button.addEventListener("click", () => {
            currentPartIndex = index;
            renderParts();
            renderCurrentPart();
        });

        container.appendChild(button);
    });
}

/* ============================================================
   CURRENT PART
   ============================================================ */

function renderCurrentPart() {
    if (!currentTest ||
        !currentTest.parts ||
        !currentTest.parts[currentPartIndex]) {
        return;
    }

    const part =
        currentTest.parts[currentPartIndex];

    const readingContainer =
        document.getElementById("readingContent");

    if (readingContainer) {
        readingContainer.innerHTML =
            part.passage ||
            part.reading ||
            part.text ||
            "";
    }

    const questionsContainer =
        document.getElementById("questionsContainer");

    if (!questionsContainer) {
        return;
    }

    questionsContainer.innerHTML = "";

    const groups =
        part.questionGroups ||
        part.groups ||
        [];

    groups.forEach(group => {
        const groupElement =
            renderQuestionGroup(group);

        questionsContainer.appendChild(groupElement);
    });

    /*
     * Some JSON structures may store questions
     * directly under the part.
     */

    if (Array.isArray(part.questions)) {
        const directGroup = {
            title: "",
            instructions: "",
            questions: part.questions
        };

        questionsContainer.appendChild(
            renderQuestionGroup(directGroup)
        );
    }

    if (Array.isArray(part.blanks)) {
        const blankGroup = {
            title: "",
            instructions: "",
            blanks: part.blanks
        };

        questionsContainer.appendChild(
            renderQuestionGroup(blankGroup)
        );
    }

    restoreSavedAnswers();
}

/* ============================================================
   QUESTION GROUP
   ============================================================ */

function renderQuestionGroup(group) {
    const wrapper =
        document.createElement("section");

    wrapper.className =
        "question-group";

    if (group.title) {
        const title =
            document.createElement("h3");

        title.textContent = group.title;

        wrapper.appendChild(title);
    }

    if (group.instructions) {
        const instructions =
            document.createElement("p");

        instructions.className =
            "question-instructions";

        instructions.textContent =
            group.instructions;

        wrapper.appendChild(instructions);
    }

    const questions =
        group.questions ||
        group.blanks ||
        [];

    questions.forEach(question => {
        wrapper.appendChild(
            renderQuestion(question)
        );
    });

    return wrapper;
}

/* ============================================================
   QUESTION RENDERING
   ============================================================ */

function renderQuestion(question) {
    const wrapper =
        document.createElement("div");

    wrapper.className =
        "question-item";

    wrapper.dataset.questionNumber =
        question.number;

    const number =
        document.createElement("span");

    number.className =
        "question-number";

    number.textContent =
        question.number + ".";

    wrapper.appendChild(number);

    if (question.question) {
        const text =
            document.createElement("span");

        text.className =
            "question-text";

        text.innerHTML =
            question.question;

        wrapper.appendChild(text);
    }

    const type =
        question.type ||
        detectQuestionType(question);

    const inputContainer =
        document.createElement("div");

    inputContainer.className =
        "question-input-container";

    /* -------------------------
       TEXT INPUT
       ------------------------- */

    if (
        type === "fill" ||
        type === "fill_blank" ||
        type === "text" ||
        type === "short_answer"
    ) {
        const input =
            document.createElement("input");

        input.type = "text";

        input.className =
            "answer-input";

        input.dataset.questionNumber =
            question.number;

        input.autocomplete = "off";

        input.addEventListener("input", () => {
            saveAnswer(
                question.number,
                input.value
            );
        });

        input.addEventListener("change", () => {
            saveAnswer(
                question.number,
                input.value
            );
        });

        inputContainer.appendChild(input);
    }

    /* -------------------------
       MULTIPLE CHOICE
       ------------------------- */

    else if (
        type === "multiple_choice" ||
        type === "multiple-choice" ||
        type === "mcq"
    ) {
        const options =
            question.options ||
            question.choices ||
            [];

        options.forEach((option, index) => {
            const label =
                document.createElement("label");

            label.className =
                "answer-option";

            const radio =
                document.createElement("input");

            radio.type = "radio";

            radio.name =
                `question-${question.number}`;

            radio.value =
                typeof option === "object"
                    ? option.value || option.text
                    : option;

            radio.addEventListener("change", () => {
                saveAnswer(
                    question.number,
                    radio.value
                );
            });

            const optionText =
                document.createElement("span");

            optionText.textContent =
                typeof option === "object"
                    ? option.text || option.value
                    : option;

            label.appendChild(radio);
            label.appendChild(optionText);

            inputContainer.appendChild(label);
        });
    }

    /* -------------------------
       CHECKBOX
       ------------------------- */

    else if (
        type === "checkbox" ||
        type === "multiple_answer"
    ) {
        const options =
            question.options ||
            question.choices ||
            [];

        options.forEach(option => {
            const label =
                document.createElement("label");

            label.className =
                "answer-option";

            const checkbox =
                document.createElement("input");

            checkbox.type = "checkbox";

            checkbox.value =
                typeof option === "object"
                    ? option.value || option.text
                    : option;

            checkbox.dataset.questionNumber =
                question.number;

            checkbox.addEventListener("change", () => {
                saveCheckboxAnswer(question.number);
            });

            const optionText =
                document.createElement("span");

            optionText.textContent =
                typeof option === "object"
                    ? option.text || option.value
                    : option;

            label.appendChild(checkbox);
            label.appendChild(optionText);

            inputContainer.appendChild(label);
        });
    }

    /* -------------------------
       TRUE / FALSE / NOT GIVEN
       ------------------------- */

    else if (
        type === "true_false_not_given" ||
        type === "tfng" ||
        type === "true_false"
    ) {
        [
            "TRUE",
            "FALSE",
            "NOT GIVEN"
        ].forEach(value => {
            const label =
                document.createElement("label");

            label.className =
                "answer-option";

            const radio =
                document.createElement("input");

            radio.type = "radio";

            radio.name =
                `question-${question.number}`;

            radio.value = value;

            radio.addEventListener("change", () => {
                saveAnswer(
                    question.number,
                    value
                );
            });

            const text =
                document.createElement("span");

            text.textContent = value;

            label.appendChild(radio);
            label.appendChild(text);

            inputContainer.appendChild(label);
        });
    }

    /* -------------------------
       YES / NO / NOT GIVEN
       ------------------------- */

    else if (
        type === "yes_no_not_given"
    ) {
        [
            "YES",
            "NO",
            "NOT GIVEN"
        ].forEach(value => {
            const label =
                document.createElement("label");

            label.className =
                "answer-option";

            const radio =
                document.createElement("input");

            radio.type = "radio";

            radio.name =
                `question-${question.number}`;

            radio.value = value;

            radio.addEventListener("change", () => {
                saveAnswer(
                    question.number,
                    value
                );
            });

            const text =
                document.createElement("span");

            text.textContent = value;

            label.appendChild(radio);
            label.appendChild(text);

            inputContainer.appendChild(label);
        });
    }

    /* -------------------------
       DEFAULT TEXT INPUT
       ------------------------- */

    else {
        const input =
            document.createElement("input");

        input.type = "text";

        input.className =
            "answer-input";

        input.dataset.questionNumber =
            question.number;

        input.addEventListener("input", () => {
            saveAnswer(
                question.number,
                input.value
            );
        });

        input.addEventListener("change", () => {
            saveAnswer(
                question.number,
                input.value
            );
        });

        inputContainer.appendChild(input);
    }

    wrapper.appendChild(inputContainer);

    return wrapper;
}

/* ============================================================
   QUESTION TYPE DETECTION
   ============================================================ */

function detectQuestionType(question) {
    if (question.options ||
        question.choices) {
        return "multiple_choice";
    }

    return "fill_blank";
}

/* ============================================================
   ANSWERS
   ============================================================ */

function saveAnswer(questionNumber, answer) {
    if (
        answer === undefined ||
        answer === null
    ) {
        return;
    }

    studentAnswers[String(questionNumber)] =
        answer;

    saveAnswersToLocalStorage();

    updateAnsweredStatus();
}

function saveCheckboxAnswer(questionNumber) {
    const checkboxes =
        document.querySelectorAll(
            `input[type="checkbox"][data-question-number="${questionNumber}"]`
        );

    const answers = [];

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            answers.push(checkbox.value);
        }
    });

    saveAnswer(questionNumber, answers);
}

/* ============================================================
   LOCAL STORAGE
   ============================================================ */

function getAnswerStorageKey() {
    const testId =
        currentTest?.id ||
        currentTest?.title ||
        "default-test";

    return `ielts-reading-answers-${testId}`;
}

function saveAnswersToLocalStorage() {
    try {
        localStorage.setItem(
            getAnswerStorageKey(),
            JSON.stringify(studentAnswers)
        );
    } catch (error) {
        console.warn(
            "Could not save answers:",
            error
        );
    }
}

function restoreSavedAnswers() {
    try {
        const saved =
            localStorage.getItem(
                getAnswerStorageKey()
            );

        if (!saved) {
            return;
        }

        const answers =
            JSON.parse(saved);

        if (!answers ||
            typeof answers !== "object") {
            return;
        }

        studentAnswers = answers;

        Object.entries(studentAnswers)
            .forEach(([number, answer]) => {
                restoreAnswerToDOM(
                    number,
                    answer
                );
            });

        updateAnsweredStatus();

    } catch (error) {
        console.warn(
            "Could not restore answers:",
            error
        );
    }
}

function restoreAnswerToDOM(
    questionNumber,
    answer
) {
    const selector =
        `[data-question-number="${questionNumber}"]`;

    const inputs =
        document.querySelectorAll(selector);

    inputs.forEach(input => {
        if (
            input.type === "checkbox"
        ) {
            const answers =
                Array.isArray(answer)
                    ? answer
                    : [answer];

            input.checked =
                answers.includes(input.value);

        } else if (
            input.type === "radio"
        ) {
            input.checked =
                String(input.value) ===
                String(answer);

        } else {
            input.value =
                Array.isArray(answer)
                    ? answer.join(", ")
                    : answer;
        }
    });
}

/* ============================================================
   ANSWERED STATUS
   ============================================================ */

function updateAnsweredStatus() {
    const answered =
        Object.values(studentAnswers)
            .filter(value => {
                if (Array.isArray(value)) {
                    return value.length > 0;
                }

                return String(value ?? "").trim() !== "";
            }).length;

    const status =
        document.getElementById("answeredCount");

    if (status) {
        status.textContent =
            answered;
    }
}

/* ============================================================
   TIMER
   ============================================================ */

function startTimer() {
    stopTimer();

    const duration =
        currentTest?.duration ||
        60 * 60;

    const durationMs =
        duration > 10000
            ? duration
            : duration * 1000;

    testStartTime = Date.now();

    updateTimer(durationMs);

    timerInterval =
        setInterval(() => {
            const elapsed =
                Date.now() -
                testStartTime;

            const remaining =
                durationMs -
                elapsed;

            if (remaining <= 0) {
                updateTimer(0);
                stopTimer();

                submitTest(true);

                return;
            }

            updateTimer(remaining);
        }, 1000);
}

function updateTimer(milliseconds) {
    const totalSeconds =
        Math.max(
            0,
            Math.floor(milliseconds / 1000)
        );

    const minutes =
        Math.floor(totalSeconds / 60);

    const seconds =
        totalSeconds % 60;

    const timer =
        document.getElementById("timer");

    if (timer) {
        timer.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/* ============================================================
   SUBMIT TEST
   ============================================================ */

async function submitTest(autoSubmit = false) {
    if (!currentTest) {
        return;
    }

    stopTimer();

    testEndTime = Date.now();

    const result =
        calculateScore();

    await saveResultToAPI(result);

    renderResult(result);

    const testScreen =
        document.getElementById("testScreen");

    if (testScreen) {
        testScreen.style.display = "none";
    }

    const resultScreen =
        document.getElementById("resultScreen");

    if (resultScreen) {
        resultScreen.style.display = "block";
    }

    if (autoSubmit) {
        const message =
            document.getElementById("autoSubmitMessage");

        if (message) {
            message.textContent =
                "Time is up. Your test was submitted automatically.";
            message.style.display = "block";
        }
    }
}

/* ============================================================
   CALCULATE SCORE
   ============================================================ */

function calculateScore() {
    let correct = 0;
    let total = 0;

    const questionResults = [];

    if (!currentTest.parts) {
        return {
            correct: 0,
            total: 0,
            percentage: 0,
            band: 0,
            questionResults: []
        };
    }

    currentTest.parts.forEach(part => {
        const groups =
            part.questionGroups ||
            part.groups ||
            [];

        const allGroups = [...groups];

        if (Array.isArray(part.questions)) {
            allGroups.push({
                questions: part.questions
            });
        }

        if (Array.isArray(part.blanks)) {
            allGroups.push({
                blanks: part.blanks
            });
        }

        allGroups.forEach(group => {
            const questions =
                group.questions ||
                group.blanks ||
                [];

            questions.forEach(question => {
                total++;

                const studentAnswer =
                    studentAnswers[
                        String(question.number)
                    ];

                const isCorrect =
                    answersMatch(
                        studentAnswer,
                        question.answer
                    );

                if (isCorrect) {
                    correct++;
                }

                questionResults.push({
                    number: question.number,
                    studentAnswer:
                        studentAnswer,
                    correctAnswer:
                        question.answer,
                    correct:
                        isCorrect
                });
            });
        });
    });

    const percentage =
        total > 0
            ? Math.round(
                (correct / total) * 100
            )
            : 0;

    const band =
        calculateIELTSBand(
            correct,
            total
        );

    return {
        correct,
        total,
        percentage,
        band,
        questionResults,
        submittedAt:
            new Date().toISOString()
    };
}

/* ============================================================
   ANSWER MATCHING
   ============================================================ */

function answersMatch(
    studentAnswer,
    correctAnswer
) {
    if (
        studentAnswer === undefined ||
        studentAnswer === null ||
        studentAnswer === ""
    ) {
        return false;
    }

    if (
        correctAnswer === undefined ||
        correctAnswer === null
    ) {
        return false;
    }

    const student =
        normalizeAnswer(studentAnswer);

    if (Array.isArray(correctAnswer)) {
        return correctAnswer.some(answer =>
            normalizeAnswer(answer) === student
        );
    }

    const correct =
        normalizeAnswer(correctAnswer);

    return student === correct;
}

function normalizeAnswer(answer) {
    if (
        answer === undefined ||
        answer === null
    ) {
        return "";
    }

    if (Array.isArray(answer)) {
        return answer
            .map(item =>
                normalizeAnswer(item)
            )
            .sort()
            .join("|");
    }

    return String(answer)
        .trim()
        .toLowerCase()
        .replace(/[“”"']/g, "")
        .replace(/\s+/g, " ");
}

/* ============================================================
   IELTS BAND
   ============================================================ */

function calculateIELTSBand(
    correct,
    total
) {
    if (!total) {
        return 0;
    }

    const score =
        correct;

    /*
     * IELTS Academic Reading conversion.
     * 40-question scale.
     */

    const scale = {
        40: 9,
        39: 9,
        38: 8.5,
        37: 8.5,
        36: 8,
        35: 8,
        34: 7.5,
        33: 7.5,
        32: 7.5,
        31: 7,
        30: 7,
        29: 7,
        28: 6.5,
        27: 6.5,
        26: 6.5,
        25: 6,
        24: 6,
        23: 6,
        22: 5.5,
        21: 5.5,
        20: 5.5,
        19: 5.5,
        18: 5,
        17: 5,
        16: 5,
        15: 5,
        14: 4.5,
        13: 4.5,
        12: 4,
        11: 4,
        10: 4,
        9: 3.5,
        8: 3.5,
        7: 3,
        6: 3,
        5: 3,
        4: 2.5,
        3: 2.5,
        2: 2,
        1: 1,
        0: 0
    };

    if (total === 40) {
        return scale[score] ?? 0;
    }

    const converted =
        Math.round(
            (score / total) * 40
        );

    return scale[
        Math.min(40, Math.max(0, converted))
    ] ?? 0;
}

/* ============================================================
   RESULT RENDERING
   ============================================================ */

function renderResult(result) {
    const scoreElement =
        document.getElementById("score");

    if (scoreElement) {
        scoreElement.textContent =
            `${result.correct} / ${result.total}`;
    }

    const percentageElement =
        document.getElementById("percentage");

    if (percentageElement) {
        percentageElement.textContent =
            `${result.percentage}%`;
    }

    const bandElement =
        document.getElementById("bandScore");

    if (bandElement) {
        bandElement.textContent =
            result.band;
    }

    renderPartScores(result);
    renderAnswerReview(result);
}

/* ============================================================
   PART SCORES
   ============================================================ */

function renderPartScores(result) {
    const container =
        document.getElementById("partScores");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!currentTest?.parts) {
        return;
    }

    currentTest.parts.forEach(
        (part, partIndex) => {
            let correct = 0;
            let total = 0;

            const groups =
                part.questionGroups ||
                part.groups ||
                [];

            const allGroups = [...groups];

            if (Array.isArray(part.questions)) {
                allGroups.push({
                    questions: part.questions
                });
            }

            if (Array.isArray(part.blanks)) {
                allGroups.push({
                    blanks: part.blanks
                });
            }

            allGroups.forEach(group => {
                const questions =
                    group.questions ||
                    group.blanks ||
                    [];

                questions.forEach(question => {
                    total++;

                    const answer =
                        studentAnswers[
                            String(question.number)
                        ];

                    if (
                        answersMatch(
                            answer,
                            question.answer
                        )
                    ) {
                        correct++;
                    }
                });
            });

            const row =
                document.createElement("div");

            row.className =
                "part-score-row";

            row.innerHTML = `
                <span>
                    ${escapeHTML(
                        part.title ||
                        `Part ${partIndex + 1}`
                    )}
                </span>

                <strong>
                    ${correct} / ${total}
                </strong>
            `;

            container.appendChild(row);
        }
    );
}

/* ============================================================
   ANSWER REVIEW
   ============================================================ */

function getReviewQuestions() {
    const questions = [];

    if (!currentTest?.parts) {
        return questions;
    }

    currentTest.parts.forEach(
        (part, partIndex) => {
            const groups =
                part.questionGroups ||
                part.groups ||
                [];

            const allGroups = [...groups];

            if (Array.isArray(part.questions)) {
                allGroups.push({
                    questions: part.questions
                });
            }

            if (Array.isArray(part.blanks)) {
                allGroups.push({
                    blanks: part.blanks
                });
            }

            allGroups.forEach(group => {
                const groupQuestions =
                    group.questions ||
                    group.blanks ||
                    [];

                groupQuestions.forEach(
                    question => {
                        const studentAnswer =
                            studentAnswers[
                                String(question.number)
                            ];

                        const correctAnswer =
                            question.answer;

                        questions.push({
                            number:
                                question.number,
                            partIndex:
                                partIndex,
                            partTitle:
                                part.title ||
                                `Part ${partIndex + 1}`,
                            question:
                                question.question ||
                                "",
                            studentAnswer,
                            correctAnswer,
                            isCorrect:
                                answersMatch(
                                    studentAnswer,
                                    correctAnswer
                                )
                        });
                    }
                );
            });
        }
    );

    questions.sort(
        (a, b) =>
            Number(a.number) -
            Number(b.number)
    );

    return questions;
}

function formatReviewAnswer(answer) {
    if (
        answer === undefined ||
        answer === null ||
        answer === ""
    ) {
        return "Not answered";
    }

    if (Array.isArray(answer)) {
        if (answer.length === 0) {
            return "Not answered";
        }

        return answer
            .map(item =>
                String(item)
            )
            .join(", ");
    }

    return String(answer);
}

function formatCorrectReviewAnswer(answer) {
    if (
        answer === undefined ||
        answer === null ||
        answer === ""
    ) {
        return "No answer provided";
    }

    if (Array.isArray(answer)) {
        return answer
            .map(item =>
                String(item)
            )
            .join(" / ");
    }

    return String(answer);
}

function renderAnswerReview() {
    const container =
        document.getElementById(
            "answerReviewContent"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const questions =
        getReviewQuestions();

    if (!questions.length) {
        container.innerHTML = `
            <p class="no-answer-review">
                No answer review is available.
            </p>
        `;

        return;
    }

    let currentPart = null;
    let partContainer = null;

    questions.forEach(item => {
        if (item.partTitle !== currentPart) {
            currentPart =
                item.partTitle;

            const heading =
                document.createElement("h3");

            heading.className =
                "review-part-title";

            heading.textContent =
                currentPart;

            container.appendChild(
                heading
            );

            partContainer =
                document.createElement("div");

            partContainer.className =
                "review-part-container";

            container.appendChild(
                partContainer
            );
        }

        const row =
            document.createElement("div");

        row.className =
            "answer-review-item " +
            (
                item.isCorrect
                    ? "answer-correct"
                    : "answer-wrong"
            );

        const status =
            item.isCorrect
                ? "✓ Correct"
                : "✗ Wrong";

        row.innerHTML = `
            <div class="review-question-header">
                <strong>
                    Question ${escapeHTML(
                        item.number
                    )}
                </strong>

                <span class="review-status">
                    ${status}
                </span>
            </div>

            ${
                item.question
                    ? `
                        <div class="review-question-text">
                            ${item.question}
                        </div>
                    `
                    : ""
            }

            <div class="review-answer-line">
                <strong>Your answer:</strong>
                <span>
                    ${escapeHTML(
                        formatReviewAnswer(
                            item.studentAnswer
                        )
                    )}
                </span>
            </div>

            <div class="review-answer-line correct-answer-line">
                <strong>Correct answer:</strong>
                <span>
                    ${escapeHTML(
                        formatCorrectReviewAnswer(
                            item.correctAnswer
                        )
                    )}
                </span>
            </div>
        `;

        if (partContainer) {
            partContainer.appendChild(row);
        } else {
            container.appendChild(row);
        }
    });
}

/* ============================================================
   PRINT SCORE REPORT
   ============================================================ */

function printScoreReport() {
    if (!currentTest) {
        return;
    }

    renderAnswerReview();

    document.body.classList.add(
        "printing-score-report"
    );

    setTimeout(() => {
        window.print();

        setTimeout(() => {
            document.body.classList.remove(
                "printing-score-report"
            );
        }, 500);
    }, 100);
}

/* ============================================================
   SAVE RESULT
   ============================================================ */

async function saveResultToAPI(result) {
    const historyKey =
        "ieltsReadingHistory";

    try {
        const history =
            JSON.parse(
                localStorage.getItem(
                    historyKey
                ) || "[]"
            );

        history.unshift({
            id:
                Date.now(),
            studentId:
                currentUser.studentId,
            username:
                currentUser.username,
            testTitle:
                currentTest?.title ||
                currentTest?.name ||
                "IELTS Reading Test",
            correct:
                result.correct,
            total:
                result.total,
            percentage:
                result.percentage,
            band:
                result.band,
            date:
                new Date().toISOString()
        });

        localStorage.setItem(
            historyKey,
            JSON.stringify(
                history.slice(0, 50)
            )
        );

    } catch (error) {
        console.warn(
            "Could not save result:",
            error
        );
    }

    /*
     * If your original project has a Google Apps
     * Script/API endpoint, keep that endpoint here.
     *
     * The localStorage result above guarantees that
     * removing login does not break result history.
     */
}

/* ============================================================
   HISTORY
   ============================================================ */

async function loadHistory() {
    const container =
        document.getElementById(
            "historyContainer"
        );

    if (!container) {
        return;
    }

    let history = [];

    try {
        history =
            JSON.parse(
                localStorage.getItem(
                    "ieltsReadingHistory"
                ) || "[]"
            );
    } catch (error) {
        history = [];
    }

    container.innerHTML = "";

    if (!history.length) {
        container.innerHTML = `
            <p class="no-history">
                No previous test results.
            </p>
        `;

        return;
    }

    history.forEach(item => {
        const row =
            document.createElement("div");

        row.className =
            "history-row";

        const date =
            item.date
                ? new Date(item.date)
                    .toLocaleString()
                : "";

        row.innerHTML = `
            <div>
                <strong>
                    ${escapeHTML(
                        item.testTitle ||
                        "IELTS Reading Test"
                    )}
                </strong>

                <small>
                    ${escapeHTML(date)}
                </small>
            </div>

            <div>
                <strong>
                    ${item.correct}/${item.total}
                </strong>

                <span>
                    Band ${item.band}
                </span>
            </div>
        `;

        container.appendChild(row);
    });
}

/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ============================================================
   SCORE REPORT STYLES
   ============================================================ */

function injectScoreReportStyles() {
    if (
        document.getElementById(
            "scoreReportInjectedStyles"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "scoreReportInjectedStyles";

    style.textContent = `
        .answer-review-section {
            margin-top: 30px;
            padding: 24px;
            border-radius: 12px;
            background: #f7f7f7;
        }

        .answer-review-section h2 {
            margin-top: 0;
            margin-bottom: 8px;
        }

        .answer-review-description {
            margin-bottom: 24px;
            color: #666;
        }

        .review-part-title {
            margin-top: 28px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #ddd;
        }

        .review-part-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .answer-review-item {
            background: #fff;
            border-radius: 10px;
            padding: 15px 18px;
            border-left: 5px solid #999;
            box-shadow:
                0 1px 4px rgba(0, 0, 0, 0.06);
        }

        .answer-correct {
            border-left-color: #2e8b57;
        }

        .answer-wrong {
            border-left-color: #d64545;
        }

        .review-question-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 8px;
        }

        .review-status {
            font-weight: 700;
        }

        .answer-correct .review-status {
            color: #2e8b57;
        }

        .answer-wrong .review-status {
            color: #d64545;
        }

        .review-question-text {
            margin: 8px 0 12px;
            line-height: 1.5;
        }

        .review-answer-line {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 6px;
            line-height: 1.5;
        }

        .correct-answer-line {
            color: #176b3a;
        }

        .no-answer-review {
            padding: 20px;
            text-align: center;
            color: #777;
        }

        @media print {
            @page {
                size: A4;
                margin: 15mm;
            }

            body.printing-score-report {
                background: #fff !important;
            }

            body.printing-score-report
            #dashboard,
            body.printing-score-report
            #testScreen,
            body.printing-score-report
            #loginScreen {
                display: none !important;
            }

            body.printing-score-report
            #resultScreen {
                display: block !important;
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            body.printing-score-report
            button,
            body.printing-score-report
            .result-actions,
            body.printing-score-report
            .actions,
            body.printing-score-report
            .status-message {
                display: none !important;
            }

            body.printing-score-report
            .answer-review-section {
                display: block !important;
                margin-top: 20px !important;
                padding: 0 !important;
                background: #fff !important;
            }

            body.printing-score-report
            .answer-review-item {
                break-inside: avoid;
                page-break-inside: avoid;
                box-shadow: none !important;
                border: 1px solid #ddd !important;
                border-left-width: 4px !important;
                margin-bottom: 8px;
            }

            body.printing-score-report
            .review-part-title {
                break-after: avoid;
                page-break-after: avoid;
            }
        }

        @media (max-width: 700px) {
            .answer-review-section {
                padding: 15px;
            }

            .review-question-header {
                align-items: flex-start;
                flex-direction: column;
            }

            .review-answer-line {
                display: block;
            }
        }
    `;

    document.head.appendChild(style);
}

/* ============================================================
   NAVIGATION HELPERS
   ============================================================ */

function goToNextPart() {
    if (!currentTest?.parts) {
        return;
    }

    if (
        currentPartIndex <
        currentTest.parts.length - 1
    ) {
        currentPartIndex++;

        renderParts();
        renderCurrentPart();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } else {
        submitTest(false);
    }
}

function goToPreviousPart() {
    if (currentPartIndex <= 0) {
        return;
    }

    currentPartIndex--;

    renderParts();
    renderCurrentPart();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* ============================================================
   PUBLIC DEBUG API
   ============================================================ */

window.IELTSReadingApp = {
    getCurrentTest() {
        return currentTest;
    },

    getAnswers() {
        return {
            ...studentAnswers
        };
    },

    getCurrentUser() {
        return {
            ...currentUser
        };
    },

    calculateScore() {
        return calculateScore();
    },

    submitTest() {
        return submitTest(false);
    },

    printScoreReport() {
        return printScoreReport();
    },

    renderAnswerReview() {
        return renderAnswerReview();
    },

    showDashboard() {
        return showDashboard();
    }
};
