import type { AssetDataset } from './dataAsset'

export type AnalysisKpi = {
  label: string
  labelEn: string
  value: string
  note: string
  tone?: 'positive' | 'warning' | 'neutral'
}

export type AnalysisSeries = {
  name: string
  color: string
  values: number[]
}

export type AnalysisResult = {
  kind: 'channel' | 'budget' | 'ads' | 'seller' | 'category' | 'hunting' | 'weekly'
  isSynthetic?: boolean
  title: string
  titleEn: string
  period: string
  headline: string
  summary: Array<{ label: string; text: string; tone?: 'positive' | 'warning' | 'neutral' }>
  kpis: AnalysisKpi[]
  chart: { title: string; titleEn: string; labels: string[]; series: AnalysisSeries[]; unit: 'money' | 'percent' }
  comparison?: { title: string; titleEn: string; items: Array<{ label: string; value: number; display: string; color: string }> }
  table: { title: string; titleEn: string; headers: string[]; rows: string[][] }
  diagnosis: string[]
  actions: string[]
  source: string
  methodology: string
}

const numeric = (value: string) => Number(String(value || '').replace(/[$,%]/g, '').replace(/,/g, '')) || 0
const money = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`
const percent = (value: number) => `${value.toFixed(2)}%`
const dataset = (datasets: AssetDataset[], id: string) => datasets.find(item => item.id === id)

function buildChannel(datasets: AssetDataset[]): AnalysisResult | null {
  const ds = dataset(datasets, 'channel')
  if (!ds) return null
  const header = ds.rows[1] || []
  const rows = ds.rows.slice(2).filter(row => row[0])
  const overall = rows.find(row => row[0] === 'Overall') || []
  const latestIndex = Math.max(10, header.length - 1)
  const latestDate = header[latestIndex] || '最新日'
  const mainNames = ['Overall', 'Creator', '- Top Creator', '- Mass Creator', 'SC', 'Self-sell', 'Paid Ads']
  const mainRows = mainNames.map(name => rows.find(row => row[0] === name)).filter(Boolean) as string[][]
  const top = mainRows.slice(1).reduce((best, row) => numeric(row[latestIndex]) > numeric(best[latestIndex]) ? row : best, mainRows[1] || overall)
  const start = Math.max(10, latestIndex - 9)
  const labels = header.slice(start, latestIndex + 1)
  const overallValues = overall.slice(start, latestIndex + 1).map(numeric)
  const avg = overallValues.reduce((sum, value) => sum + value, 0) / Math.max(overallValues.length, 1)
  const latest = numeric(overall[latestIndex])
  const maxValue = Math.max(...overallValues)
  const maxAt = labels[overallValues.indexOf(maxValue)]
  const creator = rows.find(row => row[0] === 'Creator') || []
  const creatorShare = latest ? numeric(creator[latestIndex]) / latest * 100 : 0
  return {
    kind: 'channel',
    isSynthetic: true,
    title: '整体渠道 GMV 深度分析',
    titleEn: 'Overall Channel GMV Analysis',
    period: `最新日期 ${latestDate} · 近 ${labels.length} 日趋势`,
    headline: `${latestDate} Overall GMV 为 ${money(latest)}，最近 ${labels.length} 日均值为 ${money(avg)}。`,
    summary: [
      { label: '最新表现', text: `整体 GMV ${money(latest)}，相对近 ${labels.length} 日均值${latest >= avg ? '高' : '低'} ${Math.abs(latest / Math.max(avg, 1) - 1) * 100 < 0.01 ? '0.00' : (Math.abs(latest / Math.max(avg, 1) - 1) * 100).toFixed(1)}%。`, tone: latest >= avg ? 'positive' : 'warning' },
      { label: '渠道贡献', text: `${top?.[0]?.replace(/^\s*-+\s*/, '') || '—'} 为最新日规模最大的展示层级，GMV ${money(numeric(top?.[latestIndex] || ''))}。` },
      { label: '结构观察', text: `Creator 最新日占 Overall 的 ${creatorShare.toFixed(1)}%；该占比是结构描述，不代表增量归因。` },
    ],
    kpis: [
      { label: '最新日 GMV', labelEn: 'Latest GMV', value: money(latest), note: latestDate, tone: latest >= avg ? 'positive' : 'warning' },
      { label: '近 10 日均值', labelEn: '10D Average', value: money(avg), note: 'Overall' },
      { label: 'Q3 OKR 达成', labelEn: 'Q3 OKR', value: overall[1] || '—', note: `目标 ${overall[4] || '—'}`, tone: numeric(overall[1]) >= 100 ? 'positive' : 'warning' },
      { label: 'Q3 DAGMV', labelEn: 'Q3 DAGMV', value: overall[7] || '—', note: `峰值 ${maxAt} · ${money(maxValue)}` },
    ],
    chart: { title: 'Overall GMV 趋势', titleEn: 'Daily GMV Trend', labels, series: [{ name: 'Overall', color: '#2563EB', values: overallValues }], unit: 'money' },
    comparison: { title: '最新日渠道规模对比', titleEn: 'Latest Channel Comparison', items: mainRows.slice(1).map((row, index) => ({ label: row[0].replace(/^\s*-+\s*/, ''), value: numeric(row[latestIndex]), display: row[latestIndex] || '$0', color: ['#2563EB','#7C3AED','#9333EA','#0891B2','#059669','#EA580C'][index % 6] })) },
    table: { title: '渠道目标与最新日明细', titleEn: 'Channel OKR & Latest Detail', headers: ['渠道 / Channel', 'Q3 OKR%', 'Sep OKR%', 'Q3 DAGMV', 'Sep DAGMV', latestDate], rows: mainRows.map(row => [row[0].replace(/^\s*-+\s*/, ''), row[1], row[2], row[7], row[8], row[latestIndex]]) },
    diagnosis: [
      `数据已证实：${maxAt} 是最近 ${labels.length} 日峰值，GMV ${money(maxValue)}。`,
      `数据已证实：最新日 Creator 占比为 ${creatorShare.toFixed(1)}%，需结合其他渠道共同解释整体波动。`,
      '待验证假设：若需解释日波动原因，还需商品、流量、订单和活动日历等当前资产未覆盖字段。',
    ],
    actions: ['优先复盘峰值日与最新日的渠道差额，定位绝对贡献最大的渠道。', '对 OKR 低于 100% 的渠道单列追赶清单，避免被整体达成掩盖。', '若要做因果归因，从资源中心补充商品、流量和活动明细。'],
    source: `${ds.title} · ${ds.rowCount} 行 × ${ds.columnCount} 列`,
    methodology: `最新日取表头最右侧日期列；近 ${labels.length} 日均值按 Overall 对应日值算术平均。`,
  }
}

function buildBudget(datasets: AssetDataset[]): AnalysisResult | null {
  const ds = dataset(datasets, 'budget')
  if (!ds) return null
  const rows = ds.rows.slice(1).filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row[0] || ''))
  const chronological = [...rows].reverse()
  const totalSpend = rows.reduce((sum, row) => sum + numeric(row[9]), 0)
  const totalGmv = rows.reduce((sum, row) => sum + numeric(row[10]), 0)
  const roi = totalGmv / Math.max(totalSpend, 1)
  const latest = rows[0] || []
  const latestRoi = numeric(latest[10]) / Math.max(numeric(latest[9]), 1)
  const peak = rows.reduce((best, row) => numeric(row[9]) > numeric(best?.[9] || '') ? row : best, rows[0])
  const recent = chronological.slice(-12)
  const mixNames = [['Paid Ads',1,'#2563EB'],['Growth Voucher',2,'#7C3AED'],['Campaign',3,'#EA580C'],['Assortment',4,'#059669']] as const
  const mix = mixNames.map(([label, index, color]) => {
    const value = rows.reduce((sum, row) => sum + numeric(row[index]), 0)
    return { label, value, display: money(value), color }
  })
  const mixTotal = mix.reduce((sum, item) => sum + item.value, 0)
  return {
    kind: 'budget',
    isSynthetic: true,
    title: '累计预算 ROI 深度分析',
    titleEn: 'Cumulative Budget ROI Analysis',
    period: `${chronological[0]?.[0]} 至 ${latest[0]}`,
    headline: `累计 Merchant Spend ${money(totalSpend)}，对应 Store GMV ${money(totalGmv)}，ROI 为 ${roi.toFixed(2)}×。`,
    summary: [
      { label: '累计效率', text: `每 1 美元 Merchant Spend 对应 ${roi.toFixed(2)} 美元 Store GMV。`, tone: roi >= 10 ? 'positive' : 'neutral' },
      { label: '最新单日', text: `${latest[0]} ROI 为 ${latestRoi.toFixed(2)}×，Merchant Spend ${latest[9]}。`, tone: latestRoi >= roi ? 'positive' : 'warning' },
      { label: '峰值提醒', text: `${peak?.[0]} 为单日 Merchant Spend 峰值，金额 ${peak?.[9]}，需结合当日 GMV 判断是否有效放量。` },
    ],
    kpis: [
      { label: '累计 Merchant Spend', labelEn: 'Cumulative Spend', value: money(totalSpend), note: `${rows.length} 个自然日` },
      { label: '累计 Store GMV', labelEn: 'Cumulative GMV', value: money(totalGmv), note: '与 Spend 同日期范围', tone: 'positive' },
      { label: '累计 ROI', labelEn: 'Cumulative ROI', value: `${roi.toFixed(2)}×`, note: 'Store GMV ÷ Merchant Spend', tone: roi >= 10 ? 'positive' : 'neutral' },
      { label: '最新日 ROI', labelEn: 'Latest ROI', value: `${latestRoi.toFixed(2)}×`, note: latest[0], tone: latestRoi >= roi ? 'positive' : 'warning' },
    ],
    chart: { title: '近 12 日 Spend 与 GMV 趋势', titleEn: '12D Spend & GMV Trend', labels: recent.map(row => row[0].slice(5)), series: [{ name: 'Merchant Spend', color: '#2563EB', values: recent.map(row => numeric(row[9])) }, { name: 'Store GMV', color: '#7C3AED', values: recent.map(row => numeric(row[10])) }], unit: 'money' },
    comparison: { title: '累计预算类型构成', titleEn: 'Cumulative Budget Mix', items: mix.map(item => ({ ...item, display: `${item.display} · ${(item.value / Math.max(mixTotal, 1) * 100).toFixed(1)}%` })) },
    table: { title: '最近 10 日预算明细', titleEn: 'Latest 10-Day Budget Detail', headers: ['日期', 'Paid Ads', 'Growth Voucher', 'Campaign', 'Assortment', 'Merchant Spend', 'Store GMV', 'ROI'], rows: rows.slice(0, 10).map(row => [row[0], row[1], row[2], row[3], row[4], row[9], row[10], `${(numeric(row[10]) / Math.max(numeric(row[9]), 1)).toFixed(2)}×`]) },
    diagnosis: [
      `数据已证实：累计 ROI 为 ${roi.toFixed(2)}×；最新日 ROI 为 ${latestRoi.toFixed(2)}×。`,
      `数据已证实：单日 Merchant Spend 峰值发生在 ${peak?.[0]}，金额 ${peak?.[9]}。`,
      '口径限制：此处 ROI 严格按 Store GMV ÷ Merchant Spend 计算，不等同于利润 ROI 或广告归因 ROI。',
    ],
    actions: ['将最新日 ROI 与累计基准并列监控，低于基准时复核当日高消耗预算项。', '按 Paid Ads、Growth Voucher、Campaign、Assortment 拆解消耗结构，优先检查占比高且效率弱的类型。', '涉及利润判断时查看资源中心的损益追踪模拟看板，不用本表 ROI 替代利润率。'],
    source: `${ds.title} · ${ds.rowCount} 行 × ${ds.columnCount} 列`,
    methodology: '累计 ROI = 同期 Store GMV 合计 ÷ Merchant Spend 合计；预算构成按 Paid Ads、Growth Voucher、Campaign、Assortment 字段分别汇总。',
  }
}

function buildAds(datasets: AssetDataset[]): AnalysisResult | null {
  const ds = dataset(datasets, 'ads')
  if (!ds) return null
  const sum = ds.rows.find(row => row[0] === 'SUM') || []
  const rows = ds.rows.filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row[0] || ''))
  const latest = rows.at(-1) || []
  const levels = [{ name: '0+', rate: 1, support: 4, ratio: 3 }, { name: '5+', rate: 6, support: 9, ratio: 8 }, { name: '10+', rate: 11, support: 14, ratio: 13 }, { name: '30+', rate: 16, support: 19, ratio: 18 }, { name: '50+', rate: 21, support: 24, ratio: 23 }]
  const requested = levels.slice(0, 3)
  const recent = rows.slice(-10)
  const latestRates = requested.map(level => numeric(latest[level.rate]))
  const sumRates = requested.map(level => numeric(sum[level.rate]))
  return {
    kind: 'ads',
    isSynthetic: true,
    title: '里程碑转化率深度分析',
    titleEn: 'Milestone Conversion Analysis',
    period: `最新日期 ${latest[0]} · 近 10 个有数日`,
    headline: `${latest[0]} 的 0+ / 5+ / 10+ 里程碑转化率分别为 ${latest[1]}、${latest[6]}、${latest[11]}。`,
    summary: [
      { label: '最新结果', text: `0+ 为 ${latest[1]}，5+ 为 ${latest[6]}，10+ 为 ${latest[11]}。` },
      { label: '相对汇总', text: `相对全期汇总，0+ ${latestRates[0] >= sumRates[0] ? '高' : '低'} ${(Math.abs(latestRates[0] - sumRates[0])).toFixed(2)}pp，5+ ${latestRates[1] >= sumRates[1] ? '高' : '低'} ${Math.abs(latestRates[1] - sumRates[1]).toFixed(2)}pp，10+ ${latestRates[2] >= sumRates[2] ? '高' : '低'} ${Math.abs(latestRates[2] - sumRates[2]).toFixed(2)}pp。`, tone: latestRates.filter((value, index) => value >= sumRates[index]).length >= 2 ? 'positive' : 'warning' },
      { label: '加速组观察', text: `最新日加速组转化率为 0+ ${latest[4]}、5+ ${latest[9]}、10+ ${latest[14]}，需与自然转化率分开解释。` },
    ],
    kpis: requested.map((level, index) => ({ label: `${level.name} 里程碑转化率`, labelEn: `${level.name} Conversion`, value: latest[level.rate] || '—', note: `全期汇总 ${sum[level.rate] || '—'}`, tone: latestRates[index] >= sumRates[index] ? 'positive' : 'warning' })),
    chart: { title: '近 10 个有数日转化率趋势', titleEn: '10-Day Conversion Trend', labels: recent.map(row => row[0].slice(5)), series: requested.map((level, index) => ({ name: level.name, color: ['#2563EB','#7C3AED','#059669'][index], values: recent.map(row => numeric(row[level.rate])) })), unit: 'percent' },
    comparison: { title: '最新日自然组 vs 加速组转化', titleEn: 'Organic vs Accelerated', items: levels.map((level, index) => ({ label: level.name, value: numeric(latest[level.rate]), display: `${latest[level.rate]} / 加速组 ${latest[level.support]}`, color: ['#2563EB','#7C3AED','#059669','#EA580C','#E11D48'][index] })) },
    table: { title: '最新日里程碑明细', titleEn: 'Latest Milestone Detail', headers: ['里程碑', '自然转化率', '全期汇总', '贡献率', '分子 / 分母', '加速组转化率', '加速组分子 / 分母'], rows: levels.map(level => [level.name, latest[level.rate], sum[level.rate], latest[level.rate + 1], latest[level.ratio], latest[level.support], latest[level.support + 1]]) },
    diagnosis: [
      `数据已证实：最新日 0+ / 5+ / 10+ 分别为 ${latest[1]}、${latest[6]}、${latest[11]}。`,
      `数据已证实：0+ 相对全期汇总差异为 ${(latestRates[0] - sumRates[0]).toFixed(2)}pp。`,
      '解释限制：不同里程碑的分子、分母不同，不能把层级间差值直接解释为同一漏斗流失。',
    ],
    actions: ['先关注相对全期汇总低于基准的里程碑，再查看对应分子/分母规模。', '自然组与加速组转化率分栏监控，避免将加速效果误当作自然转化。', '若需定位具体商家或广告素材，前往资源中心的广告投流与转化查询入口。'],
    source: `${ds.title} · ${ds.rowCount} 行 × ${ds.columnCount} 列`,
    methodology: '最新日取日期行中的最后一个有数日；全期基准取 SUM 行；pp 为百分点差。',
  }
}

function buildSellerDemo(): AnalysisResult {
  const labels = ['10/01','10/02','10/03','10/04','10/05','10/06','10/07','10/08','10/09','10/10']
  const gmv = [58,63,67,72,76,81,86,92,99,108].map(value => value * 1000)
  const ads = [4.8,5.1,5.4,5.8,6.2,6.6,7.1,7.5,8.0,8.5].map(value => value * 1000)
  return {
    kind: 'seller',
    isSynthetic: true,
    title: 'DEMO-4821 单店经营深度分析',
    titleEn: 'Demo Seller Performance Analysis',
    period: '安全模拟数据 · 2026-10-01 至 2026-10-10',
    headline: '店铺健康分为 86 分；近 10 日 GMV $802,000，增长主要来自达人短视频，但渠道集中度需要控制。',
    summary: [
      { label: '经营表现', text: '近 10 日 GMV 为 $802,000，后 5 日较前 5 日增长 38.7%，趋势向上。', tone: 'positive' },
      { label: '结构风险', text: '达人短视频与直播合计贡献 63%，其中头部达人贡献偏集中，波动风险较高。', tone: 'warning' },
      { label: '效率观察', text: '模拟广告消耗 $65,000，对应归因 GMV $819,000，广告 ROI 为 12.6×。' },
    ],
    kpis: [
      { label: '店铺健康分', labelEn: 'Health Score', value: '86 / 100', note: '良好 · Healthy', tone: 'positive' },
      { label: '近 10 日 GMV', labelEn: '10D GMV', value: '$802,000', note: '后 5 日 vs 前 5 日 +38.7%', tone: 'positive' },
      { label: '订单量', labelEn: 'Orders', value: '3,118', note: '模拟支付子单' },
      { label: '广告 ROI', labelEn: 'Ads ROI', value: '12.6×', note: '$819K ÷ $65K', tone: 'positive' },
    ],
    chart: { title: 'GMV 与广告消耗趋势', titleEn: 'GMV & Ads Spend Trend', labels, series: [{ name: 'GMV', color: '#EA580C', values: gmv }, { name: 'Ads Spend', color: '#E11D48', values: ads }], unit: 'money' },
    comparison: { title: '渠道贡献结构', titleEn: 'Channel Contribution Mix', items: [
      { label: '达人短视频', value: 39, display: '39% · $313K', color: '#EA580C' },
      { label: '达人直播', value: 24, display: '24% · $192K', color: '#F59E0B' },
      { label: '商家自卖', value: 21, display: '21% · $168K', color: '#2563EB' },
      { label: '广告归因', value: 16, display: '16% · $129K', color: '#E11D48' },
    ] },
    table: { title: '热销商品经营明细', titleEn: 'Top Product Performance', headers: ['商品', 'GMV', '订单量', '转化率', '广告消耗', 'GMV 占比'], rows: [
      ['晨露修护精华', '$186,000', '412', '5.4%', '$12,400', '23.2%'],
      ['城市轻行托特包', '$142,000', '356', '4.8%', '$9,800', '17.7%'],
      ['轻量不粘煎锅', '$98,000', '268', '4.1%', '$7,300', '12.2%'],
      ['其他商品', '$376,000', '2,082', '3.6%', '$35,500', '46.9%'],
    ] },
    diagnosis: ['模拟数据结论：后 5 日 GMV 较前 5 日增长 38.7%，趋势改善。', '模拟数据结论：达人渠道贡献 63%，增长同时伴随渠道集中风险。', '边界说明：店铺、商品、订单与广告数值均为安全模拟，不代表任何真实商家。'],
    actions: ['将大众达人合作覆盖从 18 位提升至 28 位，降低对头部达人的依赖。', '周三和周五各增加两场自播，优先复用前三热销商品组合。', '将 15% 长尾广告预算迁移至高转化商品，并以 ROI 12.0×作为止损线。'],
    source: '安全模拟数据 · Synthetic Demo Dataset',
    methodology: '全部指标按演示逻辑生成并保持勾稽；GMV、订单与广告数据仅用于展示分析交互。',
  }
}

const productImage = (emoji: string, from: string, to: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="112" height="112" rx="22" fill="url(#g)"/><circle cx="84" cy="25" r="18" fill="white" opacity=".18"/><circle cx="25" cy="91" r="24" fill="white" opacity=".12"/><text x="56" y="70" text-anchor="middle" font-size="49">${emoji}</text></svg>`)}`

function buildHuntingDemo(): AnalysisResult {
  const products = [
    ['热销品', productImage('🌀','#DBEAFE','#93C5FD'), 'AirFlow 便携手持风扇', 'SEA', '数码家电', '生活电器', 'VND 329,000 · USD 12.9'],
    ['热销品', productImage('🥤','#CCFBF1','#5EEAD4'), 'CloudSip 保温随行杯', 'SEA', '家居生活', '水杯水具', 'VND 259,000 · USD 10.2'],
    ['热销品', productImage('🧴','#FCE7F3','#F9A8D4'), 'GlowDrop 烟酰胺精华', 'SEA', '美妆个护', '面部精华', 'VND 299,000 · USD 11.7'],
    ['热销品', productImage('🍲','#FFEDD5','#FDBA74'), 'Bếp Mini 多功能小煮锅', 'VN', '家居生活', '厨房电器', 'VND 419,000 · USD 16.4'],
    ['热销品', productImage('👜','#F3E8FF','#C4B5FD'), 'CityLoop 轻量斜挎包', 'VN', '服饰箱包', '女士箱包', 'VND 219,000 · USD 8.6'],
    ['机会品', productImage('🧳','#E0E7FF','#A5B4FC'), 'FoldGo 旅行收纳六件套', 'SEA', '家居生活', '收纳整理', 'VND 349,000 · USD 13.7'],
    ['机会品', productImage('🐾','#DCFCE7','#86EFAC'), 'PawCare 宠物除毛手套', 'SEA', '宠物用品', '清洁美容', 'VND 149,000 · USD 5.8'],
    ['机会品', productImage('💡','#FEF3C7','#FCD34D'), 'LumiFlex 充电折叠台灯', 'SEA', '数码家电', '照明设备', 'VND 389,000 · USD 15.3'],
    ['机会品', productImage('🧂','#FEE2E2','#FCA5A5'), 'Kệ Xoay 旋转调味架', 'VN', '家居生活', '厨房收纳', 'VND 279,000 · USD 10.9'],
    ['机会品', productImage('🖌️','#FAE8FF','#E879F9'), 'SoftBlend 化妆刷套装', 'VN', '美妆个护', '美容工具', 'VND 189,000 · USD 7.4'],
    ['劣势品', productImage('🌫️','#E0F2FE','#7DD3FC'), 'AromaMist 智能香薰机', 'SEA', '家居生活', '香薰用品', 'VND 459,000 · USD 18.0'],
    ['劣势品', productImage('📱','#E2E8F0','#94A3B8'), 'MagHold 磁吸手机支架', 'SEA', '数码家电', '手机配件', 'VND 169,000 · USD 6.6'],
    ['劣势品', productImage('💆','#FCE7F3','#FDA4AF'), 'RelaxPro 颈部按摩仪', 'VN', '美妆个护', '按摩器材', 'VND 629,000 · USD 24.7'],
    ['劣势品', productImage('👟','#ECFCCB','#BEF264'), 'MoveLite 轻量训练鞋', 'VN', '运动户外', '运动鞋服', 'VND 519,000 · USD 20.4'],
    ['劣势品', productImage('🧸','#FEF9C3','#FDE047'), 'TinySteps 感统积木套装', 'VN', '母婴玩具', '益智玩具', 'VND 239,000 · USD 9.4'],
  ]
  return {
    kind: 'hunting',
    isSynthetic: true,
    title: 'SEA / VN 周度选品清单',
    titleEn: 'Weekly SEA / VN Product Hunting List',
    period: '安全模拟数据 · 2026 W40',
    headline: '本周模拟清单共 15 款：热销品 5 款、机会品 5 款、劣势品 5 款；家居生活与数码家电是重点观察类目。',
    summary: [
      { label: '热销品', text: 'SEA 3 款、VN 2 款；集中在生活电器、水杯、美妆、厨房电器和箱包。', tone: 'positive' },
      { label: '机会品', text: '旅行收纳、宠物清洁、充电台灯、厨房收纳和美容工具具备补充供给机会。', tone: 'positive' },
      { label: '劣势品', text: '香薰、手机配件、按摩器材、运动鞋服和益智玩具需先验证价格力与内容供给。', tone: 'warning' },
    ],
    kpis: [
      { label: '模拟商品数', labelEn: 'Demo Products', value: '15', note: 'SEA 8 · VN 7' },
      { label: '热销品', labelEn: 'Hot Products', value: '5', note: '建议优先跟进', tone: 'positive' },
      { label: '机会品', labelEn: 'Opportunity', value: '5', note: '适合小批量测试', tone: 'positive' },
      { label: '劣势品', labelEn: 'Disadvantage', value: '5', note: '先验证再扩量', tone: 'warning' },
    ],
    chart: { title: '各类型模拟平均价格', titleEn: 'Average Price by Product Type', labels: ['热销品','机会品','劣势品'], series: [{ name: 'SEA Avg Price', color: '#0891B2', values: [11.6,11.6,12.3] }, { name: 'VN Avg Price', color: '#7C3AED', values: [12.5,9.2,18.2] }], unit: 'money' },
    comparison: { title: '重点一级类目商品数', titleEn: 'Products by Primary Category', items: [
      { label: '家居生活', value: 5, display: '5 款', color: '#0891B2' },
      { label: '数码家电', value: 3, display: '3 款', color: '#2563EB' },
      { label: '美妆个护', value: 3, display: '3 款', color: '#7C3AED' },
      { label: '服饰箱包', value: 1, display: '1 款', color: '#EA580C' },
      { label: '宠物用品', value: 1, display: '1 款', color: '#059669' },
      { label: '运动 / 母婴', value: 2, display: '2 款', color: '#E11D48' },
    ] },
    table: { title: '分类型周度选品明细', titleEn: 'Weekly Product List by Type', headers: ['类型', '商品图', '商品名字', '市场', '一级类目', '二级类目', '价格'], rows: products },
    diagnosis: ['模拟清单结构：热销、机会、劣势三类各 5 款，便于演示分类筛选与横向比较。', '模拟数据观察：家居生活占 5/15，覆盖热销、机会和劣势三类，是本周重点验证方向。', '边界说明：商品、图片、类目和价格均为虚构演示数据，不对应真实商品或真实市场排行。'],
    actions: ['热销品优先进入快速招商池，验证供应稳定性、价格竞争力和内容承接能力。', '机会品采用小批量测试，设置 7 日点击率、支付转化率和退款率观察窗口。', '劣势品先补充竞品价格、内容量和供给深度证据，未达验证门槛前不扩大投入。'],
    source: '安全模拟数据 · Synthetic SEA/VN Product Dataset',
    methodology: '按市场 × 商品类型构造 15 条演示记录；价格同时展示 VND 与近似 USD，仅用于交互演示。',
  }
}

function buildWeeklyDemo(): AnalysisResult {
  const weeks = ['W35','W36','W37','W38','W39','W40']
  const gmv = [2180000,2310000,2470000,2560000,2620000,2840000]
  const channelRows = [
    ['Creator','$1.31M','46.1%','+12.8%','Top Creator','$486K'],
    ['Self-sell','$795K','28.0%','+6.5%','Product Card','$462K'],
    ['Shop Campaign','$426K','15.0%','+4.2%','Campaign','$218K'],
    ['Paid Ads','$309K','10.9%','+9.1%','Ads','$309K'],
  ]
  return {
    kind: 'weekly',
    isSynthetic: true,
    title: '跨境电商团队周度经营报告',
    titleEn: 'Cross-border E-commerce Weekly Report',
    period: '安全模拟数据 · 2026 W40（09/28–10/04）',
    headline: '本周团队 GMV $2.84M，周环比 +8.4%；活跃商家增至 164 家，预算达成 82.6%，增长主要由 Creator 与数码家电驱动。',
    summary: [
      { label: '本周表现', text: 'GMV 较上周增加 $220K，连续六周增长；Creator 贡献 46.1%，是最大成交渠道。', tone: 'positive' },
      { label: '商家结构', text: '活跃商家 164 家，其中 T4+ 商家 38 家；T4+ 贡献 61.3% GMV，头部集中度仍需关注。' },
      { label: '预算进度', text: '周度预算消耗 $186K，达成率 82.6%；Creator Incentive 高于计划进度，Growth Voucher 低于计划进度。', tone: 'warning' },
    ],
    kpis: [
      { label: '本周 GMV', labelEn: 'Weekly GMV', value: '$2.84M', note: 'WoW +8.4%', tone: 'positive' },
      { label: '活跃商家', labelEn: 'Active Sellers', value: '164', note: 'WoW +11 · T4+ 38 家', tone: 'positive' },
      { label: '周度预算消耗', labelEn: 'Weekly Spend', value: '$186K', note: '计划 $225K' },
      { label: '预算达成率', labelEn: 'Budget Achievement', value: '82.6%', note: '时间进度 100%', tone: 'warning' },
    ],
    chart: { title: '近六周团队 GMV 趋势', titleEn: '6-Week Team GMV Trend', labels: weeks, series: [{ name: 'Team GMV', color: '#4F46E5', values: gmv }], unit: 'money' },
    comparison: { title: '本周预算分项达成', titleEn: 'Weekly Budget Achievement', items: [
      { label: 'Merchant Incentive', value: 88, display: '88% · $66K', color: '#4F46E5' },
      { label: 'Creator Incentive', value: 96, display: '96% · $58K', color: '#7C3AED' },
      { label: 'Paid Ads', value: 79, display: '79% · $38K', color: '#2563EB' },
      { label: 'Growth Voucher', value: 67, display: '67% · $24K', color: '#F59E0B' },
    ] },
    table: { title: '本周经营模块明细', titleEn: 'Weekly Workstream Detail', headers: ['经营模块', 'GMV', 'GMV 占比', '周环比', '主要贡献项', '贡献金额'], rows: channelRows },
    diagnosis: [
      '模拟数据结论：团队 GMV 连续六周增长，本周较上周增加 $220K，Creator 是最大成交渠道。',
      '模拟数据结论：T4+ 商家仅占活跃商家 23.2%，但贡献 61.3% GMV，需控制头部商家波动风险。',
      '边界说明：GMV、商家层级、预算与渠道数据均为安全模拟，不代表真实团队经营结果。',
    ],
    actions: [
      '对 Creator 增量下钻至 Top / Mass / High Creator，识别可复制的内容与商品组合。',
      '为 T1–T3 商家建立升级清单，优先推动 12 家接近 T4 门槛的商家提升动销。',
      '下周将 Growth Voucher 预算达成拉回 80% 以上，同时对 Creator Incentive 设置效率护栏，避免只追消耗进度。',
    ],
    source: '安全模拟数据 · Synthetic Team Weekly Dataset',
    methodology: '按周汇总 GMV、活跃商家、商家层级与四类预算；周环比以上周同口径结果为基准，所有数据仅用于交互演示。',
  }
}

function buildCategoryDemo(): AnalysisResult {
  const rows = [
    ['家居生活',684000,12.6,24.1,38,426,286],['美妆个护',592000,8.4,20.8,31,388,312],['服饰箱包',476000,-2.8,16.8,27,521,248],['数码家电',418000,15.2,14.7,19,206,428],['母婴玩具',326000,3.6,11.5,22,314,196],['食品饮料',218000,-6.4,7.7,16,184,148],['运动户外',126000,9.8,4.4,11,136,338],
  ] as Array<[string, number, number, number, number, number, number]>
  return {
    kind: 'category',
    isSynthetic: true,
    title: '团队类目经营深度分析',
    titleEn: 'Team Category Performance Analysis',
    period: '安全模拟数据 · 2026 W40',
    headline: '团队本周 GMV $2.84M，周环比 +8.4%；家居生活规模第一，数码家电增速最快。',
    summary: [
      { label: '规模贡献', text: '家居生活 GMV $684K、占比 24.1%，是第一大类目。', tone: 'positive' },
      { label: '增长引擎', text: '数码家电周环比 +15.2%，家居生活 +12.6%，两者贡献主要增量。', tone: 'positive' },
      { label: '风险类目', text: '食品饮料 -6.4%、服饰箱包 -2.8%，需要检查主力商品与商家动销。', tone: 'warning' },
    ],
    kpis: [
      { label: '团队 GMV', labelEn: 'Team GMV', value: '$2.84M', note: '周环比 +8.4%', tone: 'positive' },
      { label: '主营商家', labelEn: 'Core Sellers', value: '164', note: '覆盖 7 个一级类目' },
      { label: '在售商品', labelEn: 'Active Products', value: '2,175', note: '周环比 +3.7%', tone: 'positive' },
      { label: '整体客单价', labelEn: 'Overall AOV', value: '$274', note: '周环比 +2.1%', tone: 'positive' },
    ],
    chart: { title: '近四周团队 GMV 趋势', titleEn: '4-Week Team GMV Trend', labels: ['W37','W38','W39','W40'], series: [{ name: 'Team GMV', color: '#7C3AED', values: [2520000,2610000,2620000,2840000] }], unit: 'money' },
    comparison: { title: '本周类目 GMV 对比', titleEn: 'Category GMV Comparison', items: rows.map((row, index) => ({ label: row[0], value: row[1], display: `${money(row[1])} · ${row[3]}%`, color: ['#7C3AED','#9333EA','#2563EB','#0891B2','#059669','#EA580C','#E11D48'][index] })) },
    table: { title: '一级类目经营明细', titleEn: 'Category Performance Detail', headers: ['一级类目', 'GMV', '周环比', 'GMV 占比', '主营商家', '商品数', '客单价'], rows: rows.map(row => [row[0], money(row[1]), `${row[2] > 0 ? '+' : ''}${row[2]}%`, `${row[3]}%`, String(row[4]), String(row[5]), money(row[6])]) },
    diagnosis: ['模拟数据结论：家居生活与美妆个护合计贡献 44.9% GMV，是规模基本盘。', '模拟数据结论：数码家电增速最高但商家数仅 19，供给扩张存在机会。', '边界说明：类目 GMV、商家数、商品数与 AOV 均为安全模拟，不代表真实业务表现。'],
    actions: ['把数码家电列为增长类目，补充 5–8 家高潜商家并监控新增供给转化。', '对食品饮料和服饰箱包下钻 Top 商家与 Top 商品，优先定位绝对 GMV 缺口。', '每周同时监控 GMV、商家数、商品数和 AOV，避免用单一增速判断类目健康度。'],
    source: '安全模拟数据 · Synthetic Demo Dataset',
    methodology: '类目 GMV 合计为 $2.84M；占比、商家数、商品数与 AOV 按模拟演示口径生成。',
  }
}

export type DemoScenarioId = 'budget' | 'gmv' | 'hunting' | 'weekly' | 'seller' | 'category'

export const buildScenarioAnalysis = (scenarioId: DemoScenarioId, datasets: AssetDataset[]): AnalysisResult | null => {
  if (scenarioId === 'budget') return buildBudget(datasets)
  if (scenarioId === 'gmv') return buildChannel(datasets)
  if (scenarioId === 'hunting') return buildHuntingDemo()
  if (scenarioId === 'weekly') return buildWeeklyDemo()
  if (scenarioId === 'seller') return buildSellerDemo()
  return buildCategoryDemo()
}

export const buildAnalysisResult = (query: string, datasets: AssetDataset[]): AnalysisResult | null => {
  if (/里程碑|(?:0|5|10|30|50)\s*\+|广告转化/i.test(query)) return buildAds(datasets)
  if (/预算|补贴|roi|spend|campaign|assortment/i.test(query)) return buildBudget(datasets)
  if (/gmv|成交额|渠道|dagmv|okr|周报|整体经营/i.test(query)) return buildChannel(datasets)
  return null
}
