const API = "/api";

let token = localStorage.getItem("token");
let currentUser = JSON.parse(
    localStorage.getItem("user") || "null"
);

let currentQuiz = null;
let currentQuestions = [];
let timerInterval = null;
let remainingSeconds = 0;


// HELPER FUNCTIONS

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function api(url, options = {}) {

    const response = await fetch(API + url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? {
                "Authorization": token
            } : {}),
            ...(options.headers || {})
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
    }

    return data;
}

function hideAll() {

    document.querySelectorAll("main section")
        .forEach(section => {
            section.classList.add("hidden");
        });

}

function showLogin() {

    hideAll();

    document.getElementById("loginSection")
        .classList.remove("hidden");

}

function showRegister() {

    hideAll();

    document.getElementById("registerSection")
        .classList.remove("hidden");

}


// REGISTRATION

async function register() {

    try {

        const data = await api("/auth/register", {

            method: "POST",

            body: JSON.stringify({

                name: document.getElementById("regName").value,
                email: document.getElementById("regEmail").value,
                password: document.getElementById("regPassword").value,
                role: document.getElementById("regRole").value

            })

        });

        alert(data.message);

        showLogin();

    } catch (error) {

        alert(error.message);

    }

}


// LOGIN

async function login() {

    try {

        const data = await api("/auth/login", {

            method: "POST",

            body: JSON.stringify({

                email: document.getElementById("loginEmail").value,
                password: document.getElementById("loginPassword").value

            })

        });

        token = data.token;
        currentUser = data.user;

        localStorage.setItem("token", token);
        localStorage.setItem(
            "user",
            JSON.stringify(currentUser)
        );

        openDashboard();

    } catch (error) {

        alert(error.message);

    }

}


// OPEN DASHBOARD

function openDashboard() {

    if (!currentUser || !token) {
        showLogin();
        return;
    }

    hideAll();

    if (currentUser.role === "teacher") {

        document.getElementById("teacherDashboard")
            .classList.remove("hidden");

        document.getElementById("teacherName")
            .textContent = "Welcome, " + currentUser.name;

        loadTeacherQuizzes();
        loadTeacherResults();

    } else {

        document.getElementById("studentDashboard")
            .classList.remove("hidden");

        document.getElementById("studentName")
            .textContent = "Welcome, " + currentUser.name;

        loadAvailableQuizzes();
        loadStudentResults();

    }

}


// LOGOUT

function logout() {

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    token = null;
    currentUser = null;
    currentQuiz = null;

    showLogin();

}


// TEACHER: CREATE QUIZ

async function createQuiz() {

    try {

        const data = await api("/quizzes/create", {

            method: "POST",

            body: JSON.stringify({

                title: document.getElementById("quizTitle").value,
                subject: document.getElementById("quizSubject").value,
                total_marks: Number(
                    document.getElementById("quizMarks").value
                ),
                duration: Number(
                    document.getElementById("quizDuration").value
                )

            })

        });

        alert(data.message);

        document.getElementById("quizTitle").value = "";
        document.getElementById("quizSubject").value = "";
        document.getElementById("quizMarks").value = "";
        document.getElementById("quizDuration").value = "";

        loadTeacherQuizzes();

    } catch (error) {

        alert(error.message);

    }

}


// TEACHER: LOAD QUIZZES

async function loadTeacherQuizzes() {

    try {

        const quizzes = await api("/quizzes/teacher");

        const container =
            document.getElementById("teacherQuizzes");

        const select =
            document.getElementById("questionQuiz");

        container.innerHTML = "";
        select.innerHTML = "";

        quizzes.forEach(quiz => {

            container.innerHTML += `

                <div class="quiz-card">

                    <h3>${escapeHTML(quiz.title)}</h3>

                    <p>Subject: ${escapeHTML(quiz.subject)}</p>

                    <p>Total Marks: ${quiz.total_marks}</p>

                    <p>Duration: ${quiz.duration} minutes</p>

                    <p>Questions: ${quiz.question_count}</p>

                </div>

            `;

            select.innerHTML += `

                <option value="${quiz.quiz_id}">
                    ${escapeHTML(quiz.title)}
                </option>

            `;

        });

    } catch (error) {

        alert(error.message);

    }

}


// TEACHER: ADD QUESTION

async function addQuestion() {

    try {

        const data = await api("/quizzes/add-question", {

            method: "POST",

            body: JSON.stringify({

                quiz_id: Number(
                    document.getElementById("questionQuiz").value
                ),

                question_text:
                    document.getElementById("questionText").value,

                option_a:
                    document.getElementById("optionA").value,

                option_b:
                    document.getElementById("optionB").value,

                option_c:
                    document.getElementById("optionC").value,

                option_d:
                    document.getElementById("optionD").value,

                correct_answer:
                    document.getElementById("correctAnswer").value

            })

        });

        alert(data.message);

        document.getElementById("questionText").value = "";
        document.getElementById("optionA").value = "";
        document.getElementById("optionB").value = "";
        document.getElementById("optionC").value = "";
        document.getElementById("optionD").value = "";

        loadTeacherQuizzes();

    } catch (error) {

        alert(error.message);

    }

}


// STUDENT: LOAD AVAILABLE QUIZZES

