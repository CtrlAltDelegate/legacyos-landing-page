import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
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

// ─── Wing colors (text only — no emoji, they corrupt in PDF) ──────────────────

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
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 52,
  },

  // Header
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1.5, borderBottomColor: C.black },
  brandRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  brandDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand, marginRight: 5 },
  brandName:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.black },
  reportTitle:{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.black, marginBottom: 4 },
  reportSub:  { fontSize: 9, color: C.g500 },
  nwLabel:    { fontSize: 8, color: C.g400, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'right', marginBottom: 3 },
  nwValue:    { fontSize: 28, fontFamily: 'Helvetica-Bold', color: C.black, textAlign: 'right' },
  nwChange:   { fontSize: 8, textAlign: 'right', marginTop: 2 },

  // Section heading — NEVER orphaned: always paired with first content row
  sectionHeading: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.g400,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.g200,
  },
  // Wrapper that keeps heading glued to the first content row
  sectionAnchor: { marginTop: 22 },

  // Cards
  cardRow:        { flexDirection: 'row', marginBottom: 8 },
  card:           { flex: 1, borderWidth: 0.5, borderColor: C.g200, borderRadius: 6, padding: 10, marginRight: 8 },
  cardLast:       { flex: 1, borderWidth: 0.5, borderColor: C.g200, borderRadius: 6, padding: 10 },
  cardLabel:      { fontSize: 7.5, color: C.g400, marginBottom: 3 },
  cardValue:      { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.black },
  cardSmall:      { flex: 1, backgroundColor: C.g50, borderRadius: 6, padding: 8, marginRight: 8 },
  cardSmallLast:  { flex: 1, backgroundColor: C.g50, borderRadius: 6, padding: 8 },
  cardSmallLabel: { fontSize: 7, color: C.g400, marginBottom: 2 },
  cardSmallValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.g700 },
  cardSmallSub:   { fontSize: 7, color: C.g400, marginTop: 1 },

  // Indicator cards
  indicatorCard:  { flex: 1, backgroundColor: C.g50, borderRadius: 6, padding: 9, marginRight: 8 },
  indicatorCardLast: { flex: 1, backgroundColor: C.g50, borderRadius: 6, padding: 9 },
  indicatorLabel: { fontSize: 6.5, color: C.g400, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  indicatorValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.g900, marginBottom: 2 },
  indicatorNote:  { fontSize: 7, fontFamily: 'Helvetica-Bold' },

  // Tables
  tableHeader:  { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.g300, paddingBottom: 4, marginBottom: 2 },
  tableRow:     { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: C.g100, paddingVertical: 3 },
  tableRowLast: { flexDirection: 'row', paddingTop: 5, borderTopWidth: 0.5, borderTopColor: C.g200, marginTop: 2 },
  thText:  { fontSize: 7, color: C.g400, fontFamily: 'Helvetica-Bold' },
  tdText:  { fontSize: 8, color: C.g700 },
  tdBold:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.g900 },
  tdRed:   { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.red },
  tdGray:  { fontSize: 8, color: C.g500 },
  tdSmall: { fontSize: 7, color: C.g400 },

  // Asset group
  assetGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, marginTop: 8 },
  assetGroupLabel:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.g700 },

  // Wing bars (text-only wing names — no emoji)
  wingRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  wingDot:      { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  wingNameCol:  { width: 108 },
  wingName:     { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.g800 },
  wingLevelLbl: { fontSize: 7, color: C.g400 },
  wingBarBg:    { flex: 1, height: 5, backgroundColor: C.g100, borderRadius: 3, marginHorizontal: 10 },
  wingBarFill:  { height: 5, borderRadius: 3 },
  wingLevelNum: { width: 44, fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.g600, textAlign: 'right' },

  // Goals
  goalGrid:      { flexDirection: 'row', flexWrap: 'wrap' },
  goalCard:      { width: '47%', backgroundColor: C.g50, borderRadius: 6, padding: 9, marginRight: '3%', marginBottom: 8 },
  goalCardLabel: { fontSize: 7, color: C.g400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  goalCardValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.g800 },
  fireBanner:    { backgroundColor: '#fffbeb', borderRadius: 6, padding: 10, marginTop: 8 },
  fireBannerText:{ fontSize: 8, color: '#92400e' },

  // Action items — column layout to prevent overlap
  todoRow:       { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: C.g100, paddingVertical: 5 },
  todoNum:       { fontSize: 8, color: C.g300, width: 16, paddingTop: 1 },
  todoBody:      { flex: 1, flexDirection: 'column' },
  todoTitle:     { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.g900, marginBottom: 2 },
  todoDesc:      { fontSize: 7.5, color: C.g500 },
  todoBadgeWrap: { width: 48, alignItems: 'flex-end', paddingTop: 1 },
  todoBadgeText: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8 },

  // Footer
  footer:      { position: 'absolute', bottom: 24, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.g200, paddingTop: 7 },
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

