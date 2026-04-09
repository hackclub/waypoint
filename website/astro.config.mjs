// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Waypoint',
			description: 'Learn how to design and build your own robot with Waypoint',
			customCss: ['./src/styles/starlight-overrides.css'],
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
