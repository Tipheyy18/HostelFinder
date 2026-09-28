document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menu-btn");
  const closeMenuBtn = document.getElementById("close-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileOverlay = document.getElementById("mobile-overlay");

  function openMenu() {
    // Show overlay
    mobileOverlay.classList.remove("hidden");
    setTimeout(() => {
      mobileOverlay.classList.remove("opacity-0");
    }, 10);

    // Slide menu in from left
    mobileMenu.classList.remove("-translate-x-full");
    
    // Prevent scrolling on main body while menu is open
    document.body.classList.add("overflow-hidden");
  }

  function closeMenu() {
    // Slide menu out to left
    mobileMenu.classList.add("-translate-x-full");

    // Fade out overlay then hide it
    mobileOverlay.classList.add("opacity-0");
    setTimeout(() => {
      mobileOverlay.classList.add("hidden");
    }, 300);

    // Restore body scrolling
    document.body.classList.remove("overflow-hidden");
  }

  // Event Listeners
  menuBtn.addEventListener("click", openMenu);
  closeMenuBtn.addEventListener("click", closeMenu);
  mobileOverlay.addEventListener("click", closeMenu);

  // Close menu when pressing Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !mobileMenu.classList.contains("-translate-x-full")) {
      closeMenu();
    }
  });
});