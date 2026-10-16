const base_url = "https://hostelfinderbe.onrender.com";
const SIGNUP_ENDPOINT = `${base_url}/auth/register`;
const LOGIN_ENDPOINT = `${base_url}/auth/login`;
const GET_ALL_HOSTEL = `${base_url}/properties`;

window.showToast = (message, type = "success", duration = 3500) => {
    if (!message) return;

    let container = document.getElementById("site-toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "site-toast-container";
        container.className =
            "fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2";
        container.setAttribute("aria-live", "polite");
        container.setAttribute("aria-atomic", "true");
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.className =
        "translate-x-2 rounded-xl px-4 py-3 text-sm font-semibold text-white opacity-0 shadow-lg transition-all duration-200";
    toast.classList.add(
        type === "error"
            ? "bg-red-700"
            : type === "info"
              ? "bg-[#3157D5]"
              : "bg-[#219653]",
    );
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove("translate-x-2", "opacity-0");
        toast.classList.add("translate-x-0", "opacity-100");
    });

    window.setTimeout(() => {
        toast.classList.remove("translate-x-0", "opacity-100");
        toast.classList.add("translate-x-2", "opacity-0");
        window.setTimeout(() => toast.remove(), 250);
    }, duration);
};

document.addEventListener("DOMContentLoaded", () => {
    const isLoggedIn = localStorage.getItem("hostelFinderLoggedIn") === "true";
    document
        .querySelectorAll("[data-auth-login], [data-auth-signup]")
        .forEach((element) => {
            element.hidden = isLoggedIn;
        });
    document.querySelectorAll("[data-auth-list-property]").forEach((element) => {
        element.href = isLoggedIn
            ;"/pages/login.html";
    });
    document.querySelectorAll("[data-auth-logout]").forEach((element) => {
        element.hidden = !isLoggedIn;
        element.addEventListener("click", () => {
            localStorage.removeItem("hostelFinderLoggedIn");
            localStorage.removeItem("hostelFinderToken");
            localStorage.removeItem("hostelFinderUserId");
            window.location.href = "/";
        });
    });

    // Mobile menu functionality
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

    // Password toggle functionality
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

    // Browse page data fetching and rendering is handled by js/browseProperties.js
    // Login form submission handler
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

                const redirectByRole = {
                    student: "/pages/browse.html",
                    provider: "/pages/listProperty.html",
                    admin: "/pages/dashboard.html",
                };
                const redirectPath =
                    redirectByRole[result.user?.role?.toLowerCase()];
                if (!redirectPath) {
                    throw new Error(
                        "Login response did not include a supported user role.",
                    );
                }

                message.textContent =
                    result.message || "Logged in successfully.";
                message.classList.add("text-green-700");
                if (typeof result.token === "string" && result.token) {
                    localStorage.setItem("hostelFinderToken", result.token);
                } else {
                    throw new Error(
                        "Login response did not include an authentication token. Please try again.",
                    );
                }
                const userId = result.user.id || result.user._id;
                if (userId) {
                    localStorage.setItem("hostelFinderUserId", String(userId));
                }
                localStorage.setItem("hostelFinderLoggedIn", "true");
                window.showToast(message.textContent, "success");
                await new Promise((resolve) => window.setTimeout(resolve, 800));
                window.location.href = redirectPath;
            } catch (error) {
                message.textContent =
                    error.message || "Unable to log in. Please try again.";
                message.classList.add("text-red-700");
                window.showToast(message.textContent, "error");
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    // Sign-up form submission handler
    const signupForm = document.getElementById("signup-form");
    if (!signupForm) return;

    const message = document.getElementById("signup-message");
    const submitButton = signupForm.querySelector("button[type='submit']");
    const passwordInput = signupForm.elements.password;
    const confirmPasswordInput = signupForm.elements.confirmPassword;

    confirmPasswordInput.addEventListener("input", () => {
        confirmPasswordInput.setCustomValidity("");
    });

    // Sign-up form submission handler
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
            window.showToast(message.textContent, "success");
            await new Promise((resolve) => window.setTimeout(resolve, 800));
            window.location.href = "/pages/verification.html"
                // result.user.role === "landlord"
                //     ? "/pages/landlord-verification.html"
                //     : "/pages/student-verification.html";
        } catch (error) {
            message.textContent =
                error.message || "Unable to sign up. Please try again.";
            message.classList.add("text-red-700");
            window.showToast(message.textContent, "error");
        } finally {
            submitButton.disabled = false;
        }
    });
});
