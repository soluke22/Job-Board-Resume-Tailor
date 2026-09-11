import {
  CandidateProfile,
  EvidenceItem,
  ProjectItem,
  SkillItem,
  JobRecord,
  TailoredResume,
  SearchProfile,
  OutcomeAnalytics
} from '../types';

/**
 * 100% SYNTHETIC DEMO DATASET
 * This fixture contains zero real candidate career records or PII.
 * Used exclusively for public demo mode and GitHub repository showcase.
 */

export const DEMO_CANDIDATE_PROFILE: CandidateProfile = {
  name: 'Jordan Taylor',
  fullName: 'Jordan Taylor',
  preferredName: 'Jordan',
  title: 'Frontend Product & Platform Engineer',
  email: 'jordan.taylor.demo@example.com',
  phone: '555-019-2834',
  location: 'San Francisco, CA / Remote',
  links: [
    { label: 'GitHub', url: 'https://github.com/example-demo-account' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/example-demo-candidate' },
    { label: 'Portfolio', url: 'https://jordantaylor-demo.example.dev' }
  ],
  workAuthorization: 'Authorized to work in the US (No sponsorship required)',
  targetRoleFamilies: [
    'frontend-product',
    'ui-platform-design-systems',
    'frontend-heavy-fullstack',
    'production-support-frontend'
  ],
  targetSeniority: ['Software Engineer II', 'Senior Frontend Engineer', 'Product Engineer'],
  locationPreferences: ['San Francisco, CA', 'New York, NY', 'Remote'],
  dealbreakers: [
    'Pure C++/Rust kernel distributed database roles',
    'Unsubstantiated Staff/Principal infrastructure architect roles'
  ],
  coreIdentity:
    'Frontend Product Engineer specializing in React, TypeScript, design system component primitives, GraphQL integration, and production web reliability.',
  masterSummary:
    'Product-focused frontend engineer with production experience delivering scalable web applications using React, TypeScript, and modern design systems. Skilled in component architecture, state management, GraphQL APIs, and frontend testing with high accessibility and performance standards.',
  safeVerbs: [
    'built',
    'implemented',
    'shipped',
    'contributed',
    'supported',
    'reviewed',
    'validated',
    'triaged',
    'investigated',
    'tested',
    'collaborated',
    'modernized',
    'refactored'
  ],
  restrictedVerbs: ['led', 'owned', 'architected', 'spearheaded', 'revolutionized']
};

export const DEMO_SEARCH_PROFILE: SearchProfile = {
  preferredRoleFamilies: [
    'frontend-product',
    'ui-platform-design-systems',
    'frontend-heavy-fullstack'
  ],
  preferredModifiers: [
    'DESIGN_SYSTEMS',
    'ACCESSIBILITY',
    'DEVELOPER_TOOLING',
    'B2B_SAAS',
    'AI_PRODUCT'
  ],
  excludedRolePatterns: [
    'Staff Principal Architect',
    'Senior Java Backend',
    'Distributed Systems Kernel',
    'ML Infrastructure C++'
  ],
  targetSeniority: ['Mid-Level', 'Senior', 'Product Engineer II'],
  allowedEmploymentTypes: ['full-time'],
  excludedEmploymentTypes: ['internship', 'part-time'],
  remotePreference: 'remote_only',
  hybridLocations: ['San Francisco, CA', 'New York, NY'],
  maximumOnsiteFrequency: '0 days/week',
  relocationAllowed: false,
  clearancePolicy: 'exclude_clearance',
  salaryPreference: {
    minTarget: 145000,
    minimumAcceptable: 130000
  },
  hiringProcessPreferences: {
    dislikeAiInterviewers: true,
    preferTakeHome: false,
    dislikeLeetcode: true,
    dislikeMultiRoundTakehome: true,
    notes: 'Prefers practical technical pairing and architecture discussions over robotic asynchronous one-way video screens.'
  },
  companyExclusions: ['Defense Logistics Corp', 'Legacy Banking Monoliths'],
  technologyStrengths: ['React', 'TypeScript', 'GraphQL', 'Tailwind CSS', 'Next.js', 'Jest'],
  technologyAdjacencies: ['Node.js', 'Express', 'PostgreSQL', 'Storybook', 'Vite'],
  technologyGaps: ['Java Spring Boot', 'Kubernetes Cluster Administration', 'CUDA/C++']
};

export const DEMO_EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'demo-ev-1',
    sourceType: 'document-import',
    sourceLocation: 'Aura Cloud Component Library Docs',
    verificationStatus: 'verified',
    employer: 'Aura Cloud Technologies',
    role: 'Software Engineer',
    period: '2023 - 2026',
    context: 'Full-time',
    rawEvidence:
      'Engineered and published 18 accessible React/TypeScript component primitives (Modals, Popovers, ComboBoxes, DataGrids) compliant with WCAG 2.1 AA.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Storybook', 'Aria'],
    responsibilities: [
      'Authored headless accessible primitive components',
      'Configured automated accessibility tests with axe-core and Vitest',
      'Documented component specs and API usage guidelines'
    ],
    outcomes: [
      'Adopted across 4 product frontend repositories by 30+ product engineers',
      'Zero high-severity accessibility regressions reported across two releases'
    ],
    supportedVerbs: ['built', 'implemented', 'shipped', 'tested', 'documented'],
    supportedMetrics: ['18 accessible component primitives', 'WCAG 2.1 AA compliance'],
    strength: 'High',
    roleFamilyRelevance: ['ui-platform-design-systems', 'frontend-product'],
    source: 'Aura Component Library Repository & Storybook Catalog',
    enabled: true,
    lastVerifiedAt: '2026-08-10'
  },
  {
    id: 'demo-ev-2',
    sourceType: 'document-import',
    sourceLocation: 'Nova Analytics Live Dashboard PRs',
    verificationStatus: 'verified',
    employer: 'Nova Analytics Labs',
    role: 'Software Engineer',
    period: '2022 - 2023',
    context: 'Full-time',
    rawEvidence:
      'Built real-time telemetry streaming views with React, TypeScript, and GraphQL subscriptions, replacing polling with persistent WebSocket-backed updates.',
    technologies: ['React', 'TypeScript', 'GraphQL', 'WebSockets', 'Jest'],
    responsibilities: [
      'Constructed responsive stream dashboard views',
      'Handled intermittent reconnection fallbacks and optimistic UI states',
      'Integrated Apollo Client cache normalization'
    ],
    outcomes: [
      'Eliminated 3,000 HTTP polling calls per active session',
      'Reduced visual UI jitter during network disconnects'
    ],
    supportedVerbs: ['built', 'implemented', 'shipped', 'tested', 'refactored'],
    supportedMetrics: ['3,000 requests saved per session'],
    strength: 'High',
    roleFamilyRelevance: ['frontend-product', 'frontend-heavy-fullstack'],
    source: 'Nova Product Git History',
    enabled: true,
    lastVerifiedAt: '2026-07-15'
  },
  {
    id: 'demo-ev-3',
    sourceType: 'personal-project',
    sourceLocation: 'PulseStream Telemetry GitHub Repository',
    verificationStatus: 'verified',
    context: 'Personal',
    rawEvidence:
      'Designed and deployed PulseStream, an open-source real-time event monitor built with React, Vite, Node/Express, and Tailwind CSS.',
    technologies: ['React', 'TypeScript', 'Node.js', 'Express', 'Vite', 'Tailwind CSS'],
    responsibilities: [
      'Developed responsive UI with keyboard navigation and dark mode',
      'Implemented rate-limited Express REST endpoints',
      'Configured GitHub Actions CI pipeline for linting and build validation'
    ],
    outcomes: [
      'Achieved 100% Lighthouse accessibility score',
      'Over 400 community stars on GitHub'
    ],
    supportedVerbs: ['built', 'designed', 'shipped', 'tested'],
    supportedMetrics: ['100% Lighthouse score', '400+ stars'],
    strength: 'High',
    roleFamilyRelevance: ['frontend-product', 'frontend-heavy-fullstack'],
    source: 'Public GitHub repository code commits',
    enabled: true,
    lastVerifiedAt: '2026-08-01'
  }
];

