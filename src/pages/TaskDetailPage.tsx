import { useParams } from 'react-router-dom'
import AgentTaskConversation from '../components/AgentTaskConversation'

export default function TaskDetailPage() {
  const { id } = useParams()
  if (!id) return null

  return (
    <div className="min-h-full bg-[#f8fafc] p-4 md:p-6">
      <AgentTaskConversation taskId={id} />
    </div>
  )
}
