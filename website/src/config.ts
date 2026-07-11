// Site configuration - centralized variables for colors, links, and assets

export const COLORS = {
  bg: '#141414',
  ink: '#f2e5b7',
  gold: '#f0b323',
  red: '#d84b3a',
} as const;

export const LINKS = {
  repo: 'https://github.com/hackclub/waypoint',
  guides: '/guides/first-steps',
  hackClub: 'https://hackclub.com',
} as const;

export const IMAGES = {
  orpheusFlag: '/OrpheusFlag.svg',
  heroPlaceholder: '/placeholder-hero.svg',
  starHero: '/images/waypoint/waypoint-star.png',
  heroBackground: '/images/waypoint/hero-background.png',
  heroHeidi: '/images/waypoint/hero-heidi.png',
  heroRobot: '/images/waypoint/hero-robot.png',
} as const;
