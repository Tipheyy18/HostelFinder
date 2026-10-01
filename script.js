const base_url = "https://group16-be-capstone-project-ochf.onrender.com";
const SIGNUP_ENDPOINT = `${base_url}/auth/register`;
const LOGIN_ENDPOINT = `${base_url}/auth/login`;
const GET_ALL_HOSTEL = `${base_url}/properties`;

document.addEventListener("DOMContentLoaded", () => {
    const isLoggedIn = localStorage.getItem("hostelFinderLoggedIn") === "true";
    document
        .querySelectorAll("[data-auth-login], [data-auth-signup]")
        .forEach((element) => {
            element.hidden = isLoggedIn;
        });
    document.querySelectorAll("[data-auth-logout]").forEach((element) => {
        element.hidden = !isLoggedIn;
        element.addEventListener("click", () => {
            localStorage.removeItem("hostelFinderLoggedIn");
            window.location.href = "/";
        });
    });

    const menuBtn = document.getElementById("menu-btn");
    const closeMenuBtn = document.getElementById("close-menu-btn");
    const mobileMenu = document.getElementById("mobile-menu");
    const mobileOverlay = document.getElementById("mobile-overlay");

    if (menuBtn && closeMenuBtn && mobileMenu && mobileOverlay) {
        let closeMenuTimeout;

        function openMenu() {
            window.clearTimeout(closeMenuTimeout);
            mobileOverlay.classList.remove("hidden");
            requestAnimationFrame(() => {
                mobileOverlay.classList.remove("opacity-0");
            });

            mobileMenu.classList.remove("-translate-x-full");
            menuBtn.setAttribute("aria-expanded", "true");
            document.body.classList.add("overflow-hidden");
        }

        function closeMenu() {
            mobileMenu.classList.add("-translate-x-full");

            mobileOverlay.classList.add("opacity-0");
            closeMenuTimeout = window.setTimeout(() => {
                mobileOverlay.classList.add("hidden");
            }, 300);

            menuBtn.setAttribute("aria-expanded", "false");
            document.body.classList.remove("overflow-hidden");
        }

        menuBtn.addEventListener("click", openMenu);
        closeMenuBtn.addEventListener("click", closeMenu);
        mobileOverlay.addEventListener("click", closeMenu);
    }

    document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
        const passwordField = document.getElementById(
            toggle.dataset.passwordToggle,
        );
        const icon = toggle.querySelector("i");
        if (!passwordField || !icon) return;

        toggle.addEventListener("click", () => {
            const isVisible = passwordField.type === "password";
            passwordField.type = isVisible ? "text" : "password";
            toggle.setAttribute("aria-pressed", String(isVisible));
            toggle.setAttribute(
                "aria-label",
                `${isVisible ? "Hide" : "Show"} ${passwordField.labels[0]?.textContent.toLowerCase() || "password"}`,
            );
            icon.classList.toggle("bx-eye", !isVisible);
            icon.classList.toggle("bx-eye-slash", isVisible);
        });
    });

    if (document.body.dataset.page === "browse") {
        fetch(GET_ALL_HOSTEL)
            .then(async (response) => {
                const hostels = await response.json().catch(() => ({}));
                console.log("GET_ALL_HOSTEL response:", {
                    endpoint: GET_ALL_HOSTEL,
                    status: response.status,
                    body: hostels,
                });

                if (!response.ok) {
                    throw new Error(
                        `Hostel request failed with status ${response.status}`,
                    );
                }
                return hostels;
            })
            .catch((error) => console.error("Failed to fetch hostels:", error));
    }

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        const message = document.getElementById("login-message");
        const submitButton = loginForm.querySelector("button[type='submit']");

        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const payload = {
                email: loginForm.elements.email.value.trim(),
                password: loginForm.elements.password.value,
            };

            submitButton.disabled = true;
            message.textContent = "Logging in...";
            message.classList.remove("text-red-700", "text-green-700");

            try {
                const response = await fetch(LOGIN_ENDPOINT, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const result = await response.json().catch(() => ({}));
                console.log("LOGIN response:", {
                    endpoint: LOGIN_ENDPOINT,
                    status: response.status,
                    body: result,
                });

                if (!response.ok) {
                    throw new Error(
                        result.message ||
                            "Login failed. Check your details and try again.",
                    );
                }

                message.textContent =
                    result.message || "Logged in successfully.";
                message.classList.add("text-green-700");
                localStorage.setItem("hostelFinderLoggedIn", "true");
                window.location.href = "/pages/browse.html";
            } catch (error) {
                message.textContent =
                    error.message || "Unable to log in. Please try again.";
                message.classList.add("text-red-700");
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    const signupForm = document.getElementById("signup-form");
    if (!signupForm) return;

    const message = document.getElementById("signup-message");
    const submitButton = signupForm.querySelector("button[type='submit']");
    const passwordInput = signupForm.elements.password;
    const confirmPasswordInput = signupForm.elements.confirmPassword;

    confirmPasswordInput.addEventListener("input", () => {
        confirmPasswordInput.setCustomValidity("");
    });

    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        confirmPasswordInput.setCustomValidity("");

        if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity("Passwords do not match.");
            confirmPasswordInput.reportValidity();
            return;
        }

        const payload = {
            fullName: signupForm.elements.fullName.value.trim(),
            email: signupForm.elements.email.value.trim(),
            phone: signupForm.elements.phone.value.trim(),
            password: passwordInput.value,
            confirmPassword: confirmPasswordInput.value,
            role: signupForm.elements.role.value,
            schoolId: "6abd1e667434ce241906fe2b",
            // termsAccepted: signupForm.elements.termsAccepted.checked,
        };

        submitButton.disabled = true;
        message.textContent = "Creating your account...";
        message.classList.remove("text-red-700", "text-green-700");

        try {
            const response = await fetch(SIGNUP_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json().catch(() => ({}));
            console.log("SIGNUP response:", {
                endpoint: SIGNUP_ENDPOINT,
                status: response.status,
                body: result,
            });

            if (!response.ok) {
                throw new Error(
                    result.message || "Sign up failed. Please try again.",
                );
            }

            if (!result.user?.id || !result.user?.email || !result.user?.role) {
                throw new Error(
                    "Signup response did not include the user details needed for verification.",
                );
            }

            sessionStorage.setItem(
                "hostelFinderOtpUser",
                JSON.stringify({
                    id: result.user.id,
                    email: result.user.email,
                    role: result.user.role,
                    token: result.token,
                }),
            );
            message.textContent =
                result.message || "Account created successfully.";
            message.classList.add("text-green-700");
            window.location.href = "/pages/student-verification.html";
        } catch (error) {
            message.textContent =
                error.message || "Unable to sign up. Please try again.";
            message.classList.add("text-red-700");
        } finally {
            submitButton.disabled = false;
        }
    });
});
