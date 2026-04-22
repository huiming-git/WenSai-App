const zh: Record<string, string> = {
  // Header
  'nav.brand': '问赛',
  'nav.dashboard': '仪表盘',
  'nav.papers': '论文',
  'nav.upload': '上传',
  'nav.logout': '退出',

  // Login
  'login.title': '问赛',
  'login.subtitle': '登录你的账号',
  'login.username': '用户名',
  'login.username_placeholder': '请输入用户名',
  'login.password': '密码',
  'login.password_placeholder': '请输入密码',
  'login.submit': '登录',
  'login.submitting': '登录中...',
  'login.no_account': '没有账号？',
  'login.register_link': '注册',

  // Register
  'register.title': '创建账号',
  'register.username': '用户名',
  'register.username_placeholder': '选择一个用户名',
  'register.password': '密码',
  'register.password_placeholder': '设置密码（至少 6 位）',
  'register.invite_code': '邀请码',
  'register.invite_code_placeholder': '请输入邀请码',
  'register.submit': '创建账号',
  'register.submitting': '创建中...',
  'register.has_account': '已有账号？',
  'register.login_link': '登录',

  // Dashboard
  'dashboard.welcome': '欢迎，',
  'dashboard.total_papers': '论文总数',
  'dashboard.pending': '待审核',
  'dashboard.under_review': '审核中',
  'dashboard.completed': '已完成',
  'dashboard.recent_papers': '最近论文',
  'dashboard.view_all': '查看全部',
  'dashboard.no_papers': '暂无论文。',
  'dashboard.upload_first': '上传你的第一篇论文',

  // Paper List
  'papers.title': '论文',
  'papers.upload_btn': '+ 上传论文',
  'papers.filter_all': '全部',
  'papers.col_title': '标题',
  'papers.col_author': '作者',
  'papers.col_status': '状态',
  'papers.col_date': '日期',
  'papers.no_papers': '未找到论文。',

  // Status labels
  'status.pending': '待审核',
  'status.under_review': '审核中',
  'status.reviewed': '已审核',
  'status.accepted': '已接受',
  'status.rejected': '已拒绝',
  'status.revision': '需修改',

  // Recommendation labels
  'rec.accept': '接受',
  'rec.minor_revision': '小修',
  'rec.major_revision': '大修',
  'rec.reject': '拒绝',

  // Paper Detail
  'paper.requirements': '评审要求',
  'paper.download': '下载文件',
  'paper.ai_review_btn': '🤖 AI 评审',
  'paper.manual_review_btn': '✏️ 手动评审',
  'paper.delete_btn': '删除论文',
  'paper.delete_confirm': '确定要删除这篇论文吗？',
  'paper.not_found': '论文未找到。',
  'paper.delete_review_confirm': '删除这条评审？',

  // AI Loading
  'ai.loading_title': 'AI 正在评审你的论文...',
  'ai.loading_time': '预计需要 10-30 秒',
  'ai.elapsed': '已用时',
  'ai.tip_1': '正在阅读论文内容...',
  'ai.tip_2': '正在分析研究方法...',
  'ai.tip_3': '正在评估创新点...',
  'ai.tip_4': '正在检查相关工作...',
  'ai.tip_5': '正在评估写作质量...',
  'ai.tip_6': '正在生成评审报告...',

  // Reviews
  'review.ai_title': '🤖 AI 评审',
  'review.ai_agent': 'AI Agent',
  'review.manual_title': '✏️ 手动评审',
  'review.no_manual': '暂无手动评审。',
  'review.delete': '删除',
  'review.mode_direct': '直接传文件给 LLM',
  'review.mode_extract': '提取文本后发送给 LLM',
  'review.mode_text_only': '仅基于标题和摘要',

  // Paper Upload
  'upload.title': '上传论文',
  'upload.paper_title': '标题',
  'upload.paper_title_placeholder': '请输入论文标题',
  'upload.abstract': '评审要求',
  'upload.abstract_placeholder': '请输入你对 AI 评审的要求，例如：重点关注方法创新性、实验设计是否合理...',
  'upload.file': '论文文件',
  'upload.submit': '提交论文',
  'upload.submitting': '上传中...',
  'upload.cancel': '取消',
  'upload.method_extract': 'AI 评审时将提取文本内容发送给 LLM',
  'upload.method_direct': 'AI 评审时将尝试直接传文件给 LLM',
  'upload.method_unknown': '该格式暂不支持文本提取，AI 评审将仅基于标题和摘要',
  'upload.formats_title': '支持的文件格式：',
  'upload.formats_extract': '提取文本',
  'upload.formats_direct': '直接传文件',

  // Review Form
  'review_form.title': '撰写评审',
  'review_form.score': '评分',
  'review_form.score_poor': '1 (差)',
  'review_form.score_avg': '5 (一般)',
  'review_form.score_excellent': '10 (优秀)',
  'review_form.recommendation': '推荐意见',
  'review_form.rec_accept': '接受',
  'review_form.rec_minor': '小修',
  'review_form.rec_major': '大修',
  'review_form.rec_reject': '拒绝',
  'review_form.content': '评审意见',
  'review_form.content_placeholder': '请提供详细的评审意见，包括优点、缺点和改进建议...',
  'review_form.submit': '提交评审',
  'review_form.submitting': '提交中...',
  'review_form.cancel': '取消',

  // Common
  'lang.toggle': 'EN',

  // Finalize
  'finalize.title': '完成最终评审',
  'finalize.description': '请为该论文做出最终决定：',
  'finalize.accept': '接受',
  'finalize.accept_desc': '论文通过，可以发表',
  'finalize.revision': '修改后重审',
  'finalize.revision_desc': '需要作者修改后重新提交',
  'finalize.reject': '拒绝',
  'finalize.reject_desc': '论文不通过',
  'finalize.confirm': '确认提交',
  'finalize.submitting': '提交中...',
  'finalize.cancel': '取消',
  'finalize.comment': '最终评语',
  'finalize.comment_placeholder': '请写下最终评审意见...',
  'finalize.already': '论文已完成最终评审',
  'finalize.status_accepted': '已接受',
  'finalize.status_rejected': '已拒绝',
  'finalize.status_revision': '需修改',
}

export default zh
