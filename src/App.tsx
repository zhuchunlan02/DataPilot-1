import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import knowledgeBase from './knowledge/public-demo-knowledge.json'
import { assetMeta, buildAssetFallback, buildCoverageGapAnswer, resolveAssetQuery } from './lib/dataAsset'
import { AnalysisResult, DemoScenarioId, buildAnalysisResult, buildScenarioAnalysis } from './lib/analysisResult'

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type ViewState = 'idle' | 'working' | 'completed' | 'failed' | 'scope'
type Step = { id: string; title: string; status: 'working' | 'completed' }
type ScenarioEventDetail = string | { query?: string; scenarioId?: string; demo?: boolean }

type KnowledgeEntry = { id: string; type: string; category: string; question: string; answer: string; keywords: string; note: string }
type KnowledgeHit = { entry: KnowledgeEntry; score: number }

const KNOWLEDGE_ENTRIES = knowledgeBase.entries as KnowledgeEntry[]

const GENERAL_GLOSSARY = [
  {
    aliases: ['roi', '投资回报率'],
    answer: 'ROI（Return on Investment，投资回报率）用于衡量投入产生的回报。营销分析中常见口径是“归因成交额 ÷ 营销成本”；财务口径也可能使用“（收益－成本）÷ 成本”。因此看到 ROI 时必须同时确认分子、分母、归因窗口和币种，不能只看指标名称。',
  },
  {
    aliases: ['gmv', '成交额', '成交金额'],
    answer: 'GMV（Gross Merchandise Value）指一定时期内的成交金额。实际使用时要确认支付还是下单口径、是否扣除退款、币种、时间范围以及商家范围。',
  },
  {
    aliases: ['dagmv', '日均gmv', '日均成交额'],
    answer: 'DAGMV（Daily Average GMV）指日均 GMV，通常等于统计周期内 GMV ÷ 有效天数。跨周期比较时必须统一有效天数、币种和商家范围。',
  },
  {
    aliases: ['aov', '客单价'],
    answer: 'AOV（Average Order Value，平均订单金额）通常等于 GMV ÷ 订单量。需要确认分母使用主订单、子订单还是去重买家数，不同口径不能直接比较。',
  },
  {
    aliases: ['okr%', 'okr达成率', '目标达成率'],
    answer: 'OKR 达成率通常等于实际完成值 ÷ 目标值。分析时应同时展示当前进度、时间进度和预计期末完成度，避免只看静态百分比。',
  },
]

const GMV_DIAGNOSIS_PLAYBOOK = `结论：先确认是真实经营下降还是数据异常，再按“GMV = 流量 × 转化率 × 客单价”逐层拆解；不要一开始就猜原因。

第一步｜校验数据：确认数据是否更新完整，比较周期的天数、币种、退款口径、商家范围和渠道归因是否一致，并排除 T-1/T-2 数据尚未稳定。

第二步｜定位贡献：先看总量下降发生在哪一天，再按渠道、类目、商家、商品、达人和广告拆分。用“本期 GMV－对比期 GMV”计算绝对贡献，优先定位贡献最大的负向分组，而不是只看降幅。

第三步｜拆经营漏斗：流量侧检查曝光、访问和内容供给；转化侧检查点击率、加购率和支付转化率；客单侧检查价格带、件单价、折扣与商品结构。广告和达人渠道还应检查花费、ROI、开播/发文数量及头部贡献变化。

第四步｜形成结论：把原因分成已验证事实、待验证假设和数据缺口。至少需要分日 GMV、渠道、类目、商家、商品、流量、订单、AOV、广告成本和活动日历，才能给出可信归因。`

const isDefinitionQuestion = (query: string) => /(什么意思|是什么|定义|怎么计算|怎么算|如何计算)/i.test(query)

const getGlossaryAnswer = (query: string) => {
  const clean = normalizeText(query)
  const candidates = GENERAL_GLOSSARY.flatMap(item => item.aliases.map(alias => ({ item, alias: normalizeText(alias) })))
    .filter(candidate => clean.includes(candidate.alias))
    .sort((a, b) => b.alias.length - a.alias.length)
  return candidates[0]?.item.answer ?? ''
}

const getGeneralPlaybook = (query: string) => /(gmv|成交额|成交金额).*(下降|下滑|降低|异常)|(下降|下滑|降低|异常).*(gmv|成交额|成交金额)/i.test(query)
  ? GMV_DIAGNOSIS_PLAYBOOK
  : ''

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff%]+/g, '')
const STOP_TERMS = new Set(['什么', '意思', '怎么', '如何', '哪些', '是否', '可以', '需要', '查询', '查看', '这个', '那个', '为什么'])

