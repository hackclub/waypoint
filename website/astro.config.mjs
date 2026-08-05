// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { SITE_LOADER_CSS, SITE_LOADER_SCRIPT } from './src/lib/site-loader.mjs';

// https://astro.build/config
const site = process.env.SITE_URL ?? 'https://waypoint.hackclub.org';
const guideMediaMarkdown = {
	name: 'waypoint-lazy-guide-media',
	hooks: {
		'astro:config:setup': ({ config }) => {
			if (config.markdown.processor.name !== 'satteri') {
				throw new Error("Waypoint guide-media processing requires Astro's default Satteri processor.");
			}

			config.markdown.processor.options.hastPlugins.push(() => ({
				name: 'waypoint-lazy-guide-images',
				element: {
					filter: ['img'],
					visit(node, ctx) {
						if (!ctx.fileURL?.pathname.replaceAll('\\', '/').includes('/src/content/docs/guides/')) return;

						const properties = (node.properties ??= {});
						const classNames = Array.isArray(properties.className)
							? properties.className
							: String(properties.className ?? '').split(/\s+/);
						const eager =
							Object.hasOwn(properties, 'dataLoadEager') ||
							Object.hasOwn(properties, 'data-load-eager') ||
							properties.loading === 'eager' ||
							classNames.includes('load-eager');

						if (properties.decoding == null) ctx.setProperty(node, 'decoding', 'async');
						if (properties.dataLoadWatch == null) ctx.setProperty(node, 'data-load-watch', '');
						if (eager) return;
						if (properties.loading == null) ctx.setProperty(node, 'loading', 'lazy');
						if (properties.fetchPriority == null) ctx.setProperty(node, 'fetchpriority', 'low');
					},
				},
			}));
		},
	},
};
export default defineConfig({
	site,
	output: 'static',
	prefetch: { prefetchAll: false },
	integrations: [
		starlight({
			title: 'Waypoint',
			description: 'Learn how to design and build your own robot with Waypoint',
			favicon: '/images/waypoint/waypoint-star.png',
			customCss: ['./src/styles/starlight-overrides.css'],
			head: [
				{ tag: 'style', content: SITE_LOADER_CSS },
				{ tag: 'script', content: SITE_LOADER_SCRIPT },
				{
					tag: 'link',
					attrs: {
						rel: 'preload',
						href: '/fonts/ibm-plex-mono-400-latin.woff2',
						as: 'font',
						type: 'font/woff2',
						crossorigin: 'anonymous',
					},
				},

				{
					tag: 'link',
					attrs: {
						rel: 'preload',
						href: '/fonts/press-start-2p-400-latin.woff2',
						as: 'font',
						type: 'font/woff2',
						crossorigin: 'anonymous',
					},
				},
				{ tag: 'link', attrs: { rel: 'stylesheet', href: '/fonts.css' } },

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
						{ label: 'ROS 2 Start Here', slug: 'guides/ros2-package-guide' },
						{ label: 'Learn the ROS 2 basics', slug: 'guides/ros2-package-guide/fundamentals' },
						{ label: 'Create your workspace', slug: 'guides/ros2-package-guide/workspace' },
						{ label: 'Understand messages, parameters, and launch', slug: 'guides/ros2-package-guide/messages-and-launch' },
						{ label: 'Build movement nodes', slug: 'guides/ros2-package-guide/driving' },
						{ label: 'Publish IMU data', slug: 'guides/ros2-package-guide/imu' },
						{ label: 'Add teleop and autonomy', slug: 'guides/ros2-package-guide/autonomy' },
						{ label: 'Polish your package', slug: 'guides/ros2-package-guide/polish' },
					],
				},
				{ label: 'Submission Requirements', slug: 'guides/submission-requirements' },
				{ label: 'IRL Guide', slug: 'guides/robot-bringup' },
				{
					label: 'Reference',
					items: [{ autogenerate: { directory: 'reference' } }],
				},
				{
					label: 'Extras',
					items: [
						{ label: 'Event-based keyboard teleop', slug: 'extras/event-based-keyboard-teleop' },
						{ label: 'Gyro bias calibration', slug: 'extras/gyro-bias-calibration' },
					],
				},
			],
		}),
		guideMediaMarkdown,
	],
});
