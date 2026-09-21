import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const fixture = JSON.parse(readFileSync(new URL('../public/data/read-model.demo.json', import.meta.url), 'utf8'))

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-10T08:00:00Z') })
  await page.route('**/api/study/v1/session', (route) => route.fulfill({ json: { authenticated: true, login: 'fixture-user' } }))
  await page.route('**/api/study/v1/changes', (route) => route.fulfill({ json: [] }))
})

for (const state of ['dashboard', 'scored', 'pending', 'empty', 'error']) {
  test(`${state} renders and stays within viewport`, async ({ page }) => {
    const data = structuredClone(fixture)
    if (state === 'pending') Object.assign(data.assessments[0], { attempts: [], score_runs: [], review_decisions: [], cycle_decision: null, selected_score_run_id: null, score_status: 'pending', score_total: null })
    if (state === 'empty') Object.assign(data, { projects: [], plans: [], tasks: [], progress: [], assessments: [], evidence_coverage: [], audit_events: [] })
    await page.route('**/api/study/v1/read-model', (route) => route.fulfill(state === 'error' ? { status: 503, body: '{}' } : { json: data }))
    await page.goto(state === 'scored' || state === 'pending' ? './#/assessments' : './#/dashboard')
    if (state === 'error') await expect(page.getByRole('alert')).toBeVisible({ timeout: 20000 })
    else if (state === 'empty') await expect(page.getByRole('heading', { name: '还没有学习项目' })).toBeVisible()
    else await expect(page.locator('h1')).toBeVisible()
    await expect(page).toHaveScreenshot(`${state}.png`, { animations: 'disabled', fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

test('details survive refresh and repeated submissions preserve draft operation identity', async ({ page }) => {
  await page.route('**/api/study/v1/read-model', (route) => route.fulfill({ json: fixture }))
  const plan = fixture.plans[0].plan_id
  await page.goto(`./#/plans/${encodeURIComponent(plan)}`)
  await expect(page.getByRole('heading', { name: fixture.plans[0].title, exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('任务与验收')).toBeVisible()
  await page.goto('./#/assessments')
  const inputs = page.locator('.mutation-panel label textarea').filter({ visible: true })
  for (let i = 0; i < fixture.assessments[0].questions.length; i++) await inputs.nth(i).fill(`synthetic answer ${i}`)
  await page.reload()
  await expect(inputs.first()).toHaveValue('synthetic answer 0')
  const keys: string[] = []
  await page.route('**/api/study/v1/assessments/*/attempts', (route) => {
    keys.push(route.request().headers()['x-idempotency-key'])
    return route.fulfill({ json: { attempt_id: `ATTEMPT-${keys.length}`, operation_id: 'OP-FIXTURE', status: 'submitted', pr_url: 'https://example.test/pull/1' } })
  })
  await page.getByRole('button', { name: '预览文件变更' }).click()
  await inputs.first().fill('changed answer')
  await expect(page.getByRole('button', { name: '预览文件变更' })).toBeVisible()
  await page.getByRole('button', { name: '预览文件变更' }).click()
  await page.getByRole('button', { name: '确认创建 PR' }).click()
  await expect(page.getByRole('link', { name: '查看归档 PR' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: '查看归档 PR' })).toBeVisible()
  await page.getByRole('button', { name: '开始新答卷' }).click()
  await expect(inputs.first()).toHaveValue('')
  for (let i = 0; i < fixture.assessments[0].questions.length; i++) await inputs.nth(i).fill(`synthetic answer ${i}`)
  await page.getByRole('button', { name: '预览文件变更' }).click()
  await page.getByRole('button', { name: '确认创建 PR' }).click()
  await expect.poll(() => keys.length).toBe(2)
  expect(keys[0]).not.toBe(keys[1])
})

test('review requires a concrete preview and cancellation makes no request', async ({ page }) => {
  await page.route('**/api/study/v1/read-model', (route) => route.fulfill({ json: fixture }))
  let writes = 0
  await page.route('**/api/study/v1/assessments/*/scores/*/review', (route) => { writes++; return route.fulfill({ json: { status: 'submitted', operation_id: 'OP-TEST' } }) })
  await page.goto('./#/assessments')
  await page.getByLabel('审核/周期决定理由').fill('synthetic review reason')
  await page.getByRole('button', { name: '审核通过', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText(fixture.source_commit)
  await expect(page.getByRole('dialog')).toContainText('approved')
  await page.getByRole('button', { name: '取消', exact: true }).click()
  expect(writes).toBe(0)
  await page.getByRole('button', { name: '审核通过', exact: true }).click()
  await page.getByRole('button', { name: '确认提交', exact: true }).click()
  await expect.poll(() => writes).toBe(1)
})
