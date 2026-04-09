// Site configuration - centralized variables for colors, links, and assets

export const COLORS = {
  bg: '#141414',
  ink: '#f2e5b7',
  gold: '#f0b323',
  red: '#d84b3a',
} as const;

export const LINKS = {
  repo: 'https://github.com/sharkingstudios/waypoint',
  guides: '/guides/first-steps',
  hackClub: 'https://hackclub.com',
} as const;

export const IMAGES = {
  orpheusFlag: '/OrpheusFlag.svg',
  heroPlaceholder: '/placeholder-hero.svg',
  starHero: '/star-hero.svg',
} as const;
