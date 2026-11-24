---
title: Building a sound
description: Frequency, amplitude and phase, why a cosine plus a sine is just another sine, and what “real” and “imaginary” have to do with any of it.
date: 2026-11-18
series: audio-from-scratch
milestone: whispp_lead-architect
---

I recently set out to write my own STFT and inverse STFT: the pair of functions behind nearly every spectrogram you've ever seen, and behind a lot of audio processing. I got there in the end, but it took a lot longer than it should have. Most explanations start with a formula full of complex numbers, or with a finished spectrogram, and skip everything in between. That in-between is exactly where I kept getting stuck, and it's very hard to picture from text alone.

So this is a series about the in-between, with figures you can play with (and listen to) instead of formulas you have to imagine. This first part doesn't touch the STFT at all. It's about the one thing everything else is built from: a single, pure tone. By the end you'll know what frequency, amplitude and phase are, why adding a cosine and a sine gives you just another sine, and why audio code is full of "real" and "imaginary" numbers.

The code samples are in C++, which is what I learned this in. The figures run the same maths in JavaScript.

::: note About the sound
Figures with a **▶ Listen** button make sound. Nothing plays until you press it, only one figure plays at a time, and it stops when you scroll away. It's kept quiet, but you might want to turn your volume down a little before you start.
:::

## A sound is something moving

Sound is air moving back and forth. A speaker cone pushes the air in front of it, that air pushes the air next to it, and eventually your eardrum gets pushed back and forth in the same rhythm. A microphone does what your eardrum does, and a recording is nothing more than a long list of where the microphone was at each moment.

The simplest movement there is: smoothly up and down, at a steady pace, forever. Draw its position over time and you get a wave.

::: figure fig-trace
A point moving up and down. Drawing its position over time gives a wave. The animation is slowed down a lot: the tone you hear goes up and down 220 times every second.
:::

That smooth shape is a **sine wave**, and the sound it makes is a **pure tone**: no buzz, no character, just a single pitch, a bit like a tuning fork. Hardly any sound in the real world is this simple, but as we'll see at the end of this post, every sound can be built out of them.

Three numbers describe a pure tone completely: how often it repeats, how far it moves, and where it is when you start the clock. Let's take them one at a time.

## Frequency

**Frequency** is how many times per second the wave repeats, measured in hertz (Hz). The tone above repeats 220 times per second, so it's 220 Hz. The time a single repetition takes is called the **period**: at 220 Hz that's 1/220th of a second, about 4.5 milliseconds.

$$
\text{period} = \frac{1}{\text{frequency}}
$$

Frequency is what you hear as pitch: the faster the wave repeats, the higher the tone.

::: figure fig-wave vary="frequency"
Drag the frequency and listen. The coral part of the wave is one period. Mind the time axis: the whole plot is only 10 milliseconds long.
:::

The slider isn't linear, and neither is your hearing. Doubling the frequency always sounds like the same step up: an octave. Going from 110 Hz to 220 Hz sounds like as big a jump as going from 440 Hz to 880 Hz, even though the second jump is four times as many hertz. People hear from roughly 20 Hz up to somewhere below 20,000 Hz, depending on age; this slider stays in a range that laptop speakers can handle.

## Amplitude

**Amplitude** is how far the wave swings away from rest. A bigger swing pushes more air, which you hear as louder.

::: figure fig-wave vary="amplitude"
Drag the amplitude. The dashed lines show how far the wave swings; at zero, there's nothing left to hear.
:::

Our waves go from −1 to 1. That's not a coincidence: it's how most audio software stores sound, with −1 and 1 as the furthest the signal is allowed to go. And just like pitch, loudness isn't linear: halving the amplitude doesn't sound half as loud. That's what decibels are for, and they get a part of their own later in this series.

## Phase

**Phase** is where in its cycle the wave is when you start the clock. Because a wave repeats, we measure it as an angle: a full cycle is 360°, so a phase of 90° means the wave is a quarter of a cycle further along. Changing the phase slides the wave left or right.

::: figure fig-wave vary="phase"
Drag the phase. The dashed wave has a phase of 0°; a positive phase moves the wave earlier, to the left. Now press Listen and drag it again.
:::

Did you hear the difference? You can't: a single tone sounds exactly the same whatever its phase. Your ears only care about how often and how far the air moves, not about when you started counting.

With all three numbers, we can write the wave down:

$$
x(t) = A \cos(2\pi f t + \varphi)
$$

- $A$ is the amplitude
- $f$ is the frequency, in hertz
- $\varphi$ (phi) is the phase
- $t$ is the time, in seconds

The $2\pi f t$ part turns time into an angle: after one period ($t = 1/f$) it has gone round once, which is $2\pi$ radians, or 360°.

