import dataAsset from '../knowledge/public-demo-data.json'

export type AssetDataset = { id: string; title: string; coverage: string[]; rowCount: number; columnCount: number; rows: string[][] }
export type AssetResolution = { isDataQuestion: boolean; datasets: AssetDataset[]; missing?: { reason: string; resource: string } }

const DATASETS = dataAsset.datasets as AssetDataset[]
const byId = (id: string) => DATASETS.find(item => item.id === id)
const has = (q: string, re: RegExp) => re.test(q)

const missingRules: Array<[RegExp, string, string]> = [
  [/(单店|具体店铺|某(?:个|家)?店铺|这家店|该店(?:铺)?|店铺\s*(?:(?:id|编号|代码|code)\s*[:：#-]?\s*)?[a-z0-9][a-z0-9_-]{2,}|(?:查询|查看|分析|看)\s*[a-z0-9][a-z0-9_-]{2,}\s*(?:这家店|店铺|经营|表现)|seller[_\s-]?id|shop[_\s-]?(id|code))/i, '当前资产不包含可按店铺 ID 查询的单店经营明细', '资源中心 → 取数链接 → 单店经营表现查询'],
  [/(选品|热销(?:商品|品)|机会(?:商品|品)|劣势(?:商品|品)|商品(?:图片|价格|榜单|排行|明细)|top\s*\d*\s*(?:商品|product)|product\s*(list|pool|top))/i, '当前资产不包含商品级明细、商品图片或价格字段', '资源中心 → 取数链接 → 机会商品池查询 / 类目热销商品查询'],
  [/(aov|客单价|商品数(?:量)?|product\s*count)/i, '当前资产不包含订单级 AOV 或完整商品数量字段', '资源中心 → 取数链接 → 团队类目经营查询'],
  [/(曝光(?:量)?|访问(?:量|人数)?|点击(?:量|率)?|ctr|加购(?:量|人数)?|退款(?:率|金额|订单)?|买家数|流量漏斗|转化漏斗)/i, '当前资产不包含曝光、访问、点击、加购、退款或买家级漏斗数据', '资源中心 → 取数链接 → 广告投流与转化查询'],
  [/(利润|利润率|毛利|净利|pnl|结算收入|财务成本)/i, '公开演示数据集不包含完整收入、结算成本与利润字段', '资源中心 → 仪表盘 → 损益追踪模拟看板'],
  [/(达人账号|creator[_\s-]*(?:id|handle|account)|达人名单|达人明细|某(?:个|位)?达人|这个达人|该达人)/i, '当前资产仅包含达人分层汇总，不包含达人账号级明细', '资源中心 → 取数链接 → 达人分层贡献查询'],
]

export const resolveAssetQuery = (query: string): AssetResolution => {
  const q = query.trim()
  const definitionOrMethod = /(是什么|什么意思|定义|怎么计算|如何计算|通常如何|怎么定位|分析方法|排查思路)/i.test(q)
  const dataSignal = /(多少|哪天|最高|最低|最新|趋势|明细|表现|占比|达成|累计|日均|环比|对比|数据|查询|查看|统计|汇总|top|排名|预算|补贴|gmv|dagmv|okr|里程碑|(?:0|5|10|30|50)\s*\+|商家数|seller cnt)/i.test(q)
  if (definitionOrMethod && !/(查询|查看|多少|数据)/i.test(q)) return { isDataQuestion: false, datasets: [] }
  if (!dataSignal) return { isDataQuestion: false, datasets: [] }
  for (const [rule, reason, resource] of missingRules) if (rule.test(q)) return { isDataQuestion: true, datasets: [], missing: { reason, resource } }

  const ids = new Set<string>()
  if (has(q, /(预算|补贴|spend|merchant spend|store gmv|campaign|assortment|voucher|new listing|reinvestment|补贴率|roi)/i)) ids.add('budget')
  if (has(q, /(里程碑|(?:0|5|10|30|50)\s*\+|加速组转化率|贡献率|分子|分母|广告转化)/i)) ids.add('ads')
  if (has(q, /(分渠道|渠道|overall|creator|达人分层|top creator|mass creator|self-sell|self-live|affiliate|dagmv|okr|成交额|gmv)/i)) ids.add('channel')
  if (has(q, /(商家层级|seller cnt|商家数|uplift|withdrawal|类目gmv|category gmv|creator side|merchant side|预算单)/i)) ids.add('merchant')
  if (has(q, /(周报|周度复盘|整体经营)/i)) { ids.add('channel'); ids.add('budget'); ids.add('merchant') }

  const datasets = [...ids].map(id => byId(id)).filter(Boolean) as AssetDataset[]
  if (!datasets.length) return { isDataQuestion: true, datasets: [], missing: { reason: '公开演示数据集未覆盖你询问的指标或维度', resource: '资源中心 → 取数链接，按业务对象选择本地模拟查询' } }
  return { isDataQuestion: true, datasets }
}

const terms = (q: string) => (q.toLowerCase().match(/[a-z][a-z0-9_-]{1,}|[\u4e00-\u9fff]{2,}/g) ?? []).filter(x => x.length > 1)

const selectRows = (dataset: AssetDataset, query: string) => {
  if (dataset.id !== 'merchant') return dataset.rows
  const qTerms = terms(query)
  const picked = new Set<number>()
  for (let i = 0; i < Math.min(8, dataset.rows.length); i += 1) picked.add(i)
  dataset.rows.forEach((row, index) => {
    const line = row.join(' ').toLowerCase()
    if (qTerms.some(term => line.includes(term))) {
      for (let j = Math.max(0, index - 2); j <= Math.min(dataset.rows.length - 1, index + 2); j += 1) picked.add(j)
    }
  })
  if (picked.size <= 8) for (let i = 35; i < Math.min(92, dataset.rows.length); i += 1) picked.add(i)
  return [...picked].sort((a, b) => a - b).slice(0, 70).map(i => dataset.rows[i])
}

export const buildAssetContext = (query: string, datasets: AssetDataset[]) => datasets.map(dataset => {
  const rows = selectRows(dataset, query)
  const body = rows.map((row, index) => `${index + 1}\t${row.map(cell => String(cell ?? '').replace(/\s+/g, ' ').trim()).join('\t')}`).join('\n')
  return `【${dataset.title}｜${dataset.rowCount} 行 × ${dataset.columnCount} 列】\n覆盖字段：${dataset.coverage.join('、')}\n${body}`
}).join('\n\n')

const amount = (value: string) => Number(String(value || '').replace(/[$,%]/g, '').replace(/,/g, '')) || 0
const money = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`

export const buildAssetFallback = (query: string, datasets: AssetDataset[]) => {
  const parts: string[] = []
  for (const ds of datasets) {
    if (ds.id === 'budget') {
      const rows = ds.rows.slice(1).filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row[0] || ''))
      const latest = rows[0]
      const totalSpend = rows.reduce((sum, row) => sum + amount(row[9]), 0)
      const totalGmv = rows.reduce((sum, row) => sum + amount(row[10]), 0)
      const peak = rows.reduce((best, row) => amount(row[9]) > amount(best?.[9] || '') ? row : best, rows[0])
      parts.push(`预算数据：覆盖 ${rows.at(-1)?.[0]} 至 ${latest?.[0]}；累计 Merchant Spend ${money(totalSpend)}，累计 Store GMV ${money(totalGmv)}，按两者计算 ROI 为 ${(totalGmv / Math.max(totalSpend, 1)).toFixed(2)}；单日消耗峰值为 ${peak?.[0]} 的 ${peak?.[9]}。`)
    }
    if (ds.id === 'channel') {
      const header = ds.rows[1] || []
      const overall = ds.rows.find(row => row[0] === 'Overall') || []
      const latestCol = header.length - 1
      const candidates = ds.rows.slice(2).filter(row => row[0] && !/^\s*--/.test(row[0]))
      const top = candidates.reduce((best, row) => amount(row[latestCol]) > amount(best?.[latestCol] || '') ? row : best, candidates[0])
      parts.push(`渠道数据：Overall 的 Q4 OKR 达成 ${overall[1]}、Q4 DAGMV ${overall[7]}，最新日 ${header[latestCol]} 为 ${overall[latestCol]}；最新日规模最高的展示层级为 ${top?.[0]}（${top?.[latestCol]}）。`)
    }
    if (ds.id === 'ads') {
      const sum = ds.rows.find(row => row[0] === 'SUM') || []
      const dated = ds.rows.filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row[0] || ''))
      const latest = dated.at(-1) || []
      parts.push(`广告转化数据：汇总 0+ / 5+ / 10+ / 30+ / 50+ 里程碑转化率分别为 ${sum[1]}、${sum[6]}、${sum[11]}、${sum[16]}、${sum[21]}；最新日期 ${latest[0]} 的对应值为 ${latest[1]}、${latest[6]}、${latest[11]}、${latest[16]}、${latest[21]}。`)
    }
    if (ds.id === 'merchant') {
      const selected = selectRows(ds, query).filter(row => row.some(Boolean)).slice(0, 8)
      parts.push(`商家侧数据：已命中 ${selected.length} 条相关结构记录，覆盖 OKR、DAGMV、商家层级、类目、渠道和补贴预算；需要结合问题指定的时间或分组读取对应行。`)
    }
  }
  return `结论：以下结果只使用 DataPilot 本地模拟数据计算。\n\n${parts.join('\n\n')}\n\n数据来源：${dataAsset.name} · ${dataAsset.version}（所有名称、标识符与数值均为虚构）`
}

export const buildCoverageGapAnswer = (reason: string, resource: string) => `公开演示数据集不包含此数据。\n\n缺口说明：${reason}。\n\n演示入口：${resource}。进入页面上方“资源中心”，切换到“取数链接”即可查看本地模拟预览。DataPilot 不会补造未定义的具体业务数值。`

export const assetMeta = dataAsset
