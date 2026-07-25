/**
 * Every user-visible string lives here (PRD §6.2) — one reviewable layer,
 * and the dormant i18n scaffold (§12: Arabic later is additive).
 * Voice: confident, precise, humane; sentence case; active voice; no hype.
 */
export const site = {
  name: "TowardPCC",
  tagline: "The digital home of pediatric critical care",
  metaTitle: "TowardPCC · the digital home of pediatric critical care",
  description:
    "Free clinical calculators, knowledge and data systems, and research support for the pediatric critical care community. Built from Saudi Arabia for the world.",

  nav: {
    calculators: "Calculators",
    knowledge: "Knowledge",
    data: "Data",
    services: "Services",
    about: "About",
    contact: "Contact",
    menuLabel: "Menu",
    mainAriaLabel: "Main",
    homeAriaLabel: "TowardPCC home",
    skipToContent: "Skip to content",
  },

  footer: {
    pillarsHeading: "Platform",
    siteHeading: "Site",
    navAriaLabel: "Footer",
    residency: "Servers located in Saudi Arabia",
    orgName: "Toward Pediatric Critical Care",
  },

  home: {
    heading: "Every child. Every PICU. The same tools.",
    lede: "Free, referenced clinical calculators for pediatric critical care, with knowledge and data systems for every unit and research support for every investigator. Built from Saudi Arabia for the world.",
    status: "In development. Launching soon.",
    pillarsHeading: "What we are building",
  },

  pillars: {
    calculators: {
      title: "Calculators",
      status: "in development",
      description:
        "Free, clinically referenced PICU scoring calculators. Every computation runs in your browser; every score cites its published source; validation status is always shown honestly.",
    },
    knowledge: {
      title: "Knowledge",
      status: "in pilot",
      description:
        "The PedsCC Library: a purpose-built library and document management platform for PICU teams. Your unit's documents remain your unit's documents; we pilot the software, not the content.",
    },
    data: {
      title: "Data",
      status: "in design",
      description:
        "The future Gulf and MENA PICU registry and unit dashboards, built on the same validated scoring engine as the public calculators. No patient data is collected in this version.",
    },
    services: {
      title: "Research services",
      status: "free · capacity-based",
      description:
        "Research aid, biostatistics analysis, and AI-assisted research guidance for fellows and investigators. Provided free of charge by the TowardPCC team, subject to availability and capacity; requests are queued and answered as bandwidth allows.",
    },
  },

  about: {
    title: "About",
    heading: "About TowardPCC",
    status: "in development",
    description:
      "TowardPCC builds the digital backbone of pediatric critical care: free clinical calculators for every clinician, knowledge and data systems for every unit, and research support for every investigator. Starting in Saudi Arabia and the Gulf, built for the world.",
    metaDescription:
      "The mission, story, and honest roadmap of TowardPCC — built from Saudi Arabia for the pediatric critical care community worldwide.",
  },

  contactPage: {
    title: "Contact",
    heading: "Contact",
    status: "in development",
    description:
      "A contact form lands here soon. Until then, you can reach the team directly by email.",
    emailLabel: "Email us at",
    email: "info@towardpcc.com",
    metaDescription: "How to reach the TowardPCC team.",
  },

  stub: {
    notice:
      "This section is being built right now. What you read above is the real scope; nothing here is final marketing.",
  },

  errors: {
    notFound: {
      metaTitle: "Page not found",
      code: "404",
      heading: "This page does not exist",
      body: "The address may have changed or never existed. The pages below are real.",
      homeLink: "Go to the home page",
    },
    serverError: {
      heading: "Something went wrong on our side",
      body: "Try again. If it keeps happening, let us know on the contact page.",
      retry: "Try again",
      contactLink: "Go to the contact page",
    },
  },
} as const;
