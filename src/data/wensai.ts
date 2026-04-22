import type { Competition, SuggestionTemplate, WorkflowStep, PricingPlan } from '../types'

export const APP_NAME = '问赛'

export const APP_TAGLINE = 'Triggered anywhere, completed locally'

export const COMPETITIONS: Competition[] = [
  {
    id: 'innovation',
    name: '中国国际大学生创新大赛',
    shortName: '创新大赛',
    tone: 'cyan',
    focus: '项目价值、商业计划、路演表达、团队执行',
  },
  {
    id: 'challenge-tech',
    name: '挑战杯科技作品',
    shortName: '挑战杯科技作品',
    tone: 'violet',
    focus: '研究价值、技术路线、成果证明、创新性',
  },
  {
    id: 'challenge-business',
    name: '挑战杯创业计划赛',
    shortName: '挑战杯创业计划赛',
    tone: 'amber',
    focus: '商业模式、市场验证、财务预测、落地计划',
  },
]

export const TASK_CATEGORIES: string[] = [
  '文档处理',
  '深度研究',
  'PPT 修改',
  '路演稿',
  '答辩问题',
  '商业计划',
  '评分表',
]

export const SUGGESTION_TEMPLATES: SuggestionTemplate[] = [
  {
    title: '封面和定位',
    level: '优先修改',
    content:
      '封面需要清晰出现项目名称、学校、团队、赛道和一句话定位。建议把口号型标题改成"对象 + 场景 + 价值"的表达。',
  },
  {
    title: '赛事适配',
    level: '重点检查',
    content:
      '当前材料要按所选赛事的评分维度重排：创新性、可行性、社会价值、商业模式和团队执行力需要分层呈现。',
  },
  {
    title: 'PPT 大文件',
    level: '已支持',
    content:
      '支持超 100M PPT。大文件会提示处理时间，并预留 Tauri 本地文件通道以提升桌面端体验。',
  },
  {
    title: '导出交付',
    level: '可导出',
    content:
      '修改建议支持导出 Word、PDF 打印版和复制文本，方便团队成员按页码逐条修改。',
  },
]

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { label: '选择赛事', value: '三类赛事之一', done: true },
  { label: '保存命令', value: '本地 + 后端', done: true },
  { label: '上传材料', value: '支持超 100M PPT', done: true },
  { label: '生成建议', value: 'AI / 人工复核', done: false },
  { label: '导出结果', value: 'Word / PDF / 复制', done: false },
]

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: '个人版',
    price: '¥29 / 次',
    note: '价格待定',
    description: '适合学生团队临时检查一份材料',
    features: ['单次 PPT 诊断', '修改建议导出', '答辩问题清单', '历史命令本地保存'],
  },
  {
    name: '团队版',
    price: '¥199 / 月',
    note: '价格待定',
    description: '适合一个项目团队持续打磨材料',
    features: ['不限次数草稿检查', '团队历史记录', '多版本建议对比', '路演稿辅助生成'],
  },
  {
    name: '学校版',
    price: '¥19,900 / 年',
    note: '价格待定',
    description: '适合学院、创新创业中心和赛事管理部门',
    features: ['批量团队管理', '校内模板库', '年度数据看板', '私有化和 Tauri 桌面端预留'],
  },
]

export const DEFAULT_COMMAND =
  '请检查这份 PPT 是否符合赛事要求，并给出可以直接导出的修改建议。'

export const LOCAL_HISTORY_KEY = 'wensai.history.commands'

export const SETTINGS_KEY = 'wensai.settings'
