import { Document, Page, View, Text, StyleSheet, Font, Svg, Path } from '@react-pdf/renderer';
import type { WingSummary } from '@/api/wings';
import type { TodoItem } from '@/api/todos';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ReportNetWorth {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  breakdown: { equityValue: number; realEstateValue: number; otherValue: number };
}

export interface ReportSnapshot {
  snapshotDate: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export interface ReportAsset {
  id: string;
  name: string;
  assetClass: string;
  currentValue: number | null;
  adjustedValue: number | null;
  estimatedValue: number | null;
  mortgageBalance: number | null;
  ticker: string | null;
  sector: string | null;
  propertyAddress: string | null;
  isPretax: boolean;
}

export interface ReportLiability {
  id: string;
  name: string;
  liabilityType: string | null;
  balance: number;
  interestRate: number | null;
  monthlyPayment: number | null;
}

export interface ReportGoal {
  primaryGoal: string | null;
  primaryGoalLabel: string | null;
  targetMonthlyIncome: number | null;
  targetDate: string | null;
  riskTolerance: string | null;
  targetEquityPct: number | null;
  targetRealEstatePct: number | null;
  targetCashPct: number | null;
  targetOtherPct: number | null;
}

export interface FinancialReportPDFProps {
  userName: string;
  reportDate: string;
  nw: ReportNetWorth | null;
  snapshots: ReportSnapshot[];
  assets: ReportAsset[];
  liabilities: ReportLiability[];
  goal: ReportGoal | null;
  wings: WingSummary[];
  todos: TodoItem[];
}

// ─── Disable hyphenation ───────────────────────────────────────────────────────

Font.registerHyphenationCallback(word => [word]);

// ─── Color palette ─────────────────────────────────────────────────────────────

const C = {
  brand:   '#2563eb',
  black:   '#0f172a',
  g900:    '#111827',
  g800:    '#1f2937',
  g700:    '#374151',
  g600:    '#4b5563',
  g500:    '#6b7280',
  g400:    '#9ca3af',
  g300:    '#d1d5db',
  g200:    '#e5e7eb',
  g100:    '#f3f4f6',
  g50:     '#f9fafb',
  green:   '#059669',
  red:     '#dc2626',
  amber:   '#d97706',
  blue:    '#2563eb',
  violet:  '#7c3aed',
  emerald: '#059669',
  rose:    '#e11d48',
  slate:   '#0d9488',
};

const WING_COLOR: Record<string, string> = {
  emerald: C.emerald,
  blue:    C.blue,
  rose:    C.rose,
  amber:   C.amber,
  violet:  C.violet,
  slate:   C.slate,
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.g900,
    backgroundColor: '#ffffff',
    paddingTop: 44,
    paddingBottom: 52,
    paddingHorizontal: 52,
  },

  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: C.black },
  brandRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  brandDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand, marginRight: 5 },
  brandName:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.black },
  reportTitle:{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.black, marginBottom: 4 },
  reportSub:  { fontSize: 9, color: C.g500 },
  nwLabel:    { fontSize: 8, color: C.g400, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'right', marginBottom: 3 },
  nwValue:    { fontSize: 28, fontFamily: 'Helvetica-Bold', color: C.black, textAlign: 'right' },
  nwChange:   { fontSize: 8, textAlign: 'right', marginTop: 2 },

  sec:        { marginTop: 18 },
  secHeading: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.g400,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 7,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.g200,
  },

  cardRow:        { flexDirection: 'row', marginBottom: 7 },
  card:           { flex: 1, borderWidth: 0.5, borderColor: C.g200, borderRadius: 6, padding: 9, marginRight: 7 },
  cardLast:       { flex: 1, borderWidth: 0.5, borderColor: C.g200, borderRadius: 6, padding: 9 },
  cardLabel:      { fontSize: 7.5, color: C.g400, marginBottom: 3 },
  cardValue:      { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.black },
  cardSmall:      { flex: 1, backgroundColor: C.g50, borderRadius: 6, padding: 7, marginRight: 7 },
  cardSmallLast:  { flex: 1, backgroundColor: C.g50, borderRadius: 6, padding: 7 },
  cardSmallLabel: { fontSize: 7, color: C.g400, marginBottom: 2 },
  cardSmallValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.g700 },
  cardSmallSub:   { fontSize: 7, color: C.g400, marginTop: 1 },

  indicatorCard:     { flex: 1, backgroundColor: C.g50, borderRadius: 6, padding: 8, marginRight: 7 },
  indicatorCardLast: { flex: 1, backgroundColor: C.g50, borderRadius: 6, padding: 8 },
  indicatorLabel:    { fontSize: 6.5, color: C.g400, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  indicatorValue:    { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.g900, marginBottom: 2 },
  indicatorNote:     { fontSize: 7, fontFamily: 'Helvetica-Bold' },

  tableHeader:  { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.g300, paddingBottom: 3, marginBottom: 2 },
  tableRow:     { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: C.g100, paddingVertical: 3 },
  tableRowLast: { flexDirection: 'row', paddingTop: 4, borderTopWidth: 0.5, borderTopColor: C.g200, marginTop: 2 },
  thText:  { fontSize: 7, color: C.g400, fontFamily: 'Helvetica-Bold' },
  tdText:  { fontSize: 8, color: C.g700 },
  tdBold:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.g900 },
  tdRed:   { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.red },
  tdGray:  { fontSize: 8, color: C.g500 },
  tdSmall: { fontSize: 7, color: C.g400 },

  assetGroupLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.g700 },
  assetGroupRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, marginTop: 7 },

  wingRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  wingDot:      { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  wingNameCol:  { width: 108 },
  wingName:     { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.g800 },
  wingLevelLbl: { fontSize: 7, color: C.g400 },
  wingBarBg:    { flex: 1, height: 5, backgroundColor: C.g100, borderRadius: 3, marginHorizontal: 10 },
  wingBarFill:  { height: 5, borderRadius: 3 },
  wingLevelNum: { width: 44, fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.g600, textAlign: 'right' },

  goalGrid:      { flexDirection: 'row', flexWrap: 'wrap' },
  goalCard:      { width: '47%', backgroundColor: C.g50, borderRadius: 6, padding: 8, marginRight: '3%', marginBottom: 7 },
  goalCardLabel: { fontSize: 7, color: C.g400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  goalCardValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.g800 },
  fireBanner:    { backgroundColor: '#fffbeb', borderRadius: 6, padding: 9, marginTop: 6 },
  fireBannerText:{ fontSize: 8, color: '#92400e' },

  todoRow:       { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: C.g100, paddingVertical: 4 },
  todoNum:       { fontSize: 8, color: C.g300, width: 16, paddingTop: 1 },
  todoBody:      { flex: 1, flexDirection: 'column' },
  todoTitle:     { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.g900, marginBottom: 2 },
  todoDesc:      { fontSize: 7.5, color: C.g500 },
  todoBadgeWrap: { width: 52, alignItems: 'flex-end', paddingTop: 1 },
  todoBadgeText: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8 },

  progressRow:   { marginBottom: 8 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  progressName:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.g800 },
  progressPct:   { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.g600 },
  progressBg:    { height: 7, backgroundColor: C.g100, borderRadius: 4 },
  progressFill:  { height: 7, borderRadius: 4 },
  progressSub:   { fontSize: 7, color: C.g400, marginTop: 2 },

  twoCol:     { flexDirection: 'row', gap: 16 },
  colLeft:    { flex: 1 },
  colRight:   { flex: 1 },

  kpiRow:     { flexDirection: 'row', marginBottom: 7 },
  kpi:        { flex: 1, backgroundColor: C.g50, borderRadius: 6, padding: 8, marginRight: 7 },
  kpiLast:    { flex: 1, backgroundColor: C.g50, borderRadius: 6, padding: 8 },
  kpiLabel:   { fontSize: 7, color: C.g400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  kpiValue:   { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.g900 },
  kpiSub:     { fontSize: 7, color: C.g500, marginTop: 1 },

  legendRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendDot:  { width: 8, height: 8, borderRadius: 2, marginRight: 6 },
  legendText: { fontSize: 8, color: C.g700 },
  legendPct:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.g900, marginLeft: 'auto' },

  footer:      { position: 'absolute', bottom: 22, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.g200, paddingTop: 6 },
  footerLeft:  { fontSize: 7, color: C.g300 },
  footerRight: { fontSize: 7, color: C.g300, textAlign: 'right', maxWidth: 260 },
});

