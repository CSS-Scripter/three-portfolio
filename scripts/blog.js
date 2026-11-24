// Build-time side of the blog. Every post is a folder in blog/ with an index.md
// (front matter + Markdown) and, optionally, a figures.js with its interactive figures.
// This module turns them into pages:
//
//   blog/<slug>/index.md  →  /blog/<slug>/   (the post)
//   all posts + series    →  /blog/          (the list)
//
// The pages don't exist on disk: the Vite plugin below renders them on request in dev,
// and feeds them to the production build as virtual HTML entries, so Vite still bundles
// their scripts and styles like any other page.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import katex from 'katex';
import MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';
import { createHighlighter } from 'shiki';
import { series as allSeries } from '../blog/series.js';
import { profile } from '../js/data.js';
import { escapeHtml } from '../js/format.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blogDir = path.join(root, 'blog');
const site = profile.url.replace(/\/$/, '');

const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%2311151c'/%3E%3Ccircle cx='16' cy='16' r='7' fill='%23d66853'/%3E%3C/svg%3E";
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WORDS_PER_MINUTE = 200;

/* ---------- Posts ---------- */

/**
 * @typedef {Object} Post
 * @property {string} slug
 * @property {string} url
 * @property {string} title
 * @property {string} description
 * @property {string} date          'YYYY-MM-DD'
 * @property {string | null} series
 * @property {number | null} part   1-based position in the series
 * @property {string} [milestone]   id of the career milestone the post hangs off in the tree
 * @property {boolean} draft        Drafts only show up in the dev server
 * @property {number} minutes       Reading time
 * @property {string} body          Markdown
 * @property {boolean} hasFigures
 */

/** All posts, newest first. Drafts are left out unless `drafts` is set (the dev server). */
export function loadPosts({ drafts = false } = {}) {
    return fs.readdirSync(blogDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(blogDir, entry.name, 'index.md')))
        .map((entry) => readPost(entry.name))
        .filter((post) => drafts || !post.draft)
        .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

/** What the browser gets to know about a post (the tree's leaves). */
export function postSummary(post) {
    const { slug, url, title, description, date, series, part, milestone } = post;
    return { slug, url, title, description, date, series, part, milestone: milestone ?? null };
}

function readPost(slug) {
    const file = path.join(blogDir, slug, 'index.md');
    const { data, body } = parseFrontMatter(fs.readFileSync(file, 'utf8'));
    for (const key of ['title', 'description', 'date']) {
        if (!data[key]) throw new Error(`${file}: "${key}" is missing from the front matter`);
    }

    let part = null;
    if (data.series) {
        const series = allSeries.find((s) => s.id === data.series);
        if (!series) throw new Error(`${file}: unknown series "${data.series}" (see blog/series.js)`);
        part = series.parts.findIndex((p) => p.slug === slug) + 1;
        if (!part) throw new Error(`${file}: add { slug: '${slug}' } to the parts of "${series.id}" in blog/series.js`);
    }

    return {
        slug,
        url: `/blog/${slug}/`,
        ...data,
        date: String(data.date),
        series: data.series ?? null,
        part,
        draft: data.draft === true,
        minutes: Math.max(1, Math.round(countWords(body) / WORDS_PER_MINUTE)),
        body,
        hasFigures: fs.existsSync(path.join(blogDir, slug, 'figures.js')),
    };
}

/** Minimal front matter: `key: value` lines between two `---` lines. */
function parseFrontMatter(source) {
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) return { data: {}, body: source };
    const data = {};
    for (const line of match[1].split(/\r?\n/)) {
        const field = line.match(/^([\w-]+):\s*(.*?)\s*$/);
        if (!field) continue;
        let value = field[2];
        if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
        else if (value === 'true' || value === 'false') value = value === 'true';
        data[field[1]] = value;
    }
    return { data, body: source.slice(match[0].length) };
}

function countWords(markdown) {
    return markdown
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/\$\$[\s\S]*?\$\$/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .split(/\s+/)
        .filter((word) => /\w/.test(word)).length;
}

