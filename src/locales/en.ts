const en: Record<string, string> = {
  // Header
  'nav.brand': 'WenSai',
  'nav.dashboard': 'Dashboard',
  'nav.papers': 'Papers',
  'nav.upload': 'Upload',
  'nav.logout': 'Logout',

  // Login
  'login.title': 'WenSai',
  'login.subtitle': 'Sign in to your account',
  'login.username': 'Username',
  'login.username_placeholder': 'Enter your username',
  'login.password': 'Password',
  'login.password_placeholder': 'Enter your password',
  'login.submit': 'Sign In',
  'login.submitting': 'Signing in...',
  'login.no_account': "Don't have an account?",
  'login.register_link': 'Sign up',

  // Register
  'register.title': 'Create Account',
  'register.username': 'Username',
  'register.username_placeholder': 'Choose a username',
  'register.password': 'Password',
  'register.password_placeholder': 'Set a password (min 6 characters)',
  'register.invite_code': 'Invite Code',
  'register.invite_code_placeholder': 'Enter invite code',
  'register.submit': 'Create Account',
  'register.submitting': 'Creating...',
  'register.has_account': 'Already have an account?',
  'register.login_link': 'Sign in',

  // Dashboard
  'dashboard.welcome': 'Welcome, ',
  'dashboard.total_papers': 'Total Papers',
  'dashboard.pending': 'Pending',
  'dashboard.under_review': 'Under Review',
  'dashboard.completed': 'Completed',
  'dashboard.recent_papers': 'Recent Papers',
  'dashboard.view_all': 'View all',
  'dashboard.no_papers': 'No papers yet.',
  'dashboard.upload_first': 'Upload your first paper',

  // Paper List
  'papers.title': 'Papers',
  'papers.upload_btn': '+ Upload Paper',
  'papers.filter_all': 'All',
  'papers.col_title': 'Title',
  'papers.col_author': 'Author',
  'papers.col_status': 'Status',
  'papers.col_date': 'Date',
  'papers.no_papers': 'No papers found.',

  // Status labels
  'status.pending': 'Pending',
  'status.under_review': 'Under Review',
  'status.reviewed': 'Reviewed',
  'status.accepted': 'Accepted',
  'status.rejected': 'Rejected',
  'status.revision': 'Revision',

  // Recommendation labels
  'rec.accept': 'Accept',
  'rec.minor_revision': 'Minor Revision',
  'rec.major_revision': 'Major Revision',
  'rec.reject': 'Reject',

  // Paper Detail
  'paper.requirements': 'Review Requirements',
  'paper.download': 'Download File',
  'paper.ai_review_btn': '🤖 AI Review',
  'paper.manual_review_btn': '✏️ Manual Review',
  'paper.delete_btn': 'Delete Paper',
  'paper.delete_confirm': 'Are you sure you want to delete this paper?',
  'paper.not_found': 'Paper not found.',
  'paper.delete_review_confirm': 'Delete this review?',

  // AI Loading
  'ai.loading_title': 'AI is reviewing your paper...',
  'ai.loading_time': 'This may take 10-30 seconds',
  'ai.elapsed': 'Elapsed',
  'ai.tip_1': 'Reading paper content...',
  'ai.tip_2': 'Analyzing methodology...',
  'ai.tip_3': 'Evaluating contributions...',
  'ai.tip_4': 'Checking related work...',
  'ai.tip_5': 'Assessing writing quality...',
  'ai.tip_6': 'Generating review report...',

  // Reviews
  'review.ai_title': '🤖 AI Review',
  'review.ai_agent': 'AI Agent',
  'review.manual_title': '✏️ Manual Reviews',
  'review.no_manual': 'No manual reviews yet.',
  'review.delete': 'Delete',
  'review.mode_direct': 'File sent directly to LLM',
  'review.mode_extract': 'Text extracted and sent to LLM',
  'review.mode_text_only': 'Based on title & abstract only',

  // Paper Upload
  'upload.title': 'Upload Paper',
  'upload.paper_title': 'Title',
  'upload.paper_title_placeholder': 'Enter paper title',
  'upload.abstract': 'Review Requirements',
  'upload.abstract_placeholder': 'Specify what the AI should focus on, e.g.: methodology, novelty, experimental design...',
  'upload.file': 'Paper File',
  'upload.submit': 'Submit Paper',
  'upload.submitting': 'Uploading...',
  'upload.cancel': 'Cancel',
  'upload.method_extract': 'Text will be extracted and sent to LLM for AI review',
  'upload.method_direct': 'File will be sent directly to LLM for AI review',
  'upload.method_unknown': 'Text extraction not supported, AI review will use title & abstract only',
  'upload.formats_title': 'Supported formats:',
  'upload.formats_extract': 'text extraction',
  'upload.formats_direct': 'direct file',

  // Review Form
  'review_form.title': 'Write Review',
  'review_form.score': 'Score',
  'review_form.score_poor': '1 (Poor)',
  'review_form.score_avg': '5 (Average)',
  'review_form.score_excellent': '10 (Excellent)',
  'review_form.recommendation': 'Recommendation',
  'review_form.rec_accept': 'Accept',
  'review_form.rec_minor': 'Minor Revision',
  'review_form.rec_major': 'Major Revision',
  'review_form.rec_reject': 'Reject',
  'review_form.content': 'Review Comments',
  'review_form.content_placeholder': 'Provide detailed review comments, including strengths, weaknesses, and suggestions...',
  'review_form.submit': 'Submit Review',
  'review_form.submitting': 'Submitting...',
  'review_form.cancel': 'Cancel',

  // Common
  'lang.toggle': '中',

  // Finalize
  'finalize.title': 'Final Decision',
  'finalize.description': 'Make a final decision for this paper:',
  'finalize.accept': 'Accept',
  'finalize.accept_desc': 'Paper is approved for publication',
  'finalize.revision': 'Revision Required',
  'finalize.revision_desc': 'Author needs to revise and resubmit',
  'finalize.reject': 'Reject',
  'finalize.reject_desc': 'Paper is not accepted',
  'finalize.confirm': 'Confirm',
  'finalize.submitting': 'Submitting...',
  'finalize.cancel': 'Cancel',
  'finalize.comment': 'Final Comment',
  'finalize.comment_placeholder': 'Write your final review comment...',
  'finalize.already': 'Paper already finalized',
  'finalize.status_accepted': 'Accepted',
  'finalize.status_rejected': 'Rejected',
  'finalize.status_revision': 'Revision Required',
}

export default en
