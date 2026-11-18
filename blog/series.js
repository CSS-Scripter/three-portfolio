// Series of blog posts. A post joins a series with `series: <id>` in its front matter;
// its part number is its position in `parts`. Parts without a post yet (no `slug`, or
// a draft) are listed as planned, so readers can see where a series is going.
// Imported by the build (scripts/blog.js), so keep it free of browser APIs.

export const series = [
    {
        id: 'audio-from-scratch',
        title: 'Audio from scratch',
        description: 'From a single tone to the STFT and back again, one small step at a time.',
        parts: [
            { slug: 'building-a-sound', title: 'Building a sound' },
            { title: 'Going digital: sampling and bit depth' },
            { title: 'How loud is loud: RMS, decibels and dBFS' },
            { title: 'The DFT: finding the waves inside a sound' },
            { title: 'The STFT: sound over time' },
            { title: 'The ISTFT: putting it back together' },
        ],
    },
];
