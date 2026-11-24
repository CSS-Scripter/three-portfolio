// Colour themes: three presets (tokens.css) and one the visitor makes themselves.
// The choice is kept in localStorage; theme-boot.js applies it before the first paint,
// this module switches it later and tells the canvases and the 3D scene.

import { CUSTOM_KEYS, PRESETS, STORAGE_KEY } from './theme-boot';

export { PRESETS };

const EVENT = 'themechange';

function load() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved && typeof saved === 'object') return saved;
    } catch { /* Fall through */ }
    return {};
}

/** The active theme: { id, custom }, where custom is the last custom theme made, if any. */
export function currentTheme() {
    const saved = load();
    const known = saved.id === 'custom' ? Boolean(saved.custom) : PRESETS.some((p) => p.id === saved.id);
    return { id: known ? saved.id : PRESETS[0].id, custom: saved.custom ?? null };
}

function apply({ id, custom }) {
    const root = document.documentElement;
    root.dataset.theme = id;
    for (const key of CUSTOM_KEYS) {
        if (id === 'custom' && custom?.[key]) root.style.setProperty(`--${key}`, custom[key]);
        else root.style.removeProperty(`--${key}`);
    }
    updateChrome();
    document.dispatchEvent(new CustomEvent(EVENT, { detail: { id } }));
}

/**
 * Switches to a preset by id, or to 'custom' with { accent, secondary, bg } (kept
 * readable on a dark background, see makeCustom). Without colours, 'custom' reuses the
 * last custom theme. Saved for the next visit.
 */
export function setTheme(id, colors) {
    const saved = load();
    // The first time Custom is picked, it starts as a copy of the theme in use
    const fallback = id === 'custom' ? makeCustom(palette()) : null;
    const custom = colors ? makeCustom(colors) : saved.custom ?? fallback;
    const theme = { id, custom };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch { /* Private mode: still switch, just don't remember */ }
    apply(theme);
    return theme;
}

/** Runs fn whenever the theme changes, here or in another tab. */
export function onThemeChange(fn) {
    document.addEventListener(EVENT, fn);
}

// Another tab changed the theme
window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === null) apply(currentTheme());
});

/** The theme's colours as the browser resolved them, for canvas and three.js. */
export function palette(el = document.documentElement) {
    const style = getComputedStyle(el);
    const get = (name) => style.getPropertyValue(name).trim();
    return {
        bg: get('--bg'),
        fg: get('--fg'),
        accent: get('--accent'),
        lineage: get('--lineage'),
        secondary: get('--secondary'),
        dimmed: get('--dimmed'),
    };
}

/** The favicon and the browser's toolbar colour follow the theme. */
function updateChrome() {
    const { bg, accent } = palette();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    const icon = document.querySelector('link[rel="icon"]');
    if (icon) {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='15' fill='${bg}'/><circle cx='16' cy='16' r='7' fill='${accent}'/></svg>`;
        icon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }
}

/* ---------- Custom themes ---------- */

// The site is built for light text on a dark background, so custom colours are held to
// that: accents bright enough to read on the background, the background dark enough for
// the text. Lightness is OKLCH lightness, so the limits hold for every hue.
const ACCENT_LIGHTNESS = [0.58, 0.9];
const BG_LIGHTNESS = [0, 0.24];

/** Clamps the visitor's picks and derives the lineage colour from the accent. */
export function makeCustom({ accent, secondary, bg }) {
    const [L, C, H] = toOklch(accent);
    return {
        accent: withLightness(accent, ACCENT_LIGHTNESS),
        // Like copper's lineage: lighter, and a bit less saturated
        lineage: fromOklch(clamp(L, ...ACCENT_LIGHTNESS) + 0.137, C * 0.6, H),
        secondary: withLightness(secondary, ACCENT_LIGHTNESS),
        bg: withLightness(bg, BG_LIGHTNESS),
    };
}

const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

function withLightness(hex, [min, max]) {
    const [L, C, H] = toOklch(hex);
    return L >= min && L <= max ? hex.toLowerCase() : fromOklch(clamp(L, min, max), C, H);
}

/** '#rrggbb', 'rgb(r, g, b)' → [r, g, b] in 0–1 */
function parseColor(css) {
    const hex = css.match(/^#([0-9a-f]{6})$/i);
    if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16) / 255);
    const rgb = css.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (rgb) return rgb.slice(1, 4).map((v) => Number(v) / 255);
    return [0, 0, 0];
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function toOklch(css) {
    const [r, g, b] = parseColor(css).map(toLinear);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, Math.hypot(A, B), Math.atan2(B, A)];
}

/** Back to '#rrggbb', lowering the chroma until the colour fits in sRGB. */
function fromOklch(L, C, H) {
    for (let chroma = C; ; chroma *= 0.95) {
        const a = chroma * Math.cos(H);
        const b = chroma * Math.sin(H);
        const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
        const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
        const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
        const rgb = [
            4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
        ];
        if (chroma < 0.001 || rgb.every((c) => c >= -0.0005 && c <= 1.0005)) {
            return `#${rgb.map((c) => Math.round(clamp(toGamma(clamp(c, 0, 1)), 0, 1) * 255).toString(16).padStart(2, '0')).join('')}`;
        }
    }
}