export const DEMO_PROJECTS: ProjectItem[] = [
  {
    id: 'demo-proj-1',
    name: 'PulseStream Telemetry Platform',
    purpose: 'Real-time observability dashboard for distributed event streams',
    period: '2024 - 2025',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Express', 'Vite'],
    solomonContribution:
      'Created full frontend interface, component library, live stream renderer, and client state cache.',
    leadershipEvidence: 'Maintained open-source repository and reviewed community pull requests.',
    implementationEvidence:
      'Implemented custom virtualized list rendering 5,000 events/sec at steady 60fps.',
    outcomes: [
      'Maintains 60fps rendering under heavy stream bursts',
      'Used by over 50 indie developers for local event triage'
    ],
    supportedMetrics: ['5,000 events/sec virtualization', '60fps performance'],
    roleFamilyRelevance: ['frontend-product', 'frontend-heavy-fullstack'],
    bullets: [
      'Engineered virtualized stream interface in React and TypeScript sustaining 5,000 events per second at steady 60fps.',
      'Constructed zero-dependency filter tokens and keyboard shortcut navigation passing WCAG AA criteria.'
    ],
    enabled: true
  },
  {
    id: 'demo-proj-2',
    name: 'Aura Accessible Primitives',
    purpose: 'Headless accessible component token library for product frontends',
    period: '2023 - 2024',
    technologies: ['React', 'TypeScript', 'Storybook', 'Aria Primitives', 'Vitest'],
    solomonContribution:
      'Implemented 18 component primitives, wrote Storybook documentation, and automated axe-core test suites.',
    leadershipEvidence: 'Led weekly frontend design system syncs with product engineering teams.',
    implementationEvidence:
      'Created comprehensive keyboard focus traps, portal dialogs, and ARIA live regions.',
    outcomes: [
      'Zero accessibility regressions across 12 product releases',
      'Cut new component prototyping time by 40%'
    ],
    supportedMetrics: ['18 primitives', '40% faster prototyping'],
    roleFamilyRelevance: ['ui-platform-design-systems', 'frontend-product'],
    bullets: [
      'Authored 18 headless component primitives in React and TypeScript with focus management and screen reader support.',
      'Integrated Storybook catalog with automated accessibility audits catching violations before production release.'
    ],
    enabled: true
  }
];

