// Sound for the figures. Nothing plays until a reader presses a button, only one
// figure plays at a time, and everything is kept quiet: a level of 1 in a figure is
// well below full scale, and a limiter catches anything that adds up beyond that.

const LEVEL = 0.16;   // output gain for amplitude 1
const FADE = 0.015;   // seconds; ramps avoid clicks when sound starts, stops or changes

let context = null;
let output = null;
let current = null;

function getContext() {
    if (!context) {
        context = new AudioContext();
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -10;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.1;
        output = context.createGain();
        output.gain.value = LEVEL;
        output.connect(limiter).connect(context.destination);
    }
    if (context.state === 'suspended') context.resume();
    return context;
}

/**
 * A tone made of `partials` sine waves at whole multiples of `frequency`
 * (one partial is a pure tone). Fires `change` when it starts or stops.
 */
export class Voice extends EventTarget {
    constructor({ partials = 1, frequency = 220, amplitudes = [1] } = {}) {
        super();
        this.partials = partials;
        this.frequency = frequency;
        this.amplitudes = amplitudes;
        this.nodes = null;
    }

    get playing() {
        return this.nodes !== null;
    }

    /** @param {{ frequency?: number, amplitudes?: number[] }} settings */
    set({ frequency = this.frequency, amplitudes = this.amplitudes }) {
        this.frequency = frequency;
        this.amplitudes = amplitudes;
        if (!this.nodes) return;
        const now = context.currentTime;
        this.nodes.partials.forEach(({ oscillator, gain }, i) => {
            oscillator.frequency.setTargetAtTime(frequency * (i + 1), now, FADE);
            gain.gain.setTargetAtTime(amplitudes[i] ?? 0, now, FADE);
        });
    }

    start() {
        if (this.nodes) return;
        if (current && current !== this) current.stop();
        const ctx = getContext();
        const now = ctx.currentTime;

        const master = ctx.createGain();
        master.gain.setValueAtTime(0, now);
        master.gain.setTargetAtTime(1, now, FADE);
        master.connect(output);

        const partials = Array.from({ length: this.partials }, (_, i) => {
            const oscillator = ctx.createOscillator();
            oscillator.frequency.value = this.frequency * (i + 1);
            const gain = ctx.createGain();
            gain.gain.value = this.amplitudes[i] ?? 0;
            oscillator.connect(gain).connect(master);
            oscillator.start(now);
            return { oscillator, gain };
        });

        this.nodes = { master, partials };
        current = this;
        this.dispatchEvent(new Event('change'));
    }

    stop() {
        if (!this.nodes) return;
        const { master, partials } = this.nodes;
        const now = context.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(0, now, FADE);
        partials.forEach(({ oscillator }) => oscillator.stop(now + FADE * 8));
        partials[0].oscillator.onended = () => master.disconnect();
        this.nodes = null;
        if (current === this) current = null;
        this.dispatchEvent(new Event('change'));
    }

    toggle() {
        if (this.playing) this.stop();
        else this.start();
    }
}