// ─── Section anchor — heading glued to first row so it can't orphan ───────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    // outer wrap={true} lets long sections flow across pages
    <View style={s.sectionAnchor}>
      {/* inner wrap={false} keeps just the heading + first-row together */}
      <View wrap={false}>
        <Text style={s.sectionHeading}>{title}</Text>
        {/* children slot 0 renders alongside the heading in the no-wrap zone */}
      </View>
      {children}
    </View>
  );
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
  const last  = trendSnaps[trendSnaps.length - 1];
  const prev  = trendSnaps[trendSnaps.length - 2];
  const momCh = last && prev ? Number(last.netWorth) - Number(prev.netWorth) : null;
  const yoyCh = trendSnaps.length >= 2 ? Number(last.netWorth) - Number(trendSnaps[0].netWorth) : null;

  const classOrder   = ['equity', 'real_estate', 'other', 'restricted'];
  const byClass      = assets.reduce<Record<string, ReportAsset[]>>((acc, a) => {
    (acc[a.assetClass] ??= []).push(a); return acc;
  }, {});

  const assessedWings = wings.filter(w => w.assessed);
  const avgLevel      = assessedWings.length
    ? assessedWings.reduce((s, w) => s + w.level, 0) / assessedWings.length : 0;

  const equityActual = totalAssets > 0 ? equityVal / totalAssets * 100 : 0;
  const reActual     = totalAssets > 0 ? reVal / totalAssets * 100 : 0;
  const otherActual  = totalAssets > 0 ? otherVal / totalAssets * 100 : 0;

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

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 1: Cover · Balance Sheet · Health Indicators · Assets
      ══════════════════════════════════════════════════════════════════ */}
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
        <View style={s.sectionAnchor} wrap={false}>
          <Text style={s.sectionHeading}>Balance Sheet</Text>
          <View style={s.cardRow}>
            {[
              { label: 'Total Assets',      value: totalAssets, color: C.black,              last: false },
              { label: 'Total Liabilities', value: totalLiab,   color: totalLiab > 0 ? C.red : C.black, last: false },
              { label: 'Net Worth',         value: netWorth,    color: netWorth >= 0 ? C.black : C.red,  last: true },
            ].map(({ label, value, color, last: isLast }) => (
              <View key={label} style={isLast ? s.cardLast : s.card}>
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
            ].map(({ label, value, last: isLast }) => (
              <View key={label} style={isLast ? s.cardSmallLast : s.cardSmall}>
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
        <View style={s.sectionAnchor} wrap={false}>
          <Text style={s.sectionHeading}>Financial Health Indicators</Text>
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

        {/* Asset Detail */}
        <View style={s.sectionAnchor}>
          <Text style={s.sectionHeading}>Asset Detail</Text>

          {classOrder.filter(cls => byClass[cls]?.length).map(cls => {
            const clsAssets = byClass[cls];
            const clsTotal  = clsAssets.reduce((sum, a) => sum + assetValue(a), 0);
            const isEq = cls === 'equity';
            const isRE = cls === 'real_estate';

            return (
              <View key={cls} wrap={false}>
                {/* Group header + table header in one no-wrap block */}
                <View style={s.assetGroupHeader}>
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
                  const val    = assetValue(a);
                  const isLast = i === clsAssets.length - 1;
                  return (
                    <View key={a.id} style={isLast ? { ...s.tableRow, borderBottomWidth: 0 } : s.tableRow}>
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

          {assets.length === 0 && (
            <Text style={{ fontSize: 8, color: C.g400 }}>No assets recorded yet.</Text>
          )}
        </View>

        <PageFooter reportDate={reportDate} />
      </Page>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 2: Liabilities · Trend · Allocation · Goals · Wings · Actions
      ══════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>

        {/* Liabilities */}
        <View style={s.sectionAnchor}>
          <Text style={s.sectionHeading}>Liabilities Detail</Text>
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
          <View style={s.sectionAnchor}>
            <Text style={s.sectionHeading}>Net Worth Trend — Last 12 Months</Text>
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

        {/* Portfolio Allocation */}
        {goal && (goal.targetEquityPct != null || goal.targetRealEstatePct != null) && (
          <View style={s.sectionAnchor}>
            <Text style={s.sectionHeading}>Portfolio Allocation — Target vs. Actual</Text>
            <View style={s.tableHeader} wrap={false}>
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
              const t     = Number(target);
              const delta = actual - t;
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
          <View style={s.sectionAnchor} wrap={false}>
            <Text style={s.sectionHeading}>Financial Goals</Text>
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
              const monthly  = Number(goal.targetMonthlyIncome);
              const fireNum  = monthly * 12 * 25;
              const progress = netWorth > 0 ? netWorth / fireNum * 100 : 0;
              return (
                <View style={s.fireBanner}>
                  <Text style={s.fireBannerText}>
                    {'FIRE Number: '}
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>{fmt(fireNum)}</Text>
                    {'  (25x annual at 4% SWR)'}
                    {netWorth > 0 && (
                      <Text>{'     '}<Text style={{ fontFamily: 'Helvetica-Bold' }}>{fmtPct(progress)} of the way there</Text></Text>
                    )}
                  </Text>
                </View>
              );
            })()}
          </View>
        )}

        {/* Six Wing Assessment — text-only names, no emoji */}
        {assessedWings.length > 0 && (
          <View style={s.sectionAnchor} wrap={false}>
            <Text style={s.sectionHeading}>Six Wing Assessment</Text>
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
            {assessedWings.length > 0 && (
              <Text style={{ fontSize: 7.5, color: C.g400, marginTop: 4 }}>
                {'Average across '}{assessedWings.length}{' assessed wing'}
                {assessedWings.length !== 1 ? 's' : ''}
                {': '}
                <Text style={{ fontFamily: 'Helvetica-Bold', color: C.g600 }}>
                  {avgLevel.toFixed(1)} / 5
                </Text>
              </Text>
            )}
          </View>
        )}

        {/* Priority Action Items */}
        {todos.length > 0 && (
          <View style={s.sectionAnchor}>
            <Text style={s.sectionHeading}>Priority Action Items</Text>
            {todos.map((todo, i) => {
              const badge =
                todo.category === 'document' ? { bg: '#eff6ff', color: '#1d4ed8' } :
                todo.category === 'action'   ? { bg: '#fffbeb', color: '#b45309' } :
                                               { bg: '#f5f3ff', color: '#6d28d9' };
              return (
                <View key={todo.id} style={s.todoRow} wrap={false}>
                  <Text style={s.todoNum}>{i + 1}</Text>
                  {/* Column layout prevents title/desc overlap */}
                  <View style={s.todoBody}>
                    <Text style={s.todoTitle}>{todo.title}</Text>
                    {todo.description ? (
                      <Text style={s.todoDesc}>{todo.description}</Text>
                    ) : null}
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