::: note Why cosine, and not sine?
It's only a choice. A sine is a cosine that's a quarter of a cycle late, $\sin(\theta) = \cos(\theta - 90°)$, so either one can describe any pure tone. Signal processing usually writes tones as cosines, because that makes the maths in later parts of this series come out neatly, so we'll do the same.
:::

## When phase does matter

If you can't hear phase, why bother with it? Because it matters a lot as soon as two sounds meet. Take two identical tones and play them together. When their peaks line up, they push the air together and the result is twice as strong. Shift one of them by half a cycle, and every peak of one meets a trough of the other: they cancel out.

::: figure fig-interference
Two identical tones and their sum. Shift the phase of the second tone and listen to what happens to the sum.
:::

At half a turn (180°), two perfectly good tones add up to silence. That's how noise-cancelling headphones work: they record the noise around you and play it back half a cycle out of phase.

It's also why phase will matter later in this series. The STFT cuts a sound into small pieces, and the ISTFT adds them back together. Pieces that don't line up in phase partly cancel each other out, and you can hear it.

## Going round in circles

Here's the idea that makes the rest of this post work. Picture a point going round a circle at a steady speed. Look at it from the side and all you see is the point moving up and down: a sine wave. Look at it from below and all you see is it moving left and right: a cosine wave.

::: figure wide fig-circle
The point's height draws a sine (teal), its left-right position draws a cosine (coral). Slowed down again.
:::

This circle holds all three numbers:

- the **radius** is the amplitude
- the **speed**, in turns per second, is the frequency
- the **angle** the point starts at is the phase

So a pure tone isn't really a wiggly line: it's a point going round a circle, and the wave is its shadow. Hold on to that picture. Real and imaginary numbers are just a way of writing it down.

## A cosine plus a sine

What happens if you add a cosine and a sine of the same frequency? You might expect something lumpy. Instead you always get another perfectly smooth wave, with the same frequency, but a different amplitude and phase.

::: figure fig-cos-sin
Choose how much cosine (coral) and how much sine (teal) to add. The bottom row is their sum: always a pure tone of the same frequency. The dashed wave is a plain cosine, for comparison; the distance between the two dots is the phase.
:::

It works the other way round too, and that's the important part: every pure tone can be split into some amount of cosine plus some amount of sine. It's a trigonometric identity:

$$
A\cos(\omega t + \varphi) = \cre{A\cos\varphi} \cdot \cos(\omega t) \; - \; \cim{A\sin\varphi} \cdot \sin(\omega t)
$$

(Here $\omega$, omega, is just short for $2\pi f$.)

So instead of describing a tone by its amplitude and phase, you can describe it by two other numbers: how much cosine, and how much sine. Two numbers either way, holding exactly the same information. This pair is going to follow us through the whole series.

## Real and imaginary

Those two numbers have names: the **real part** and the **imaginary part**. Together they form a **complex number**, which you can draw as a point on a plane: real along the horizontal axis, imaginary along the vertical one.

And here's the payoff: that point is exactly the point on the circle from before, frozen at the moment you start the clock. Its distance from the centre is the amplitude, and its angle is the phase.

::: figure wide fig-complex
Drag the point (or focus it and use the arrow keys). The coral line is the real part, the teal line the imaginary part. On the right is the wave this point describes, with the cosine and sine it's made of.
:::

Put the point on the real axis and you get a pure cosine. Put it on the imaginary axis and you get a sine, upside down (more on that in a moment). Anywhere else, you get a mix of both. Moving the point around the centre without changing its distance only changes the phase, which, as we know, you can't hear.

"Imaginary" is an unfortunate name. There's nothing imaginary about it: it's just the second axis. The name goes back to Descartes, who meant it dismissively, and it stuck.

::: note Where does the minus sign come from?
The real part is how much cosine there is, but the amount of sine is *minus* the imaginary part: $\cre{\text{re}} \cdot \cos(\omega t) - \cim{\text{im}} \cdot \sin(\omega t)$.

That's because of the direction the point goes round. A wave that's a quarter of a cycle ahead of a cosine isn't a sine, but a negative sine: $\cos(\omega t + 90°) = -\sin(\omega t)$. With the minus sign, the angle of the point is exactly the phase of the wave. Without it, the angle would be the phase backwards.

It's a convention, but nearly everything follows it, including the DFT later in this series. If your results ever come out mirrored, this minus sign is the first thing to check.
:::

## All of it at once

Now set the point spinning again, and at the same time move it along a time axis. It draws a spiral. Look along the time axis and you see the circle. The shadow on the floor is the real part over time: a cosine. The shadow on the back wall is the imaginary part over time: a sine.

::: figure wide fig-helix
Drag to rotate, or use the buttons to look along each axis. The coral shadow on the floor is the real part over time, the teal shadow on the wall the imaginary part.
:::

