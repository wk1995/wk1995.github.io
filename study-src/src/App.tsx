import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { assertCompatibleReadModel, type Assessment, type ReadModel } from './model'
import { attemptDiffPreview, backendLoginUrl, decideCycle, hasAuthenticatedBackend, loadPrivateReadModel, loadSession, logout, reviewScore, selectScore, submitAttempt, triggerScore } from './mutations'

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
  const data: unknown = hasAuthenticatedBackend()
    ? await loadPrivateReadModel()
    : await fetch(`${import.meta.env.BASE_URL}data/read-model.demo.json`, { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error(`读取失败：HTTP ${response.status}`)
      return response.json()
    })
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
  const evidence = data.evidence_coverage.find((item) => item.project_id === project?.project_id)
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
      <article><span>证据覆盖</span><strong>{evidence?.percent ?? 0}%</strong><small>{evidence?.covered_items ?? 0}/{evidence?.total_items ?? 0} 项</small></article>
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
      <div className="meta-row"><span>模型 <b>{selected?.exact_model ?? '—'}</b></span><span>置信度 <b>{selected?.confidence != null ? `${Math.round(selected.confidence * 100)}%` : '—'}</b></span><span>答卷 <b>{assessment.attempts.length} 份</b></span></div>
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

function AssessmentMutationPanel({ assessment, data, profileId, reviewPolicy }: { assessment: Assessment; data: ReadModel; profileId?: string; reviewPolicy: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState(false)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  const [reason, setReason] = useState('')
  const canWrite = hasAuthenticatedBackend()
  const complete = assessment.questions.every((question) => answers[question.question_id]?.trim())
  const selectedScore = assessment.score_runs.find((item) => item.score_run_id === assessment.selected_score_run_id)
  const selectedReview = assessment.review_decisions.filter((item) => item.score_run_id === assessment.selected_score_run_id).at(-1)
  const run = async (operation: () => Promise<{ status: string; pr_url?: string; attempt_id?: string }>) => {
    setWorking(true)
    try {
      const receipt = await operation()
      setMessage(`${receipt.status}${receipt.attempt_id ? ` · ${receipt.attempt_id}` : ''}${receipt.pr_url ? ` · PR ${receipt.pr_url}` : ' · workflow 已触发'}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败')
    } finally {
      setWorking(false)
    }
  }
  return <section className="mutation-panel">
    {!canWrite && <p>公开演示构建为只读；配置 <code>VITE_STUDY_BFF_URL</code> 后才连接受认证写入服务。</p>}
    {canWrite && assessment.attempts.length === 0 && <>
      <h3>提交答卷</h3>
      {assessment.questions.map((question) => <label key={question.question_id}><strong>{question.question_id} · {question.prompt}</strong><textarea value={answers[question.question_id] ?? ''} onChange={(event) => { setPreview(false); setAnswers((value) => ({ ...value, [question.question_id]: event.target.value })) }}/></label>)}
      {preview && <pre>{attemptDiffPreview(assessment, answers, data.source_commit)}</pre>}
      <button className="button" disabled={!complete || working} onClick={() => preview ? void run(() => submitAttempt(assessment, answers, data.source_commit)) : setPreview(true)}>{preview ? '确认创建 PR' : '预览文件变更'}</button>
    </>}
    {canWrite && assessment.attempts.length > 0 && !assessment.selected_score_run_id && <button className="button" disabled={!profileId || working} onClick={() => void run(() => triggerScore(assessment, assessment.attempts.at(-1)!.attempt_id, profileId!, data.source_commit, reviewPolicy))}>触发版本化 LLM 评分</button>}
    {canWrite && assessment.score_runs.filter((score) => score.status === 'succeeded' && score.score_run_id !== assessment.selected_score_run_id).map((score) => <button className="button secondary" disabled={working} key={score.score_run_id} onClick={() => void run(() => selectScore(assessment, score.score_run_id, data.source_commit))}>选择 {score.exact_model} · {score.score_run_id}</button>)}
    {canWrite && assessment.selected_score_run_id && <div className="decision-actions"><label><strong>审核/周期决定理由</strong><textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="button-row"><button className="button secondary" disabled={!reason.trim() || working} onClick={() => void run(() => reviewScore(assessment, assessment.selected_score_run_id!, 'approved', reason, data.source_commit))}>审核通过</button><button className="button secondary" disabled={!reason.trim() || working || selectedScore?.review_policy !== 'review_optional'} onClick={() => void run(() => reviewScore(assessment, assessment.selected_score_run_id!, 'skipped', reason, data.source_commit))}>明确跳过</button><button className="button secondary" disabled={!reason.trim() || working} onClick={() => void run(() => reviewScore(assessment, assessment.selected_score_run_id!, 'rejected', reason, data.source_commit))}>驳回</button>{profileId && selectedScore && selectedReview?.decision === 'rejected' && <button className="button secondary" disabled={working} onClick={() => void run(() => triggerScore(assessment, selectedScore.attempt_id, profileId, data.source_commit, reviewPolicy, true))}>强制重新评分</button>}</div><div className="button-row"><button className="button" disabled={!reason.trim() || working} onClick={() => void run(() => decideCycle(assessment, 'continue', reason, data.source_commit))}>继续下一周期</button><button className="button secondary" disabled={!reason.trim() || working} onClick={() => void run(() => decideCycle(assessment, 'stop_by_user', reason, data.source_commit))}>停止学习</button></div></div>}
    {message && <p role="status">{message}</p>}
  </section>
}

function Assessments({ data, profileId, reviewPolicy }: { data: ReadModel; profileId?: string; reviewPolicy: string }) {
  return <Page title="测试与评分" subtitle="同一套题可以保留多个时期、多个入口的答卷；所有评分和审核均留档。">{data.assessments.length ? <div className="assessment-list">{data.assessments.map((assessment) => <article className="card detail-card" key={assessment.assessment_id}><AssessmentSummary assessment={assessment}/><AssessmentMutationPanel assessment={assessment} data={data} profileId={profileId} reviewPolicy={reviewPolicy}/><div className="history"><h3>答卷来源</h3>{assessment.attempts.map((attempt) => <div className="history-row" key={attempt.attempt_id}><span className="source-icon">{attempt.source_type.slice(0,1).toUpperCase()}</span><div><strong>{attempt.source_type}</strong><p>{new Date(attempt.submitted_at).toLocaleString('zh-CN')} · {attempt.attempt_id}</p></div></div>)}</div>{assessment.score_runs.map((score) => { const review = assessment.review_decisions.filter((item) => item.score_run_id === score.score_run_id).at(-1); return <div className="score-detail" key={score.score_run_id}><div className="inline-title"><h3>{score.provider ?? score.source_type} / {score.exact_model ?? score.status}</h3><strong>{score.total ?? '—'}/{score.possible ?? '—'}</strong></div><p>置信度：{score.confidence != null ? `${Math.round(score.confidence * 100)}%` : '—'} · 审核：{review?.decision ?? score.review_policy} · 审计：{score.audit_event_id}</p>{score.error_message && <p>{score.error_code}: {score.error_message}</p>}{score.breakdown?.map((item) => <div className="breakdown" key={item.dimension}><span>{item.dimension}</span><ProgressBar value={Math.round(item.awarded / item.possible * 100)} /><b>{item.awarded}/{item.possible}</b><p>{item.reason}</p></div>)}{score.questions?.map((question) => <div key={question.question_id}><strong>{question.question_id}: {question.awarded}/{question.possible}</strong>{question.deductions.map((item) => <p key={item.code}>扣 {item.points}：{item.reason}</p>)}</div>)}</div> })}</article>)}</div> : <Empty title="尚无检测" detail="当前周期结束前会预建一份测试。" />}</Page>
}

function ProgressPage({ data }: { data: ReadModel }) {
  return <Page title="学习进度" subtitle="执行进度、检测掌握度与证据覆盖分开展示。"><div className="list-grid">{data.progress.map((item) => { const plan = data.plans.find((candidate) => candidate.plan_id === item.plan_id); const assessment = data.assessments.filter((candidate) => candidate.plan_id === item.plan_id).at(-1); const evidence = data.evidence_coverage.find((candidate) => candidate.project_id === item.project_id); return <article className="card progress-detail" key={item.progress_id}><h2>{plan?.title ?? item.plan_id}</h2><div className="split-stat"><div><span>执行进度</span><strong>{item.execution_percent}%</strong><ProgressBar value={item.execution_percent}/></div><div><span>最近检测</span><strong>{assessment?.score_total ?? '—'}{assessment?.score_total != null ? ' 分' : ''}</strong><p>{assessment?.level ?? '未完成评分'}</p></div><div><span>证据覆盖</span><strong>{evidence?.percent ?? 0}%</strong><p>{evidence?.gaps.length ? `缺口 ${evidence.gaps.slice(0, 3).join('、')}` : '当前无证据缺口'}</p></div></div></article> })}</div></Page>
}

function Settings({ data, profileId, reviewPolicy, onSelect, onSelectReviewPolicy, session, onLogout }: { data: ReadModel; profileId?: string; reviewPolicy: string; onSelect: (id: string) => void; onSelectReviewPolicy: (policy: string) => void; session?: { authenticated: boolean; login?: string }; onLogout: () => void }) {
  const profiles = data.llm_profiles ?? []
  return <Page title="评分设置" subtitle="Web 只保存 Profile ID 与审核策略；OAuth Token 使用短期 HttpOnly Cookie，LLM 密钥由 GitHub Actions Secret 保存。"><article className="card diagnostic-card"><div><h2>GitHub 私有仓库连接</h2><p>{session?.authenticated ? `已连接 ${session.login}` : '尚未建立 BFF 短期会话'}</p></div>{session?.authenticated ? <button className="button secondary" onClick={onLogout}>退出</button> : backendLoginUrl() ? <a className="button" href={backendLoginUrl()}>使用 GitHub 登录</a> : <span>当前构建未配置 BFF</span>}</article><article className="card review-policy-card"><h2>审核策略</h2><div className="button-row">{[['review_required', '必须审核'], ['review_optional', '允许明确跳过'], ['review_not_required', '无需审核']].map(([value, label]) => <button className={`button ${reviewPolicy === value ? '' : 'secondary'}`} key={value} onClick={() => onSelectReviewPolicy(value)}>{label}</button>)}</div><p>此选择独立于 Profile 默认值，并会作为本次评分的归档策略。</p></article><div className="list-grid">{profiles.map((profile) => <button className={`card settings-card ${profile.profile_id === profileId ? 'selected' : ''}`} key={profile.profile_id} onClick={() => onSelect(profile.profile_id)}><div><p className="card-label">LLM Profile v{profile.profile_version}</p><h2>{profile.exact_model}</h2><p>{profile.description}</p></div><dl><div><dt>Provider</dt><dd>{profile.provider}</dd></div><div><dt>Prompt / Rubric</dt><dd>{profile.prompt_version} / {profile.rubric_version}</dd></div><div><dt>Profile 默认审核策略</dt><dd>{profile.review_policy}</dd></div><div><dt>Secret 引用</dt><dd>{profile.secret_ref}</dd></div></dl></button>)}</div>{profiles.length === 0 && <Empty title="没有 LLM Profile" detail="请刷新由私人仓库生成的 read model。"/>}</Page>
}

function Diagnostics({ data, refetch, fetching }: { data: ReadModel; refetch: () => void; fetching: boolean }) {
  const lastSync = localStorage.getItem('study-last-successful-sync')
  return <Page title="同步诊断" subtitle="客户端成功状态以合并后重新读取的 source commit 为准。"><article className="card diagnostic-card"><div className="diagnostic-ok">✓</div><div><h2>Read model 可用</h2><p>Schema、generator 兼容范围、稳定 ID 唯一性/关联与来源 commit 已通过客户端检查。</p></div><button className="button secondary" onClick={refetch} disabled={fetching}>{fetching ? '刷新中…' : '重新读取'}</button></article><dl className="card diagnostic-list"><div><dt>Schema version</dt><dd>{data.schema_version}</dd></div><div><dt>Generator</dt><dd>{data.generator_version}</dd></div><div><dt>Source commit</dt><dd className="mono">{data.source_commit}</dd></div><div><dt>最近成功同步</dt><dd>{lastSync ? new Date(lastSync).toLocaleString('zh-CN') : '当前会话首次加载'}</dd></div><div><dt>生成时间</dt><dd>{new Date(data.generated_at).toLocaleString('zh-CN')}</dd></div><div><dt>数据模式</dt><dd>{hasAuthenticatedBackend() ? 'BFF 私有仓库' : '公开脱敏演示 fixture'}</dd></div><div><dt>审计事件</dt><dd>{data.audit_events.length}</dd></div></dl></Page>
}

function Page({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <><section className="page-heading"><div><p className="eyebrow">Study workspace</p><h1>{title}</h1><p>{subtitle}</p></div></section>{children}</>
}

export function App() {
  const [route, setRoute] = useState<Route>(currentRoute)
  const query = useQuery({ queryKey: ['read-model'], queryFn: loadReadModel })
  const sessionQuery = useQuery({ queryKey: ['study-session'], queryFn: loadSession })
  const [profileId, setProfileId] = useState<string | undefined>(() => localStorage.getItem('study-llm-profile') ?? undefined)
  const [reviewPolicy, setReviewPolicy] = useState(() => localStorage.getItem('study-review-policy') ?? 'review_optional')
  useEffect(() => { const profiles = query.data?.llm_profiles?.filter((item) => item.enabled !== false) ?? []; if (!profiles.some((item) => item.profile_id === profileId) && profiles[0]) { setProfileId(profiles[0].profile_id); localStorage.setItem('study-llm-profile', profiles[0].profile_id) } }, [query.data, profileId])
  useEffect(() => { if (query.data) localStorage.setItem('study-last-successful-sync', new Date().toISOString()) }, [query.data])
  useEffect(() => { const handler = () => setRoute(currentRoute()); window.addEventListener('hashchange', handler); return () => window.removeEventListener('hashchange', handler) }, [])
  const routeLabel = useMemo(() => routes.find(([value]) => value === route)?.[1] ?? '概览', [route])
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#/dashboard" aria-label="Study 首页"><span>S</span><strong>Study</strong></a><nav aria-label="主导航">{routes.map(([value, label, icon]) => <a href={`#/${value}`} className={route === value ? 'active' : ''} key={value}><span aria-hidden="true">{icon}</span>{label}</a>)}</nav><div className="privacy-note"><span>●</span><p><strong>演示模式</strong><br/>仅加载公开脱敏数据</p></div></aside>
    <main><header className="mobile-header"><a className="brand" href="#/dashboard"><span>S</span><strong>Study</strong></a><span>{routeLabel}</span></header><div className="content">
      {query.isLoading && <section className="loading" aria-live="polite"><span/><p>正在读取学习状态…</p></section>}
      {query.isError && <section className="error" role="alert"><h1>无法读取学习状态</h1><p>{query.error.message}</p><div className="button-row"><button className="button" onClick={() => query.refetch()}>重试</button>{backendLoginUrl() && <a className="button secondary" href={backendLoginUrl()}>使用 GitHub 登录</a>}</div></section>}
      {query.data && route === 'dashboard' && <Dashboard data={query.data}/>}
      {query.data && route === 'projects' && <Projects data={query.data}/>}
      {query.data && route === 'plans' && <Plans data={query.data}/>}
      {query.data && route === 'assessments' && <Assessments data={query.data} profileId={profileId} reviewPolicy={reviewPolicy}/>}
      {query.data && route === 'progress' && <ProgressPage data={query.data}/>}
      {query.data && route === 'settings' && <Settings
        data={query.data}
        profileId={profileId}
        reviewPolicy={reviewPolicy}
        session={sessionQuery.data}
        onLogout={() => { void logout().then(() => { void sessionQuery.refetch(); void query.refetch() }) }}
        onSelect={(id) => { setProfileId(id); localStorage.setItem('study-llm-profile', id) }}
        onSelectReviewPolicy={(policy) => { setReviewPolicy(policy); localStorage.setItem('study-review-policy', policy) }}
      />}
      {query.data && route === 'diagnostics' && <Diagnostics data={query.data} refetch={() => void query.refetch()} fetching={query.isFetching}/>}
    </div></main>
    <nav className="bottom-nav" aria-label="移动端导航">{routes.slice(0, 5).map(([value, label, icon]) => <a href={`#/${value}`} className={route === value ? 'active' : ''} key={value}><span>{icon}</span>{label.slice(0, 2)}</a>)}</nav>
  </div>
}