export const DEMO_SKILLS: SkillItem[] = [
  {
    id: 'demo-sk-1',
    name: 'React',
    category: 'Frameworks & Libraries',
    professionalEvidence: '3+ years production building component systems and consumer web UI.',
    projectEvidence: 'PulseStream, Aura Primitives',
    confidence: 'Expert',
    isCore: true,
    roleFamilies: ['frontend-product', 'ui-platform-design-systems'],
    enabled: true
  },
  {
    id: 'demo-sk-2',
    name: 'TypeScript',
    category: 'Languages',
    professionalEvidence: 'Strict TypeScript across all production component libraries and apps.',
    projectEvidence: 'PulseStream, Aura Primitives',
    confidence: 'Expert',
    isCore: true,
    roleFamilies: ['frontend-product', 'ui-platform-design-systems', 'frontend-heavy-fullstack'],
    enabled: true
  },
  {
    id: 'demo-sk-3',
    name: 'GraphQL',
    category: 'Architecture & Web Systems',
    professionalEvidence: 'Integrated normalized Apollo Client queries, mutations, and subscriptions.',
    projectEvidence: 'PulseStream real-time queries',
    confidence: 'Proficient',
    isCore: true,
    roleFamilies: ['frontend-product', 'frontend-heavy-fullstack'],
    enabled: true
  },
  {
    id: 'demo-sk-4',
    name: 'Tailwind CSS',
    category: 'Frameworks & Libraries',
    professionalEvidence: 'Authored design system utility configurations and responsive themes.',
    projectEvidence: 'All personal and professional projects',
    confidence: 'Expert',
    isCore: true,
    roleFamilies: ['frontend-product', 'ui-platform-design-systems'],
    enabled: true
  }
];

