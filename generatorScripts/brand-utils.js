// Want to change domain and brand name run this command in root directory of the project:

// node generatorScripts/set-site-brand.js --name "BRAND NAME" --domain domain.com       


function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderBrandMarkup(brandName, highlightClass) {
  const words = brandName.trim().split(/\s+/);
  const emphasized = words.pop();
  const leading = words.join(" ");
  const classAttribute = highlightClass ? ' class="highlight"' : "";
  return `${escapeHtml(leading)}${leading ? " " : ""}<span${classAttribute}>${escapeHtml(emphasized)}</span>`;
}

function replaceBranding(content, oldName, newName, escapeText = false) {
  const logoText = `<span class="logo-text">${renderBrandMarkup(newName, true)}</span>`;
  const updated = content
    .replace(
      /<span\b(?=[^>]*\bclass="[^"]*\blogo-text\b[^"]*")[^>]*>[\s\S]*?<\/span\s*>\s*<\/span\s*>/gi,
      logoText,
    )
    .replace(
      /(<a\b[^>]*\bclass="(?:drawer-brand|footer-brand)"[^>]*>)[\s\S]*?(<\/a>)/gi,
      (_match, openingTag, closingTag) => `${openingTag}${renderBrandMarkup(newName, false)}${closingTag}`,
    );
  if (!oldName) {
    return updated;
  }

  const replacement = escapeText ? escapeHtml(newName) : newName;
  const escapedNames = [...new Set([oldName, escapeHtml(oldName)])];
  return escapedNames.reduce((result, value) => {
    const pattern = new RegExp(
      `(?<![a-z\\d.-])${escapeRegExp(value)}(?![a-z\\d])(?!\\.[a-z\\d-]+(?:\\.[a-z\\d-]+)*)`,
      "gi",
    );
    return result.replace(pattern, () => replacement);
  }, updated);
}

module.exports = { replaceBranding };
