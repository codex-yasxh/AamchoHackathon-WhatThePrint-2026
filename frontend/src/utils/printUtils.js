export function guessPages(file) {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".tiff", ".tif"].includes(ext)) return 1;
  return Math.max(1, Math.round(file.size / 70000));
}

export function formatINR(value) {
  return `\u20B9${value.toFixed(2)}`;
}

export function getPaperRate(paper, rates) {
  if (paper === "matte") return rates.matte;
  if (paper === "glossy") return rates.glossy;
  return 0;
}

export function getPaperLabel(paper) {
  if (paper === "matte") return "Matte 90gsm";
  if (paper === "glossy") return "Glossy 120gsm";
  return "Plain 75gsm";
}

export function getBindingCost(binding, rates) {
  if (binding === "staple") return rates.staple;
  if (binding === "spiral") return rates.spiral;
  return 0;
}

export function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
