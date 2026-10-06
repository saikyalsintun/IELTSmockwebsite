// ============================================================
// IELTS PRACTICE - STUDENT AUTHENTICATION GUARD
// ============================================================

(function () {

    // --------------------------------------------------------
    // GOOGLE APPS SCRIPT WEB APP URL
    // --------------------------------------------------------
    const GOOGLE_APPS_SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbzkYktZQFtycRgG3K6Hi6MsvUtP8RsqOq6QxB598FVYefGmpe_oS3R518GZ0821bNbYtw/exec";


    // --------------------------------------------------------
    // LOGIN STORAGE KEY
    // --------------------------------------------------------
    const AUTH_STORAGE_KEY = "ieltsStudentSession";


    // --------------------------------------------------------
    // GET SAVED STUDENT SESSION
    // --------------------------------------------------------
    function getStudentSession() {

        try {

            const saved =
                localStorage.getItem(AUTH_STORAGE_KEY);

            if (!saved) {
                return null;
            }

            return JSON.parse(saved);

        } catch (error) {

            console.error(
                "Unable to read student session:",
                error
            );

            localStorage.removeItem(AUTH_STORAGE_KEY);

            return null;
        }
    }


    // --------------------------------------------------------
    // CHECK WHETHER STUDENT IS LOGGED IN
    // --------------------------------------------------------
    function isStudentLoggedIn() {

        const session = getStudentSession();

        if (!session) {
            return false;
        }

        if (!session.studentId ||
            !session.username) {

            return false;
        }

        return true;
    }


    // --------------------------------------------------------
    // REDIRECT TO MAIN LOGIN PAGE
    // --------------------------------------------------------
    function redirectToLogin() {

        /*
         * If this file is inside:
         *
         * IELTSR/
         * IELTS5/
         * IELTS6/
         * etc.
         *
         * ../index.html means the main IELTS login page.
         */

        window.location.href = "../index.html";
    }


    // --------------------------------------------------------
    // PROTECT CURRENT PAGE
    // --------------------------------------------------------
    function protectPage() {

        if (!isStudentLoggedIn()) {

            redirectToLogin();

            return false;
        }

        return true;
    }


    // --------------------------------------------------------
    // LOGOUT
    // --------------------------------------------------------
    function logoutStudent() {

        localStorage.removeItem(AUTH_STORAGE_KEY);

        redirectToLogin();
    }


    // --------------------------------------------------------
    // GET CURRENT STUDENT
    // --------------------------------------------------------
    function getCurrentStudent() {

        return getStudentSession();
    }


    // --------------------------------------------------------
    // MAKE FUNCTIONS AVAILABLE GLOBALLY
    // --------------------------------------------------------
    window.IELTSAuth = {

        getSession: getStudentSession,

        isLoggedIn: isStudentLoggedIn,

        protect: protectPage,

        logout: logoutStudent,

        getCurrentStudent: getCurrentStudent

    };


    // --------------------------------------------------------
    // AUTOMATIC LOGIN CHECK
    // --------------------------------------------------------
    document.addEventListener(
        "DOMContentLoaded",
        function () {

            protectPage();

        }
    );

})();
