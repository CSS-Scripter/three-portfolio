// Presentation helpers shared by the browser and the build (vite.config.js).
// Keep this free of DOM and three.js usage.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonth(value) {
    const [year, month] = value.split('-').map(Number);
    return { year, month };
}

function monthIndex(value) {
    const { year, month } = parseMonth(value);
    return year * 12 + (month - 1);
}

function currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonth(value) {
    if (!value) return 'present';
    const { year, month } = parseMonth(value);
    return `${MONTHS[month - 1]} ${year}`;
}

export function formatPeriod(node) {
    return `${formatMonth(node.start)} – ${formatMonth(node.end)}`;
}

export function formatDuration(node) {
    const months = monthIndex(node.end ?? currentMonth()) - monthIndex(node.start);
    const years = Math.floor(months / 12);
    const rest = months % 12;
    const parts = [];
    if (years) parts.push(`${years} yr`);
    if (rest || !years) parts.push(`${Math.max(rest, 1)} mo`);
    return parts.join(' ');
}

/** Turns an indented template string into a list of trimmed paragraphs. */
export function paragraphs(text) {
    return text
        .split(/\n\s*\n/)
        .map((p) => p.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
}

export function chronological(nodes) {
    return [...nodes].sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
}

export function currentMilestone(nodes) {
    const ongoing = chronological(nodes.filter((n) => n.end === null));
    return ongoing[ongoing.length - 1] ?? chronological(nodes).at(-1);
}

export function profileRole(profile, nodes) {
    if (profile.role) return profile.role;
    const current = currentMilestone(nodes);
    return current ? `${current.title} @ ${current.subtitle}` : '';
}

export function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

/** Static, newest-first list of all milestones. Injected into index.html at build time. */
export function renderMilestoneList(nodes) {
    return chronological(nodes).reverse().map((n) => `
        <li data-id="${escapeHtml(n.id)}">
            <article>
                <button type="button" class="milestone-link" data-id="${escapeHtml(n.id)}">
                    <span class="milestone-title">${escapeHtml(n.title)}</span>
                    <span class="milestone-meta"><time datetime="${n.start}">${escapeHtml(formatPeriod(n))}</time> · ${escapeHtml(n.subtitle)}</span>
                </button>
                <div class="milestone-body">
                    ${paragraphs(n.description).map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
                    ${n.skills.length ? `<ul class="chips">${n.skills.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>` : ''}
                </div>
            </article>
        </li>`).join('');
}

export function renderLinks(links) {
    return links
        .map((l) => `<a href="${escapeHtml(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`)
        .join('');
}
