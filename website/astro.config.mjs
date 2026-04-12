// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { SITE_LOADER_CSS, SITE_LOADER_SCRIPT } from './src/lib/site-loader.mjs';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Waypoint',
			description: 'Learn how to design and build your own robot with Waypoint',
			favicon: '/star-hero.svg',
			customCss: ['./src/styles/starlight-overrides.css'],
			head: [
				{ tag: 'style', content: SITE_LOADER_CSS },
				{ tag: 'script', content: SITE_LOADER_SCRIPT },
			],
			components: {
				ThemeSelect: './src/components/Empty.astro',
				SocialIcons: './src/components/DocsSocialIcons.astro',
			},
			pagefind: false,
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/sharkingstudios/waypoint' },
			],
			sidebar: [
				{ label: 'First Steps', slug: 'guides/first-steps' },
				   {
					   label: 'Reference',
					   autogenerate: { directory: 'reference' },
				   },
			],
		}),
	],
});
