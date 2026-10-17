// menu button features

const searchQuery = new URLSearchParams(window.location.search).get("q");
if (searchQuery) {
  document.querySelectorAll('input[name="q"]').forEach((input) => {
    input.value = searchQuery;
  });
}

const menuToggle = document.querySelector(".menu-toggle");
const navbar = document.querySelector(".navbar-wrapper");
const closeButton = document.querySelector(".menu-close");
const backdrop = document.querySelector(".menu-backdrop");

document.querySelectorAll(".app-detail-screenshot-carousel").forEach((carousel) => {
  const gallery = carousel.querySelector(".app-detail-screenshots");
  if (!gallery) {
    return;
  }

  carousel.querySelectorAll("[data-screenshot-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = Number(button.dataset.screenshotDirection);
      const firstScreenshot = gallery.querySelector("figure");
      const gap = Number.parseFloat(getComputedStyle(gallery).columnGap) || 0;
      const distance = firstScreenshot ? firstScreenshot.getBoundingClientRect().width + gap : gallery.clientWidth;
      gallery.scrollBy({ left: direction * distance, behavior: "smooth" });
    });
  });
});

if (menuToggle && navbar) {
  const setMenuOpen = (isOpen) => {
    navbar.classList.toggle("is-menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    document.body.classList.toggle("menu-open", isOpen);
  };

  menuToggle.addEventListener("click", () => {
    setMenuOpen(!navbar.classList.contains("is-menu-open"));
  });

  [closeButton, backdrop].forEach((button) => {
    button?.addEventListener("click", () => setMenuOpen(false));
  });

  navbar.querySelectorAll(".nav-menu a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      setMenuOpen(false);
    }
  });
}
