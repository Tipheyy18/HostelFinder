<<<<<<< HEAD
document.addEventListener("DOMContentLoaded", () => {
    const menuBtn = document.getElementById("menu-btn");
    const closeMenuBtn = document.getElementById("close-menu-btn");
    const mobileMenu = document.getElementById("mobile-menu");
    const mobileOverlay = document.getElementById("mobile-overlay");

    if (!menuBtn || !closeMenuBtn || !mobileMenu || !mobileOverlay) {
        console.error("One or more mobile menu elements were not found in the DOM.");
        return;
    }

    function openMenu() {
        mobileOverlay.classList.remove("hidden");
        setTimeout(() => {
            mobileOverlay.classList.remove("opacity-0");
        }, 10);

        mobileMenu.classList.remove("-translate-x-full");
        document.body.classList.add("overflow-hidden");
        console.log("Menu Opened");
    }

    function closeMenu() {
        mobileMenu.classList.add("-translate-x-full");

        mobileOverlay.classList.add("opacity-0");
        setTimeout(() => {
            mobileOverlay.classList.add("hidden");
        }, 300);

        document.body.classList.remove("overflow-hidden");
        console.log("Menu Closed");
    }

    menuBtn.addEventListener("click", openMenu);
    closeMenuBtn.addEventListener("click", closeMenu);
    mobileOverlay.addEventListener("click", closeMenu);
});
=======
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
      },
    },
  },
}
>>>>>>> 746c4dcc6bdd0eec78bd1b1b56d256a814932f06
