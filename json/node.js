export const nodeData = [
    {
        id: 'hsleiden',
        timeline: 2017_09,
        title: 'Computer science degree',
        subtitle: 'University of Applied Sciences Leiden',
        timestamp: '09/2017 to 06/2023',
        description: `
            During this degree, I've learned about the basics of computer science, with a focus of application within the workfield. First year was focused on orientation, teaching students about the four branches that the students can specialize in within the degree, these four branches being business data, forensics, interaction technology and software engineering. Example topics: Object oriented programming, UML design, Database design, Basic forensics & Webdevelopment.

            For the second, third and fourth year, I specialized in the branch Software Development, diving deeper into topics like Design patterns, Fullstack development, Testing and Alghoritms & Datastructures. We did projects twice per semster, so we could put this knowledge to practice, as well as learn some collaboration and project management skills. To complete the topics, there was also a selection of topics that was shared between specializations, such as Ethics, Orginasational knowledge, Database management systems and Social skills.

            The third and fourth year are divided into four semesters, which can be done in almost any order you'd like. These segments are: a project of your choice, accompanied with some lectures and tests; an internship; a minor; a gratuation internship. For me, this project was SyncMyMusic, the intership was done at OneTwoModel, the minor was Startup Ville, where I created Heya Social, and the gratuation internship at Whispp. 
        `,
        connectionsFrom: [],
        skills: ['Java', 'Python', 'Javascript', 'Typescript', 'Golang', 'SpringBoot', 'Angular', 'Vue', 'Database Design', 'Docker', 'Software Testing', 'CI/CD', 'much more...']
    }, {
        id: 'onetwomodel',
        timeline: 2021_09,
        title: 'Internship Full Stack Developer',
        subtitle: 'OneTwoModel',
        timestamp: '09/2021 to 02/2022',
        description: `
            OneTwoModel was a startup, aiming at a fair and safe environment for (starting) models. Their platform allowed models to create a portfolio, and get in contact with multiple agencies at a time. This structure allowed their platform to also serve as a gateway, which keeps out unfair or unsafe modeling agencies.

            During my internship, my goal was, together with Daniel, to create the admin and modeling agency portals. We both worked on the backend in NestJS, while splitting the frontend responsibilities per portal, me working on the agency portal, while Daniel created the admin portal. We both worked in SvelteJS, as to keep the amount of technologies used low, and be able to keep a consistent architecture between portals.

            The goal of the agency portal was a nice user experience, and easy collaboration between multiple people within the agency taking into account their role and permissions. Allthough I do not fully understand the roles of a modelling agency, I've been able to set up permissions in a way to allows for full customization. 
        `,
        connectionsFrom: ['hsleiden'],
        skills: ['SvelteJS', 'NestJS', 'Firebase', 'Typescript', 'UI/UX Design', 'Software Testing']
    }, {
        id: 'startupville',
        timeline: 2022_02,
        title: 'Minor Startup Ville',
        subtitle: 'The creation of Heya Social',
        timestamp: '02/2022 to 08/2022',
        description: `
            Startup ville is an educational program of 6 months (1 semester), in which you create your own startup. The program is divided into two sections: the planning section, in which you validate wether your startup idea will work or not. The second part is the creation of it: creating the product, marketing and getting investors.

            The idea behind Heya Social was a social platform, in which people with similar interests can meet up to do something, that noone within their current friend group likes to do. Shortly after Startup Ville, we stopped with Heya Social, as school and internships started taking up too much time.
        `,
        connectionsFrom: ['hsleiden'],
        skills: ['Business skills', 'NestJS', 'React Native']
    }, {
        id: 'whispp_student',
        timeline: 2022_10,
        title: 'Partime software tester',
        subtitle: 'Whispp B.V.',
        timestamp: '10/2022 to 02/2023',
        description: `
            I started off at Whispp mainly as a software tester. I had to test the iOS app, which was being developed in house. Later my responsibilities expanded to creating a data collection platform, to collect data for AI training (similar to common voice by mozilla). Additionally, I've done the research proving Whispp's marketing claims to be truthful, making Whispp eligible for the CE certificate,and being able to sell their product in the EU.
        `,
        connectionsFrom: ['startupville'],
        skills: ['Software Testing', 'NestJS', 'Vue3', 'Research']
    }, {
        id: 'whispp_intern',
        timeline: 2023_02,
        title: 'Graduation Internship Full Stack Developer',
        subtitle: 'Whispp B.V.',
        timestamp: '02/2023 to 08/2023',
        description: `
            Whispp tries to give people with a voice disorder back their voice with AI. One of their big milestones is to get this working during a phone call, so people with voice disorders can become intelligible on the phone again.

            The project that was assigned to me was to find a way to make the phone calls, while being able to manipulate the audio from the phone calls server side. Additionally, I had to find an efficient way of load balancing these calls across multiple AI servers.

            The problem with load balancing across multiple AI servers is that metrics did not expose any information about the internal load of the AI server, or how much more it could handle. As the AI uses GPU, anything above what it could handle, will simply crash the application.

            To complete the design, some UML diagrams were made of how the code bases of the different applications in play would look. Additionally, I've set up a github actions workflow that empowers our software development cycle.
        `,
        connectionsFrom: ['hsleiden', 'whispp_student'],
        skills: ['UML', 'Cloud architecture', 'Github actions', 'CI/CD', 'Express', 'Typescript']
    }, {
        id: 'whispp_fullstack',
        timeline: 2023_02,
        title: 'Fulltime Software engineer',
        subtitle: 'Whispp B.V.',
        timestamp: '08/2023 to 01/2024',
        description: `
            Developer of the backend of the calling functionality in the Whispp app.
        `,
        connectionsFrom: ['whispp_intern'],
        skills: ['Express', 'Typescript', 'Python', 'GCP'],
    }, {
        id: 'teaching_assistent',
        timeline: 2019_09,
        title: 'Teaching assistent',
        subtitle: 'University of Applied Sciences Leiden',
        timestamp: '09/2019 to 03/2020',
        description: `
            Teaching assistent for first year and second year classes. Helped in Java, UML, Math, Webdevelopment and Database modelling.
        `,
        connectionsFrom: ['hsleiden'],
        skills: ['Java', 'UML', 'Math', 'Angular', 'Database Design']
    }, {
        id: 'syntax_board',
        timeline: 2019_09,
        title: 'Boardmember S.V. Syntax',
        subtitle: 'Study association Syntax',
        timestamp: '09/2019 to 08/2020',
        description: `
            As the president of studie association, I, together with the other board members, were in charge of the smooth runnings of the association. As the president, my main tasks were ensuring the other board members were able to do their tasks correctly, and helping where required. Additionally, I was 'the face' of the association, having to do speeches, being the main speaker at public meetings and being a contact point for other associations and the university.
        `,
        connectionsFrom: ['hsleiden'],
        skills: [],
    }, {
        id: 'syntax_educo',
        timeline: 2019_11,
        title: 'Member of the education commission',
        subtitle: 'Study association Syntax',
        timestamp: '11/2019 to 08/2022',
        description: `
            As a member of the education commission, I helped organize educational events for the study association, such as crash courses for first year topics, and talks from companies.
        `,
        connectionsFrom: ['syntax_board'],
        skills: [],
    }, {
        id: 'ois',
        timeline: 2019_09,
        title: 'Frontend developer',
        subtitle: 'OIS',
        timestamp: '07/2019 to 10/2019',
        description: `
            A summerjob creating websites in Angular and plain javascript.
        `,
        connectionsFrom: ['syntax_board'],
        skills: ['Angular', 'Javascript', 'Typescript']
    }, {
        id: 'whispp_lead-architect',
        timeline: 2024_01,
        title: 'Lead Architect',
        subtitle: 'Whispp B.V.',
        timestamp: '01/2024 to current',
        description: `
            Main developer of infrastructure and software architecture at Whispp
        `,
        connectionsFrom: ['whispp_fullstack'],
        skills: []
    }
];

export const GetNodeRelations = () => {
    const mappings = {};
    nodeData.forEach((node) => {
        mappings[node.id] = nodeData.filter((n) => n.connectionsFrom.includes(node.id)).map((n) => n.id);
    });
    return mappings;
}