import { test, expect, navigate, readCardFile } from './support/fixtures'

test('rename a sample rewrites every referencing file once', async ({ card }) => {
  await navigate(card, '/synths/Synth%20003')
  await card.getByRole('link', { name: 'SAMPLES/D024/D025/D039/S0298.wav' }).click()
  await card.getByRole('button', { name: 'Rename' }).click()

  const dialog = card.locator('dialog')
  await dialog.getByRole('textbox').fill('S0298 renamed.wav')
  await expect(dialog).toContainText('rewrite 2 files')
  await expect(dialog).toContainText('/SONGS/Song 005.XML')
  await expect(dialog).toContainText('/SYNTHS/Synth 003.XML')
  await dialog.getByRole('button', { name: 'Rename' }).click()

  await expect(card.getByRole('heading', { name: 'S0298 renamed' })).toBeVisible()
  await expect(card.getByText('Usage 2')).toBeVisible()

  expect(await readCardFile(card, 'SAMPLES/D024/D025/D039/S0298.wav')).toBeNull()
  expect(await readCardFile(card, 'SAMPLES/D024/D025/D039/S0298 renamed.wav')).not.toBeNull()
  for (const file of ['SYNTHS/Synth 003.XML', 'SONGS/Song 005.XML']) {
    const text = await readCardFile(card, file)
    expect(text).toContain('SAMPLES/D024/D025/D039/S0298 renamed.wav')
    expect(text).not.toContain('S0298.wav')
  }
  // consoleErrors fixture fails the test if the confirm ran twice (second run hits NotFoundError).
})

test('delete a skipped file re-scans the card', async ({ card }) => {
  const skipped = card.getByText('Edge unsupported firmware.XML', { exact: true }).locator('..')
  await skipped.getByRole('button').click()
  await card.locator('dialog').getByRole('button', { name: 'Delete' }).click()

  await expect(card.getByText('2 files in SONGS, SYNTHS or KITS could not be fully read')).toBeVisible()
  expect(await readCardFile(card, 'SONGS/Edge unsupported firmware.XML')).toBeNull()
})
