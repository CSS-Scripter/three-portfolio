// Single source of truth for the site's content. This file is imported both by
// the browser (3D scene + UI) and by vite.config.js (static HTML for crawlers,
// screen readers and browsers without WebGL), so it must not import three.js.

export const profile = {
    name: 'Thom Leenman',
    // Shown right under the name
    tagline: "aka CSS-Scripter (can't do css tho)",
    // Where the site is hosted; link previews need absolute URLs (e.g. for og.png)
    url: 'https://lnmn.nl',
    // Shown under the name. Leave empty to derive it from the current milestone.
    role: '',
    // Rendered as links in the header, e.g. { label: 'GitHub', href: 'https://github.com/...' }
    links: [
      { label: 'GitHub', href: 'https://github.com/CSS-Scripter' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/thom-leenman-662481179/' },
    ],
};

/**
 * @typedef {Object} Milestone
 * @property {string} id
 * @property {string} title
 * @property {string} subtitle
 * @property {string} start           'YYYY-MM'
 * @property {string | null} end      'YYYY-MM', or null when still ongoing
 * @property {string} description     Paragraphs separated by a blank line
 * @property {string[]} connectionsFrom
 * @property {string[]} skills
 * @property {{ label: string, href: string }[]} [links]  Shown on the card, e.g. a live site or repository
 * @property {Award[]} [awards]  Achievements and team awards; each one orbits the node as a small dot
 * @property {'project'} [kind]  School and side projects; these never count as the current role
 */

/**
 * @typedef {Object} Award
 * @property {string} title
 * @property {string} [by]     Who gave the award, when that isn't already in the title
 * @property {string} date     'YYYY-MM' of the announcement
 * @property {string} [href]   Announcement or listing
 * @property {boolean} [team]  Won as a team; listed under "Team awards" instead of "Achievements"
 */

/** @type {Milestone[]} */
export const nodeData = [
    {
        id: 'hsleiden',
        title: 'Computer Science degree',
        subtitle: 'University of Applied Sciences Leiden',
        start: '2017-09',
        end: '2023-06',
        description: `
            During this degree, I've learned about the basics of computer science, with a focus on application within the work field. The first year was focused on orientation, teaching students about the four branches they can specialize in within the degree: business data, forensics, interaction technology and software engineering. Example topics: Object oriented programming, UML design, Database design, Basic forensics & Web development.

            For the second, third and fourth year, I specialized in Software Development, diving deeper into topics like Design patterns, Full stack development, Testing and Algorithms & Data structures. We did projects twice per semester, so we could put this knowledge into practice, as well as learn collaboration and project management skills. To complete the curriculum, there was also a selection of topics shared between specializations, such as Ethics, Organisational knowledge, Database management systems and Social skills.

            The third and fourth year are divided into four semesters, which can be done in almost any order you'd like: a project of your choice, accompanied by lectures and tests; an internship; a minor; and a graduation internship. For me, the project was SyncMyMusic, the internship was done at OneTwoModel, the minor was Startup Ville, where I created Heya Social, and the graduation internship was at Whispp.
        `,
        connectionsFrom: [],
        skills: ['Java', 'Python', 'JavaScript', 'TypeScript', 'Golang', 'Spring Boot', 'Angular', 'Vue', 'Database Design', 'Docker', 'Software Testing', 'CI/CD', 'much more...'],
        awards: [
            { title: 'Graduated', by: "Bachelor's degree in Computer Science", date: '2023-06' },
        ]
    }, {
        id: 'onetwomodel',
        title: 'Internship Full Stack Developer',
        subtitle: 'OneTwoModel',
        start: '2021-09',
        end: '2022-02',
        description: `
            OneTwoModel was a startup aiming at a fair and safe environment for (starting) models. Their platform allowed models to create a portfolio and get in contact with multiple agencies at a time. This structure allowed the platform to also serve as a gateway, keeping out unfair or unsafe modelling agencies.

            During my internship, my goal was, together with Daniel, to create the admin and modelling agency portals. We both worked on the backend in NestJS, while splitting the frontend responsibilities per portal: I worked on the agency portal, while Daniel created the admin portal. We both worked in SvelteJS, to keep the number of technologies low and to keep a consistent architecture between portals.

            The goal of the agency portal was a nice user experience and easy collaboration between multiple people within an agency, taking into account their role and permissions. Although I do not fully understand the roles within a modelling agency, I was able to set up permissions in a way that allows for full customization.
        `,
        connectionsFrom: ['hsleiden', 'syntax_board'],
        skills: ['SvelteJS', 'NestJS', 'Firebase', 'TypeScript', 'UI/UX Design', 'Software Testing']
    }, {
        id: 'startupville',
        title: 'Minor Startup Ville',
        subtitle: 'The creation of Heya Social',
        start: '2022-02',
        end: '2022-08',
        description: `
            Startup Ville is an educational program of 6 months (1 semester), in which you create your own startup. The program is divided into two parts: the planning part, in which you validate whether your startup idea will work, and the creation part: building the product, marketing and finding investors.

            The idea behind Heya Social was a social platform on which people with similar interests can meet up to do something that no one in their current friend group likes to do. Shortly after Startup Ville, we stopped with Heya Social, as school and internships started taking up too much time.
        `,
        connectionsFrom: ['hsleiden', 'onetwomodel'],
        skills: ['Business skills', 'NestJS', 'React Native']
    }, {
        id: 'whispp_student',
        title: 'Part-time Software Tester',
        subtitle: 'Whispp B.V.',
        start: '2022-10',
        end: '2023-02',
        description: `
            I started off at Whispp mainly as a software tester, testing the iOS app that was being developed in house. Later my responsibilities expanded to creating a data collection platform to collect data for AI training (similar to Common Voice by Mozilla). Additionally, I did the research proving Whispp's marketing claims to be truthful, making Whispp eligible for the CE certificate and able to sell their product in the EU.
        `,
        connectionsFrom: ['startupville'],
        skills: ['Software Testing', 'NestJS', 'Vue3', 'Research']
    }, {
        id: 'whispp_intern',
        title: 'Graduation Internship Full Stack Developer',
        subtitle: 'Whispp B.V.',
        start: '2023-02',
        end: '2023-07',
        description: `
            Whispp tries to give people with a voice disorder their voice back with AI. One of their big milestones is to get this working during a phone call, so people with voice disorders can become intelligible on the phone again.

            The project assigned to me was to find a way to make these phone calls while being able to manipulate the audio server side. Additionally, I had to find an efficient way of load balancing these calls across multiple AI servers.

            The problem with load balancing across multiple AI servers is that the metrics did not expose any information about the internal load of an AI server, or how much more it could handle. As the AI runs on the GPU, anything above what it can handle simply crashes the application.

            To complete the design, I made UML diagrams of how the code bases of the different applications in play would look. Additionally, I set up a GitHub Actions workflow that empowers our software development cycle.
        `,
        connectionsFrom: ['hsleiden', 'whispp_student'],
        skills: ['UML', 'Cloud architecture', 'GitHub Actions', 'CI/CD', 'Express', 'TypeScript']
    }, {
        id: 'whispp_fullstack',
        title: 'Full-time Software Engineer',
        subtitle: 'Whispp B.V.',
        start: '2023-07',
        end: '2024-01',
        description: `
            After graduating, I continued as the backend developer of Whispp's calling functionality: a real-time audio streaming pipeline for phone calls, which processes the caller's voice through the Whispp AI in-flight to make them intelligible again. It's written in TypeScript and Python.

            The AI servers pad their work into batches, which makes their GPU utilisation look the same whatever the load. That made the capacity-based routing of standard orchestrators unusable, so I built our own service discovery and load balancer, including failure detection, recovery protocols and scaling across multiple instances.

            Unit test coverage of the calling stack peaked at around 80%, and integration tests validate the end-to-end audio quality and latency in production.
        `,
        connectionsFrom: ['whispp_intern'],
        skills: ['TypeScript', 'Python', 'Express', 'GCP', 'Real-time audio', 'Load balancing', 'Software Testing'],
        awards: [
            { team: true, title: 'CES Innovation Award 2024', by: 'Honoree, Accessibility & Longevity', date: '2023-11', href: 'https://www.ces.tech/ces-innovation-awards/2024/whispp/' },
        ],
    }, {
        id: 'teaching_assistant',
        title: 'Teaching Assistant',
        subtitle: 'University of Applied Sciences Leiden',
        start: '2019-09',
        end: '2020-03',
        description: `
            Teaching assistant for first and second year classes. Helped with Java, UML, Math, Web development and Database modelling.
        `,
        connectionsFrom: ['hsleiden'],
        skills: ['Java', 'UML', 'Math', 'Angular', 'Database Design']
    }, {
        id: 'syntax_board',
        title: 'Board Member S.V. Syntax',
        subtitle: 'Study association Syntax',
        start: '2019-09',
        end: '2020-08',
        description: `
            As president of the study association, I was, together with the other board members, in charge of the smooth running of the association. My main tasks were ensuring the other board members were able to do their tasks well, and helping where required. Additionally, I was 'the face' of the association: giving speeches, being the main speaker at public meetings and being the contact point for other associations and the university.
        `,
        connectionsFrom: ['hsleiden'],
        skills: [],
    }, {
        id: 'syntax_educo',
        title: 'Member of the Education Committee',
        subtitle: 'Study association Syntax',
        start: '2019-11',
        end: '2022-08',
        description: `
            As a member of the education committee, I helped organize educational events for the study association, such as crash courses for first year topics and talks from companies.
        `,
        connectionsFrom: ['syntax_board'],
        skills: [],
    }, {
        id: 'ois',
        title: 'Frontend Developer',
        subtitle: 'OIS',
        start: '2019-07',
        end: '2019-10',
        description: `
            A summer job creating websites in Angular and plain JavaScript.
        `,
        connectionsFrom: ['hsleiden'],
        skills: ['Angular', 'JavaScript', 'TypeScript']
    }, {
        id: 'syncmymusic',
        title: 'SyncMyMusic',
        subtitle: 'School project',
        kind: 'project',
        start: '2020-09',
        end: '2021-01',
        description: `
            A school project, with the primary goal of setting up a CI/CD pipeline. The project itself was done in Golang and Vue, with a self-hosted GitLab CI pipeline.

            The website was meant for music bands, with the goal of easily managing sheet music. It's always a pain to search through all the sheet music until you find the correct one.
        `,
        connectionsFrom: ['hsleiden'],
        skills: ['Golang', 'Vue', 'GitLab CI', 'CI/CD'],
        links: [
            { label: 'GitHub', href: 'https://github.com/CSS-Scripter/SyncMyMusic' },
        ],
    }, {
        id: 'cite',
        title: 'Cite',
        subtitle: 'School project',
        kind: 'project',
        start: '2021-02',
        end: '2021-05',
        description: `
            There are a lot of occasions where another WhatsApp group is created with the sole purpose of storing quotes. Why not keep them in a nicely styled app that also has the sole purpose of storing quotes? Created in collaboration with my buddy Daniel (LNGZL)!
        `,
        connectionsFrom: ['hsleiden'],
        skills: [],
        links: [
            { label: 'LNGZL', href: 'https://lngzl.nl/' },
        ],
    }, {
        id: 'pixelfont',
        title: 'PixelFont',
        subtitle: 'Side project',
        kind: 'project',
        // Still online, so no end date
        start: '2020-10',
        end: null,
        description: `
            It's basically a font in pure (S)CSS. It started off as one of my less serious projects, and it still is one of my less serious projects.
        `,
        connectionsFrom: ['hsleiden'],
        skills: ['CSS', 'SCSS'],
        links: [
            { label: 'pixelfont.lnmn.nl', href: 'https://pixelfont.lnmn.nl' },
            { label: 'GitHub', href: 'https://github.com/CSS-Scripter/PixelFont' },
        ],
    }, {
        id: 'hexchess',
        title: 'HexChess',
        subtitle: 'Side project',
        kind: 'project',
        start: '2024-07',
        end: '2024-08',
        description: `
            My first go at hexagonal chess in the browser: a Vue frontend and an Express backend in TypeScript, with Socket.IO for live games, deployed with Docker on my own server.

            It implemented Gliński's rules completely, apart from a few draw rules (threefold repetition, insufficient material and the 50-move rule). You created a game and shared the link with your opponent, and after the game you could step through all the moves to see where you went wrong.

            I gave up on it halfway through a refactor towards supporting more rulesets, like McCooey's.
        `,
        connectionsFrom: ['pixelfont'],
        skills: ['Vue', 'Pinia', 'TypeScript', 'Express', 'Socket.IO', 'Docker'],
        links: [
            { label: 'GitHub', href: 'https://github.com/CSS-Scripter/hex-chess_old' },
        ],
    }, {
        id: 'chexclub',
        title: 'Chex Club',
        subtitle: 'Side project',
        kind: 'project',
        start: '2026-10',
        end: null,
        description: `
            Chess, but hexagonal! I picked HexChess back up and turned it into Chex Club, finally putting the chex.club domain I registered for it in 2024 to use. It completes what the original was missing, with the remaining draw rules and two more rulesets (McCooey's and Shafran's next to Gliński's), and adds what I had wanted to build next: a computer opponent at five difficulty levels, and post-game analysis that flags inaccuracies, mistakes and blunders and shows the best move.

            Playing a friend still works by sending them a link, and anyone else with the link can watch.

            Under the hood, a single chess engine written in Rust is compiled to WebAssembly and runs both in the browser, where it plays as the computer opponent, and on the server. The backend runs on Cloudflare Workers, with Durable Objects keeping both players in sync over WebSockets.
        `,
        connectionsFrom: ['hexchess'],
        skills: ['Rust', 'WebAssembly', 'Vue', 'Cloudflare Workers', 'Durable Objects', 'WebSockets'],
        links: [
            { label: 'chex.club', href: 'https://chex.club' },
        ],
    }, {
        id: 'whispp_lead-architect',
        title: 'Lead Architect',
        subtitle: 'Whispp B.V.',
        start: '2024-01',
        end: null,
        description: `
            As Lead Architect I'm responsible for Whispp's infrastructure and software architecture, with a focus on on-device AI. I designed the fault-tolerant calling stack behind a product with about 9,000 registered users: the AI processing servers operate independently of the orchestration and load balancing layers, so calls in progress survive infrastructure failures. I'm also the on-call engineer for this business-critical infrastructure.

            On the device side, I develop Whispp's desktop application in Rust (Tauri), Vue, C++ and ONNX Runtime, with cross-language FFI modules for the performance-critical paths. By profiling execution providers and selecting the right backend, I brought inference latency down from 30 ms to 8 ms (averaged over 100 inferences on Ryzen AI 9 edge hardware). I also explored protecting the model itself, with proofs of concept for watermarking the model and for an obfuscation layer that hardens it against reverse engineering. These stayed proofs of concept and didn't make it into the product.

            To keep it all running, I set up the observability stack (Grafana, Prometheus, Loki and Promtail) with custom Golang instrumentation for log tracing and alerting. On top of that runs synthetic monitoring: every 30 minutes, a real call is placed in each region, audio is pushed through the pipeline and recorded at the receiving end, and the result is automatically checked against amplification and latency thresholds.
        `,
        connectionsFrom: ['whispp_fullstack'],
        skills: ['Software architecture', 'On-device AI', 'Rust', 'Tauri', 'C++', 'ONNX Runtime', 'Vue', 'TypeScript', 'Python', 'Golang', 'Grafana', 'Prometheus', 'Loki'],
        awards: [
            { team: true, title: 'Best of MWC 2024', by: 'Android Authority', date: '2024-02', href: 'https://www.androidauthority.com/best-of-mwc-2024-awards-3420794/' },
            { team: true, title: 'TIME Best Inventions 2024', date: '2024-10', href: 'https://time.com/collections/best-inventions-2024/7094886/whispp/' },
            { team: true, title: 'Forbes Accessibility 100', date: '2025-06', href: 'https://www.forbes.com/lists/accessibility-100/' },
            { team: true, title: 'Qualcomm Collaboration', date: '2026-09', href: 'https://www.linkedin.com/pulse/qualcomm-6g-leadership-day-ai-powered-accessibility-new-dragonwing-jefdf/' },
        ],
    }
];

export const GetNodeRelations = () => {
    const mappings = {};
    nodeData.forEach((node) => {
        mappings[node.id] = nodeData.filter((n) => n.connectionsFrom.includes(node.id)).map((n) => n.id);
    });
    return mappings;
}