export const DEMO_MASTER_RESUME: TailoredResume = {
  id: 'demo-master-resume',
  jobId: 'master',
  roleFamily: 'frontend-product',
  header: {
    name: 'Jordan Taylor',
    title: 'Frontend Product & Platform Engineer',
    email: 'jordan.taylor.demo@example.com',
    phone: '555-019-2834',
    location: 'San Francisco, CA / Remote',
    links: [
      { label: 'GitHub', url: 'https://github.com/example-demo-account' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/example-demo-candidate' },
      { label: 'Portfolio', url: 'https://jordantaylor-demo.example.dev' }
    ]
  },
  professionalSummary:
    'Product-oriented Frontend Software Engineer with production experience shipping accessible, high-performance web applications using React, TypeScript, and GraphQL. Track record developing reusable component primitives, real-time telemetry dashboards, and verified test suites meeting rigorous WCAG accessibility standards.',
  skills: [
    {
      category: 'Frontend & Architecture',
      skills: ['React', 'TypeScript', 'Next.js', 'GraphQL', 'Tailwind CSS', 'HTML5/CSS3']
    },
    {
      category: 'Design Systems & UI',
      skills: ['Storybook', 'ARIA Primitives', 'WCAG 2.1 AA', 'Design Tokens', 'Figma']
    },
    {
      category: 'Backend Integration & Tools',
      skills: ['Node.js', 'Express', 'REST APIs', 'Vite', 'Git', 'Webpack']
    },
    {
      category: 'Quality & Testing',
      skills: ['Jest', 'Vitest', 'React Testing Library', 'Playwright', 'axe-core']
    }
  ],
  experience: [
    {
      id: 'demo-exp-1',
      employer: 'Aura Cloud Technologies',
      title: 'Software Engineer',
      period: '2023 - Present',
      location: 'San Francisco, CA / Remote',
      bullets: [
        {
          id: 'demo-b-1',
          section: 'experience',
          parentId: 'demo-exp-1',
          text: 'Built and published 18 accessible React and TypeScript component primitives with keyboard focus traps and full WCAG 2.1 AA compliance.',
          targetRequirement: 'Design system experience',
          evidenceSource: 'Aura Component Library Docs',
          whyThisBullet: 'Demonstrates deep component infrastructure craft and accessibility rigor.',
          underlyingEvidence: '18 primitives shipped to 4 internal repositories.',
          enabled: true
        },
        {
          id: 'demo-b-2',
          section: 'experience',
          parentId: 'demo-exp-1',
          text: 'Integrated automated axe-core accessibility tests into CI pipeline, catching regression issues prior to deployment across 12 releases.',
          targetRequirement: 'Frontend testing and CI/CD',
          evidenceSource: 'Aura Cloud CI Pipelines',
          whyThisBullet: 'Shows proactive engineering quality and automated compliance.',
          underlyingEvidence: 'Automated CI test coverage across releases.',
          enabled: true
        },
        {
          id: 'demo-b-3',
          section: 'experience',
          parentId: 'demo-exp-1',
          text: 'Collaborated with product designers to standardize design tokens for typography, spacing, and elevation, cutting UI inconsistencies across squads.',
          targetRequirement: 'Design collaboration',
          evidenceSource: 'Design Tokens Spec',
          whyThisBullet: 'Proves cross-functional alignment with design and product teams.',
          underlyingEvidence: 'Design token specification adoption.',
          enabled: true
        }
      ]
    },
    {
      id: 'demo-exp-2',
      employer: 'Nova Analytics Labs',
      title: 'Software Engineer',
      period: '2022 - 2023',
      location: 'San Francisco, CA',
      bullets: [
        {
          id: 'demo-b-4',
          section: 'experience',
          parentId: 'demo-exp-2',
          text: 'Engineered real-time telemetry streaming views with React, TypeScript, and GraphQL subscriptions, replacing polling to save 3,000 HTTP requests per session.',
          targetRequirement: 'GraphQL and real-time frontend integration',
          evidenceSource: 'Nova Git History',
          whyThisBullet: 'Connects React UI state with real-time GraphQL streaming.',
          underlyingEvidence: 'Replaced polling with persistent subscriptions.',
          enabled: true
        },
        {
          id: 'demo-b-5',
          section: 'experience',
          parentId: 'demo-exp-2',
          text: 'Triaged and resolved 45 production frontend bugs using browser DevTools and telemetry logs to maintain responsive 60fps rendering.',
          targetRequirement: 'Production support and debugging',
          evidenceSource: 'Jira issue history',
          whyThisBullet: 'Demonstrates defensive production support and reliability.',
          underlyingEvidence: 'Resolved 45 customer-reported issues.',
          enabled: true
        }
      ]
    }
  ],
  projects: [
    {
      id: 'demo-p-1',
      name: 'PulseStream Telemetry Platform',
      period: '2024 - 2025',
      technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Express', 'Vite'],
      bullets: [
        {
          id: 'demo-pb-1',
          section: 'project',
          parentId: 'demo-p-1',
          text: 'Engineered high-throughput event visualization dashboard in React and TypeScript rendering 5,000 virtualized log lines at steady 60fps.',
          targetRequirement: 'Performance optimization',
          evidenceSource: 'PulseStream Repo',
          whyThisBullet: 'Validates virtualization and high-density UI rendering.',
          underlyingEvidence: 'Custom virtual list implementation.',
          enabled: true
        },
        {
          id: 'demo-pb-2',
          section: 'project',
          parentId: 'demo-p-1',
          text: 'Implemented rate-limited Express REST API with input validation schemas and structured error payloads for developer integration.',
          targetRequirement: 'Full-stack Node/Express capabilities',
          evidenceSource: 'PulseStream Server Code',
          whyThisBullet: 'Provides defensible server-side API integration evidence.',
          underlyingEvidence: 'Express server with Zod validation.',
          enabled: true
        }
      ]
    }
  ],
  education: [
    {
      institution: 'University of California, Berkeley',
      degree: 'B.S. in Computer Science',
      period: '2018 - 2022',
      location: 'Berkeley, CA'
    }
  ],
  pageEstimate: {
    isOnePage: true,
    estimatedLines: 47,
    overflowRisk: 'low',
    trimSuggestions: []
  }
};

export const DEMO_JOBS: JobRecord[] = [
  {
    id: 'job-demo-ashby-1',
    atsProvider: 'ashby',
    atsBoard: 'stripe-demo-team',
    atsJobId: 'ashby-7821-frontend-product',
    company: 'Linear Dynamics',
    title: 'Frontend Product Engineer (Design Systems)',
    canonicalUrl: 'https://jobs.ashbyhq.com/linear-dynamics/ashby-7821-frontend-product',
    applyUrl: 'https://jobs.ashbyhq.com/linear-dynamics/ashby-7821-frontend-product/apply',
    discoveryUrl: 'https://jobs.ashbyhq.com/linear-dynamics/ashby-7821-frontend-product',
    description:
      'We are looking for a Frontend Product Engineer to craft responsive user interfaces, expand our shared React/TypeScript component library, and collaborate closely with product design. Requirements: 2+ years of production React and TypeScript experience, strong accessibility knowledge (WCAG), Storybook or component documentation experience, and experience connecting UI to GraphQL APIs.',
    location: 'Remote (US)',
    secondaryLocations: ['San Francisco, CA', 'New York, NY'],
    remoteStatus: 'remote',
    workplaceType: 'Remote',
    employmentType: 'full-time',
    compensation: {
      min: 140000,
      max: 175000,
      currency: 'USD',
      interval: 'year',
      raw: '$140,000 - $175,000 USD'
    },
    department: 'Product Engineering',
    team: 'Core UI Experience',
    publishedAt: '2026-09-02T14:30:00Z',
    updatedAt: '2026-09-08T10:15:00Z',
    firstSeenAt: '2026-09-03T09:00:00Z',
    lastVerifiedAt: '2026-09-10T12:00:00Z',
    verificationStatus: 'LISTED',
    isCurrentlyListed: true,
    freshnessBand: 'RECENT',
    sourceChannel: 'Ashby Direct API Board',
    searchQuery: 'site:jobs.ashbyhq.com React TypeScript frontend design systems',
    primaryRoleFamily: 'ui-platform-design-systems',
    roleModifiers: ['DESIGN_SYSTEMS', 'ACCESSIBILITY', 'DEVELOPER_TOOLING', 'B2B_SAAS'],
    seniority: 'Mid',
    hardRequirements: [
      '2+ years production React and TypeScript experience',
      'Strong accessibility and WCAG compliance knowledge',
      'Component library or Storybook development'
    ],
    preferredRequirements: [
      'Experience with GraphQL queries and cache normalization',
      'Figma design token workflow integration'
    ],
    technologies: ['React', 'TypeScript', 'GraphQL', 'Storybook', 'Tailwind CSS', 'Aria'],
    responsibilities: [
      'Build reusable accessible UI primitives for web application squads',
      'Ensure 100% WCAG 2.1 AA accessibility compliance across core components',
      'Integrate GraphQL client state and optimize render performance'
    ],
    hiringSignals: [
      'Explicit emphasis on accessibility craft rather than generic full-stack work',
      'Verified active listing on Ashby board with transparent compensation'
    ],
    hardBlockers: [],
    softGaps: ['Experience with specialized Figma token automation plugins'],
    qualificationFit: 9.2,
    evidenceCoverage: 9.0,
    applicationPriority: 'APPLY FIRST',
    priorityReason:
      'Direct alignment with verified candidate evidence in React, TypeScript, WCAG component primitives, and Storybook.',
    applicationStatus: 'SHORTLISTED',
    rawDescription:
      'We are looking for a Frontend Product Engineer to craft responsive user interfaces, expand our shared React/TypeScript component library, and collaborate closely with product design. Requirements: 2+ years of production React and TypeScript experience, strong accessibility knowledge (WCAG), Storybook or component documentation experience, and experience connecting UI to GraphQL APIs.',
    dateAdded: '2026-09-03',
    status: 'Fit Checked',
    fit: {
      qualificationFit: 9.2,
      evidenceCoverage: 9.0,
      applicationPriority: 'High',
      initialFitScore: 8.8,
      tailoredFitScore: 9.4,
      verdict: 'Apply',
      verdictReason:
        'Outstanding technical alignment. Candidate has verified evidence for all hard requirements.',
      strongestMatch: '18 accessible React/TypeScript component primitives with WCAG compliance.',
      biggestActualGap: 'Figma token automation plugins (preferred requirement only).',
      blockers: [],
      unsupportedRequirements: [],
      canTailor: true
    }
  },
  {
    id: 'job-demo-gh-2',
    atsProvider: 'greenhouse',
    atsBoard: 'dataroute-demo',
    atsJobId: 'gh-9912-product-engineer',
    company: 'DataRoute Cloud',
    title: 'Software Engineer, Product UI',
    canonicalUrl: 'https://job-boards.greenhouse.io/dataroute-demo/jobs/9912',
    applyUrl: 'https://job-boards.greenhouse.io/dataroute-demo/jobs/9912#app',
    discoveryUrl: 'https://job-boards.greenhouse.io/dataroute-demo/jobs/9912',
    description:
      'DataRoute Cloud is hiring a Software Engineer for our Product UI team. You will build user-facing workflows, telemetry monitors, and configuration screens. Tech stack: React, TypeScript, Vite, Tailwind CSS, GraphQL backend. We look for engineers who care about developer experience, testing rigor, and reliable customer-facing features.',
    location: 'Remote (US)',
    remoteStatus: 'remote',
    workplaceType: 'Remote',
    employmentType: 'full-time',
    compensation: {
      min: 135000,
      max: 165000,
      currency: 'USD',
      interval: 'year',
      raw: '$135,000 - $165,000 USD'
    },
    department: 'Engineering',
    team: 'Product Workflows',
    publishedAt: '2026-09-05T08:00:00Z',
    firstSeenAt: '2026-09-06T11:00:00Z',
    lastVerifiedAt: '2026-09-10T12:00:00Z',
    verificationStatus: 'LISTED',
    isCurrentlyListed: true,
    freshnessBand: 'NEW',
    sourceChannel: 'Greenhouse API Board',
    searchQuery: 'site:job-boards.greenhouse.io React TypeScript product engineer',
    primaryRoleFamily: 'frontend-product',
    roleModifiers: ['DATA_VISUALIZATION', 'B2B_SAAS', 'DEVELOPER_TOOLING'],
    seniority: 'Mid',
    hardRequirements: [
      'Production React and TypeScript experience',
      'Hands-on experience with frontend build tooling (Vite/Webpack)',
      'Experience testing React components with Vitest or Jest'
    ],
    preferredRequirements: [
      'Experience with high-density data tables and telemetry streams',
      'Knowledge of Node/Express microservices'
    ],
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'Jest', 'GraphQL'],
    responsibilities: [
      'Build responsive, reliable product UI workflows',
      'Implement real-time telemetry tables and filters',
      'Write comprehensive unit and integration tests'
    ],
    hiringSignals: ['Clear compensation band', 'Verified listed status on canonical Greenhouse board'],
    hardBlockers: [],
    softGaps: [],
    qualificationFit: 8.9,
    evidenceCoverage: 8.8,
    applicationPriority: 'STRONG',
    priorityReason:
      'Strong match with telemetry UI experience (PulseStream) and modern React/Vite stack.',
    applicationStatus: 'TAILORED',
    rawDescription:
      'DataRoute Cloud is hiring a Software Engineer for our Product UI team. You will build user-facing workflows, telemetry monitors, and configuration screens. Tech stack: React, TypeScript, Vite, Tailwind CSS, GraphQL backend.',
    dateAdded: '2026-09-06',
    status: 'Resume Generated',
    fit: {
      qualificationFit: 8.9,
      evidenceCoverage: 8.8,
      applicationPriority: 'High',
      initialFitScore: 8.5,
      tailoredFitScore: 9.1,
      verdict: 'Apply',
      verdictReason:
        'Strong overlap with real-time UI telemetry and verified testing practices.',
      strongestMatch: 'PulseStream telemetry dashboard and virtualized high-density UI.',
      biggestActualGap: 'None on hard requirements.',
      blockers: [],
      unsupportedRequirements: [],
      canTailor: true
    }
  },
  {
    id: 'job-demo-lever-3',
    atsProvider: 'lever',
    atsBoard: 'cortex-ai-demo',
    atsJobId: 'lever-5531-fde',
    company: 'Cortex Applied AI',
    title: 'Forward Deployed Engineer (Product UI & Integrations)',
    canonicalUrl: 'https://jobs.lever.co/cortex-ai-demo/5531-fde',
    applyUrl: 'https://jobs.lever.co/cortex-ai-demo/5531-fde/apply',
    discoveryUrl: 'https://jobs.lever.co/cortex-ai-demo/5531-fde',
    description:
      'Cortex Applied AI is seeking a Forward Deployed Engineer to work with enterprise customers deploying our AI workflow copilot interfaces. You will adapt our React/TypeScript product components, integrate customer REST/GraphQL endpoints, and prototype custom UI dashboards under rapid cycles.',
    location: 'San Francisco, CA / Remote',
    remoteStatus: 'remote',
    workplaceType: 'Hybrid or Remote',
    employmentType: 'full-time',
    compensation: {
      min: 150000,
      max: 185000,
      currency: 'USD',
      interval: 'year'
    },
    publishedAt: '2026-08-28T16:00:00Z',
    firstSeenAt: '2026-08-30T10:00:00Z',
    lastVerifiedAt: '2026-09-10T12:00:00Z',
    verificationStatus: 'LISTED',
    isCurrentlyListed: true,
    freshnessBand: 'ESTABLISHED',
    sourceChannel: 'Lever Postings API',
    searchQuery: 'site:jobs.lever.co React TypeScript forward deployed AI',
    primaryRoleFamily: 'forward-deployed-software',
    roleModifiers: ['AI_PRODUCT', 'CUSTOMER_FACING', 'EARLY_STAGE'],
    seniority: 'Mid',
    hardRequirements: [
      'React and TypeScript engineering proficiency',
      'Strong API data-fetching and integration experience',
      'Direct customer or stakeholder technical collaboration'
    ],
    preferredRequirements: [
      'Experience with LLM tool-calling UI interfaces',
      'Rapid prototyping agility'
    ],
    technologies: ['React', 'TypeScript', 'Node.js', 'REST', 'GraphQL'],
    responsibilities: [
      'Deploy customer-facing AI workflow UI interfaces',
      'Implement custom integrations with client systems',
      'Collaborate directly with enterprise client technical leads'
    ],
    hiringSignals: ['Selective FDE role centered on frontend product UI rather than heavy distributed backend'],
    hardBlockers: [],
    softGaps: ['Client-facing escalation management'],
    qualificationFit: 8.3,
    evidenceCoverage: 7.9,
    applicationPriority: 'CALIBRATED STRETCH',
    priorityReason:
      'Strong technical fit on React/API integration; slight stretch on formal customer-facing forward deployed title.',
    applicationStatus: 'APPLIED',
    appliedDate: '2026-09-07',
    channel: 'Direct / Company Portal',
    rawDescription:
      'Cortex Applied AI is seeking a Forward Deployed Engineer to work with enterprise customers deploying our AI workflow copilot interfaces.',
    dateAdded: '2026-08-30',
    status: 'Applied'
  }
];

