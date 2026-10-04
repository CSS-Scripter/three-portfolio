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

/** The latest ongoing role. Projects only count when there is no ongoing role at all. */
export function currentMilestone(nodes) {
    const ongoing = chronological(nodes.filter((n) => n.end === null));
    const roles = ongoing.filter((n) => n.kind !== 'project');
    return roles.at(-1) ?? ongoing.at(-1) ?? chronological(nodes).at(-1);
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
                    ${renderAwards(n, 'h4')}
                    ${n.skills.length ? `<ul class="chips">${n.skills.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>` : ''}
                    ${n.links?.length ? `<p class="milestone-links">${renderLinks(n.links)}</p>` : ''}
                </div>
            </article>
        </li>`).join('');
}

export function sortedAwards(node) {
    return [...(node.awards ?? [])].sort((a, b) => a.date.localeCompare(b.date));
}

export function awardMeta(award) {
    return [award.by, formatMonth(award.date)].filter(Boolean).join(' · ');
}

/** Personal achievements and team awards, each under their own heading. */
export function renderAwards(node, headingTag = 'h3') {
    const awards = sortedAwards(node);
    return [
        ['Achievements', awards.filter((a) => !a.team)],
        ['Team awards', awards.filter((a) => a.team)],
    ]
        .filter(([, group]) => group.length)
        .map(([label, group]) => `<${headingTag} class="awards-label">${label}</${headingTag}>${renderAwardList(group)}`)
        .join('');
}

function renderAwardList(awards) {
    return `<ul class="awards">${awards.map((a) => {
        const title = `<span class="award-title">${escapeHtml(a.title)}</span>`;
        const meta = `<span class="award-meta">${escapeHtml(awardMeta(a))}</span>`;
        return a.href
            ? `<li><a href="${escapeHtml(a.href)}" target="_blank" rel="noopener">${title}${meta}</a></li>`
            : `<li>${title}${meta}</li>`;
    }).join('')}</ul>`;
}

export function renderLinks(links) {
    return links
        .map((l) => `<a href="${escapeHtml(l.href)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a>`)
        .join('');
}