// ─── Formatters ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtPct = (n: number) => `${Number(n).toFixed(1)}%`;

const ASSET_CLASS_LABEL: Record<string, string> = {
  equity:      'Equities & Securities',
  real_estate: 'Real Estate',
  other:       'Cash & Other Assets',
  restricted:  'Restricted / Vesting',
};

const LIABILITY_TYPE_LABEL: Record<string, string> = {
  student_loan: 'Student Loan', auto: 'Auto Loan', heloc: 'HELOC',
  credit_card: 'Credit Card', cosigned: 'Co-signed', other: 'Other',
};

const GOAL_LABEL: Record<string, string> = {
  replace_spouse_income: 'Replace spouse income',
  buy_property:          'Buy property',
  exit_job:              'Exit job / FIRE',
  retire:                'Retire comfortably',
  build_generational:    'Build generational wealth',
  other:                 'Other',
};

function assetValue(a: ReportAsset): number {
  if (a.assetClass === 'real_estate') {
    return Number(a.adjustedValue ?? a.estimatedValue ?? 0) - Number(a.mortgageBalance ?? 0);
  }
  return Number(a.currentValue ?? 0);
}

// ─── SVG Donut Chart ───────────────────────────────────────────────────────────

function donutArc(
  cx: number, cy: number, outerR: number, innerR: number,
  startDeg: number, endDeg: number,
): string {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const s = toRad(startDeg), e = toRad(endDeg);
  const x1 = cx + outerR * Math.cos(s), y1 = cy + outerR * Math.sin(s);
  const x2 = cx + outerR * Math.cos(e), y2 = cy + outerR * Math.sin(e);
  const x3 = cx + innerR * Math.cos(e), y3 = cy + innerR * Math.sin(e);
  const x4 = cx + innerR * Math.cos(s), y4 = cy + innerR * Math.sin(s);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    'Z',
  ].join(' ');
}

interface DonutSlice { value: number; color: string; label: string }

