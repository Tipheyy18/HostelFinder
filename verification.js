const API_BASE_URL = "https://capstone-project-be-oeov.onrender.com";
const OTP_ENDPOINTS = {
    send: `${API_BASE_URL}/auth/otp/send`,
    resend: `${API_BASE_URL}/auth/otp/resend`,
    verify: `${API_BASE_URL}/auth/otp/verify`,
};

document.addEventListener("DOMContentLoaded", () => {
    const statePanels = {
        form: document.getElementById("state-form"),
        otp: document.getElementById("state-otp"),
        loading: document.getElementById("state-loading"),
        success: document.getElementById("state-success"),
    };
    const studentForm = document.getElementById("student-form");
    const formError = document.getElementById("form-error");
    const otpForm = document.getElementById("otp-form");
    const otpInputs = [...document.querySelectorAll(".otp-digit")];
    const otpError = document.getElementById("otp-error");
    const countdown = document.querySelector("#countdown span");
    const resendButton = document.getElementById("resend-code");
    const attemptsRemaining = document.getElementById("attempts-remaining");
    const otpRecipient = document.getElementById("otp-recipient");
    const otpSubmitButton = otpForm.querySelector("button[type='submit']");
    let remainingSeconds = 60;
    let timerId;
    let studentDetails;

    async function postJson(url, payload) {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success === false) {
            throw new Error(result.message || `Request failed with status ${response.status}.`);
        }

        return result;
    }

    function showState(name) {
        Object.entries(statePanels).forEach(([stateName, panel]) => {
            panel.classList.toggle("hidden", stateName !== name);
            if (stateName === "loading") panel.classList.toggle("flex", stateName === name);
        });
    }

    function renderCountdown() {
        const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
        const seconds = String(remainingSeconds % 60).padStart(2, "0");
        countdown.textContent = `${minutes}:${seconds}`;
        resendButton.disabled = remainingSeconds > 0;
    }

    function startCountdown() {
        window.clearInterval(timerId);
        remainingSeconds = 60;
        renderCountdown();
        timerId = window.setInterval(() => {
            remainingSeconds = Math.max(0, remainingSeconds - 1);
            renderCountdown();
            if (remainingSeconds === 0) window.clearInterval(timerId);
        }, 1000);
    }

    function clearOtpInputs() {
        otpInputs.forEach((input) => {
            input.value = "";
            input.classList.remove("border-red-600");
        });
    }

    studentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!studentForm.reportValidity()) return;

        studentDetails = {
            school: studentForm.elements.school.value.trim(),
            matricNumber: studentForm.elements["matric-number"].value.trim(),
            email: studentForm.elements.email.value.trim(),
        };
        formError.classList.add("hidden");
        const submitButton = studentForm.querySelector("button[type='submit']");
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";

        try {
            await postJson(OTP_ENDPOINTS.send, studentDetails);
            otpRecipient.textContent = `We sent a 6-digit code to ${studentDetails.email}.`;
            otpError.classList.add("hidden");
            attemptsRemaining.classList.add("hidden");
            showState("otp");
            startCountdown();
            otpInputs[0].focus();
        } catch (error) {
            formError.textContent = error.message || "Unable to send the verification code. Please try again.";
            formError.classList.remove("hidden");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Send Verification Email";
        }
    });

    otpInputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "").slice(-1);
            otpError.classList.add("hidden");
            input.classList.remove("border-red-600");
            if (input.value && index < otpInputs.length - 1) otpInputs[index + 1].focus();
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Backspace" && !input.value && index > 0) otpInputs[index - 1].focus();
            if (event.key === "ArrowLeft" && index > 0) otpInputs[index - 1].focus();
            if (event.key === "ArrowRight" && index < otpInputs.length - 1) otpInputs[index + 1].focus();
        });

        input.addEventListener("paste", (event) => {
            const pastedCode = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (!pastedCode) return;
            event.preventDefault();
            pastedCode.split("").forEach((digit, digitIndex) => {
                otpInputs[digitIndex].value = digit;
            });
            otpInputs[Math.min(pastedCode.length, otpInputs.length - 1)].focus();
        });
    });

    otpForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const otp = otpInputs.map((input) => input.value).join("");

        if (otp.length !== otpInputs.length) {
            otpInputs.find((input) => !input.value)?.focus();
            otpError.textContent = "Enter all 6 digits to continue.";
            otpError.classList.remove("hidden");
            return;
        }

        otpError.classList.add("hidden");
        otpSubmitButton.disabled = true;
        showState("loading");

        try {
            await postJson(OTP_ENDPOINTS.verify, { email: studentDetails.email, otp });
            window.clearInterval(timerId);
            showState("success");
            window.setTimeout(() => {
                window.location.href = "/pages/login.html";
            }, 1500);
        } catch (error) {
            showState("otp");
            otpError.textContent = error.message || "Invalid code. Please try again.";
            otpError.classList.remove("hidden");
            clearOtpInputs();
            otpInputs.forEach((input) => input.classList.add("border-red-600"));
            otpInputs[0].focus();
        } finally {
            otpSubmitButton.disabled = false;
        }
    });

    resendButton.addEventListener("click", async () => {
        if (remainingSeconds > 0 || !studentDetails) return;

        resendButton.disabled = true;
        otpError.classList.add("hidden");

        try {
            await postJson(OTP_ENDPOINTS.resend, { email: studentDetails.email });
            clearOtpInputs();
            startCountdown();
            otpInputs[0].focus();
        } catch (error) {
            otpError.textContent = error.message || "Unable to resend the code. Please try again.";
            otpError.classList.remove("hidden");
            resendButton.disabled = false;
        }
    });

    document.querySelectorAll("[data-state]").forEach((button) => {
        button.addEventListener("click", () => showState(button.dataset.state));
    });
    document.querySelectorAll("[data-back]").forEach((button) => {
        button.addEventListener("click", () => {
            window.location.href = button.dataset.back;
        });
    });

    const menuButton = document.getElementById("menu-btn");
    const closeMenuButton = document.getElementById("close-menu-btn");
    const mobileMenu = document.getElementById("mobile-menu");
    const mobileOverlay = document.getElementById("mobile-overlay");

    if (menuButton && closeMenuButton && mobileMenu && mobileOverlay) {
        function closeMenu() {
            mobileMenu.classList.add("-translate-x-full");
            mobileOverlay.classList.add("opacity-0");
            window.setTimeout(() => mobileOverlay.classList.add("hidden"), 300);
            menuButton.setAttribute("aria-expanded", "false");
            document.body.classList.remove("overflow-hidden");
        }

        menuButton.addEventListener("click", () => {
            mobileOverlay.classList.remove("hidden");
            requestAnimationFrame(() => mobileOverlay.classList.remove("opacity-0"));
            mobileMenu.classList.remove("-translate-x-full");
            menuButton.setAttribute("aria-expanded", "true");
            document.body.classList.add("overflow-hidden");
        });
        closeMenuButton.addEventListener("click", closeMenu);
        mobileOverlay.addEventListener("click", closeMenu);
    }
});
