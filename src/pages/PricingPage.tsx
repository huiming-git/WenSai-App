import { PRICING_PLANS } from '../data/wensai'
import { useAuth } from '../context/AuthContext'
import { LogoMark, Panel } from '../components/WensaiUI'

const CREDIT_USAGE = [
  ['普通问答', '约 20 积分 / 轮'],
  ['生成图表', '约 50 积分 / 次'],
  ['安装技能', '约 100 积分 / 次'],
  ['制作 PPT', '约 700-800 积分 / 次'],
  ['制作视频', '约 2500 积分 / 次'],
]

const CREDIT_SOURCES = [
  ['购买套餐', '按个人或学校账户充值积分。'],
  ['注册赠送', '新用户可配置一次性体验积分。'],
  ['邀请新用户', '邀请成功后可奖励积分，适合校园推广。'],
]

export default function PricingPage() {
  const { user } = useAuth()
  const credits = typeof user?.credits === 'number' ? `${user.credits.toLocaleString()} 积分` : '待同步'

  return (
    <div className="min-h-full bg-[#f5f7fb] p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">积分收费制度</h1>
          <p className="mt-2 text-sm text-slate-500">
            个人可按次消耗积分，学校可按年配置统一积分池。
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-right">
            <p className="text-xs text-slate-500">当前余额</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{credits}</p>
          </div>
          <LogoMark className="h-14 w-14" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <Panel key={plan.name} className="overflow-hidden">
            <div className="border-b border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{plan.description}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  {plan.note}
                </span>
              </div>
              <p className="mt-6 text-3xl font-semibold text-slate-950">{plan.price}</p>
            </div>
            <div className="p-5">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm text-slate-600">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-slate-950">积分消耗额度</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            {CREDIT_USAGE.map(([name, cost]) => (
              <div key={name} className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-200 bg-white px-4 py-3 last:border-b-0">
                <span className="text-sm font-medium text-slate-800">{name}</span>
                <span className="text-sm text-slate-500">{cost}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-slate-950">积分来源与用途</h2>
          <div className="mt-4 space-y-3">
            {CREDIT_SOURCES.map(([title, text]) => (
              <div key={title} className="rounded-lg bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-5 p-5">
        <h2 className="text-lg font-semibold text-slate-950">学校年度积分池</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ['额度配置', '按年为学校或学院配置总积分，支持项目团队分配。'],
            ['消耗明细', '记录材料上传、AI 生成、导出等使用场景，便于对账。'],
            ['充值续费', '余额不足时按积分包或年度服务续费，后续可接入支付接口。'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-lg bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
