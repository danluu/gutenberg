import { test, expect } from '@wordpress/e2e-test-utils-playwright';

import CollaborationUtils, {
	setCollaboration,
	type UserCredentials,
} from '../fixtures/collaboration-utils';

const CONVERGENCE_TIMEOUT_MS = 20_000;
const SEED_PARAGRAPH = 'Seed 930885 step 3 user 1 paragraph 502655';
const TARGET_FORMATTED_CONTENT = '<em>italic</em>beta 930885 1';

async function openFreshParagraph(page: Parameters<typeof test>[0]['page']) {
	await page.keyboard.press('ControlOrMeta+Alt+y');
}

async function slashInsert(
	page: Parameters<typeof test>[0]['page'],
	command: string
) {
	await page.keyboard.type('/' + command);
	await expect(page.locator('[role="listbox"]')).toBeVisible();
	await page.keyboard.press('Enter');
}

async function insertNaturalFormattedParagraph({
	page,
}: {
	page: Parameters<typeof test>[0]['page'];
}) {
	await openFreshParagraph(page);
	await page.keyboard.press('ControlOrMeta+i');
	await page.keyboard.type('italic');
	await page.keyboard.press('ControlOrMeta+i');
	await page.keyboard.type('beta 930885 1');
}

async function createCollaborator(
	requestUtils: Parameters<typeof test>[0]['requestUtils'],
	suffix: string
): Promise<{ createdUser: { id: number }; collaborator: UserCredentials }> {
	const collaborator: UserCredentials = {
		username: `triage-richtext-${suffix}`,
		email: `triage-richtext-${suffix}@example.com`,
		firstName: 'Triage',
		lastName: 'RichText',
		password: 'password',
		roles: ['editor'],
	};

	const createdUser = await requestUtils.createUser(collaborator);
	return { createdUser, collaborator };
}

test.describe('RTC formatted rich-text natural repro', () => {
	test('search block plus natural italic typing stays converged', async ({
		admin,
		editor,
		page,
		requestUtils,
	}) => {
		test.setTimeout(120_000);

		const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
		const { createdUser, collaborator } = await createCollaborator(
			requestUtils,
			suffix
		);
		const collaborationUtils = new CollaborationUtils({
			admin,
			cleanupUsersMode: 'tracked',
			editor,
			requestUtils,
			page,
		});
		collaborationUtils.registerCleanupUser(createdUser.id);

		try {
			await setCollaboration(requestUtils, true);

			const post = await requestUtils.createPost({
				title: `RTC natural rich-text ${suffix}`,
				status: 'draft',
				date_gmt: new Date().toISOString(),
			});

			await collaborationUtils.openPost(post.id);
			const { page: page2, editor: editor2 } =
				await collaborationUtils.joinUser(post.id, collaborator);
			await collaborationUtils.waitForMutualDiscovery();
			await collaborationUtils.waitForConvergence({
				timeout: CONVERGENCE_TIMEOUT_MS,
			});

			await editor2.canvas
				.getByRole('button', { name: 'Add default block' })
				.click();
			await page2.keyboard.type(SEED_PARAGRAPH);
			await page2.keyboard.press('Enter');
			await slashInsert(page2, 'search');
			await insertNaturalFormattedParagraph({
				page: page2,
			});

			await expect
				.poll(
					async () => {
						const blocks = await editor2.getBlocks();
						return blocks.at(-1)?.attributes?.content;
					},
					{ timeout: CONVERGENCE_TIMEOUT_MS }
				)
				.toBe(TARGET_FORMATTED_CONTENT);

			const finalState = await collaborationUtils.waitForConvergence({
				timeout: CONVERGENCE_TIMEOUT_MS,
			});
			expect(finalState.blocks.at(-1)?.attributes.content).toBe(
				TARGET_FORMATTED_CONTENT
			);
		} finally {
			await collaborationUtils.teardown();
			await setCollaboration(requestUtils, false);
		}
	});

	test('formatted paragraph still converges after save and passive-peer reload', async ({
		admin,
		editor,
		page,
		requestUtils,
	}) => {
		test.setTimeout(150_000);

		const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
		const { createdUser, collaborator } = await createCollaborator(
			requestUtils,
			suffix
		);
		const collaborationUtils = new CollaborationUtils({
			admin,
			cleanupUsersMode: 'tracked',
			editor,
			requestUtils,
			page,
		});
		collaborationUtils.registerCleanupUser(createdUser.id);

		try {
			await setCollaboration(requestUtils, true);

			const post = await requestUtils.createPost({
				title: `RTC natural rich-text reload ${suffix}`,
				status: 'draft',
				date_gmt: new Date().toISOString(),
			});

			await collaborationUtils.openPost(post.id);
			const { page: page2, editor: editor2 } =
				await collaborationUtils.joinUser(post.id, collaborator);
			await collaborationUtils.waitForMutualDiscovery();
			await collaborationUtils.waitForConvergence({
				timeout: CONVERGENCE_TIMEOUT_MS,
			});

			await editor2.canvas
				.getByRole('button', { name: 'Add default block' })
				.click();
			await page2.keyboard.type(SEED_PARAGRAPH);
			await page2.keyboard.press('Enter');
			await slashInsert(page2, 'search');

			await page2.getByRole('button', { name: 'Save draft' }).click();
			await expect(
				page2.getByRole('button', { name: 'Saved', exact: true })
			).toBeVisible({
				timeout: CONVERGENCE_TIMEOUT_MS,
			});

			await page.reload({ waitUntil: 'domcontentloaded' });
			await collaborationUtils.waitForEntityReadyAndSaveSettled(page, {
				timeout: CONVERGENCE_TIMEOUT_MS,
			});
			await collaborationUtils.waitForMutualDiscovery({
				timeout: CONVERGENCE_TIMEOUT_MS,
			});

			await insertNaturalFormattedParagraph({
				page: page2,
			});

			await expect
				.poll(
					async () => {
						const blocks = await editor2.getBlocks();
						return blocks.at(-1)?.attributes?.content;
					},
					{ timeout: CONVERGENCE_TIMEOUT_MS }
				)
				.toBe(TARGET_FORMATTED_CONTENT);

			const finalState = await collaborationUtils.waitForConvergence({
				timeout: CONVERGENCE_TIMEOUT_MS,
			});
			expect(finalState.blocks.at(-1)?.attributes.content).toBe(
				TARGET_FORMATTED_CONTENT
			);
		} finally {
			await collaborationUtils.teardown();
			await setCollaboration(requestUtils, false);
		}
	});
});
