/**
 * Every user-visible string lives here (PRD §6.2) — one reviewable layer,
 * and the dormant i18n scaffold (§12: Arabic later is additive).
 * Voice: confident, precise, humane; sentence case; active voice; no hype.
 */
export const site = {
  name: "TowardPCC",
  tagline: "The digital home of pediatric critical care",
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
    homeAriaLabel: "TowardPCC home",
  },

  footer: {
    pillarsHeading: "Platform",
    siteHeading: "Site",
    residency: "servers located in saudi arabia",
    // TODO:legal — replace with [ORG_LEGAL_NAME] when provided (LAUNCH-BLOCKERS.md)
    copyright: "© 2026 TowardPCC",
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

  stub: {
    notice:
      "This section is being built right now. What you read above is the real scope; nothing here is final marketing.",
  },

  errors: {
    notFound: {
      code: "404",
      heading: "This page does not exist",
      body: "The address may have changed or never existed. The pages below are real.",
      homeLink: "Go to the home page",
    },
    serverError: {
      heading: "Something went wrong on our side",
      body: "The error has been contained and nothing you entered has been stored. Try again, and if it keeps happening, tell us.",
      retry: "Try again",
    },
  },
} as const;
