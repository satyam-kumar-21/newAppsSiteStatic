// menu button features

const searchQuery = new URLSearchParams(window.location.search).get("q");
if (searchQuery) {
  document.querySelectorAll('input[name="q"]').forEach((input) => {
    input.value = searchQuery;
  });
}

function normalizeSearchValue(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function searchCatalogItems(query) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery || !Array.isArray(window.catalogSearchItems)) {
    return [];
  }

  const queryTerms = normalizedQuery.split(/\s+/);
  return window.catalogSearchItems
    .map((item) => {
      const title = normalizeSearchValue(item.title);
      const category = normalizeSearchValue(item.categoryName);
      const developer = normalizeSearchValue(item.developer);
      const description = normalizeSearchValue(item.description);
      const fields = [title, category, developer, description];
      if (!queryTerms.every((term) => fields.some((field) => field.includes(term)))) {
        return null;
      }

      const titleMatches = queryTerms.filter((term) => title.includes(term)).length;
      const categoryMatches = queryTerms.filter((term) => category.includes(term)).length;
      const developerMatches = queryTerms.filter((term) => developer.includes(term)).length;
      const descriptionMatches = queryTerms.filter((term) => description.includes(term)).length;
      const score = (title === normalizedQuery ? 1000 : title.startsWith(normalizedQuery) ? 800 : titleMatches * 100)
        + categoryMatches * 40
        + developerMatches * 20
        + descriptionMatches * 5;
      return { item, score };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title))
    .map(({ item }) => item);
}

window.searchCatalogItems = searchCatalogItems;

document.querySelectorAll(".search-box input[name='q']").forEach((input, index) => {
  const form = input.closest("form");
  if (!form) {
    return;
  }

  const suggestions = document.createElement("div");
  suggestions.className = "search-suggestions";
  suggestions.id = `search-suggestions-${index + 1}`;
  suggestions.setAttribute("role", "listbox");
  suggestions.hidden = true;
  form.append(suggestions);
  input.setAttribute("autocomplete", "off");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", suggestions.id);
  input.setAttribute("aria-expanded", "false");

  const closeSuggestions = () => {
    suggestions.hidden = true;
    suggestions.replaceChildren();
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };

  const renderSuggestions = () => {
    const query = input.value.trim();
    suggestions.replaceChildren();
    input.removeAttribute("aria-activedescendant");
    if (!query) {
      closeSuggestions();
      return;
    }

    const results = searchCatalogItems(query).slice(0, 8);
    if (!results.length) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "search-suggestion-empty";
      emptyMessage.textContent = "No matching apps or games";
      suggestions.append(emptyMessage);
    } else {
      results.forEach((item, resultIndex) => {
        const link = document.createElement("a");
        link.className = "search-suggestion";
        link.href = item.appurl;
        link.id = `${suggestions.id}-option-${resultIndex + 1}`;
        link.setAttribute("role", "option");
        link.setAttribute("aria-selected", "false");

        const title = document.createElement("span");
        title.className = "search-suggestion-title";
        title.textContent = item.title;

        const detail = document.createElement("span");
        detail.className = "search-suggestion-detail";
        detail.textContent = `${item.categoryName || "Catalog"} · ${item.type === "games" ? "Game" : "App"}`;

        link.append(title, detail);
        suggestions.append(link);
      });
    }
    suggestions.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  input.addEventListener("input", renderSuggestions);
  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      renderSuggestions();
    }
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSuggestions();
    } else if (event.key === "ArrowDown" && !suggestions.hidden) {
      const firstSuggestion = suggestions.querySelector(".search-suggestion");
      if (firstSuggestion) {
        event.preventDefault();
        firstSuggestion.focus();
      }
    }
  });
  document.addEventListener("click", (event) => {
    if (!form.contains(event.target)) {
      closeSuggestions();
    }
  });
});

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
