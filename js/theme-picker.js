// <theme-picker>: a pill that opens a small panel with the preset themes and a custom
// one, made from three colour inputs. Used in the home page header and the blog's top bar.

import { PRESETS, currentTheme, onThemeChange, palette, setTheme } from './theme';

let count = 0;

class ThemePicker extends HTMLElement {
    connectedCallback() {
        if (this.panel) return;
        const id = `theme-panel-${++count}`;

        this.innerHTML = `
            <button type="button" class="theme-toggle" popovertarget="${id}">
                <span class="theme-dot" aria-hidden="true"></span>Theme
            </button>
            <div class="theme-panel" id="${id}" popover>
                <fieldset class="theme-presets">
                    <legend>Theme</legend>
                    ${[...PRESETS, { id: 'custom', label: 'Custom' }].map((p) => `
                    <label class="theme-option"${p.id === 'custom' ? '' : ` data-theme="${p.id}"`}>
                        <input type="radio" name="${id}" value="${p.id}">
                        <span class="theme-swatch" aria-hidden="true"></span>${p.label}
                    </label>`).join('')}
                </fieldset>
                <div class="theme-custom" role="group" aria-labelledby="${id}-custom">
                    <p class="theme-heading" id="${id}-custom">Your colours</p>
                    <label>Accent <input type="color" name="accent"></label>
                    <label>Secondary <input type="color" name="secondary"></label>
                    <label>Background <input type="color" name="bg"></label>
                    <p class="theme-note">The accent marks what’s in focus, the secondary colour joins it in the blog’s figures. Colours are kept readable on a dark background.</p>
                </div>
            </div>`;

        this.toggle = this.querySelector('.theme-toggle');
        this.panel = this.querySelector('.theme-panel');
        this.radios = [...this.querySelectorAll('input[type="radio"]')];
        this.inputs = [...this.querySelectorAll('input[type="color"]')];
        this.customOption = this.radios.find((r) => r.value === 'custom').closest('label');

        this.radios.forEach((radio) => radio.addEventListener('change', () => setTheme(radio.value)));

        // Live while dragging (without moving the input being dragged); on release, show
        // where a colour was held to the limits
        this.inputs.forEach((input) => {
            input.addEventListener('input', () => {
                this.editing = input;
                setTheme('custom', this.picked());
                this.editing = null;
            });
            input.addEventListener('change', () => this.sync());
        });

        this.panel.addEventListener('toggle', (event) => {
            if (event.newState === 'open') {
                this.place();
                window.addEventListener('resize', this.place);
                window.addEventListener('scroll', this.place, { passive: true });
            } else {
                window.removeEventListener('resize', this.place);
                window.removeEventListener('scroll', this.place);
            }
            this.toggle.setAttribute('aria-expanded', String(event.newState === 'open'));
        });

        onThemeChange(() => this.sync());
        this.sync();
    }

    picked() {
        return Object.fromEntries(this.inputs.map((input) => [input.name, input.value]));
    }

    /** Reflects the active theme in the radios, the inputs and the custom swatch. */
    sync() {
        const { id, custom } = currentTheme();
        this.radios.forEach((radio) => { radio.checked = radio.value === id; });
        this.panel.classList.toggle('is-custom', id === 'custom');

        // The inputs show the custom theme, or start from the theme in use
        const colors = custom ?? palette();
        this.inputs.forEach((input) => {
            if (input !== this.editing) input.value = toHex(colors[input.name]);
        });
        this.customOption.classList.toggle('has-colors', Boolean(custom));
        if (custom) this.customOption.style.setProperty('--accent', custom.accent);
    }

    /** Below the pill, kept on screen. */
    place = () => {
        const button = this.toggle.getBoundingClientRect();
        const { width } = this.panel.getBoundingClientRect();
        const margin = 12;
        const left = Math.min(Math.max(margin, button.left), window.innerWidth - width - margin);
        this.panel.style.left = `${Math.max(margin, left)}px`;
        this.panel.style.top = `${button.bottom + 8}px`;
    };
}

/** Colour inputs only take '#rrggbb'. */
function toHex(css = '') {
    if (/^#[0-9a-f]{6}$/i.test(css)) return css.toLowerCase();
    const rgb = css.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    return rgb ? `#${rgb.slice(1, 4).map((v) => Number(v).toString(16).padStart(2, '0')).join('')}` : '#000000';
}

customElements.define('theme-picker', ThemePicker);
