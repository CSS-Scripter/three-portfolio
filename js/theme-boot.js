// The part of the theme code that runs before the first paint. vite.config.js inlines
// bootScript into the <head> of every page, so a saved theme never flashes copper first.
// Kept free of browser globals at the top level: vite.config.js imports this in Node.

export const STORAGE_KEY = 'theme';

export const PRESETS = [
    { id: 'copper', label: 'Copper' },
    { id: 'emerald', label: 'Emerald' },
    { id: 'sapphire', label: 'Sapphire' },
];

/** The colours a custom theme sets on <html> (see tokens.css). */
export const CUSTOM_KEYS = ['accent', 'lineage', 'secondary', 'bg'];

/**
 * Applies the saved theme. Inlined as a string, so it can only use its arguments, and it
 * sticks to old syntax so any browser that runs it can at least parse it.
 */
function bootTheme(storageKey, ids, customKeys) {
    try {
        var saved = JSON.parse(localStorage.getItem(storageKey));
        var root = document.documentElement;
        if (!saved || ids.indexOf(saved.id) === -1) return;
        if (saved.id === 'custom' && !saved.custom) return;
        root.setAttribute('data-theme', saved.id);
        if (saved.id !== 'custom') return;
        customKeys.forEach(function (key) {
            var value = saved.custom[key];
            if (/^#[0-9a-f]{6}$/i.test(value)) root.style.setProperty('--' + key, value);
        });
    } catch (error) { /* Storage blocked or unreadable: keep the default */ }
}

export const bootScript = `(${bootTheme})(${[
    STORAGE_KEY,
    [...PRESETS.map((p) => p.id), 'custom'],
    CUSTOM_KEYS,
].map((arg) => JSON.stringify(arg)).join(', ')});`;