function DonutChart({ slices, size = 110, thickness = 24 }: {
  slices: DonutSlice[]; size?: number; thickness?: number;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;
  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 2, innerR = outerR - thickness;

  let startDeg = 0;
  const paths = slices
    .filter(sl => sl.value > 0)
    .map(sl => {
      const sweep = (sl.value / total) * 360;
      const endDeg = startDeg + Math.min(sweep, 359.99);
      let d: string;
      if (sweep >= 359.99) {
        // Full circle: draw two 180° arcs
        d = [
          `M ${cx} ${(cy - outerR).toFixed(2)}`,
          `A ${outerR} ${outerR} 0 1 1 ${cx} ${(cy + outerR).toFixed(2)}`,
          `A ${outerR} ${outerR} 0 1 1 ${cx} ${(cy - outerR).toFixed(2)}`,
          `M ${cx} ${(cy - innerR).toFixed(2)}`,
          `A ${innerR} ${innerR} 0 1 0 ${cx} ${(cy + innerR).toFixed(2)}`,
          `A ${innerR} ${innerR} 0 1 0 ${cx} ${(cy - innerR).toFixed(2)}`,
          'Z',
        ].join(' ');
      } else {
        d = donutArc(cx, cy, outerR, innerR, startDeg, endDeg);
      }
      startDeg += sweep;
      return { color: sl.color, d };
    });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => (
        <Path key={i} d={p.d} fill={p.color} />
      ))}
    </Svg>
  );
}

// ─── Debt payoff simulation (avalanche) ────────────────────────────────────────

function simulateAvalanche(liabilities: ReportLiability[]): { months: number; totalInterest: number } {
  if (!liabilities.length) return { months: 0, totalInterest: 0 };
  const entries = liabilities
    .filter(l => Number(l.balance) > 0)
    .map(l => ({
      rem:     Number(l.balance),
      rate:    Number(l.interestRate ?? 0) / 100 / 12,
      minPay:  Number(l.monthlyPayment ?? 0),
      apr:     Number(l.interestRate ?? 0),
    }))
    .sort((a, b) => b.apr - a.apr);

  if (!entries.length) return { months: 0, totalInterest: 0 };
  const budget = entries.reduce((s, e) => s + e.minPay, 0);
  if (budget === 0) return { months: 0, totalInterest: 0 };

  let totalInterest = 0, month = 0;
  while (entries.some(e => e.rem > 0.01) && month < 600) {
    month++;
    for (const e of entries) {
      if (e.rem > 0) { const i = e.rem * e.rate; totalInterest += i; e.rem += i; }
    }
    let left = budget;
    for (const e of entries) {
      if (e.rem > 0 && left > 0) {
        const pay = Math.min(left, e.rem);
        e.rem -= pay; left -= pay;
      }
    }
    for (const e of entries) { if (e.rem < 0.01) e.rem = 0; }
  }
  return { months: month, totalInterest };
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function PageFooter({ reportDate }: { reportDate: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerLeft}>Generated by LegacyOS · {reportDate}</Text>
      <Text style={s.footerRight}>For informational purposes only. Not financial, legal, or tax advice.</Text>
    </View>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ label, current, target, color, sub }: {
  label: string; current: number; target: number; color: string; sub?: string;
}) {
  const pct = target > 0 ? Math.min(current / target, 1) : 0;
  return (
    <View style={s.progressRow}>
      <View style={s.progressLabel}>
        <Text style={s.progressName}>{label}</Text>
        <Text style={{ ...s.progressPct, color }}>{Math.round(pct * 100)}%</Text>
      </View>
      <View style={s.progressBg}>
        <View style={{ ...s.progressFill, width: `${Math.round(pct * 100)}%`, backgroundColor: color }} />
      </View>
      {sub ? <Text style={s.progressSub}>{sub}</Text> : null}
    </View>
  );
}

// ─── Main Document ─────────────────────────────────────────────────────────────