const getSearchTerms = (query: string) => {
  const terms = new Set<string>()
  for (const token of query.toLowerCase().match(/[a-z][a-z0-9_%.-]{1,}|\d+(?:\.\d+)?%?/g) ?? []) terms.add(token)
  for (const segment of query.match(/[\u4e00-\u9fff]{2,}/g) ?? []) {
    if (segment.length <= 8) terms.add(segment)
    for (let size = 2; size <= Math.min(4, segment.length); size += 1) {
      for (let i = 0; i <= segment.length - size; i += 1) terms.add(segment.slice(i, i + size))
    }
  }
  return [...terms].filter(term => !STOP_TERMS.has(term))
}

const getRelevantKnowledge = (query: string, limit = 5): KnowledgeHit[] => {
  const cleanQuery = normalizeText(query)
  const terms = getSearchTerms(query)
  return KNOWLEDGE_ENTRIES.map(entry => {
    const question = entry.question.toLowerCase()
    const answer = entry.answer.toLowerCase()
    const labels = `${entry.category} ${entry.keywords} ${entry.note}`.toLowerCase()
    let score = 0
    const cleanQuestion = normalizeText(entry.question)
    if (cleanQuery.length >= 4 && (cleanQuestion.includes(cleanQuery) || cleanQuery.includes(cleanQuestion))) score += 20
    for (const term of terms) {
      if (question.includes(term)) score += /[a-z0-9]/i.test(term) ? 8 : 4
      if (labels.includes(term)) score += /[a-z0-9]/i.test(term) ? 5 : 2
      if (answer.includes(term)) score += /[a-z0-9]/i.test(term) ? 3 : 1
    }
    if (entry.type === 'redline' && /(红线|注意|规则|口径|不能|禁止)/.test(query)) score += 3
    if (entry.type === 'asset' && /(资源|看板|数据集|报表|哪里|入口)/.test(query)) score += 3
    return { entry, score }
  }).filter(hit => hit.score >= 4).sort((a, b) => b.score - a.score).slice(0, limit)
}

const buildKnowledgeAnswer = (hits: KnowledgeHit[]) => {
  const primary = hits[0]?.entry
  if (!primary) return ''
  return `${primary.answer}${primary.note ? `\n\n使用提示：${primary.note}` : ''}\n\n知识来源：${knowledgeBase.name} · ${primary.id}`
}

const businessPattern = /(数据|指标|看板|报表|分析|经营|业务|gmv|成交额|成交金额|预算|补贴|商家|店铺|达人|广告|商品|选品|类目|品类|渠道|增长|下降|下滑|降低|异常|定位|排查|趋势|表现|曝光|访问|点击|加购|退款|买家|转化|目标|okr|dagmv|文件|工具|口径|查询|资源|模板|roi|aov|seller|creator|category|report|dashboard|周报|利润|成本|订单)/i

const axisMoney = (value: number) => value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `$${Math.round(value / 1_000)}K` : `$${Math.round(value)}`