The tone you hear is the shadow on the floor, the real part. The imaginary part is the bookkeeping that remembers where on the circle the point is.

This spinning point has a name that you'll see all over audio maths: $e^{i\omega t}$. It looks scary, but it's only this spiral: a point going round the circle, $\omega$ radians per second. We'll need it for the DFT; for now it's enough to know what it looks like.

## Converting between the two

So there are two ways to describe the same tone: by its **amplitude and phase**, or by its **real and imaginary parts**. Audio code switches between them all the time, so it's worth knowing how.

From amplitude and phase to real and imaginary, go round the circle and read off the coordinates:

$$
\cre{\text{re}} = A \cos\varphi \qquad \cim{\text{im}} = A \sin\varphi
$$

And back: the amplitude is the distance from the centre (hello, Pythagoras), and the phase is the angle:

$$
A = \sqrt{\cre{\text{re}}^2 + \cim{\text{im}}^2} \qquad \varphi = \operatorname{atan2}(\cim{\text{im}}, \cre{\text{re}})
$$

The angle needs some care. The obvious choice, $\arctan(\text{im} / \text{re})$, only sees the ratio between the two, and opposite points have the same ratio: $(1, 1)$ and $(-1, -1)$ both give 1. So it can't tell them apart, and gets the angle wrong for half of the plane. `atan2` takes the two numbers separately, and gets it right everywhere.

::: figure fig-atan
Drag the point into the right half, where the two agree, and back into the left half, where `atan` points the wrong way.
:::

In C++:

```cpp
#include <cmath>
#include <complex>

struct Tone {
    double amplitude;
    double phase; // in radians
};

// Amplitude and phase → real and imaginary
std::complex<double> to_complex(Tone tone) {
    return {
        tone.amplitude * std::cos(tone.phase),
        tone.amplitude * std::sin(tone.phase),
    };
}

// Real and imaginary → amplitude and phase
Tone to_tone(std::complex<double> z) {
    return {
        std::sqrt(z.real() * z.real() + z.imag() * z.imag()),
        std::atan2(z.imag(), z.real()),
    };
}
```

Like most languages, C++ measures angles in radians: a full turn is $2\pi$, not 360°.

You'll rarely write those two yourself, though, because the standard library already has them. `std::polar` builds a complex number from an amplitude and a phase, and `std::abs` and `std::arg` give you the amplitude and the phase back:

```cpp
#include <complex>
#include <numbers>

std::complex<double> z = std::polar(0.8, std::numbers::pi / 4); // amplitude 0.8, phase 45°

double amplitude = std::abs(z); // 0.8
double phase     = std::arg(z); // 0.785… (π / 4)
```

Finally, the value of the wave at any moment: how much cosine, minus how much sine.

```cpp
#include <cmath>
#include <complex>
#include <numbers>

// The value of the tone described by z, at time t (in seconds)
double value_at(std::complex<double> z, double frequency, double t) {
    const double angle = 2.0 * std::numbers::pi * frequency * t;
    return z.real() * std::cos(angle) - z.imag() * std::sin(angle);
}
```

That return line does the same as `std::real(z * std::polar(1.0, angle))`: turn the point to the current angle, and take its shadow on the real axis. Same wave, written as the spiral.

## Stacking tones

Real sounds are almost never a single pure tone. Sing a note, pluck a string or say "aaah", and you get a whole stack of tones at once: one at the pitch you hear, plus **harmonics** at two, three, four or more times that frequency, each with its own amplitude and phase. The mix of harmonics is what makes a violin sound different from a flute playing the same note.

::: figure fig-harmonics
Add harmonics on top of a 220 Hz tone and listen to it change character. With all of them, the wave heads towards a sawtooth; with only the odd ones, towards a square.
:::

The bars in that figure have a name: a **spectrum**. And since every harmonic is a pure tone, every bar really stands for a complex number: an amplitude and a phase, or a real and an imaginary part. Getting from the wave to the bars, from a recording to the list of tones it's made of, is exactly what the DFT does. That's where all of this is heading.

## To recap

- A pure tone has a **frequency** (its pitch), an **amplitude** (its loudness) and a **phase** (where in its cycle it starts).
- You can't hear the phase of a single tone, but it decides what happens when tones are added together.
- A pure tone is a point going round a circle, and the wave is its shadow.
- A cosine plus a sine of the same frequency is another pure tone. The amounts of cosine and sine are the **real** and **imaginary** parts of a complex number, and that number is the point on the circle.
- To go from amplitude and phase to real and imaginary and back, use `std::polar`, `std::abs` and `std::arg`.

Before we get to the DFT, we need to get sound into a computer. Everything in this post was smooth and continuous, but a computer can only store a list of numbers. In the next part we'll look at sampling: how often you need to measure a wave to capture it, what goes wrong when you don't, and how much detail each measurement needs.
