const fs = require("node:fs");
const path = require("node:path");
const { replaceBranding } = require("./brand-utils");

const ROOT = path.resolve(__dirname, "..");
const CONFIG_FILE = path.join(__dirname, "site-brand.json");
const TEXT_EXTENSIONS = new Set([".html", ".js", ".xml", ".txt"]);
const SKIPPED_DIRECTORIES = new Set([".git", "assets", "data", "generatorScripts"]);

function usage() {
  return [
    "Usage: node generatorScripts/set-site-brand.js [--name \"Brand Name\"] [--domain example.com]",
    "Provide at least one option. An omitted option keeps its current value.",
  ].join("\n");
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const optionName = argument === "--name" || argument === "--brand-name" ? "brandName"
      : argument === "--domain" ? "domain"
        : undefined;
    if (!optionName) {
      throw new Error(`Unknown option: ${argument}\n${usage()}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}.\n${usage()}`);
    }
    if (options[optionName] !== undefined) {
      throw new Error(`Option ${argument} was provided more than once.`);
    }
    options[optionName] = value;
    index += 1;
  }
  if (Object.keys(options).length === 0) {
    throw new Error(usage());
  }
  return options;
}

function validateBrandName(value) {
  const brandName = value.trim();
  if (!brandName || /[<>"'`$\\\u0000-\u001f\u007f]/.test(brandName)) {
    throw new Error("Brand name must be non-empty and cannot contain markup, quotes, dollar signs, backslashes, or control characters.");
  }
  return brandName.replace(/\s+/g, " ");
}

function validateDomain(value) {
  const input = value.trim();
  const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`);
  if (
    !["https:", "http:"].includes(url.protocol)
    || !url.hostname
    || url.username
    || url.password
    || url.port
    || (url.pathname !== "/" && url.pathname !== "")
    || url.search
    || url.hash
    || !/^(?=.{1,253}$)(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)(?:\.(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?))+$/i.test(url.hostname)
  ) {
    throw new Error(`Invalid domain: ${value}. Use a hostname such as example.com without a path.`);
  }
  return url.hostname.toLowerCase();
}

function replaceLiteral(value, oldValue, newValue) {
  if (!oldValue || oldValue.toLowerCase() === newValue.toLowerCase()) {
    return value;
  }
  const escaped = oldValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value.replace(new RegExp(escaped, "gi"), () => newValue);
}

function replaceKnownValues(value, oldValues, newValue, replacer) {
  return [...new Set(oldValues.filter(Boolean))].reduce(
    (result, oldValue) => replacer(result, oldValue, newValue),
    value,
  );
}

function updateFiles(directory, previousBrand, nextBrand, previousDomain, nextDomain, counts) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) {
      continue;
    }
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      updateFiles(filePath, previousBrand, nextBrand, previousDomain, nextDomain, counts);
      continue;
    }
    if (!entry.isFile() || !TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }
    const original = fs.readFileSync(filePath, "utf8");
    const updatedDomain = replaceKnownValues(
      original,
      [previousDomain, "brandname.com"],
      nextDomain,
      replaceLiteral,
    );
    const updated = replaceKnownValues(
      updatedDomain,
      [previousBrand, "BRANDNAME"],
      nextBrand,
      (content, oldBrand) => replaceBranding(
        content,
        oldBrand,
        nextBrand,
        path.extname(entry.name).toLowerCase() === ".html",
      ),
    );
    if (updated !== original) {
      fs.writeFileSync(filePath, updated, "utf8");
      counts.files += 1;
    }
  }
}

try {
  const options = parseArguments(process.argv.slice(2));
  const current = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  if (typeof current.brandName !== "string" || typeof current.domain !== "string") {
    throw new Error("generatorScripts/site-brand.json must define string values for brandName and domain.");
  }

  const next = {
    brandName: options.brandName === undefined ? current.brandName : validateBrandName(options.brandName),
    domain: options.domain === undefined ? current.domain : validateDomain(options.domain),
  };
  const counts = { files: 0 };
  updateFiles(ROOT, current.brandName, next.brandName, current.domain, next.domain, counts);
  fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`Updated brand name to "${next.brandName}" and domain to "${next.domain}" in ${counts.files} files.`);
} catch (error) {
  console.error(`Brand update failed: ${error.message}`);
  process.exitCode = 1;
}
