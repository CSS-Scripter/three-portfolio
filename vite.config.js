import { defineConfig } from 'vite';
import { nodeData, profile } from './js/data.js';
import { chronological, currentMilestone, escapeHtml, profileRole, renderLinks, renderMilestoneList } from './js/format.js';
import { blogPages, loadPosts, postSummary } from './scripts/blog.js';

// Bakes the career data into index.html, so the content exists without
// JavaScript/WebGL (search engines, screen readers, link previews).
function staticContent() {
    const role = profileRole(profile, nodeData);
    const first = chronological(nodeData)[0];
    const summary = `${profile.name}, ${role.replace(/\.$/, '')}. An interactive map of my career, `
        + `from ${first.title} to ${currentMilestone(nodeData).title}.`;
    const replacements = {
        '<!--profile-name-->': escapeHtml(profile.name),
        '<!--profile-role-->': escapeHtml(role),
        '<!--profile-tagline-->': escapeHtml(profile.tagline ?? ''),
        '<!--profile-links-->': renderLinks(profile.links),
        '%DESCRIPTION%': escapeHtml(summary),
        '%SITE_URL%': escapeHtml(profile.url.replace(/\/$/, '')),
    };
    let drafts = false;

    return {
        name: 'static-content',
        configResolved(config) {
            drafts = config.command === 'serve';
        },
        transformIndexHtml(html) {
            // Read on every request, so new posts show up in dev without a restart
            const posts = loadPosts({ drafts }).map(postSummary);
            return Object.entries({ ...replacements, '<!--milestones-->': renderMilestoneList(nodeData, posts) })
                .reduce((out, [key, value]) => out.replaceAll(key, value), html);
        },
    };
}

export default defineConfig({
    plugins: [staticContent(), blogPages()],
    build: {
        // three.js alone is ~600 kB minified (~150 kB gzipped)
        chunkSizeWarningLimit: 800,
    },
});