export const DEMO_OUTCOME_ANALYTICS: OutcomeAnalytics = {
  totalApplications: 14,
  totalScreens: 6,
  totalTechnicalInterviews: 4,
  totalFinalInterviews: 2,
  totalOffers: 1,
  totalRejections: 3,
  conversionByFamily: {
    'ui-platform-design-systems': { total: 5, interviews: 3, rate: 0.6 },
    'frontend-product': { total: 6, interviews: 3, rate: 0.5 },
    'forward-deployed-software': { total: 2, interviews: 0, rate: 0.0 },
    'frontend-heavy-fullstack': { total: 1, interviews: 0, rate: 0.0 }
  },
  conversionByModifier: {
    DESIGN_SYSTEMS: { total: 5, interviews: 3, rate: 0.6 },
    ACCESSIBILITY: { total: 4, interviews: 3, rate: 0.75 },
    B2B_SAAS: { total: 6, interviews: 3, rate: 0.5 },
    AI_PRODUCT: { total: 2, interviews: 1, rate: 0.5 }
  },
  conversionByChannel: {
    'Ashby Direct': { total: 6, interviews: 3, rate: 0.5 },
    'Greenhouse Board': { total: 5, interviews: 2, rate: 0.4 },
    'Company Portal': { total: 3, interviews: 1, rate: 0.33 }
  },
  conversionByFitBand: {
    'APPLY FIRST (9.0+)': { total: 6, interviews: 4, rate: 0.67 },
    'STRONG (8.0-8.9)': { total: 5, interviews: 2, rate: 0.4 },
    'CALIBRATED STRETCH': { total: 3, interviews: 0, rate: 0.0 }
  },
  conversionByFreshness: {
    'NEW (< 7 days)': { total: 7, interviews: 4, rate: 0.57 },
    'RECENT (7-21 days)': { total: 5, interviews: 2, rate: 0.4 },
    'ESTABLISHED (21+ days)': { total: 2, interviews: 0, rate: 0.0 }
  },
  smallSampleWarning: true
};