function RichAnalysis({ analysis, narrative }: { analysis: AnalysisResult; narrative: string }) {
  const chartData = analysis.chart.labels.map((label, index) => ({ label, ...Object.fromEntries(analysis.chart.series.map(series => [series.name, series.values[index]])) }))
  const maxComparison = Math.max(...(analysis.comparison?.items.map(item => item.value) || [1]), 1)
  const isDualAxis = analysis.chart.series.length === 2 && (analysis.kind === 'budget' || analysis.kind === 'seller')
  return <div className={`analysis-report analysis-${analysis.kind}`}>
    <section className="analysis-hero"><div><span>SYNTHETIC DEMO ANALYSIS</span><h2>{analysis.title}</h2><small>{analysis.titleEn}</small></div><p>{analysis.period}</p></section>
    <section className="analysis-summary"><div className="analysis-summary-head"><span>✦</span><div><b>智能总结与诊断</b><small>AI Summary & Diagnosis</small></div></div><h3>{analysis.headline}</h3><div className="analysis-summary-grid">{analysis.summary.map(item => <article key={item.label} className={item.tone || 'neutral'}><b>{item.label}</b><p>{item.text}</p></article>)}</div></section>
    <section className="analysis-kpis">{analysis.kpis.map(kpi => <article key={kpi.label} className={kpi.tone || 'neutral'}><label>{kpi.label}<small>{kpi.labelEn}</small></label><strong>{kpi.value}</strong><em>{kpi.note}</em></article>)}</section>
    <div className="analysis-chart-grid"><section className="analysis-panel analysis-chart-panel"><div className="analysis-section-head"><div><h3>{analysis.chart.title}</h3><small>{analysis.chart.titleEn}</small></div><span>数值已标注</span></div><div className="analysis-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 24, right: 18, left: 2, bottom: 5 }}><CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} /><YAxis yAxisId="left" tickFormatter={analysis.chart.unit === 'money' ? axisMoney : value => `${value}%`} tick={{ fontSize: 8, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={48} />{isDualAxis && <YAxis yAxisId="right" orientation="right" tickFormatter={axisMoney} tick={{ fontSize: 8, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={48} />}<Tooltip formatter={(value) => { const raw = Array.isArray(value) ? value[0] : value; return analysis.chart.unit === 'money' ? axisMoney(Number(raw || 0)) : `${Number(raw || 0).toFixed(2)}%` }} contentStyle={{ borderRadius: 10, border: '1px solid #DBEAFE', fontSize: 10 }} /><Legend wrapperStyle={{ fontSize: 9 }} />{analysis.chart.series.map((series, index) => <Line key={series.name} yAxisId={isDualAxis && index === 1 ? 'right' : 'left'} type="monotone" dataKey={series.name} stroke={series.color} strokeWidth={2.5} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} label={{ position: 'top', fontSize: 7, fill: series.color, formatter: (value: unknown) => analysis.chart.unit === 'money' ? axisMoney(Number(value || 0)) : `${Number(value || 0).toFixed(1)}%` }} />)}</LineChart></ResponsiveContainer></div><div className="analysis-chart-values">{analysis.chart.labels.map((label, index) => <span key={`${label}-${index}`}><small>{label}</small><b>{analysis.chart.series.map(series => `${series.name} ${analysis.chart.unit === 'money' ? axisMoney(series.values[index]) : `${series.values[index].toFixed(2)}%`}`).join(' · ')}</b></span>)}</div></section>{analysis.comparison && <section className="analysis-panel analysis-comparison"><div className="analysis-section-head"><div><h3>{analysis.comparison.title}</h3><small>{analysis.comparison.titleEn}</small></div><span>{analysis.comparison.items.length} 项</span></div><div className="analysis-bars">{analysis.comparison.items.map(item => <div key={item.label}><div><b>{item.label}</b><span>{item.display}</span></div><i><em style={{ width: `${Math.max(3, item.value / maxComparison * 100)}%`, background: item.color }} /></i></div>)}</div></section>}</div>
    <section className="analysis-panel analysis-detail"><div className="analysis-section-head"><div><h3>{analysis.table.title}</h3><small>{analysis.table.titleEn}</small></div><span>左右滑动查看完整明细</span></div><div className="analysis-table-wrap"><table><thead><tr>{analysis.table.headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{analysis.table.rows.map((row, rowIndex) => <tr key={`${row[0]}-${rowIndex}`}>{row.map((cell, index) => <td key={`${rowIndex}-${index}`}>{analysis.kind === 'hunting' && index === 1 && cell.startsWith('data:image/') ? <img className="analysis-product-image" src={cell} alt={`${row[2]} 模拟商品图`} /> : analysis.kind === 'hunting' && index === 0 ? <span className={`analysis-product-type type-${cell === '热销品' ? 'hot' : cell === '机会品' ? 'opportunity' : 'gap'}`}>{cell}</span> : index === 0 || (analysis.kind === 'hunting' && index === 2) ? <b>{cell}</b> : cell}</td>)}</tr>)}</tbody></table></div></section>
    <div className="analysis-insight-grid"><section className="analysis-panel"><div className="analysis-section-head"><div><h3>诊断结论</h3><small>Verified Findings & Limits</small></div></div><ol className="analysis-list diagnosis">{analysis.diagnosis.map(item => <li key={item}>{item}</li>)}</ol></section><section className="analysis-panel"><div className="analysis-section-head"><div><h3>建议动作</h3><small>Recommended Actions</small></div></div><ol className="analysis-list actions">{analysis.actions.map(item => <li key={item}>{item}</li>)}</ol></section></div>
    {narrative && <section className="analysis-panel analysis-narrative"><div className="analysis-section-head"><div><h3>本地分析解读</h3><small>Local Analysis Narrative</small></div><span>完全模拟数据</span></div><div>{narrative}</div></section>}
    <footer className="analysis-source"><span>数据来源：{analysis.source}</span><span>计算口径：{analysis.methodology}</span><span>{assetMeta.name} · {assetMeta.version} · 所有数值均为虚构</span></footer>
  </div>
}

function SmartResult({ state, answer, analysis, steps, question, onRetry }: { state: ViewState; answer: string; analysis: AnalysisResult | null; steps: Step[]; question: string; onRetry: () => void }) {
  if (state === 'scope') {
    return <div className="result-shell smart-result-shell"><section className="scope-message"><span className="scope-icon">?</span><div><p className="scope-kicker">能力边界 · SCOPE CHECK</p><h2>这个问题不在 DataPilot 的业务数据范围内</h2><small>“{question}” 未识别到数据、指标、资源或经营分析意图。</small><p>DataPilot 不会为了给出答案而强行匹配分析模板。你可以询问指标口径、资源位置、数据异常、经营建议，或使用下方六个固定分析入口。</p></div></section></div>
  }
  return <div className="result-shell smart-result-shell"><section className="smart-answer-card"><div className="smart-answer-head"><div><span>✦</span><p><b>DataPilot 智能回答</b><small>Local reasoning · Synthetic data only</small></p></div><em className={`smart-state ${state}`}>{state === 'working' ? '分析中' : state === 'failed' ? '执行失败' : '已完成'}</em></div><div className="smart-question"><span>你的问题</span><p>{question}</p></div>{state === 'working' && <div className="smart-progress"><div className="smart-progress-bar"><i /></div><p>{analysis ? 'KPI、趋势图和明细已生成，正在补充本地分析解读。' : '正在计算 KPI、生成趋势图、组织诊断结论与建议动作。'}</p>{steps.length > 0 && <div className="smart-steps">{steps.slice(-4).map(step => <span key={step.id}>✓ {step.title}</span>)}</div>}</div>}{analysis ? <RichAnalysis analysis={analysis} narrative={answer} /> : answer && state !== 'failed' ? <div className="smart-answer-text">{answer}</div> : null}{state === 'failed' && <div className="smart-error"><p>{answer || '智能任务暂时不可用，请稍后重试。'}</p><button onClick={onRetry}>重新尝试 · Retry</button></div>}</section></div>
}

export default function App() {
  const [input, setInput] = useState('')
  const [state, setState] = useState<ViewState>('idle')
  const [answer, setAnswer] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [question, setQuestion] = useState('')
  const [, setHistory] = useState<ChatMessage[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const resultRoot = useMemo(() => document.getElementById('smart-result-root'), [])

  useEffect(() => {
    const clear = () => { setState('idle'); setAnswer(''); setAnalysis(null); setSteps([]) }
    window.addEventListener('datapilot:legacy-result', clear)
    return () => window.removeEventListener('datapilot:legacy-result', clear)
  }, [])

  const revealResult = () => {
    document.getElementById('stageEmpty')?.classList.add('hidden')
    document.getElementById('resultMount')?.classList.add('hidden')
    setTimeout(() => document.getElementById('analysisStage')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40)
  }

  const submitLocalAnalysis = async (q: string) => {
    setQuestion(q); setState('working'); setAnswer(''); setAnalysis(null); setSteps([{ id: 'coverage', title: '校验本地数据覆盖', status: 'working' }]); revealResult()
    await new Promise(resolve => window.setTimeout(resolve, 220))
    const relevant = getRelevantKnowledge(q).filter(hit => hit.score >= 10)
    const glossaryAnswer = getGlossaryAnswer(q)
    const playbook = getGeneralPlaybook(q)
    const resolution = resolveAssetQuery(q)
    const structuredAnalysis = resolution.datasets.length ? buildAnalysisResult(q, resolution.datasets) : null
    const localAnswer = (resolution.datasets.length ? buildAssetFallback(q, resolution.datasets) : '') || playbook || glossaryAnswer || buildKnowledgeAnswer(relevant)
    const finalText = localAnswer || '公开演示数据集暂未覆盖该问题。请从资源中心选择本地模拟查询或使用六个固定分析场景。'
    setSteps([
      { id: 'coverage', title: '本地数据覆盖已校验', status: 'completed' },
      { id: 'analysis', title: structuredAnalysis ? '结构化分析已生成' : '本地知识答案已生成', status: 'completed' },
    ])
    setAnalysis(structuredAnalysis)
    setAnswer(finalText)
    setState('completed')
    setHistory(prev => [...prev, { role: 'user' as const, content: q }, { role: 'assistant' as const, content: finalText }].slice(-10))
  }

  const processScenario = (q: string, scenarioId: DemoScenarioId) => {
    const safeQuery = scenarioId === 'budget' ? '预算消耗 ROI 分天明细' : '成交额分渠道 OKR 明细'
    const datasets = scenarioId === 'budget' || scenarioId === 'gmv' ? resolveAssetQuery(safeQuery).datasets : []
    const structured = buildScenarioAnalysis(scenarioId, datasets)
    if (!structured) {
      setQuestion(q); setAnswer('当前固定场景暂时无法生成结果，请稍后重试。'); setAnalysis(null); setState('failed'); setSteps([]); revealResult()
      return
    }
    const narratives: Record<DemoScenarioId, string> = {
      budget: '表现判断：当前公开模拟预算数据可以支持预算消耗、Store GMV、ROI 和分天明细分析。累计效率与最新日效率需要并列观察，不能只用单日结果判断预算质量。\n\n关键变化：先定位单日消耗峰值，再检查 Paid Ads、Growth Voucher、Campaign 与 Assortment 的结构变化；高消耗但 ROI 低于累计基准的日期应优先复盘。\n\n风险与限制：当前资产不含订单量，因此不能可靠计算 AOV；报告不会用模拟 AOV 混入真实资产结果。\n\n建议动作：建立“累计 ROI—最新日 ROI—预算类型占比”三层监控，并把低于基准的高消耗预算项加入复核清单。',
      gmv: '表现判断：渠道结果使用本地模拟 channel 表生成，重点同时观察 Overall、Creator、Self-sell 与 Paid Ads，避免整体达成掩盖局部落后。\n\n关键变化：趋势图展示近 10 日 Overall GMV，渠道对比按最新日口径；峰值日与最新日的差额可用于定位主要波动来源。\n\n风险与限制：当前结论是结构描述而非因果归因；若要解释波动原因，仍需商品、流量、订单和活动日历。\n\n建议动作：对 OKR 低于 100% 的渠道建立追赶清单，并按绝对 GMV 缺口排序。',
      seller: '这是安全模拟单店分析。模拟结果显示店铺 GMV 连续走高，但达人渠道贡献达到 63%，增长对达人供给稳定性较敏感。\n\n前三热销商品贡献 53.1% GMV，广告预算向高转化商品集中具备效率基础，但仍应设置 ROI 止损线，避免追量导致边际效率下降。\n\n建议同时推进达人结构分散、自播补量和广告预算迁移，并用周度复盘验证动作是否真正改善渠道健康度。',
      hunting: '这是安全模拟的 SEA / VN 周度选品清单。结果按热销品、机会品、劣势品三类展示，每条记录都包含模拟商品图、商品名字、市场、一级类目、二级类目和价格。\n\n热销品适合优先验证供给稳定性并快速跟进；机会品建议用小批量测试确认点击和支付转化；劣势品代表当前供给或竞争力存在缺口，应先补充价格、内容和商家证据。\n\n所有商品名称、图片、分类和价格均为虚构演示数据，不代表真实 SEA/VN 排名或市场表现。',
      weekly: '这是独立的安全模拟团队周报，不再复用预算分析结果。报告同时覆盖周度 GMV、活跃商家与层级结构、渠道贡献和四类预算达成。\n\n本周 GMV 连续第六周增长，Creator 是最大贡献渠道；但 T4+ 商家贡献超过六成，说明增长仍对头部商家稳定性较敏感。\n\n预算侧应把进度与效率分开管理：Growth Voucher 需要补进度，Creator Incentive 则需要增加效率护栏。所有数值均为虚构演示数据，不代表真实团队经营表现。',
      category: '这是安全模拟类目分析。家居生活与美妆个护构成规模基本盘，数码家电是本周增长最快类目，但商家供给相对有限。\n\n食品饮料和服饰箱包出现负增长，建议优先下钻绝对 GMV 缺口最大的商家和商品，而不是只按降幅排序。\n\n类目健康度应同时使用 GMV、商家数、商品数和 AOV 判断；单一指标改善不能直接代表供给质量提升。',
    }
    setQuestion(q); setAnswer(narratives[scenarioId]); setAnalysis(structured); setState('completed'); setSteps([]); revealResult()
    setHistory(prev => [...prev, { role: 'user' as const, content: q }, { role: 'assistant' as const, content: narratives[scenarioId] }].slice(-10))
  }

  const processQuestion = async (q: string, scenarioId?: DemoScenarioId) => {
    if (!q || state === 'working') return
    if (scenarioId) { processScenario(q, scenarioId); return }
    const glossaryAnswer = getGlossaryAnswer(q)
    const playbook = getGeneralPlaybook(q)
    if (!businessPattern.test(q) && !glossaryAnswer && !playbook) {
      setQuestion(q); setState('scope'); setAnswer(''); setAnalysis(null); revealResult(); return
    }
    if (playbook) {
      setQuestion(q); setAnswer(playbook); setAnalysis(null); setState('completed'); setSteps([]); revealResult()
      setHistory(prev => [...prev, { role: 'user' as const, content: q }, { role: 'assistant' as const, content: playbook }].slice(-10))
      return
    }
    if (isDefinitionQuestion(q) && glossaryAnswer) {
      setQuestion(q); setAnswer(`${glossaryAnswer}\n\n回答来源：DataPilot 通用指标词典`); setAnalysis(null); setState('completed'); setSteps([]); revealResult()
      setHistory(prev => [...prev, { role: 'user' as const, content: q }, { role: 'assistant' as const, content: glossaryAnswer }].slice(-10))
      return
    }
    const relevant = getRelevantKnowledge(q)
    if (isDefinitionQuestion(q) && relevant[0]?.score >= 10) {
      const localAnswer = buildKnowledgeAnswer(relevant)
      setQuestion(q); setAnswer(localAnswer); setAnalysis(null); setState('completed'); setSteps([]); revealResult()
      setHistory(prev => [...prev, { role: 'user' as const, content: q }, { role: 'assistant' as const, content: localAnswer }].slice(-10))
      return
    }
    const resolution = resolveAssetQuery(q)
    if (resolution.isDataQuestion && resolution.missing) {
      const localAnswer = buildCoverageGapAnswer(resolution.missing.reason, resolution.missing.resource)
      setQuestion(q); setAnswer(localAnswer); setAnalysis(null); setState('completed'); setSteps([]); revealResult()
      setHistory(prev => [...prev, { role: 'user' as const, content: q }, { role: 'assistant' as const, content: localAnswer }].slice(-10))
      return
    }
    await submitLocalAnalysis(q)
  }

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    await processQuestion(input.trim())
  }

  useEffect(() => {
    const askFromCard = (event: Event) => {
      const detail = (event as CustomEvent<ScenarioEventDetail>).detail
      const q = typeof detail === 'string' ? detail.trim() : String(detail?.query || '').trim()
      const rawScenario = typeof detail === 'object' ? detail?.scenarioId : undefined
      const scenarioId = rawScenario && ['budget','gmv','hunting','weekly','seller','category'].includes(rawScenario) ? rawScenario as DemoScenarioId : undefined
      if (!q) return
      setInput(q)
      void processQuestion(q, scenarioId)
    }
    window.addEventListener('datapilot:asset-question', askFromCard)
    return () => window.removeEventListener('datapilot:asset-question', askFromCard)
  })

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit() }
  }

  return <>
    <form className="ask-box smart-ask-box" onSubmit={submit}>
      <div className="smart-mode-row"><span><i /> 公开演示模式 · LOCAL LOGIC + SYNTHETIC DATA</span><small>4 张本地模拟数据表 + {KNOWLEDGE_ENTRIES.length} 条通用知识；无网络请求</small></div>
      <textarea id="queryInput" rows={3} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder="例如：查询整体渠道 GMV、预算 ROI 或里程碑转化率" />
      <div className="smart-suggestions">{['整体渠道最新 GMV 是多少？','预算累计 ROI 如何？','最新日期各里程碑转化率是多少？'].map(item => <button type="button" key={item} onClick={() => setInput(item)}>{item}</button>)}</div>
      <div className="ask-actions"><span>数据问题先校验资产覆盖；未覆盖时明确推荐对应取数入口</span><button id="sendBtn" type="submit" disabled={state === 'working'}><span className="run-copy"><strong>{state === 'working' ? '正在分析' : '智能提问'}</strong><small>{state === 'working' ? 'Agent working' : 'Ask DataPilot'}</small></span><b>{state === 'working' ? '…' : '→'}</b></button></div>
    </form>
    {resultRoot && state !== 'idle' ? createPortal(<SmartResult state={state} answer={answer} analysis={analysis} steps={steps} question={question} onRetry={() => void submitLocalAnalysis(question)} />, resultRoot) : null}
  </>
}