export function formatDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return `${day} ${MONTHS[month - 1]} ${year}`;
}

/* ---------- Markdown ---------- */

// Syntax highlighting in the site's palette: accent keywords, lineage (light accent)
// literals, everything else in shades of the foreground. The colours are CSS variables,
// so code follows the visitor's theme. The secondary colour is kept out on purpose: in
// the figures it means "sine / imaginary".
const codeTheme = {
    name: 'lnmn',
    type: 'dark',
    colors: { 'editor.background': 'var(--code-bg)', 'editor.foreground': '#dcdcdc' },
    tokenColors: [
        { settings: { foreground: '#dcdcdc' } },
        { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#77777c', fontStyle: 'italic' } },
        { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control', 'keyword.operator.new', 'keyword.other'], settings: { foreground: 'var(--accent)' } },
        { scope: ['meta.preprocessor', 'keyword.control.directive', 'punctuation.definition.directive'], settings: { foreground: 'var(--accent)' } },
        { scope: ['string', 'string.quoted', 'constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: 'var(--lineage)' } },
        { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: '#f4f4f4' } },
        { scope: ['entity.name.type', 'support.type', 'storage.type.built-in', 'entity.name.class'], settings: { foreground: '#c4c4c8' } },
        { scope: ['keyword.operator', 'punctuation', 'meta.brace', 'entity.name.scope-resolution', 'entity.name.namespace'], settings: { foreground: '#8e8e94' } },
    ],
};

// KaTeX macros for colour-coding maths the same way as the figures:
// \cre{...} for cosine / real parts (the accent), \cim{...} for sine / imaginary parts
// (the theme's secondary colour).
const katexOptions = {
    throwOnError: true,
    strict: false,
    trust: (context) => context.command === '\\htmlClass',
    macros: {
        '\\cre': '\\htmlClass{c-re}{#1}',
        '\\cim': '\\htmlClass{c-im}{#1}',
    },
};

let rendererPromise;
function getRenderer() {
    rendererPromise ??= createHighlighter({ themes: [codeTheme], langs: ['cpp', 'javascript', 'python', 'shell'] })
        .then(createMarkdown);
    return rendererPromise;
}

function createMarkdown(highlighter) {
    const md = new MarkdownIt({
        html: true,
        typographer: true,
        highlight: (code, lang) => highlighter.codeToHtml(code, {
            lang: highlighter.getLoadedLanguages().includes(lang) ? lang : 'text',
            theme: 'lnmn',
        }),
    });

    md.use(mathPlugin);

    // ::: note Optional title
    md.use(container, 'note', {
        render(tokens, i) {
            const token = tokens[i];
            if (token.nesting === -1) return '</aside>\n';
            const title = token.info.trim().slice('note'.length).trim();
            return `<aside class="note">${title ? `<p class="note-title">${md.renderInline(title)}</p>` : ''}\n`;
        },
    });

    // ::: figure [wide] <element-name> [attributes]
    // Caption (Markdown)
    // :::
    md.use(container, 'figure', {
        validate: (info) => /^figure\b/.test(info.trim()),
        render(tokens, i) {
            const token = tokens[i];
            if (token.nesting === -1) return '</figure>\n';
            const match = token.info.trim().match(/^figure(\s+wide)?(?:\s+([a-z][\w]*-[\w-]+)(.*))?$/);
            if (!match) throw new Error(`Can't read figure "${token.info.trim()}"`);
            const [, wide, element, attributes = ''] = match;
            const figure = element ? `<${element}${attributes}></${element}>` : '';
            return `<figure class="fig${wide ? ' fig-wide' : ''}">${figure}\n`;
        },
    });

    // The paragraphs inside a figure are its caption
    md.core.ruler.push('figcaptions', (state) => {
        const levels = [];
        for (const token of state.tokens) {
            if (token.type === 'container_figure_open') levels.push(token.level);
            else if (token.type === 'container_figure_close') levels.pop();
            else if (levels.length && token.level === levels.at(-1) + 1
                && (token.type === 'paragraph_open' || token.type === 'paragraph_close')) {
                token.tag = 'figcaption';
            }
        }
    });

    // Headings get an id, so sections can be linked to
    md.core.ruler.push('heading_ids', (state) => {
        const used = new Set();
        state.tokens.forEach((token, i) => {
            if (token.type !== 'heading_open') return;
            const base = state.tokens[i + 1].content.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'section';
            let id = base;
            for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
            used.add(id);
            token.attrSet('id', id);
        });
    });

    return md;
}

/** `$inline$` and `$$display$$` maths, rendered with KaTeX at build time. */
function mathPlugin(md) {
    md.inline.ruler.after('escape', 'math_inline', (state, silent) => {
        const { src, pos } = state;
        if (src[pos] !== '$' || src[pos + 1] === '$') return false;
        let end = pos + 1;
        while ((end = src.indexOf('$', end)) !== -1 && src[end - 1] === '\\') end++;
        if (end === -1) return false;
        const content = src.slice(pos + 1, end);
        // "$5 and $6" is money, not maths
        if (!content || /^\s|\s$/.test(content)) return false;
        // Punctuation right after the maths stays on the same line as it
        const trailing = src.slice(end + 1).match(/^[.,;:!?)]+/)?.[0] ?? '';
        if (!silent) {
            const token = state.push('math_inline', 'math', 0);
            token.content = content;
            token.meta = { trailing };
        }
        state.pos = end + 1 + trailing.length;
        return true;
    });

    md.block.ruler.before('fence', 'math_block', (state, startLine, endLine, silent) => {
        const start = state.bMarks[startLine] + state.tShift[startLine];
        const first = state.src.slice(start, state.eMarks[startLine]);
        if (!first.startsWith('$$')) return false;

        const lines = [];
        let line = startLine;
        let rest = first.slice(2);
        while (true) {
            const close = rest.indexOf('$$');
            if (close !== -1) {
                lines.push(rest.slice(0, close));
                break;
            }
            lines.push(rest);
            if (++line >= endLine) return false;
            rest = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
        }
        if (silent) return true;

        state.line = line + 1;
        const token = state.push('math_block', 'math', 0);
        token.block = true;
        token.content = lines.join('\n').trim();
        token.map = [startLine, state.line];
        return true;
    }, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });

    md.renderer.rules.math_inline = (tokens, i) => {
        const math = katex.renderToString(tokens[i].content, katexOptions);
        const { trailing } = tokens[i].meta;
        return trailing ? `<span class="math-inline">${math}${md.utils.escapeHtml(trailing)}</span>` : math;
    };
    md.renderer.rules.math_block = (tokens, i) => `<div class="math">${katex.renderToString(tokens[i].content, { ...katexOptions, displayMode: true })}</div>\n`;
}

/* ---------- Pages ---------- */

function head({ title, description, url, type = 'website' }) {
    return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="theme-color" content="#11151c">
    <meta property="og:type" content="${type}">
    <meta property="og:url" content="${site}${url}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${site}/og.png">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="canonical" href="${site}${url}">
    <link rel="icon" href="${FAVICON}">
    <link rel="stylesheet" href="/blog/blog.css">
    <script type="module" src="/js/theme-picker.js"></script>`;
}

/** The bar above every blog page: breadcrumbs, and the theme picker on the right. */
function crumbs(...trail) {
    const links = [{ label: profile.name, href: '/' }, ...trail];
    return `<div class="topbar">
        <nav class="crumbs" aria-label="Breadcrumbs">${links
        .map((l) => `<a href="${l.href}">${escapeHtml(l.label)}</a>`)
        .join('<span aria-hidden="true">/</span>')}</nav>
        <theme-picker></theme-picker>
    </div>`;
}

function footer() {
    const links = profile.links.map((l) => `<a href="${escapeHtml(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`);
    return `<footer class="site-footer">
        <a href="/">${escapeHtml(profile.name)}</a>
        <a href="/blog/">Blog</a>
        ${links.join('\n        ')}
    </footer>`;
}

/** The parts of a series as a vertical line with a dot per part. */
function seriesTimeline(series, posts, { current = null, descriptions = false } = {}) {
    const items = series.parts.map((part, index) => {
        const post = part.slug && posts.find((p) => p.slug === part.slug);
        const number = `Part ${index + 1}`;
        if (!post) {
            return `<li class="planned">
                <span class="timeline-title">${escapeHtml(part.title)}</span>
                <span class="timeline-meta">${number} · planned</span>
            </li>`;
        }
        const isCurrent = post.slug === current;
        return `<li${isCurrent ? ' class="current"' : ''}>
                <a class="timeline-title" href="${post.url}"${isCurrent ? ' aria-current="page"' : ''}>${escapeHtml(post.title)}</a>
                <span class="timeline-meta">${number} · <time datetime="${post.date}">${formatDate(post.date)}</time>${isCurrent ? ' · you are here' : ''}</span>
                ${descriptions ? `<p>${escapeHtml(post.description)}</p>` : ''}
            </li>`;
    });
    return `<ol class="timeline">${items.join('')}</ol>`;
}

export async function renderPostPage(slug, { drafts = false } = {}) {
    const posts = loadPosts({ drafts });
    const post = posts.find((p) => p.slug === slug);
    if (!post) throw new Error(`No post "${slug}"`);
    const md = await getRenderer();
    const series = post.series ? allSeries.find((s) => s.id === post.series) : null;

    return `<!DOCTYPE html>
<html lang="en">
<head>${head({ title: `${post.title} – ${profile.name}`, description: post.description, url: post.url, type: 'article' })}
</head>
<body class="blog">
    ${crumbs({ label: 'Blog', href: '/blog/' })}
    <main>
        <article class="post">
            <header class="post-header">
                ${series ? `<p class="eyebrow"><a href="/blog/#${series.id}">${escapeHtml(series.title)}</a> · Part ${post.part}</p>` : ''}
                <h1>${escapeHtml(post.title)}</h1>
                <p class="lede">${escapeHtml(post.description)}</p>
                <p class="post-meta"><time datetime="${post.date}">${formatDate(post.date)}</time> · ${post.minutes} min read${post.draft ? ' · draft' : ''}</p>
            </header>
            <div class="prose">
${md.render(post.body)}
            </div>
            ${series ? `<nav class="series-nav" aria-label="${escapeHtml(series.title)}">
                <p class="eyebrow">${escapeHtml(series.title)}</p>
                ${seriesTimeline(series, posts, { current: post.slug })}
            </nav>` : ''}
        </article>
    </main>
    ${footer()}
    ${post.hasFigures ? `<script type="module" src="/blog/${slug}/figures.js"></script>` : ''}
</body>
</html>`;
}

export function renderIndexPage({ drafts = false } = {}) {
    const posts = loadPosts({ drafts });
    const seriesBlocks = allSeries
        .filter((series) => posts.some((p) => p.series === series.id))
        .map((series) => `
        <section class="series" id="${series.id}">
            <p class="eyebrow">Series</p>
            <h2>${escapeHtml(series.title)}</h2>
            <p class="series-description">${escapeHtml(series.description)}</p>
            ${seriesTimeline(series, posts, { descriptions: true })}
        </section>`);

    const standalone = posts.filter((p) => !p.series);
    const standaloneBlock = standalone.length ? `
        <section class="series" id="posts">
            <p class="eyebrow">Posts</p>
            <ol class="timeline">${standalone.map((post) => `<li>
                <a class="timeline-title" href="${post.url}">${escapeHtml(post.title)}</a>
                <span class="timeline-meta"><time datetime="${post.date}">${formatDate(post.date)}</time></span>
                <p>${escapeHtml(post.description)}</p>
            </li>`).join('')}</ol>
        </section>` : '';

    const description = 'Interactive, visual tutorials about things I found hard to learn from text alone.';
    return `<!DOCTYPE html>
<html lang="en">
<head>${head({ title: `Blog – ${profile.name}`, description, url: '/blog/' })}
</head>
<body class="blog">
    ${crumbs()}
    <main>
        <header class="blog-header">
            <h1>Blog</h1>
            <p class="lede">${escapeHtml(description)}</p>
        </header>
        ${seriesBlocks.join('')}
        ${standaloneBlock}
        ${posts.length ? '' : '<p class="empty">Nothing here yet.</p>'}
    </main>
    ${footer()}
</body>
</html>`;
}

/* ---------- Vite plugin ---------- */

const VIRTUAL_POSTS = 'virtual:blog-posts';
const RESOLVED_POSTS = '\0virtual:blog-posts';

/** Which page an HTML path or URL is: the list, a post, or neither. */
function pageFor(file, posts) {
    const relative = path.relative(blogDir, file).split(path.sep);
    if (relative.length === 1 && relative[0] === 'index.html') return { type: 'index' };
    if (relative.length === 2 && relative[1] === 'index.html' && posts.some((p) => p.slug === relative[0])) {
        return { type: 'post', slug: relative[0] };
    }
    return null;
}

function renderPage(page, options) {
    return page.type === 'index' ? renderIndexPage(options) : renderPostPage(page.slug, options);
}

export function blogPages() {
    let drafts = false;

    return {
        name: 'blog-pages',
        enforce: 'pre',

        config(config, { command }) {
            drafts = command === 'serve';
            if (command !== 'build') return;
            const input = {
                main: path.join(root, 'index.html'),
                blog: path.join(blogDir, 'index.html'),
            };
            for (const post of loadPosts()) input[`blog-${post.slug}`] = path.join(blogDir, post.slug, 'index.html');
            return { build: { rolldownOptions: { input } } };
        },

        resolveId(id) {
            if (id === VIRTUAL_POSTS) return RESOLVED_POSTS;
            if (id.endsWith('.html') && pageFor(id, loadPosts({ drafts }))) return id;
            return null;
        },

        load(id) {
            if (id === RESOLVED_POSTS) {
                return `export default ${JSON.stringify(loadPosts({ drafts }).map(postSummary))};`;
            }
            if (!id.endsWith('.html')) return null;
            const page = pageFor(id, loadPosts({ drafts }));
            return page ? renderPage(page, { drafts }) : null;
        },

        configureServer(server) {
            // Runs before Vite's own HTML handling, which only knows files on disk
            server.middlewares.use(async (req, res, next) => {
                const url = new URL(req.url, 'http://localhost').pathname;
                if (!url.startsWith('/blog')) return next();
                const posts = loadPosts({ drafts });
                const slug = url.match(/^\/blog\/([\w-]+)\/?(?:index\.html)?$/)?.[1];
                const isIndex = /^\/blog\/?(?:index\.html)?$/.test(url);
                if (!isIndex && !posts.some((p) => p.slug === slug)) return next();

                // Relative links in a page need the trailing slash
                if (!url.endsWith('/') && !url.endsWith('.html')) {
                    res.writeHead(301, { Location: `${url}/` });
                    return res.end();
                }
                try {
                    const page = isIndex ? { type: 'index' } : { type: 'post', slug };
                    const html = await server.transformIndexHtml(url, await renderPage(page, { drafts }), req.originalUrl);
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(html);
                } catch (error) {
                    next(error);
                }
            });

            // Markdown and series changes: reload, and refresh the posts the tree knows about
            const reload = (file) => {
                const relative = path.relative(blogDir, file);
                if (relative.startsWith('..') || !(relative.endsWith('.md') || relative === 'series.js')) return;
                for (const environment of Object.values(server.environments ?? {})) {
                    const module = environment.moduleGraph?.getModuleById(RESOLVED_POSTS);
                    if (module) environment.moduleGraph.invalidateModule(module);
                }
                server.ws.send({ type: 'full-reload' });
            };
            server.watcher.on('change', reload);
            server.watcher.on('add', reload);
            server.watcher.on('unlink', reload);
        },
    };
}
