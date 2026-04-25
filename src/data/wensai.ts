import type { Competition, SuggestionTemplate, WorkflowStep, PricingPlan } from '../types'

export const APP_NAME = '问赛'

export const APP_TAGLINE = 'Triggered anywhere, completed locally'

export const COMPETITIONS: Competition[] = [
  {
    id: 'innovation',
    name: '中国国际大学生创新大赛',
    shortName: '创新大赛-中国国际大学生创新大赛',
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
      '封面需要清晰出现项目名称、学校、团队、赛道和一句话定位。建议把口号型标题改成"对象 + 场景 + 价值"的表达，并在第一页就对齐所选赛事。',
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
      '首页支持直接选择 PPT / PDF / Word 等材料。前端不限制 100M 以上文件，实际上传成功取决于浏览器、网络和后端部署限制。',
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
  { label: '首页上传材料', value: '材料名称 + 文件', done: true },
  { label: '生成建议', value: 'AI / 人工复核', done: false },
  { label: '导出结果', value: 'Word / PDF / 复制', done: false },
]

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: '个人按次',
    price: '20 积分 / 次',
    note: '建议方案',
    description: '适合个人或单个团队按材料消耗积分',
    features: ['上传一份材料并生成修改建议', '支持 Word / PDF / 复制导出', '历史命令本地保存', '适合临时检查和迭代修改'],
  },
  {
    name: '积分包',
    price: '¥49 起充',
    note: '可扩展',
    description: '适合多次修改，按生成、导出和大文件处理扣减',
    features: ['充值后进入个人积分余额', '普通问答约 20 积分 / 轮', 'PPT 修改约 200-800 积分 / 次', '视频或复杂材料可单独计费'],
  },
  {
    name: '学校按年',
    price: '年度积分池',
    note: '推荐给学校',
    description: '适合学院、创新创业中心和赛事管理部门统一采购',
    features: ['按年配置学校积分额度', '团队可按项目或成员分配', '支持查看消耗明细与剩余额度', '后续可接入校内模板和数据看板'],
  },
]

export const DEFAULT_COMMAND =
  '请检查这份 PPT 是否符合赛事要求，并给出可以直接导出的修改建议。'

export const LOCAL_HISTORY_KEY = 'wensai.history.commands'

export const ACTIVE_DRAFT_KEY = 'wensai.active.draft'

export const SETTINGS_KEY = 'wensai.settings'
