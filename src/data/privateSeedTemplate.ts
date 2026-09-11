import {
  CandidateProfile,
  SearchProfile,
  TailoredResume
} from '../types';

/**
 * Clean private candidate workspace default template.
 * When the owner logs in for the first time without an imported workspace,
 * this structure initializes an empty candidate profile awaiting resume import.
 */
export const DEFAULT_PRIVATE_PROFILE: CandidateProfile = {
  name: 'Solomon Lucas-Thornton',
  fullName: 'Solomon Lucas-Thornton',
  preferredName: 'Solomon',
  title: 'Software Engineer',
  email: 'solomonlucasthornton@gmail.com',
  phone: '',
  location: 'Los Angeles, CA / Remote',
  links: [
    { label: 'GitHub', url: 'https://github.com/soluke22' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/solomonlucasthornton' },
    { label: 'Portfolio', url: 'https://soluke22.github.io/' }
  ],
  workAuthorization: 'Authorized to work in the US (No sponsorship required)',
  targetRoleFamilies: [
    'frontend-product',
    'ui-platform-design-systems',
    'frontend-heavy-fullstack',
    'production-support-frontend',
    'forward-deployed-software'
  ],
  targetSeniority: ['Software Engineer', 'Frontend Engineer II', 'Mid-Level Software Engineer'],
  locationPreferences: ['Los Angeles, CA', 'Remote', 'Bristol, CT'],
  dealbreakers: [
    'Pure C++/kernel distributed consensus systems',
    'Unsubstantiated Staff/Principal infrastructure architect roles'
  ],
  coreIdentity:
    'Software Engineer specializing in React, TypeScript, GraphQL, and frontend product engineering.',
  masterSummary:
    'Software Engineer specializing in React, TypeScript, and modern web application development with production experience building performant, accessible UI and data-backed product features.',
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

export const DEFAULT_SEARCH_PROFILE: SearchProfile = {
  preferredRoleFamilies: [
    'frontend-product',
    'ui-platform-design-systems',
    'frontend-heavy-fullstack'
  ],
  preferredModifiers: [
    'DESIGN_SYSTEMS',
    'ACCESSIBILITY',
    'DEVELOPER_TOOLING',
    'MEDIA',
    'SPORTS',
    'AI_PRODUCT'
  ],
  excludedRolePatterns: [
    'Senior Java Architect',
    'Staff Principal Distributed Systems',
    'C++ Kernel Developer',
    'ML Infrastructure Engineer'
  ],
  targetSeniority: ['Software Engineer', 'Frontend Engineer II', 'Mid-Level', 'Product Engineer'],
  allowedEmploymentTypes: ['full-time', 'contract'],
  excludedEmploymentTypes: ['internship'],
  remotePreference: 'remote_only',
  hybridLocations: ['Los Angeles, CA'],
  maximumOnsiteFrequency: '0 days/week',
  relocationAllowed: false,
  clearancePolicy: 'exclude_clearance',
  salaryPreference: {
    minTarget: 140000,
    minimumAcceptable: 125000
  },
  hiringProcessPreferences: {
    dislikeAiInterviewers: true,
    preferTakeHome: false,
    dislikeLeetcode: true,
    dislikeMultiRoundTakehome: true,
    notes: 'Prioritizes teams evaluating verified code samples, PR reviews, and practical architecture over artificial puzzle interviews.'
  },
  companyExclusions: [],
  technologyStrengths: ['React', 'TypeScript', 'GraphQL', 'JavaScript', 'Jest', 'Tailwind CSS'],
  technologyAdjacencies: ['Node.js', 'Express', 'Vite', 'Storybook', 'Next.js', 'New Relic'],
  technologyGaps: ['Java Spring Boot', 'C++', 'Kubernetes cluster administration', 'Python ML infra']
};

export const DEFAULT_BLANK_MASTER_RESUME: TailoredResume = {
  id: 'master-resume-template',
  jobId: 'master',
  roleFamily: 'frontend-product',
  header: {
    name: 'Solomon Lucas-Thornton',
    title: 'Software Engineer',
    email: 'solomonlucasthornton@gmail.com',
    phone: '',
    location: 'Los Angeles, CA / Remote',
    links: [
      { label: 'GitHub', url: 'https://github.com/soluke22' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/solomonlucasthornton' },
      { label: 'Portfolio', url: 'https://soluke22.github.io/' }
    ]
  },
  professionalSummary:
    'Software Engineer with production experience building performant web user interfaces with React, TypeScript, and GraphQL. Experienced across high-visibility consumer digital products, reusable frontend component libraries, live sports tournament states, and cross-functional feature delivery with rigorous QA and testing standards.',
  skills: [
    {
      category: 'Languages & Core',
      skills: ['TypeScript', 'JavaScript (ES6+)', 'HTML5', 'CSS3/SCSS', 'GraphQL']
    },
    {
      category: 'Frameworks & UI',
      skills: ['React', 'Next.js', 'Tailwind CSS', 'Storybook', 'Component Systems']
    },
    {
      category: 'Backend & Tools',
      skills: ['Node.js', 'Express', 'REST APIs', 'Git', 'Vite', 'Webpack']
    },
    {
      category: 'Testing & Reliability',
      skills: ['Jest', 'React Testing Library', 'Playwright', 'WCAG AA Accessibility']
    }
  ],
  experience: [],
  projects: [],
  education: [
    {
      institution: 'University Degree',
      degree: 'B.S. in Computer Science',
      period: '2018 - 2022',
      location: 'United States'
    }
  ],
  pageEstimate: {
    isOnePage: true,
    estimatedLines: 46,
    overflowRisk: 'low',
    trimSuggestions: []
  }
};
