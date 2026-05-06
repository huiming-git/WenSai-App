import { useEffect, useState } from 'react'
import {
  createWorkspace,
  deleteWorkspace,
  joinWorkspace,
  listWorkspaceMembers,
  listWorkspaceTasks,
  listWorkspaces,
  removeWorkspaceMember,
  switchWorkspace,
} from '../api/workspaces'
import { Icon, Panel } from '../components/WensaiUI'
import { useAuth } from '../context/AuthContext'
import { useWorkbench } from '../context/WorkbenchContext'
import type { WorkspaceMember, WorkspaceSummary, WorkspaceTaskSummary } from '../types'

export default function TeamSpacePage() {
  const { user, refreshUser } = useAuth()
  const { compactWorkbench } = useWorkbench()
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [tasks, setTasks] = useState<WorkspaceTaskSummary[]>([])
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceSummary | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    void loadWorkspaces()
  }, [])

  useEffect(() => {
    const activeWorkspace = workspaces.find((item) => item.is_active)
    if (!activeWorkspace) {
      setMembers([])
      setTasks([])
      return
    }
    void loadWorkspaceDetails(activeWorkspace.id)
  }, [workspaces])

  const loadWorkspaces = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listWorkspaces()
      setWorkspaces(res.data)
    } catch (err) {
      console.error('Failed to load workspaces', err)
      setError('加载团队空间失败')
    } finally {
      setLoading(false)
    }
  }

  const loadWorkspaceDetails = async (workspaceId: number) => {
    try {
      const [membersRes, tasksRes] = await Promise.all([
        listWorkspaceMembers(workspaceId),
        listWorkspaceTasks(workspaceId),
      ])
      setMembers(membersRes.data)
      setTasks(tasksRes.data.filter((task) => getParentTaskId(task) === null))
    } catch (err) {
      console.error('Failed to load workspace details', err)
      setError('加载团队空间详情失败')
    }
  }

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await createWorkspace({ name: newWorkspaceName.trim() })
      setNewWorkspaceName('')
      await refreshUser()
      await loadWorkspaces()
    } catch (err) {
      console.error('Failed to create workspace', err)
      setError('创建团队空间失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinWorkspace = async () => {
    if (!inviteCode.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await joinWorkspace({ invite_code: inviteCode.trim() })
      setInviteCode('')
      await refreshUser()
      await loadWorkspaces()
    } catch (err) {
      console.error('Failed to join workspace', err)
      setError('加入团队空间失败，请检查邀请码')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSwitchWorkspace = async (workspaceId: number) => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      await switchWorkspace(workspaceId)
      await refreshUser()
      await loadWorkspaces()
    } catch (err) {
      console.error('Failed to switch workspace', err)
      setError('切换团队空间失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveMember = async (workspaceId: number, memberUserId: number) => {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      await removeWorkspaceMember(workspaceId, memberUserId)
      await refreshUser()
      await loadWorkspaces()
    } catch (err) {
      console.error('Failed to remove workspace member', err)
      setError('移除成员失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteWorkspace = async (workspace: WorkspaceSummary) => {
    if (submitting) return
    setDeleteTarget(workspace)
    setDeleteConfirmText('')
  }

  const confirmDeleteWorkspace = async () => {
    if (!deleteTarget || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await deleteWorkspace(deleteTarget.id)
      await refreshUser()
      await loadWorkspaces()
      setDeleteTarget(null)
      setDeleteConfirmText('')
    } catch (err) {
      console.error('Failed to delete workspace', err)
      setError('删除团队空间失败')
    } finally {
      setSubmitting(false)
    }
  }

  const activeWorkspace = workspaces.find((item) => item.is_active) || null
  const activeWorkspaceName = user?.active_workspace?.name || '个人空间'
  const canManageMembers = activeWorkspace?.owner_id === user?.id
  const deletePhrase = deleteTarget ? `我确定删除 ${deleteTarget.name}` : ''
  const canConfirmDelete = deleteTarget !== null && deleteConfirmText.trim() === deletePhrase

  return (
    <div className={['min-h-full bg-[#f5f7fb]', compactWorkbench ? 'p-3' : 'p-4 md:p-6'].join(' ')}>
      <div className={['flex flex-col gap-3', compactWorkbench ? '' : 'md:flex-row md:items-end md:justify-between'].join(' ')}>
        <div>
          <h1 className={['font-semibold text-slate-950', compactWorkbench ? 'text-xl' : 'text-2xl'].join(' ')}>团队空间</h1>
          <p className={['mt-2 text-slate-500', compactWorkbench ? 'text-[13px] leading-6' : 'text-sm'].join(' ')}>创建、加入并切换不同团队空间，不同用户可共享同一空间协作。</p>
        </div>
        <div className={['inline-flex items-center gap-3 rounded-2xl border border-cyan-100 bg-white shadow-sm self-start', compactWorkbench ? 'px-3 py-2.5' : 'px-4 py-3'].join(' ')}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-50 text-cyan-700">
            <Icon name="team" className="h-5 w-5" />
          </span>
          <div className="text-left">
            <p className="text-xs font-medium text-slate-400">当前空间</p>
            <p className="text-sm font-semibold text-slate-900">{activeWorkspaceName}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className={['mt-5 grid gap-5', compactWorkbench ? '' : 'xl:grid-cols-[minmax(0,1fr)_360px]'].join(' ')}>
        <Panel className={compactWorkbench ? 'p-4' : 'p-5'}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">我的团队空间</h2>
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
              {workspaces.length} 个空间
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">正在加载团队空间...</p>
            ) : workspaces.length ? (
              workspaces.map((workspace) => (
                <div key={workspace.id} className={['rounded-2xl border border-slate-200 bg-white', compactWorkbench ? 'p-3' : 'p-4'].join(' ')}>
                  {(() => {
                    const isPersonalSpace = workspace.name === '个人空间' || workspace.name === '本地空间'
                    return (
                  <div className={['flex flex-col gap-3', compactWorkbench ? '' : 'md:flex-row md:items-center md:justify-between'].join(' ')}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-base font-semibold text-slate-950">{workspace.name}</p>
                        {workspace.is_active ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            当前空间
                          </span>
                        ) : null}
                      </div>
                      {isPersonalSpace ? (
                        <p className={['mt-2 text-slate-500', compactWorkbench ? 'text-[13px]' : 'text-sm'].join(' ')}>
                          个人空间仅自己使用，不提供邀请码和加入机制。
                        </p>
                      ) : (
                        <p className={['mt-2 text-slate-500', compactWorkbench ? 'text-[13px]' : 'text-sm'].join(' ')}>
                          邀请码：<span className="font-semibold tracking-[0.18em] text-slate-700">{workspace.invite_code}</span>
                        </p>
                      )}
                      <p className={['mt-1 text-slate-500', compactWorkbench ? 'text-[13px]' : 'text-sm'].join(' ')}>
                        角色：{workspace.role} · 成员数：{workspace.member_count}
                      </p>
                    </div>
                    <div className={['flex flex-wrap items-center gap-2', compactWorkbench ? '' : ''].join(' ')}>
                      {workspace.owner_id === user?.id && !isPersonalSpace ? (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleDeleteWorkspace(workspace)}
                          className={['inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60', compactWorkbench ? 'h-9 px-3 text-xs' : 'h-10 px-4 text-sm'].join(' ')}
                        >
                          删除空间
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={submitting || workspace.is_active}
                        onClick={() => handleSwitchWorkspace(workspace.id)}
                        className={[
                          compactWorkbench
                            ? 'inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium transition'
                            : 'inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition',
                          workspace.is_active
                            ? 'bg-slate-100 text-slate-400'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700',
                        ].join(' ')}
                      >
                        {workspace.is_active ? '已启用' : '切换到这里'}
                      </button>
                    </div>
                  </div>
                    )
                  })()}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">当前还没有团队空间，先创建一个或用邀请码加入。</p>
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel className={compactWorkbench ? 'p-4' : 'p-5'}>
            <h2 className="text-lg font-semibold text-slate-950">创建空间</h2>
            <p className={['mt-2 text-slate-500', compactWorkbench ? 'text-[13px] leading-6' : 'text-sm'].join(' ')}>为不同项目或不同团队分别建立独立空间。</p>
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              className="mt-4 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="例如：挑战杯创业计划团队"
            />
            <button
              type="button"
              onClick={handleCreateWorkspace}
              disabled={submitting || !newWorkspaceName.trim()}
              className={['mt-3 inline-flex w-full items-center justify-center rounded-lg bg-slate-950 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60', compactWorkbench ? 'h-9 px-3 text-xs' : 'h-10 px-4 text-sm'].join(' ')}
            >
              创建并切换
            </button>
          </Panel>

          <Panel className={compactWorkbench ? 'p-4' : 'p-5'}>
            <h2 className="text-lg font-semibold text-slate-950">加入空间</h2>
            <p className={['mt-2 text-slate-500', compactWorkbench ? 'text-[13px] leading-6' : 'text-sm'].join(' ')}>输入其他用户分享的邀请码即可加入该团队空间。</p>
            <input
              type="text"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              className="mt-4 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm uppercase tracking-[0.18em] outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              placeholder="输入邀请码"
            />
            <button
              type="button"
              onClick={handleJoinWorkspace}
              disabled={submitting || !inviteCode.trim()}
              className={['mt-3 inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:opacity-60', compactWorkbench ? 'h-9 px-3 text-xs' : 'h-10 px-4 text-sm'].join(' ')}
            >
              加入并切换
            </button>
          </Panel>
        </div>
      </div>

      <div className={['mt-5 grid gap-5', compactWorkbench ? '' : 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'].join(' ')}>
        <Panel className={compactWorkbench ? 'p-4' : 'p-5'}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">空间成员</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {members.length} 人
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {activeWorkspace ? (
              members.length ? (
                members.map((member) => (
                  <div key={member.id} className={['flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white', compactWorkbench ? 'p-3' : 'p-4'].join(' ')}>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{member.username}</p>
                      <p className="mt-1 text-xs text-slate-500">角色：{member.role}</p>
                    </div>
                    {canManageMembers && member.user_id !== activeWorkspace.owner_id ? (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleRemoveMember(activeWorkspace.id, member.user_id)}
                        className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        移除
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">{member.role === 'owner' ? '空间拥有者' : '成员'}</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">当前空间暂无成员数据。</p>
              )
            ) : (
              <p className="text-sm text-slate-500">先选择一个团队空间。</p>
            )}
          </div>
        </Panel>

        <Panel className={compactWorkbench ? 'p-4' : 'p-5'}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">空间沙盒</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {tasks.length} 个沙盒
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {activeWorkspace ? (
              tasks.length ? (
                tasks.map((task) => (
                  <div key={task.id} className={['rounded-2xl border border-slate-200 bg-white', compactWorkbench ? 'p-3' : 'p-4'].join(' ')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{task.title || `沙盒 #${task.id}`}</p>
                        <p className="mt-1 text-xs text-slate-500">发起人：{task.owner_username}</p>
                      </div>
                      <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                        {task.status}
                      </span>
                    </div>
                    <p className={['mt-3 line-clamp-2 text-slate-600', compactWorkbench ? 'text-[13px] leading-6' : 'text-sm leading-6'].join(' ')}>{task.prompt}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-400">{new Date(task.created_at).toLocaleString()}</span>
                      <span className="text-xs text-slate-500">{task.agent_type}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">当前空间还没有沙盒，去沙盒管理里创建一个。</p>
              )
            ) : (
              <p className="text-sm text-slate-500">先选择一个团队空间。</p>
            )}
          </div>
        </Panel>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-[520px] rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-slate-950">确认删除团队空间</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  删除后，空间任务和文件会转回你的个人空间，其他成员会切回各自的个人空间。
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (submitting) return
                  setDeleteTarget(null)
                  setDeleteConfirmText('')
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                title="关闭"
              >
                <Icon name="chevronRight" className="h-4 w-4 rotate-45" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
              <p className="text-sm font-medium text-rose-700">请输入下面这句话确认删除：</p>
              <p className="mt-2 rounded-xl bg-white px-3 py-3 font-mono text-sm font-semibold text-slate-950">
                {deletePhrase}
              </p>
            </div>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder={deletePhrase}
              className="mt-4 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
            />

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteConfirmText('')
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!canConfirmDelete || submitting}
                onClick={() => void confirmDeleteWorkspace()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-200"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function getParentTaskId(task: WorkspaceTaskSummary) {
  const value = task.input?.parent_task_id
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}