export default function FinancialReportPDF({
  userName, reportDate, nw, snapshots, assets, liabilities, goal, wings, todos,
}: FinancialReportPDFProps) {

  const totalAssets = Number(nw?.totalAssets ?? 0);
  const totalLiab   = Number(nw?.totalLiabilities ?? 0);
  const netWorth    = Number(nw?.netWorth ?? 0);
  const equityVal   = Number(nw?.breakdown.equityValue ?? 0);
  const reVal       = Number(nw?.breakdown.realEstateValue ?? 0);
  const otherVal    = Number(nw?.breakdown.otherValue ?? 0);

  const debtToAsset   = totalAssets > 0 ? (totalLiab / totalAssets) * 100 : 0;
  const leverageRatio = totalLiab > 0 ? netWorth / totalLiab : null;
  const monthlyDebt   = liabilities.reduce((s, l) => s + Number(l.monthlyPayment ?? 0), 0);
  const wtRate        = liabilities.reduce((s, l) => s + Number(l.balance) * Number(l.interestRate ?? 0), 0);
  const wtAvgRate     = totalLiab > 0 ? wtRate / totalLiab : 0;

  const trendSnaps = snapshots.slice(-12);
  const lastSnap  = trendSnaps[trendSnaps.length - 1];
  const prevSnap  = trendSnaps[trendSnaps.length - 2];
  const momCh = lastSnap && prevSnap ? Number(lastSnap.netWorth) - Number(prevSnap.netWorth) : null;
  const yoyCh = trendSnaps.length >= 2 ? Number(lastSnap.netWorth) - Number(trendSnaps[0].netWorth) : null;

  const classOrder = ['equity', 'real_estate', 'other', 'restricted'];
  const byClass    = assets.reduce<Record<string, ReportAsset[]>>((acc, a) => {
    (acc[a.assetClass] ??= []).push(a); return acc;
  }, {});

  const assessedWings = wings.filter(w => w.assessed);
  const avgLevel      = assessedWings.length
    ? assessedWings.reduce((s, w) => s + w.level, 0) / assessedWings.length : 0;

  const equityActual = totalAssets > 0 ? equityVal / totalAssets * 100 : 0;
  const reActual     = totalAssets > 0 ? reVal / totalAssets * 100 : 0;
  const otherActual  = totalAssets > 0 ? otherVal / totalAssets * 100 : 0;

  // FIRE calculations
  const fireNumber   = goal?.targetMonthlyIncome ? Number(goal.targetMonthlyIncome) * 12 * 25 : 0;
  const fireProgress = fireNumber > 0 ? Math.min(netWorth / fireNumber, 1) : 0;

  // Retirement (pretax) assets
  const pretaxAssets  = assets.filter(a => a.isPretax);
  const pretaxTotal   = pretaxAssets.reduce((s, a) => s + assetValue(a), 0);

  // Debt payoff
  const payoff = simulateAvalanche(liabilities);

  function fmtMonths(m: number) {
    if (m === 0) return '—';
    if (m >= 600) return '>50 yrs';
    const y = Math.floor(m / 12), mo = m % 12;
    return y > 0 ? `${y}y ${mo}mo` : `${mo}mo`;
  }

  // Portfolio donut slices
  const donutSlices: DonutSlice[] = [
    { value: equityVal, color: C.blue,    label: 'Equities' },
    { value: reVal,     color: C.emerald, label: 'Real Estate' },
    { value: otherVal,  color: C.amber,   label: 'Cash & Other' },
  ].filter(sl => sl.value > 0);

  // Milestones
  interface Milestone { label: string; current: number; target: number; color: string; sub: string }
  const milestones: Milestone[] = [];

  // Emergency fund: 6× monthly debt service (rough proxy for monthly expenses)
  const emgTarget = monthlyDebt > 0 ? monthlyDebt * 6 : 0;
  const cashLike  = otherVal;
  if (emgTarget > 0) {
    milestones.push({
      label: 'Emergency Fund (6 months)',
      current: cashLike,
      target: emgTarget,
      color: C.amber,
      sub: `${fmt(cashLike)} of ${fmt(emgTarget)} target`,
    });
  }

  // $100k brokerage milestone (non-pretax equity)
  const brokerageVal = assets
    .filter(a => a.assetClass === 'equity' && !a.isPretax)
    .reduce((s, a) => s + assetValue(a), 0);
  if (brokerageVal < 500_000) {
    const bTarget = brokerageVal < 100_000 ? 100_000 :
                    brokerageVal < 250_000 ? 250_000 : 500_000;
    milestones.push({
      label: `$${bTarget >= 1_000_000 ? `${bTarget/1_000_000}M` : `${bTarget/1_000}K`} in Brokerage`,
      current: brokerageVal,
      target: bTarget,
      color: C.blue,
      sub: `${fmt(brokerageVal)} of ${fmt(bTarget)}`,
    });
  }

  // $100k / $500k net worth milestone
  const nwTarget = netWorth < 100_000 ? 100_000 :
                   netWorth < 500_000 ? 500_000 :
                   netWorth < 1_000_000 ? 1_000_000 : 0;
  if (nwTarget > 0) {
    milestones.push({
      label: `${fmt(nwTarget)} Net Worth`,
      current: Math.max(netWorth, 0),
      target: nwTarget,
      color: C.green,
      sub: `${fmt(Math.max(netWorth, 0))} of ${fmt(nwTarget)}`,
    });
  }

  // FIRE progress milestone
  if (fireNumber > 0) {
    milestones.push({
      label: 'FIRE Number',
      current: Math.max(netWorth, 0),
      target: fireNumber,
      color: C.violet,
      sub: `${fmt(Math.max(netWorth, 0))} of ${fmt(fireNumber)}`,
    });
  }

  const indicators = [
    { label: 'Debt-to-Asset', value: fmtPct(debtToAsset),
      note: debtToAsset < 20 ? 'Strong' : debtToAsset < 40 ? 'Moderate' : 'High',
      good: debtToAsset < 40 },
    { label: 'Net Worth / Debt', value: leverageRatio != null ? `${leverageRatio.toFixed(1)}x` : '—',
      note: leverageRatio != null && leverageRatio >= 2 ? 'Healthy' : 'Watch',
      good: leverageRatio != null && leverageRatio >= 2 },
    { label: 'Monthly Debt Service', value: monthlyDebt > 0 ? fmt(monthlyDebt) : '—',
      note: 'Total minimums', good: true },
    { label: 'Avg. Interest Rate', value: totalLiab > 0 ? fmtPct(wtAvgRate) : '—',
      note: wtAvgRate < 5 ? 'Low cost' : wtAvgRate < 10 ? 'Moderate' : 'High cost',
      good: wtAvgRate < 10 },
  ];

  return (
    <Document title={`${userName} Financial Report — ${reportDate}`} author="LegacyOS">

      {/* ══════════════════════════════════════════════════════════════
          PAGE 1 — Cover · Balance Sheet · Health Indicators · Assets
      ══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>

        {/* Cover */}
        <View style={s.headerRow} wrap={false}>
          <View>
            <View style={s.brandRow}>
              <View style={s.brandDot} />
              <Text style={s.brandName}>LegacyOS</Text>
            </View>
            <Text style={s.reportTitle}>Financial Report</Text>
            <Text style={s.reportSub}>{userName}</Text>
            <Text style={{ ...s.reportSub, marginTop: 2 }}>{reportDate}</Text>
          </View>
          <View>
            <Text style={s.nwLabel}>Net Worth</Text>
            <Text style={{ ...s.nwValue, color: netWorth >= 0 ? C.black : C.red }}>
              {fmt(netWorth)}
            </Text>
            {momCh !== null && (
              <Text style={{ ...s.nwChange, color: momCh >= 0 ? C.green : C.red }}>
                {momCh >= 0 ? '+' : ''}{fmt(momCh)} this month
              </Text>
            )}
            {yoyCh !== null && (
              <Text style={{ ...s.nwChange, color: yoyCh >= 0 ? C.green : C.red, marginTop: 1 }}>
                {yoyCh >= 0 ? '+' : ''}{fmt(yoyCh)} / 12 months
              </Text>
            )}
          </View>
        </View>

        {/* Balance Sheet */}
        <View style={s.sec} wrap={false}>
          <Text style={s.secHeading}>Balance Sheet</Text>
          <View style={s.cardRow}>
            {[
              { label: 'Total Assets',      value: totalAssets, color: C.black,              last: false },
              { label: 'Total Liabilities', value: totalLiab,   color: totalLiab > 0 ? C.red : C.black, last: false },
              { label: 'Net Worth',         value: netWorth,    color: netWorth >= 0 ? C.black : C.red,  last: true },
            ].map(({ label, value, color, last }) => (
              <View key={label} style={last ? s.cardLast : s.card}>
                <Text style={s.cardLabel}>{label}</Text>
                <Text style={{ ...s.cardValue, color }}>{fmt(value)}</Text>
              </View>
            ))}
          </View>
          <View style={s.cardRow}>
            {[
              { label: 'Equities & Securities', value: equityVal, last: false },
              { label: 'Real Estate',           value: reVal,     last: false },
              { label: 'Cash & Other',          value: otherVal,  last: true },
            ].map(({ label, value, last }) => (
              <View key={label} style={last ? s.cardSmallLast : s.cardSmall}>
                <Text style={s.cardSmallLabel}>{label}</Text>
                <Text style={s.cardSmallValue}>{fmt(value)}</Text>
                {totalAssets > 0 && (
                  <Text style={s.cardSmallSub}>{fmtPct(value / totalAssets * 100)}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Financial Health Indicators */}
        <View style={s.sec} wrap={false}>
          <Text style={s.secHeading}>Financial Health Indicators</Text>
          <View style={s.cardRow}>
            {indicators.map(({ label, value, note, good }, i) => (
              <View key={label} style={i === indicators.length - 1 ? s.indicatorCardLast : s.indicatorCard}>
                <Text style={s.indicatorLabel}>{label}</Text>
                <Text style={s.indicatorValue}>{value}</Text>
                <Text style={{ ...s.indicatorNote, color: good ? C.green : C.amber }}>{note}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Asset Detail — heading lives inside first group's wrap=false block */}
        <View style={s.sec}>
          {classOrder.filter(cls => byClass[cls]?.length).length === 0 && (
            <View wrap={false}>
              <Text style={s.secHeading}>Asset Detail</Text>
              <Text style={{ fontSize: 8, color: C.g400 }}>No assets recorded yet.</Text>
            </View>
          )}
          {classOrder.filter(cls => byClass[cls]?.length).map((cls, groupIndex) => {
            const clsAssets = byClass[cls];
            const clsTotal  = clsAssets.reduce((sum, a) => sum + assetValue(a), 0);
            const isEq = cls === 'equity';
            const isRE = cls === 'real_estate';

            return (
              <View key={cls} wrap={false}>
                {/* Section heading is anchored inside the first group — can never orphan */}
                {groupIndex === 0 && <Text style={s.secHeading}>Asset Detail</Text>}
                <View style={s.assetGroupRow}>
                  <Text style={s.assetGroupLabel}>{ASSET_CLASS_LABEL[cls] ?? cls}</Text>
                  <Text style={s.assetGroupLabel}>{fmt(clsTotal)}</Text>
                </View>
                <View style={s.tableHeader}>
                  <Text style={{ ...s.thText, flex: isEq ? 3 : 4 }}>Name</Text>
                  {isEq && <Text style={{ ...s.thText, flex: 1.5 }}>Ticker</Text>}
                  {isEq && <Text style={{ ...s.thText, flex: 2 }}>Sector</Text>}
                  {isRE && <Text style={{ ...s.thText, flex: 3 }}>Address</Text>}
                  <Text style={{ ...s.thText, flex: 1.5, textAlign: 'right' }}>Value</Text>
                  <Text style={{ ...s.thText, width: 32, textAlign: 'right' }}>%</Text>
                </View>
                {clsAssets.map((a, i) => {
                  const val = assetValue(a);
                  return (
                    <View key={a.id} style={i === clsAssets.length - 1 ? { ...s.tableRow, borderBottomWidth: 0 } : s.tableRow}>
                      <View style={{ flex: isEq ? 3 : 4, flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={s.tdText}>{a.name}</Text>
                        {a.isPretax && (
                          <Text style={{ fontSize: 6, color: C.violet, fontFamily: 'Helvetica-Bold', marginLeft: 3 }}>
                            PRE-TAX
                          </Text>
                        )}
                      </View>
                      {isEq && <Text style={{ ...s.tdGray, flex: 1.5 }}>{a.ticker ?? '—'}</Text>}
                      {isEq && <Text style={{ ...s.tdGray, flex: 2 }}>{a.sector ?? '—'}</Text>}
                      {isRE && <Text style={{ ...s.tdGray, flex: 3 }}>{a.propertyAddress ?? '—'}</Text>}
                      <Text style={{ ...s.tdBold, flex: 1.5, textAlign: 'right' }}>{val > 0 ? fmt(val) : '—'}</Text>
                      <Text style={{ ...s.tdSmall, width: 32, textAlign: 'right' }}>
                        {totalAssets > 0 && val > 0 ? fmtPct(val / totalAssets * 100) : '—'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        <PageFooter reportDate={reportDate} />
      </Page>

      {/* ══════════════════════════════════════════════════════════════
          PAGE 2 — Liabilities · Trend · Allocation · Goals · Wings
      ══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>

        {/* Liabilities */}
        <View style={s.sec}>
          <Text style={s.secHeading}>Liabilities Detail</Text>
          {liabilities.length > 0 ? (
            <View>
              <View style={s.tableHeader} wrap={false}>
                <Text style={{ ...s.thText, flex: 3 }}>Name</Text>
                <Text style={{ ...s.thText, flex: 2 }}>Type</Text>
                <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Balance</Text>
                <Text style={{ ...s.thText, flex: 1.5, textAlign: 'right' }}>Rate</Text>
                <Text style={{ ...s.thText, flex: 1.5, textAlign: 'right' }}>Monthly</Text>
              </View>
              {liabilities.map((l, i) => (
                <View key={l.id} style={i === liabilities.length - 1 ? { ...s.tableRow, borderBottomWidth: 0 } : s.tableRow}>
                  <Text style={{ ...s.tdText, flex: 3 }}>{l.name}</Text>
                  <Text style={{ ...s.tdGray, flex: 2 }}>
                    {LIABILITY_TYPE_LABEL[l.liabilityType ?? ''] ?? (l.liabilityType ?? '—')}
                  </Text>
                  <Text style={{ ...s.tdRed, flex: 2, textAlign: 'right' }}>{fmt(Number(l.balance))}</Text>
                  <Text style={{ ...s.tdGray, flex: 1.5, textAlign: 'right' }}>
                    {l.interestRate != null ? fmtPct(Number(l.interestRate)) : '—'}
                  </Text>
                  <Text style={{ ...s.tdGray, flex: 1.5, textAlign: 'right' }}>
                    {l.monthlyPayment != null ? fmt(Number(l.monthlyPayment)) : '—'}
                  </Text>
                </View>
              ))}
              <View style={s.tableRowLast}>
                <Text style={{ ...s.tdText, flex: 3, fontFamily: 'Helvetica-Bold' }}>Total</Text>
                <Text style={{ ...s.tdGray, flex: 2 }}>{totalLiab > 0 ? `${fmtPct(wtAvgRate)} avg.` : '—'}</Text>
                <Text style={{ ...s.tdRed, flex: 2, textAlign: 'right' }}>{fmt(totalLiab)}</Text>
                <Text style={{ ...s.tdGray, flex: 1.5, textAlign: 'right' }}>—</Text>
                <Text style={{ ...s.tdGray, flex: 1.5, textAlign: 'right' }}>
                  {monthlyDebt > 0 ? fmt(monthlyDebt) : '—'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={{ fontSize: 8, color: C.g400 }}>No liabilities recorded.</Text>
          )}
        </View>

        {/* Net Worth Trend */}
        {trendSnaps.length >= 2 && (
          <View style={s.sec}>
            <Text style={s.secHeading}>Net Worth Trend — Last 12 Months</Text>
            <View style={s.tableHeader} wrap={false}>
              <Text style={{ ...s.thText, flex: 2 }}>Month</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Net Worth</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Total Assets</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Total Liab.</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Change</Text>
            </View>
            {trendSnaps.map((snap, i) => {
              const p      = trendSnaps[i - 1];
              const change = p ? Number(snap.netWorth) - Number(p.netWorth) : null;
              const label  = new Date(snap.snapshotDate)
                .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              return (
                <View key={snap.snapshotDate} style={s.tableRow}>
                  <Text style={{ ...s.tdText, flex: 2 }}>{label}</Text>
                  <Text style={{ ...s.tdBold, flex: 2, textAlign: 'right' }}>{fmt(Number(snap.netWorth))}</Text>
                  <Text style={{ ...s.tdGray, flex: 2, textAlign: 'right' }}>{fmt(Number(snap.totalAssets))}</Text>
                  <Text style={{ ...s.tdGray, flex: 2, textAlign: 'right' }}>{fmt(Number(snap.totalLiabilities))}</Text>
                  <Text style={{
                    ...s.tdGray, flex: 2, textAlign: 'right', fontFamily: 'Helvetica-Bold',
                    color: change === null ? C.g300 : change >= 0 ? C.green : C.red,
                  }}>
                    {change === null ? '—' : `${change >= 0 ? '+' : ''}${fmt(change)}`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Portfolio Allocation table */}
        {goal && (goal.targetEquityPct != null || goal.targetRealEstatePct != null) && (
          <View style={s.sec} wrap={false}>
            <Text style={s.secHeading}>Portfolio Allocation — Target vs. Actual</Text>
            <View style={s.tableHeader}>
              <Text style={{ ...s.thText, flex: 3 }}>Asset Class</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Target</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Actual</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Delta</Text>
            </View>
            {[
              { label: 'Equities',     target: goal.targetEquityPct,     actual: equityActual },
              { label: 'Real Estate',  target: goal.targetRealEstatePct, actual: reActual },
              { label: 'Cash & Other', target: goal.targetCashPct ?? goal.targetOtherPct, actual: otherActual },
            ].map(({ label, target, actual }) => {
              if (target == null) return null;
              const t = Number(target), delta = actual - t;
              return (
                <View key={label} style={s.tableRow}>
                  <Text style={{ ...s.tdText, flex: 3 }}>{label}</Text>
                  <Text style={{ ...s.tdGray, flex: 2, textAlign: 'right' }}>{fmtPct(t)}</Text>
                  <Text style={{ ...s.tdBold, flex: 2, textAlign: 'right' }}>{fmtPct(actual)}</Text>
                  <Text style={{
                    ...s.tdGray, flex: 2, textAlign: 'right', fontFamily: 'Helvetica-Bold',
                    color: Math.abs(delta) < 2 ? C.g400 : delta > 0 ? C.blue : C.amber,
                  }}>
                    {delta > 0 ? '+' : ''}{fmtPct(delta)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Goals */}
        {goal && (
          <View style={s.sec} wrap={false}>
            <Text style={s.secHeading}>Financial Goals</Text>
            <View style={s.goalGrid}>
              {[
                { label: 'Primary Goal',
                  value: goal.primaryGoalLabel || GOAL_LABEL[goal.primaryGoal ?? ''] || goal.primaryGoal || '—' },
                { label: 'Risk Tolerance',
                  value: goal.riskTolerance
                    ? goal.riskTolerance.charAt(0).toUpperCase() + goal.riskTolerance.slice(1) : '—' },
                { label: 'Monthly Income Target',
                  value: goal.targetMonthlyIncome ? fmt(Number(goal.targetMonthlyIncome)) : '—' },
                { label: 'Target Date',
                  value: goal.targetDate
                    ? new Date(goal.targetDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '—' },
              ].map(({ label, value }) => (
                <View key={label} style={s.goalCard}>
                  <Text style={s.goalCardLabel}>{label}</Text>
                  <Text style={s.goalCardValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
            {goal.targetMonthlyIncome && (() => {
              const monthly = Number(goal.targetMonthlyIncome);
              const fn      = monthly * 12 * 25;
              const prog    = netWorth > 0 ? netWorth / fn * 100 : 0;
              return (
                <View style={s.fireBanner}>
                  <Text style={s.fireBannerText}>
                    {'FIRE Number: '}
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>{fmt(fn)}</Text>
                    {'  (25x annual at 4% SWR)'}
                    {netWorth > 0 && (
                      <Text>
                        {'     '}
                        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{fmtPct(prog)} of the way there</Text>
                      </Text>
                    )}
                  </Text>
                </View>
              );
            })()}
          </View>
        )}

        {/* Six Wing Assessment */}
        {assessedWings.length > 0 && (
          <View style={s.sec} wrap={false}>
            <Text style={s.secHeading}>Six Wing Assessment</Text>
            {wings.map(wing => {
              const color = WING_COLOR[wing.color] ?? C.g700;
              const pct   = wing.assessed ? wing.level / 5 : 0;
              return (
                <View key={wing.id} style={s.wingRow}>
                  <View style={{ ...s.wingDot, backgroundColor: color }} />
                  <View style={s.wingNameCol}>
                    <Text style={s.wingName}>{wing.name}</Text>
                    <Text style={s.wingLevelLbl}>{wing.assessed ? wing.levelLabel : 'Not assessed'}</Text>
                  </View>
                  <View style={s.wingBarBg}>
                    <View style={{ ...s.wingBarFill, width: `${Math.round(pct * 100)}%`, backgroundColor: color }} />
                  </View>
                  <Text style={s.wingLevelNum}>
                    {wing.assessed ? `Lv ${wing.level} / 5` : '—'}
                  </Text>
                </View>
              );
            })}
            <Text style={{ fontSize: 7.5, color: C.g400, marginTop: 4 }}>
              {'Average: '}
              <Text style={{ fontFamily: 'Helvetica-Bold', color: C.g600 }}>
                {avgLevel.toFixed(1)} / 5
              </Text>
              {'  across '}{assessedWings.length}{' assessed wing'}{assessedWings.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        <PageFooter reportDate={reportDate} />
      </Page>

      {/* ══════════════════════════════════════════════════════════════
          PAGE 3 — Portfolio Chart · Projections · Milestones · Actions
      ══════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>

        {/* Portfolio Donut + Legend side by side */}
        <View style={s.sec} wrap={false}>
          <Text style={s.secHeading}>Portfolio Breakdown</Text>
          {totalAssets > 0 ? (
            <View style={s.twoCol}>
              <View style={s.colLeft}>
                <DonutChart slices={donutSlices} size={110} thickness={26} />
              </View>
              <View style={{ ...s.colRight, justifyContent: 'center' }}>
                {donutSlices.map(sl => (
                  <View key={sl.label} style={s.legendRow}>
                    <View style={{ ...s.legendDot, backgroundColor: sl.color }} />
                    <Text style={s.legendText}>{sl.label}</Text>
                    <Text style={s.legendPct}>{fmtPct(sl.value / totalAssets * 100)}</Text>
                  </View>
                ))}
                <View style={{ marginTop: 10 }}>
                  <Text style={{ fontSize: 7, color: C.g400, marginBottom: 2 }}>Total Assets</Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.g900 }}>{fmt(totalAssets)}</Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={{ fontSize: 8, color: C.g400 }}>No assets to display.</Text>
          )}
        </View>

        {/* FIRE / Retirement / Debt Projections */}
        <View style={s.sec} wrap={false}>
          <Text style={s.secHeading}>Financial Projections</Text>
          <View style={s.kpiRow}>
            {/* FIRE */}
            <View style={s.kpi}>
              <Text style={s.kpiLabel}>FIRE Number (4% SWR)</Text>
              <Text style={s.kpiValue}>{fireNumber > 0 ? fmt(fireNumber) : '—'}</Text>
              <Text style={s.kpiSub}>
                {fireNumber > 0
                  ? `${Math.round(fireProgress * 100)}% there · ${fmt(Math.max(netWorth, 0))} saved`
                  : 'Set a monthly income target to calculate'}
              </Text>
            </View>
            {/* Retirement */}
            <View style={s.kpi}>
              <Text style={s.kpiLabel}>Pre-Tax / Retirement Assets</Text>
              <Text style={s.kpiValue}>{pretaxTotal > 0 ? fmt(pretaxTotal) : '—'}</Text>
              <Text style={s.kpiSub}>
                {pretaxTotal > 0
                  ? `${pretaxAssets.length} account${pretaxAssets.length !== 1 ? 's' : ''} · ${fmtPct(pretaxTotal / totalAssets * 100)} of assets`
                  : 'No pre-tax accounts found'}
              </Text>
            </View>
            {/* Debt payoff */}
            <View style={s.kpiLast}>
              <Text style={s.kpiLabel}>Debt-Free (Avalanche)</Text>
              <Text style={s.kpiValue}>{payoff.months > 0 ? fmtMonths(payoff.months) : '—'}</Text>
              <Text style={s.kpiSub}>
                {payoff.months > 0
                  ? `${fmt(Math.round(payoff.totalInterest))} total interest at minimums`
                  : 'No liabilities recorded'}
              </Text>
            </View>
          </View>
        </View>

        {/* Retirement assets breakdown (if any) */}
        {pretaxAssets.length > 0 && (
          <View style={s.sec} wrap={false}>
            <Text style={s.secHeading}>Retirement Account Detail</Text>
            <View style={s.tableHeader}>
              <Text style={{ ...s.thText, flex: 4 }}>Account</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Value</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>% of Retirement</Text>
            </View>
            {pretaxAssets.map((a, i) => {
              const val = assetValue(a);
              return (
                <View key={a.id} style={i === pretaxAssets.length - 1 ? { ...s.tableRow, borderBottomWidth: 0 } : s.tableRow}>
                  <Text style={{ ...s.tdText, flex: 4 }}>{a.name}</Text>
                  <Text style={{ ...s.tdBold, flex: 2, textAlign: 'right' }}>{fmt(val)}</Text>
                  <Text style={{ ...s.tdGray, flex: 2, textAlign: 'right' }}>
                    {pretaxTotal > 0 ? fmtPct(val / pretaxTotal * 100) : '—'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Goal Milestones */}
        {milestones.length > 0 && (
          <View style={s.sec} wrap={false}>
            <Text style={s.secHeading}>Financial Milestones</Text>
            {milestones.map(m => (
              <ProgressBar
                key={m.label}
                label={m.label}
                current={m.current}
                target={m.target}
                color={m.color}
                sub={m.sub}
              />
            ))}
          </View>
        )}

        {/* Priority Action Items */}
        {todos.length > 0 && (
          <View style={s.sec}>
            <Text style={s.secHeading}>Priority Action Items</Text>
            {todos.map((todo, i) => {
              const badge =
                todo.category === 'document' ? { bg: '#eff6ff', color: '#1d4ed8' } :
                todo.category === 'action'   ? { bg: '#fffbeb', color: '#b45309' } :
                                               { bg: '#f5f3ff', color: '#6d28d9' };
              return (
                <View key={todo.id} style={s.todoRow} wrap={false}>
                  <Text style={s.todoNum}>{i + 1}</Text>
                  <View style={s.todoBody}>
                    <Text style={s.todoTitle}>{todo.title}</Text>
                    {todo.description ? <Text style={s.todoDesc}>{todo.description}</Text> : null}
                  </View>
                  <View style={s.todoBadgeWrap}>
                    <Text style={{ ...s.todoBadgeText, backgroundColor: badge.bg, color: badge.color }}>
                      {(todo.category ?? '').toUpperCase()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <PageFooter reportDate={reportDate} />
      </Page>
    </Document>
  );
}
