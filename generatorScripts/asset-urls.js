const ASSET_BASE_URL = (process.env.ASSET_BASE_URL || "").replace(/\/+$/, "");

function assetUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid asset URL: ${value}`);
  }

  const assetPath = value.trim();
  if (/^https?:\/\//i.test(assetPath)) {
    const url = new URL(assetPath);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error(`Unsupported asset URL protocol: ${assetPath}`);
    }
    return url.href;
  }
  if (!assetPath.startsWith("/") || assetPath.startsWith("//") || assetPath.includes("\\") || assetPath.split("/").includes("..")) {
    throw new Error(`Invalid asset path: ${assetPath}`);
  }
  return ASSET_BASE_URL ? new URL(assetPath, `${ASSET_BASE_URL}/`).href : assetPath;
}

module.exports = { assetUrl };
