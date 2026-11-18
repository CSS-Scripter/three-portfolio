// Controls under a figure: sliders, pill buttons, a play button and a readout.

function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
}

/**
 * @param {{
 *   label: string, min: number, max: number, value: number, step?: number,
 *   log?: boolean, tone?: 're' | 'im' | 'accent', format?: (value: number) => string,
 *   onInput: (value: number) => void,
 * }} options
 */
export function slider({ label, min, max, value, step = 0.01, log = false, tone, format = String, onInput }) {
    const wrapper = element('label', 'control');
    const name = element('span', 'control-label');
    if (tone === 're' || tone === 'im') name.append(element('span', `swatch swatch-${tone}`));
    name.append(label);

    // A logarithmic slider runs 0…1000 internally
    const toSlider = (v) => (log ? (Math.log(v / min) / Math.log(max / min)) * 1000 : v);
    const fromSlider = (s) => (log ? min * Math.pow(max / min, s / 1000) : s);

    const input = element('input');
    input.type = 'range';
    input.min = log ? 0 : min;
    input.max = log ? 1000 : max;
    input.step = log ? 1 : step;
    if (tone) input.dataset.tone = tone;

    const output = element('output', 'control-value');
    const show = (v) => {
        output.textContent = format(v);
        input.setAttribute('aria-valuetext', format(v));
    };

    input.addEventListener('input', () => {
        const v = fromSlider(Number(input.value));
        show(v);
        onInput(v);
    });

    const set = (v) => {
        input.value = toSlider(v);
        show(v);
    };
    set(value);

    wrapper.append(name, input, output);
    return { element: wrapper, set };
}

export function button(label, onClick, { pressed } = {}) {
    const el = element('button', 'pill', label);
    el.type = 'button';
    if (pressed !== undefined) el.setAttribute('aria-pressed', String(pressed));
    el.addEventListener('click', onClick);
    return el;
}

/** A group of pill buttons of which exactly one is pressed. */
export function choice(options, value, onChange) {
    const group = element('div', 'buttons');
    group.setAttribute('role', 'group');
    const buttons = options.map(([key, label]) => {
        const el = button(label, () => select(key), { pressed: key === value });
        el.dataset.key = key;
        return el;
    });
    function select(key, notify = true) {
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.key === key)));
        if (notify) onChange(key);
    }
    group.append(...buttons);
    return { element: group, select: (key) => select(key, false) };
}

/** ▶ Listen / ■ Stop for a Voice. */
export function playButton(voice, label = 'Listen') {
    const el = element('button', 'pill play');
    el.type = 'button';
    const render = () => {
        el.replaceChildren(
            Object.assign(element('span', 'icon', voice.playing ? '■' : '▶'), { ariaHidden: 'true' }),
            voice.playing ? 'Stop' : label,
        );
        el.setAttribute('aria-pressed', String(voice.playing));
    };
    el.addEventListener('click', () => voice.toggle());
    voice.addEventListener('change', render);
    render();
    return el;
}

/** Pause / play for an animated figure. */
export function motionButton(figure) {
    const el = element('button', 'pill');
    el.type = 'button';
    const render = () => {
        el.replaceChildren(
            Object.assign(element('span', 'icon', figure.running ? '❚❚' : '↻'), { ariaHidden: 'true' }),
            figure.running ? 'Pause' : 'Animate',
        );
    };
    el.addEventListener('click', () => {
        figure.setRunning(!figure.running);
        render();
    });
    render();
    return el;
}

/** A line of mono key/value pairs. */
export function readout() {
    const el = element('p', 'readout');
    return {
        element: el,
        set(pairs) {
            el.replaceChildren(...pairs.map(([key, value]) => {
                const item = element('span', null, `${key} `);
                item.append(element('b', null, value));
                return item;
            }));
        },
    };
}

export function row(...children) {
    const el = element('div', 'buttons');
    el.append(...children);
    return el;
}