async function loadAvailableQuizzes() {

    try {

        const quizzes = await api("/quizzes");

        const container =
            document.getElementById("availableQuizzes");

        container.innerHTML = "";

        if (quizzes.length === 0) {

            container.textContent =
                "No available quizzes at the moment.";

            return;

        }

        quizzes.forEach(quiz => {

            container.innerHTML += `

                <div class="quiz-card">

                    <h3>${escapeHTML(quiz.title)}</h3>

                    <p>Subject: ${escapeHTML(quiz.subject)}</p>

                    <p>Total Marks: ${quiz.total_marks}</p>

                    <p>Duration: ${quiz.duration} minutes</p>

                    <p>Teacher: ${escapeHTML(quiz.teacher_name)}</p>

                    <button onclick="startExam(${quiz.quiz_id})">
                        Start Examination
                    </button>

                </div>

            `;

        });

    } catch (error) {

        alert(error.message);

    }

}


// STUDENT: START EXAM

async function startExam(quizId) {

    try {

        const quizzes = await api("/quizzes");

        currentQuiz = quizzes.find(
            q => q.quiz_id === quizId
        );

        if (!currentQuiz) {
            throw new Error("Quiz is not available");
        }

        currentQuestions = await api(
            `/quizzes/${quizId}/questions`
        );

        if (currentQuestions.length === 0) {
            throw new Error("No questions in this quiz");
        }

        hideAll();

        document.getElementById("examSection")
            .classList.remove("hidden");

        document.getElementById("examTitle")
            .textContent = currentQuiz.title;

        const container =
            document.getElementById("examQuestions");

        container.innerHTML = "";

        currentQuestions.forEach((q, index) => {

            container.innerHTML += `

                <div class="question-card">

                    <h3>
                        ${index + 1}. ${escapeHTML(q.question_text)}
                    </h3>

                    ${["A", "B", "C", "D"].map(letter => `

                        <label>

                            <input
                                type="radio"
                                name="question_${q.question_id}"
                                value="${letter}"
                            >

                            ${letter}. ${escapeHTML(
                                q["option_" + letter.toLowerCase()]
                            )}

                        </label>

                    `).join("")}

                </div>

            `;

        });

        startTimer(currentQuiz.duration);

    } catch (error) {

        alert(error.message);

    }

}


// EXAM TIMER

function startTimer(minutes) {

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    remainingSeconds = minutes * 60;

    updateTimer();

    timerInterval = setInterval(() => {

        remainingSeconds--;

        updateTimer();

        if (remainingSeconds <= 0) {

            clearInterval(timerInterval);

            alert("Time is over! Your examination will be submitted.");

            submitExam();

        }

    }, 1000);

}

function updateTimer() {

    const min = Math.floor(remainingSeconds / 60);

    const sec = remainingSeconds % 60;

    document.getElementById("examTimer")
        .textContent =
        `Time Remaining: ${min}:${String(sec).padStart(2, "0")}`;

}


// STUDENT: SUBMIT EXAM

async function submitExam() {

    if (!currentQuiz) {
        return;
    }

    const button = document.querySelector(
        "#examSection button"
    );

    if (button) {
        button.disabled = true;
    }

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    try {

        const answers = [];

        currentQuestions.forEach(q => {

            const selected = document.querySelector(
                `input[name="question_${q.question_id}"]:checked`
            );

            if (selected) {

                answers.push({

                    question_id: q.question_id,
                    answer: selected.value

                });

            }

        });

        const data = await api("/results/submit", {

            method: "POST",

            body: JSON.stringify({

                quiz_id: currentQuiz.quiz_id,
                answers: answers

            })

        });

        hideAll();

        document.getElementById("resultSection")
            .classList.remove("hidden");

        document.getElementById("resultScore")
            .textContent =
            `Your Score: ${data.score} / ${data.total_marks}`;

        document.getElementById("resultMessage")
            .textContent =
            `Correct Answers: ${data.correct_answers} out of ${data.total_questions}`;

        currentQuiz = null;
        currentQuestions = [];

    } catch (error) {

        alert(error.message);

    } finally {

        if (button) {
            button.disabled = false;
        }

    }

}


// STUDENT: VIEW RESULTS

async function loadStudentResults() {

    try {

        const results = await api("/results/student");

        const container =
            document.getElementById("studentResults");

        container.innerHTML = "";

        if (results.length === 0) {

            container.textContent = "No examination results yet.";

            return;

        }

        results.forEach(result => {

            container.innerHTML += `

                <div class="result-card">

                    <h3>${escapeHTML(result.title)}</h3>

                    <p>Subject: ${escapeHTML(result.subject)}</p>

                    <p>
                        Score: ${result.score} /
                        ${result.total_marks}
                    </p>

                    <p>Status: ${escapeHTML(result.status)}</p>

                    <p>
                        Attempted: ${new Date(
                            result.attempted_at
                        ).toLocaleString()}
                    </p>

                </div>

            `;

        });

    } catch (error) {

        alert(error.message);

    }

}


// TEACHER: VIEW RESULTS

async function loadTeacherResults() {

    try {

        const results = await api("/results/teacher");

        const container =
            document.getElementById("teacherResults");

        container.innerHTML = "";

        if (results.length === 0) {

            container.textContent =
                "No students have submitted examinations yet.";

            return;

        }

        results.forEach(result => {

            container.innerHTML += `

                <div class="result-card">

                    <h3>${escapeHTML(result.student_name)}</h3>

                    <p>Quiz: ${escapeHTML(result.quiz_title)}</p>

                    <p>
                        Score: ${result.score} /
                        ${result.total_marks}
                    </p>

                    <p>Status: ${escapeHTML(result.status)}</p>

                </div>

            `;

        });

    } catch (error) {

        alert(error.message);

    }

}


// RETURN TO DASHBOARD

function backToDashboard() {

    currentQuiz = null;
    currentQuestions = [];

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    openDashboard();

}


// RESTORE LOGIN AFTER PAGE REFRESH

if (token && currentUser) {

    openDashboard();

} else {

    showLogin();

}