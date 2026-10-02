import { defineConfig } from 'vite';
import { nodeData, profile } from './js/data.js';
import { chronological, currentMilestone, escapeHtml, profileRole, renderLinks, renderMilestoneList } from './js/format.js';

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
        '<!--profile-links-->': renderLinks(profile.links),
        '<!--milestones-->': renderMilestoneList(nodeData),
        '%DESCRIPTION%': escapeHtml(summary),
    };

    return {
        name: 'static-content',
        transformIndexHtml(html) {
            return Object.entries(replacements).reduce((out, [key, value]) => out.replaceAll(key, value), html);
        },
    };
}

export default defineConfig({
    plugins: [staticContent()],
    build: {
        // three.js alone is ~600 kB minified (~150 kB gzipped)
        chunkSizeWarningLimit: 800,
    },
});
