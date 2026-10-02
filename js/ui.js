import { formatDuration, formatPeriod, paragraphs, renderAwards } from './format';

const $ = (id) => document.getElementById(id);

const el = {
    overlay: $('overlay'),
    title: $('title'),
    subtitle: $('subtitle'),
    timestamp: $('timestamp'),
    description: $('description'),
    awards: $('awards'),
    skills: $('skills'),
    relations: $('relations'),
    prev: $('prev'),
    next: $('next'),
    hint: $('hint'),
    hintTitle: document.querySelector('#hint .hint-title'),
    hintMeta: document.querySelector('#hint .hint-meta'),
    help: $('help'),
    depth: document.querySelector('#depth span'),
    list: $('milestones'),
    listToggle: $('controls_list'),
};

function chip(text, onClick) {
    const li = document.createElement('li');
    if (onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.addEventListener('click', onClick);
        li.append(button);
    } else {
        li.textContent = text;
    }
    return li;
}

function linkGroup(links = []) {
    if (!links.length) return null;
    const wrapper = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = 'Links';
    const list = document.createElement('ul');
    list.className = 'chips external';
    links.forEach(({ label, href }) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = `${label} ↗`;
        li.append(a);
        list.append(li);
    });
    wrapper.append(heading, list);
    return wrapper;
}

function relationGroup(label, nodes, onSelect) {
    if (!nodes.length) return null;
    const wrapper = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = label;
    const list = document.createElement('ul');
    list.className = 'chips links';
    nodes.forEach((n) => list.append(chip(n.title, () => onSelect(n.id))));
    wrapper.append(heading, list);
    return wrapper;
}

export function createUI({ onSelect, onClose }) {
    let hintVisible = false;

    el.overlay.querySelector('.close').addEventListener('click', onClose);

    // The list panel is placed right below the header, whatever its height
    const header = document.querySelector('.heading');
    new ResizeObserver(() => {
        document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    }).observe(header);

    el.listToggle.addEventListener('click', () => setListOpen(el.list.hidden));
    el.list.querySelectorAll('.milestone-link').forEach((button) => {
        button.addEventListener('click', () => {
            onSelect(button.dataset.id, { focusCard: true });
            if (window.matchMedia('(max-width: 720px)').matches) setListOpen(false);
        });
    });

    function setListOpen(open) {
        el.list.hidden = !open;
        el.listToggle.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('list-open', open);
    }

    function showHint(node, x, y) {
        if (!hintVisible || el.hint.dataset.id !== node.id) {
            el.hint.dataset.id = node.id;
            el.hintTitle.textContent = node.title;
            const teamAwards = node.awards?.filter((a) => a.team).length ?? 0;
            const awards = teamAwards ? ` · ${teamAwards} award${teamAwards > 1 ? 's' : ''}` : '';
            el.hintMeta.textContent = `${node.subtitle} · ${formatPeriod(node)}${awards}`;
            el.hint.classList.add('visible');
            hintVisible = true;
        }
        // Next to the cursor (not on top of it), flipped when it would leave the screen
        const { width, height } = el.hint.getBoundingClientRect();
        const left = x + 18 + width > window.innerWidth - 8 ? x - 18 - width : x + 18;
        const top = Math.min(Math.max(8, y - height / 2), window.innerHeight - height - 8);
        el.hint.style.transform = `translate(${left}px, ${top}px)`;
    }

    function hideHint() {
        if (!hintVisible) return;
        el.hint.classList.remove('visible');
        hintVisible = false;
    }

    /**
     * @param {import('./data').Milestone} node
     * @param {{ parents: any[], children: any[], prev: any, next: any, focusCard?: boolean }} context
     */
    function openCard(node, { parents, children, prev, next, focusCard }) {
        el.title.textContent = node.title;
        el.subtitle.textContent = node.subtitle;
        el.timestamp.textContent = `${formatPeriod(node)} · ${formatDuration(node)}`;

        el.description.replaceChildren(...paragraphs(node.description).map((text) => {
            const p = document.createElement('p');
            p.textContent = text;
            return p;
        }));

        // Built from escaped data only (see renderAwards)
        el.awards.innerHTML = renderAwards(node);

        el.skills.replaceChildren(...node.skills.map((s) => chip(s)));
        el.skills.hidden = node.skills.length === 0;

        el.relations.replaceChildren(...[
            linkGroup(node.links),
            relationGroup('Came from', parents, onSelect),
            relationGroup('Led to', children, onSelect),
        ].filter(Boolean));

        el.prev.disabled = !prev;
        el.next.disabled = !next;
        el.prev.onclick = prev ? () => onSelect(prev.id) : null;
        el.next.onclick = next ? () => onSelect(next.id) : null;

        el.list.querySelectorAll('li[data-id]').forEach((li) => li.classList.toggle('active', li.dataset.id === node.id));

        document.body.classList.add('card-open');
        el.overlay.hidden = false;
        el.overlay.scrollTop = 0;
        requestAnimationFrame(() => el.overlay.classList.add('open'));
        if (focusCard) el.overlay.focus({ preventScroll: true });
    }

    function closeCard() {
        document.body.classList.remove('card-open');
        el.overlay.classList.remove('open');
        el.list.querySelectorAll('li.active').forEach((li) => li.classList.remove('active'));
        el.overlay.addEventListener('transitionend', () => {
            if (!el.overlay.classList.contains('open')) el.overlay.hidden = true;
        }, { once: true });
    }

    /** Screen space covered by the open panels, so the scene can shift out from under them. */
    function insets() {
        const out = { left: 0, right: 0, bottom: 0 };
        const isSheet = window.matchMedia('(max-width: 720px)').matches;
        if (!el.overlay.hidden && el.overlay.classList.contains('open')) {
            const rect = el.overlay.getBoundingClientRect();
            if (isSheet) out.bottom = rect.height;
            else out.right = window.innerWidth - rect.left;
        }
        if (!el.list.hidden && !isSheet) {
            out.left = el.list.getBoundingClientRect().right;
        }
        return out;
    }

    function setDepth(progress) {
        el.depth.style.top = `${Math.min(1, Math.max(0, progress)) * 100}%`;
    }

    function dismissHelp() {
        el.help.classList.add('dismissed');
    }

    return {
        showHint, hideHint, openCard, closeCard, insets, setDepth, dismissHelp, setListOpen,
        get isListOpen() { return !el.list.hidden; },
    };
}
