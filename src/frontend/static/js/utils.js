function hslToHex(hsl) {
  const h = hsl[0];
  let s = hsl[1];
  let l = hsl[2];

  s /= 100;
  l /= 100;

  const f = (n) => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
  };

  return `#${((1 << 24) | (f(0) << 16) | (f(8) << 8) | f(4)).toString(16).slice(1)}`;
}

function parseHsl(hsl) {
  const hslMatch = hsl.match(/\d+/g); // Extracts numbers
  if (hslMatch) {
    const [hue, saturation, lightness] = hslMatch.map(Number);
    return [hue, saturation, lightness]
  }
}

function fixHTML(text) {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}