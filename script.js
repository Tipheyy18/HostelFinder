const menuBtn = document.getElementById("menu-btn");
const closeMenuBtn = document.getElementById("close-menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
const mobileOverlay = document.getElementById("mobile-overlay");

menuBtn.addEventListener("click", function menuOpen(){
    // mobileOverlay.classList.remove("hidden");
    // setTimeout(() => {
    //     mobileOverlay.classList.remove("opacity-0");
    // }, 10);

    // mobileMenu.classList.remove("-translate-x-full");

    // document.body.classList.add("overflow-hidden");

    console.log("Menu Opened");
})

closeMenuBtn.addEventListener("click", () => {
    mobileMenu.classList.add("-translate-x-full");

    mobileOverlay.classList.add("opacity-0");
    setTimeout(() => {
        mobileOverlay.classList.add("hidden");
    }, 300);

    document.body.classList.remove("overflow-hidden");

    console.log("Menu Closed");
})

mobileOverlay.addEventListener("click", () => {
    mobileMenu.classList.add("-translate-x-full");

    mobileOverlay.classList.add("opacity-0");
    setTimeout(() => {
        mobileOverlay.classList.add("hidden");
    }, 300);

    document.body.classList.remove("overflow-hidden");

    console.log("Menu Closed");
})

// Close menu when pressing Escape key
// document.addEventListener("keydown", (e) => {
//     if (e.key === "Escape" && !mobileMenu.classList.contains("-translate-x-full")) {
//         closeMenu();
//     }
// });