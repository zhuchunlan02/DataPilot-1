import resourceCatalog from '../assets/downloads/Synthetic_Team_Resource_Catalog.xlsx?url'
import weeklyReview from '../assets/downloads/Synthetic_Weekly_Business_Review.xlsx?url'
import budgetTracker from '../assets/downloads/Synthetic_Merchant_Budget_Tracker.xlsx?url'
import huntingList from '../assets/downloads/Synthetic_Hunting_List.csv?url'
import goldenSet from '../assets/downloads/Synthetic_Agent_Golden_Set.jsonl?url'

window.DATAPILOT_DATA = {
  scenarios: [
    {id:'budget',icon:'BU',title:'预算消耗进度监控',en:'Budget Spend Tracking',desc:'季度 / 月度 / 分天预算、ROI 与 AOV',query:'查看本季度和本月不同类型预算的消耗进度、ROI、AOV，并给出分天明细',type:'budget'},
    {id:'gmv',icon:'GM',title:'成交额分渠道追踪',en:'GMV Tracking by Channel',desc:'整体、联盟、自卖、达人及广告渠道',query:'查询整体、联盟、自卖、不同类型达人和广告侧的成交额明细与 OKR 达成度',type:'gmv'},
    {id:'hunting',icon:'PR',title:'生成周度选品清单',en:'Weekly Product Hunting List',desc:'热销品、机会品与劣势品',query:'生成本周东南亚与越南市场的热销品、机会品和劣势品选品清单',type:'hunting'},
    {id:'weekly',icon:'WR',title:'生成团队周报',en:'Weekly Report Generation',desc:'成交额、商家层级与预算达成',query:'生成本周团队周报，包含成交额、商家数量层级和预算消耗达成情况',type:'weekly'},
    {id:'seller',icon:'SE',title:'查询单店经营情况',en:'Seller Performance Tracking',desc:'经营评分、成交额、商品与广告',query:'查询店铺 DEMO-4821 的经营评分、成交额、热销商品和广告投流金额',type:'seller'},
    {id:'category',icon:'CA',title:'查询类目表现',en:'Category Performance Tracking',desc:'成交额、环比、占比、商家与商品',query:'查询团队本周各类目的成交额、环比、占比、商家数、商品数和客单价',type:'category'}
  ],
  dashboards: [
    {id:'overall',group:'整体追踪',groupEn:'Overall',name:'整体经营日报',en:'Overall Daily Report',desc:'核心目标、日均成交额、渠道、供给与商品排行的一站式经营概览。',tone:'amber'},
    {id:'sellerBoard',group:'商家侧',groupEn:'Seller',name:'商家经营追踪',en:'Seller Performance Dashboard',desc:'商家经营评分、成交额趋势、热销商品和广告效率。',tone:'rose'},
    {id:'creatorBoard',group:'达人侧',groupEn:'Creator',name:'分渠道每日成交额追踪',en:'Daily GMV Tracking by Channel',desc:'整体、达人、自卖与广告渠道的目标达成和每日明细。',tone:'violet'},
    {id:'milestone',group:'广告侧',groupEn:'Ads',name:'里程碑转化每日追踪',en:'Milestone Conversion Tracking',desc:'投流消耗、转化率与不同订单里程碑的每日变化。',tone:'green'},
    {id:'budgetBoard',group:'策略侧',groupEn:'Strategy',name:'预算补贴每日追踪',en:'Budget Daily Tracking',desc:'季度、月度预算进度与分天分类型消耗明细。',tone:'blue'},
    {id:'pnl',group:'策略侧',groupEn:'Strategy',name:'损益追踪',en:'PNL Tracking',desc:'收入、成本、结算成交额与利润率的结构化分析。',tone:'cyan'}
  ],
  resources: {
    queries:[
      {tag:'成交额',name:'分渠道日度成交额查询',en:'Daily GMV by Channel Query',owner:'Demo Data Team',refresh:'T-2',format:'可视化查询',status:'稳定',use:'追踪整体、联盟、自卖、达人与广告渠道的日度成交额和 OKR',action:'打开查询'},
      {tag:'商家',name:'单店经营表现查询',en:'Seller Performance Query',owner:'Demo Seller Team',refresh:'按需',format:'店铺 ID',status:'稳定',use:'输入模拟店铺 ID，查看经营评分、商品、内容和投流表现',action:'打开查询'},
      {tag:'商品',name:'类目热销商品查询',en:'Category Top Products Query',owner:'Demo Product Team',refresh:'近30日',format:'三级类目',status:'稳定',use:'按类目提取成交额 Top 商品、价格带与供给信息',action:'打开查询'},
      {tag:'预算',name:'预算单消耗明细查询',en:'Budget Bill Spend Query',owner:'Demo Strategy Team',refresh:'每日',format:'预算单 ID',status:'稳定',use:'查询预算消耗、带动成交额、订单量与投入产出比',action:'打开查询'},
      {tag:'广告',name:'广告投流与转化查询',en:'Ads Spend & Conversion Query',owner:'Demo Ads Team',refresh:'T-1',format:'商家 / 日期',status:'稳定',use:'拆解广告消耗、归因成交额、转化率与素材效率',action:'打开查询'},
      {tag:'达人',name:'达人分层贡献查询',en:'Creator Tier Contribution Query',owner:'Demo Creator Team',refresh:'T-2',format:'日期区间',status:'稳定',use:'查询头部、大众与高价值达人分层贡献及每日趋势',action:'打开查询'},
      {tag:'类目',name:'团队类目经营查询',en:'Team Category Performance Query',owner:'Demo Category Team',refresh:'每周',format:'一级类目',status:'稳定',use:'查看成交额、环比、份额、主营商家数、商品数和客单价',action:'打开查询'},
      {tag:'供给',name:'商家层级与跃迁查询',en:'Seller Tier & Uplift Query',owner:'Demo Seller Team',refresh:'每周',format:'团队 / 层级',status:'Beta',use:'定位商家层级变化、跃迁路径与降级风险',action:'打开查询'},
      {tag:'选品',name:'机会商品池查询',en:'Opportunity Product Pool Query',owner:'Demo Product Team',refresh:'每周',format:'市场 / 类目',status:'Beta',use:'筛选热销品、机会品与供给劣势品，支持导出清单',action:'打开查询'}
    ],
    files:[
      {tag:'周报',name:'团队周度经营复盘模板',en:'Weekly Business Review Template',owner:'Local Samples',refresh:'每周',format:'XLSX · 8 sheets',status:'在用',use:'统一成交额、商家层级、预算和行动项的周报结构',action:'查看文件'},
      {tag:'口径',name:'核心指标口径字典',en:'Core Metric Dictionary',owner:'Demo Data Team',refresh:'每月',format:'在线文档',status:'在用',use:'沉淀 GMV、DAGMV、OKR、AOV、ROI 等核心指标定义',action:'查看文件'},
      {tag:'流程',name:'常用分析标准流程库',en:'Analysis SOP Library',owner:'Local Samples',refresh:'每季度',format:'SOP 集合',status:'在用',use:'覆盖取数、校验、诊断、复盘与发布的标准步骤',action:'查看文件'},
      {tag:'选品',name:'周度选品清单模板',en:'Weekly Hunting List Template',owner:'Demo Product Team',refresh:'每周',format:'XLSX · 4 sheets',status:'在用',use:'沉淀热销、机会、劣势商品及价格、类目和图片字段',action:'查看文件'},
      {tag:'规划',name:'季度目标与预算规划表',en:'Quarter OKR & Budget Plan',owner:'Demo Strategy Team',refresh:'每季度',format:'XLSX · 6 sheets',status:'在用',use:'统一季度目标、月度拆解、预算窗口和责任人',action:'查看文件'},
      {tag:'复盘',name:'活动效果复盘框架',en:'Campaign Review Framework',owner:'活动协作方',refresh:'按活动',format:'Slides · 18 pages',status:'模板',use:'对比目标、投入、增量、效率、问题和后续动作',action:'查看文件'},
      {tag:'评测',name:'DataPilot 评测样例集',en:'DataPilot Golden Set',owner:'项目维护人',refresh:'按版本',format:'JSONL · 120 cases',status:'v1.4',use:'测试意图识别、资源召回、口径引用和输出完整性',action:'查看文件'},
      {tag:'权限',name:'数据资源使用说明',en:'Demo Data Usage Guide',owner:'Demo Data Team',refresh:'每半年',format:'在线文档',status:'在用',use:'说明资源分级、申请路径、审批材料和使用边界',action:'查看文件'}
    ],
    tools:[
      {tag:'查询',name:'可视化查询构建器',en:'Visual Query Builder',owner:'数据工具',refresh:'实时',format:'Web Tool',status:'在线',use:'用维度、指标和筛选器拼装安全查询，无需手写 SQL',action:'打开工具'},
      {tag:'校验',name:'指标口径检查器',en:'Metric Caliber Checker',owner:'数据工具',refresh:'实时',format:'Web Tool',status:'在线',use:'对比两个指标定义、过滤条件、时间窗与聚合方式',action:'打开工具'},
      {tag:'表格',name:'宽表预览与导出工具',en:'Wide Table Previewer',owner:'效率工具',refresh:'实时',format:'Web Tool',status:'在线',use:'预览大宽表、固定关键列、筛选并导出模拟样例',action:'打开工具'},
      {tag:'SQL',name:'查询性能诊断器',en:'Query Performance Inspector',owner:'数据工具',refresh:'实时',format:'Web Tool',status:'Beta',use:'识别全表扫描、重复计算与高基数字段等性能风险',action:'打开工具'},
      {tag:'图表',name:'经营图表生成器',en:'Business Chart Composer',owner:'效率工具',refresh:'实时',format:'Web Tool',status:'在线',use:'将表格快速转换为趋势、对比、占比与双轴图',action:'打开工具'},
      {tag:'评测',name:'智能助手答案评测台',en:'Agent Evaluation Console',owner:'项目工具',refresh:'按版本',format:'Web Console',status:'v1.4',use:'批量运行测试集并评估正确性、完整性和引用质量',action:'打开工具'},
      {tag:'模拟',name:'演示数据生成器',en:'Demo Data Generator',owner:'项目工具',refresh:'实时',format:'Web Tool',status:'在线',use:'替换 ID、金额、名称和链接，生成完全虚构的演示数据集',action:'打开工具'}
    ]
  },
  downloads:[
    {type:'XLSX',name:'团队资源目录',en:'Team Resource Catalog',desc:'看板索引、取数入口、指标字典与分析流程。',meta:'4 个工作表',file:resourceCatalog},
    {type:'XLSX',name:'团队周度经营复盘',en:'Weekly Business Review',desc:'成交额、渠道、商家层级与预算复盘样例。',meta:'2 个工作表',file:weeklyReview},
    {type:'XLSX',name:'商家预算追踪表',en:'Merchant Budget Tracker',desc:'预算类型、消耗进度、投入产出比与状态。',meta:'1 个工作表',file:budgetTracker},
    {type:'CSV',name:'周度选品清单',en:'Weekly Hunting List',desc:'40 条商品级模拟选品数据。',meta:'40 行',file:huntingList},
    {type:'JSONL',name:'DataPilot 评测样例集',en:'DataPilot Golden Set',desc:'意图识别、资源召回与输出完整性测试。',meta:'5 个样例',file:goldenSet}
  ]
};
