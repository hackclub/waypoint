// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { SITE_LOADER_CSS, SITE_LOADER_SCRIPT } from './src/lib/site-loader.mjs';

// https://astro.build/config
const site = process.env.SITE_URL ?? 'https://waypoint.loganpeterson.org';

export default defineConfig({
	site,
	output: 'static',
	integrations: [
		starlight({
			title: 'Waypoint',
			description: 'Learn how to design and build your own robot with Waypoint',
			favicon: '/images/waypoint/waypoint-star.png',
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
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/hackclub/waypoint' },
			],
			sidebar: [
				{ label: 'First Steps', slug: 'guides/first-steps' },
				{ label: 'PCB Guide', slug: 'guides/pcb-guide' },
				{ label: 'Chassis Guide', slug: 'guides/chassis-guide' },
				{
					label: 'ROS 2 Package Guide',
					items: [
						{ label: 'Start here', slug: 'guides/ros2-package-guide' },
						{ label: '1. Create your workspace', slug: 'guides/ros2-package-guide/workspace' },
						{ label: '2. Build movement nodes', slug: 'guides/ros2-package-guide/driving' },
						{ label: '3. Publish IMU data', slug: 'guides/ros2-package-guide/imu' },
						{ label: '4. Add teleop and autonomy', slug: 'guides/ros2-package-guide/autonomy' },
						{ label: '5. Polish your package', slug: 'guides/ros2-package-guide/polish' },
					],
				},
				{ label: 'Put Your Package on a Robot', slug: 'guides/robot-bringup' },
				{
					label: 'Reference',
					items: [{ autogenerate: { directory: 'reference' } }],
				},
			],
		}),
	],
});
