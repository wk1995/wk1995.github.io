import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { assertCompatibleReadModel, type Assessment, type ReadModel } from './model'

const routes = [
  ['dashboard', '概览', '⌂'],
  ['projects', '学习项目', '◫'],
  ['plans', '计划与任务', '✓'],
  ['assessments', '测试与评分', '◎'],
  ['progress', '学习进度', '↗'],
  ['settings', '评分设置', '⚙'],
  ['diagnostics', '同步诊断', '↻'],
] as const

type Route = (typeof routes)[number][0]

function currentRoute(): Route {
  const value = window.location.hash.replace(/^#\/?/, '') as Route
  return routes.some(([route]) => route === value) ? value : 'dashboard'
}

async function loadReadModel(): Promise<ReadModel> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/read-model.demo.json`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`读取失败：HTTP ${response.status}`)
  const data: unknown = await response.json()
  assertCompatibleReadModel(data)
  return data
}

function StatusPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'good' | 'warn' | 'neutral' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

function ProgressBar({ value }: { value: number }) {
  return <div className="progress-track" role="progressbar" aria-label={`执行进度 ${value}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${value}%` }} /></div>
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return <section className="empty"><span aria-hidden="true">◇</span><h2>{title}</h2><p>{detail}</p></section>
}

function Dashboard({ data }: { data: ReadModel }) {
  const plan = data.plans.find((item) => item.status === 'active') ?? data.plans[0]
  const project = data.projects.find((item) => item.project_id === plan?.project_id)
  const progress = data.progress.find((item) => item.plan_id === plan?.plan_id)
  const assessment = [...data.assessments].sort((a, b) => b.cycle_index - a.cycle_index)[0]
  const pendingTask = data.tasks.find((item) => item.status.toLowerCase() !== 'done')
  if (!project || !plan) return <Empty title="还没有学习项目" detail="创建并同步第一个项目后，当前周期会显示在这里。" />
  return <>
    <section className="page-heading">
      <div><p className="eyebrow">当前学习周期</p><h1>{project.title}</h1><p>{plan.title} · {plan.target_date ? `目标 ${plan.target_date}` : '未设置目标日期'}</p></div>
      <StatusPill tone="good">进行中</StatusPill>
    </section>
    <section className="hero-grid">
      <article className="card next-card">
        <p className="card-label">下一步</p>
        <h2>{pendingTask?.title ?? '周期任务已完成'}</h2>
        <p>{pendingTask ? `${pendingTask.task_id} · ${pendingTask.kind}` : '完成周期测试后生成下一步。'}</p>
        <a className="button" href="#/plans">查看任务 <span aria-hidden="true">→</span></a>
      </article>
      <article className="card progress-card">
        <p className="card-label">执行进度</p>
        <strong>{progress?.execution_percent ?? 0}<small>%</small></strong>
        <ProgressBar value={progress?.execution_percent ?? 0} />
        <p>{data.tasks.filter((item) => item.status.toLowerCase() === 'done').length}/{data.tasks.length} 项任务完成 · {progress?.health === 'on_track' ? '节奏正常' : progress?.health ?? '状态未知'}</p>
      </article>
    </section>
    <section className="section-heading"><div><p className="eyebrow">最近检测</p><h2>分数与下一周期依据</h2></div><a href="#/assessments">查看完整记录</a></section>
    {assessment ? <AssessmentSummary assessment={assessment} /> : <Empty title="尚无检测" detail="每个周期结束前都需要完成一次测试。" />}
    <section className="metrics-grid">
      <article><span>活跃项目</span><strong>{data.projects.filter((item) => item.status === 'active').length}</strong></article>
      <article><span>进行中计划</span><strong>{data.plans.filter((item) => item.status === 'active').length}</strong></article>
      <article><span>历史答卷</span><strong>{data.assessments.reduce((sum, item) => sum + item.attempts.length, 0)}</strong></article>
      <article><span>已归档评分</span><strong>{data.assessments.reduce((sum, item) => sum + item.score_runs.length, 0)}</strong></article>
    </section>
  </>
}

function AssessmentSummary({ assessment }: { assessment: Assessment }) {
  const selected = assessment.score_runs.find((item) => item.score_run_id === assessment.selected_score_run_id)
  return <article className="card assessment-summary">
    <div className="score-ring"><strong>{assessment.score_total ?? '—'}</strong><span>/ 100</span></div>
    <div className="assessment-copy">
      <div className="inline-title"><h3>第 {assessment.cycle_index} 周期测试</h3><StatusPill tone={assessment.score_status === 'scored' ? 'good' : 'warn'}>{assessment.score_status === 'scored' ? '已评分' : '待处理'}</StatusPill></div>
      <p>{assessment.cycle_decision?.reason ?? '等待评分、审核和周期结论。'}</p>
      <div className="meta-row"><span>模型 <b>{selected?.exact_model ?? '—'}</b></span><span>置信度 <b>{selected ? `${Math.round(selected.confidence * 100)}%` : '—'}</b></span><span>答卷 <b>{assessment.attempts.length} 份</b></span></div>
    </div>
    <div className="decision"><span>周期结论</span><strong>{assessment.cycle_decision?.decision === 'continue' ? '继续学习' : assessment.cycle_decision?.decision ?? '待决定'}</strong></div>
  </article>
}

function Projects({ data }: { data: ReadModel }) {
  return <Page title="学习项目" subtitle="项目目标、当前周期和状态均来自同一 source commit。"><div className="list-grid">{data.projects.map((project) => <article className="card list-card" key={project.project_id}><div className="inline-title"><h2>{project.title}</h2><StatusPill tone={project.status === 'active' ? 'good' : 'neutral'}>{project.status}</StatusPill></div><p className="mono">{project.project_id}</p><p>{data.plans.filter((plan) => plan.project_id === project.project_id).length} 个计划 · 更新于 {project.updated ?? '未知'}</p></article>)}</div></Page>
}

function Plans({ data }: { data: ReadModel }) {
  return <Page title="计划与任务" subtitle="执行状态来自计划文件；完成任务不会自动提升掌握度。">{data.plans.map((plan) => <section className="card plan-card" key={plan.plan_id}><div className="inline-title"><div><p className="eyebrow">{plan.priority} · {plan.status}</p><h2>{plan.title}</h2></div><span className="mono">{plan.plan_id}</span></div><div className="task-list">{data.tasks.filter((task) => task.plan_id === plan.plan_id).map((task) => <div className="task" key={`${plan.plan_id}-${task.task_id}`}><span className={`check ${task.status.toLowerCase() === 'done' ? 'checked' : ''}`}>{task.status.toLowerCase() === 'done' ? '✓' : ''}</span><div><strong>{task.title}</strong><p>{task.task_id} · {task.kind}</p></div><StatusPill tone={task.status.toLowerCase() === 'in progress' ? 'warn' : 'neutral'}>{task.status}</StatusPill></div>)}</div></section>)}</Page>
}

function Assessments({ data }: { data: ReadModel }) {
  return <Page title="测试与评分" subtitle="同一套题可以保留多个时期、多个入口的答卷；所有评分和审核均留档。">{data.assessments.length ? <div className="assessment-list">{data.assessments.map((assessment) => <article className="card detail-card" key={assessment.assessment_id}><AssessmentSummary assessment={assessment}/><div className="history"><h3>答卷来源</h3>{assessment.attempts.map((attempt) => <div className="history-row" key={attempt.attempt_id}><span className="source-icon">{attempt.source_type.slice(0,1).toUpperCase()}</span><div><strong>{attempt.source_type}</strong><p>{new Date(attempt.submitted_at).toLocaleString('zh-CN')} · {attempt.attempt_id}</p></div></div>)}</div>{assessment.score_runs.map((score) => <div className="score-detail" key={score.score_run_id}><div className="inline-title"><h3>{score.provider} / {score.exact_model}</h3><strong>{score.total}/{score.possible}</strong></div>{score.breakdown.map((item) => <div className="breakdown" key={item.dimension}><span>{item.dimension}</span><ProgressBar value={Math.round(item.awarded / item.possible * 100)} /><b>{item.awarded}/{item.possible}</b><p>{item.reason}</p></div>)}</div>)}</article>)}</div> : <Empty title="尚无检测" detail="当前周期结束前会预建一份测试。" />}</Page>
}

function ProgressPage({ data }: { data: ReadModel }) {
  return <Page title="学习进度" subtitle="执行进度与检测掌握度分开展示。"><div className="list-grid">{data.progress.map((item) => { const plan = data.plans.find((candidate) => candidate.plan_id === item.plan_id); const assessment = data.assessments.filter((candidate) => candidate.plan_id === item.plan_id).at(-1); return <article className="card progress-detail" key={item.progress_id}><h2>{plan?.title ?? item.plan_id}</h2><div className="split-stat"><div><span>执行进度</span><strong>{item.execution_percent}%</strong><ProgressBar value={item.execution_percent}/></div><div><span>最近检测</span><strong>{assessment?.score_total ?? '—'}{assessment?.score_total != null ? ' 分' : ''}</strong><p>{assessment?.level ?? '未完成评分'}</p></div></div></article> })}</div></Page>
}

function Settings() {
  return <Page title="评分设置" subtitle="当前为安全演示模式，不保存 LLM 密钥或 GitHub Token。"><article className="card settings-card"><div><p className="card-label">LLM Profile</p><h2>demo-scoring-v1</h2><p>模型调用必须由受认证 BFF、Codex 或 CI 执行。客户端只提交 profile 版本与答卷引用。</p></div><dl><div><dt>Provider</dt><dd>demo-provider</dd></div><div><dt>Exact model</dt><dd>demo-model-2026-08</dd></div><div><dt>复用策略</dt><dd>当前 answer_hash 已有有效 ScoreRun 时跳过 CI 评分</dd></div><div><dt>审核策略</dt><dd>评分后需要审核；用户也可以显式跳过</dd></div></dl></article></Page>
}

function Diagnostics({ data, refetch, fetching }: { data: ReadModel; refetch: () => void; fetching: boolean }) {
  return <Page title="同步诊断" subtitle="客户端成功状态以合并后重新读取的 source commit 为准。"><article className="card diagnostic-card"><div className="diagnostic-ok">✓</div><div><h2>Read model 可用</h2><p>Schema、稳定 ID 基础结构与来源 commit 已通过客户端检查。</p></div><button className="button secondary" onClick={refetch} disabled={fetching}>{fetching ? '刷新中…' : '重新读取'}</button></article><dl className="card diagnostic-list"><div><dt>Schema version</dt><dd>{data.schema_version}</dd></div><div><dt>Generator</dt><dd>{data.generator_version}</dd></div><div><dt>Source commit</dt><dd className="mono">{data.source_commit}</dd></div><div><dt>生成时间</dt><dd>{new Date(data.generated_at).toLocaleString('zh-CN')}</dd></div><div><dt>数据模式</dt><dd>公开脱敏演示 fixture</dd></div></dl></Page>
}

function Page({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <><section className="page-heading"><div><p className="eyebrow">Study workspace</p><h1>{title}</h1><p>{subtitle}</p></div></section>{children}</>
}

export function App() {
  const [route, setRoute] = useState<Route>(currentRoute)
  const query = useQuery({ queryKey: ['read-model'], queryFn: loadReadModel })
  useEffect(() => { const handler = () => setRoute(currentRoute()); window.addEventListener('hashchange', handler); return () => window.removeEventListener('hashchange', handler) }, [])
  const routeLabel = useMemo(() => routes.find(([value]) => value === route)?.[1] ?? '概览', [route])
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#/dashboard" aria-label="Study 首页"><span>S</span><strong>Study</strong></a><nav aria-label="主导航">{routes.map(([value, label, icon]) => <a href={`#/${value}`} className={route === value ? 'active' : ''} key={value}><span aria-hidden="true">{icon}</span>{label}</a>)}</nav><div className="privacy-note"><span>●</span><p><strong>演示模式</strong><br/>仅加载公开脱敏数据</p></div></aside>
    <main><header className="mobile-header"><a className="brand" href="#/dashboard"><span>S</span><strong>Study</strong></a><span>{routeLabel}</span></header><div className="content">
      {query.isLoading && <section className="loading" aria-live="polite"><span/><p>正在读取学习状态…</p></section>}
      {query.isError && <section className="error" role="alert"><h1>无法读取学习状态</h1><p>{query.error.message}</p><button className="button" onClick={() => query.refetch()}>重试</button></section>}
      {query.data && route === 'dashboard' && <Dashboard data={query.data}/>}
      {query.data && route === 'projects' && <Projects data={query.data}/>}
      {query.data && route === 'plans' && <Plans data={query.data}/>}
      {query.data && route === 'assessments' && <Assessments data={query.data}/>}
      {query.data && route === 'progress' && <ProgressPage data={query.data}/>}
      {query.data && route === 'settings' && <Settings/>}
      {query.data && route === 'diagnostics' && <Diagnostics data={query.data} refetch={() => void query.refetch()} fetching={query.isFetching}/>}
    </div></main>
    <nav className="bottom-nav" aria-label="移动端导航">{routes.slice(0, 5).map(([value, label, icon]) => <a href={`#/${value}`} className={route === value ? 'active' : ''} key={value}><span>{icon}</span>{label.slice(0, 2)}</a>)}</nav>
  </div>
}
