import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ReadModel } from './model'
import { hasAuthenticatedBackend, loadChanges } from './mutations'

export function PlanDetail({ data, id }: { data: ReadModel; id: string }) {
  const plan = data.plans.find((item) => item.plan_id === id)
  if (!plan) return <p role="alert">计划不存在或不在当前数据版本中。</p>
  const progress = data.progress.find((item) => item.plan_id === id)
  return <section className="card detail-card"><a href="#/plans">返回计划</a><h1>{plan.title}</h1><p>{plan.status} · {plan.priority} · 目标日期 {plan.target_date ?? '未设置'}</p><p>执行进度 {progress?.execution_percent ?? 0}%</p><p>来源：{plan.source.path}</p><h2>任务与验收</h2>{data.tasks.filter((item) => item.plan_id === id).map((task) => <p key={task.task_id}><a href={`#/tasks/${encodeURIComponent(`${id}:${task.task_id}`)}`}>{task.task_id} · {task.title}</a></p>)}<h2>检测证据</h2>{data.assessments.filter((item) => item.plan_id === id).map((item) => <p key={item.assessment_id}><a href="#/assessments">{item.title ?? item.assessment_id}</a> · {item.score_status} · {item.score_total ?? '未评分'}</p>)}</section>
}

export function TaskDetail({ data, id }: { data: ReadModel; id: string }) {
  const matches = data.tasks.filter((item) => `${item.plan_id}:${item.task_id}` === id || item.task_id === id)
  if (matches.length !== 1) return <p role="alert">任务不存在或编号在多个计划中重复，请从计划详情进入。</p>
  const task = matches[0]
  return <section className="card detail-card"><a href={`#/plans/${encodeURIComponent(task.plan_id)}`}>返回计划</a><h1>{task.title}</h1><p>{task.task_id} · {task.status}</p><h2>验收标准</h2><p>{task.acceptance_criteria || '尚未记录验收标准'}</p><h2>依赖</h2><p>{task.dependencies || '未记录依赖'}</p><h2>证据与来源</h2><p>{task.source.path}</p>{task.issue_url && <a href={task.issue_url}>查看 GitHub 任务</a>}</section>
}

export function Changes({ data }: { data: ReadModel }) {
  const query = useQuery({ queryKey: ['study-changes'], queryFn: loadChanges, enabled: hasAuthenticatedBackend(), refetchInterval: 60_000 })
  return <section><h1>变更审阅</h1><p>归档候选只有合并并重建数据后才成为权威记录。</p>{query.isError && <p role="alert">{query.error.message}</p>}{query.data?.map((change) => <article className="card detail-card" key={change.pr_url}><h2><a href={change.pr_url}>{change.title}</a></h2><p>{change.state} · 校验 {change.checks} · 冲突 {change.mergeable === null ? '待检测' : change.mergeable ? '无' : '有'}</p>{change.files.map((file) => <pre key={file.path}>{file.status} {file.path} +{file.additions} / -{file.deletions}{'\n'}{file.patch}</pre>)}</article>)}<h2>已归档操作</h2>{data.audit_events.length ? data.audit_events.map((event) => <article className="card list-card" key={event.audit_event_id}><strong>{event.operation} · {event.status}</strong><p>{event.reason}</p><p>{event.output_artifact_id ?? event.output_artifact_ids.join('、') ?? '无新增产物'}</p><small>{event.created_at} · {event.audit_event_id}</small></article>) : <p>当前版本没有审计记录。</p>}</section>
}

export function LocalNotes({ category }: { category: string }) {
  const key = `study-local-${category}`
  const [notes, setNotes] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(key) ?? '[]') } catch { return [] } })
  const [text, setText] = useState('')
  return <section className="card detail-card"><h1>{({ ideas: 'Idea 记录', bugs: 'Bug 登记', crashes: 'Crash 记录' } as Record<string, string>)[category]}</h1><p>记录保存在当前浏览器。请勿填写密钥或私人学习答案。</p><textarea aria-label="记录内容" value={text} onChange={(event) => setText(event.target.value)}/><button disabled={!text.trim()} onClick={() => { const next = [...notes, `${new Date().toISOString()} ${text.trim()}`]; localStorage.setItem(key, JSON.stringify(next)); setNotes(next); setText('') }}>保存本机记录</button>{notes.map((note, index) => <p key={index}>{note}</p>)}</section>
}
