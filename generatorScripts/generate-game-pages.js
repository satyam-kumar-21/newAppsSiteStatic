const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { assetUrl } = require("./asset-urls");

const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "games.json");
const APPS_SCRIPT_FILE = path.join(ROOT, "scripts", "apps.js");
const GAMES_SCRIPT_FILE = path.join(ROOT, "scripts", "games.js");

function createGamesListingScript() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const subcategories = data?.games?.subcategories;
  if (!subcategories || typeof subcategories !== "object" || Array.isArray(subcategories)) {
    throw new Error("Expected data/games.json to contain games.subcategories.");
  }

  const categoryLabels = {
    "action": "Action",
    "racing": "Racing",
  };
  const categories = Object.entries(subcategories).map(([key, category]) => {
    if (!Array.isArray(category?.apps)) {
      throw new Error(`Game category "${key}" must contain a games array.`);
    }
    return {
      name: category.name || categoryLabels[key] || key.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
      slug: category.slug || key,
      apps: category.apps.map(({ title, ratings, appurl, icon }) => ({
        title,
        ratings,
        appurl: typeof appurl === "string"
          ? appurl.replace(/^\/(?:games?|apps)\//, "/app/").replace(/\/+$/, "").replace(/\/index\.html$/, "")
          : appurl,
        icon: icon ? assetUrl(icon) : icon,
      })),
    };
  });

  const appsScript = fs.readFileSync(APPS_SCRIPT_FILE, "utf8");
  const rendererStart = appsScript.indexOf("const categoryList = document.querySelector");
  if (rendererStart < 0) {
    throw new Error("Could not locate the shared category renderer in apps.js.");
  }
  let renderer = appsScript.slice(rendererStart)
    .replaceAll("#apps-category-list", "#games-category-list")
    .replaceAll("#apps-page-title", "#games-page-title")
    .replaceAll("#apps-page-description", "#games-page-description")
    .replaceAll("apps-${category.slug}", "games-${category.slug}")
    .replaceAll("apps-${selectedCategory.slug}", "games-${selectedCategory.slug}")
    .replaceAll("apps.html", "games.html")
    .replaceAll("/apps/index.html", "/games")
    .replaceAll("/apps?category=", "/games?category=")
    .replaceAll('new URL("/apps"', 'new URL("/games"')
    .replaceAll("App Category Not Found", "Game Category Not Found")
    .replaceAll("category apps", "category games")
    .replaceAll("app in our catalog", "game in our catalog")
    .replaceAll("apps in our catalog", "games in our catalog")
    .replaceAll("each app.", "each game.")
    .replaceAll("app icon", "game icon");
  renderer = renderer
    .replaceAll("app category not found", "game category not found")
    .replaceAll("requested app category", "requested game category")
    .replaceAll("all app categories", "all game categories")
    .replaceAll(" apps in our catalog", " games in our catalog")
    .replaceAll("All ${selectedCategory.name} apps", "All ${selectedCategory.name} games")
    .replaceAll("All ${selectedCategory.name} Apps", "All ${selectedCategory.name} Games")
    .replaceAll("View all ${category.name} apps", "View all ${category.name} games");

  const header = `const appCategories = ${JSON.stringify(categories, null, 2)};\n\n`;
  return `${header}${renderer}`;
}

try {
  const gamesScript = createGamesListingScript();
  fs.writeFileSync(GAMES_SCRIPT_FILE, gamesScript, "utf8");
  execFileSync(process.execPath, [path.join(ROOT, "generatorScripts", "generate-app-pages.js"), "games"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  console.log(`Updated ${path.relative(ROOT, GAMES_SCRIPT_FILE)} with embedded data from ${path.relative(ROOT, DATA_FILE)}.`);
} catch (error) {
  console.error(`Game page generation failed: ${error.message}`);
  process.exitCode = 1;
}
