import { PRICING_PLANS } from '../data/wensai'
import { LogoMark, Panel } from '../components/WensaiUI'

export default function PricingPage() {
  return (
    <div className="min-h-full bg-[#f5f7fb] p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">收费标准页</h1>
          <p className="mt-2 text-sm text-slate-500">
            价格为待定展示稿，正式上线前可由后台或配置文件替换。
          </p>
        </div>
        <LogoMark className="h-14 w-14" />
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

      <Panel className="mt-5 p-5">
        <h2 className="text-lg font-semibold text-slate-950">收费逻辑建议</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ['个人按次', '适合个人学生或单个团队，降低首次使用门槛。'],
            ['学校按年', '适合学院统一采购，按年提供管理、模板和数据看板。'],
            ['增值服务', '可对深度修改、专家复核、答辩陪练设置额外服务。'],
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
