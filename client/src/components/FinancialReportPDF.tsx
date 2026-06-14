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
  assetType: string;
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

// ─── Fonts (built-in PDF fonts — no download required) ────────────────────────

Font.registerHyphenationCallback(word => [word]);

// ─── Styles ────────────────────────────────────────────────────────────────────

const C = {
  brand:    '#2563eb',
  black:    '#0f172a',
  gray900:  '#111827',
  gray800:  '#1f2937',
  gray700:  '#374151',
  gray600:  '#4b5563',
  gray500:  '#6b7280',
  gray400:  '#9ca3af',
  gray300:  '#d1d5db',
  gray200:  '#e5e7eb',
  gray100:  '#f3f4f6',
  gray50:   '#f9fafb',
  green:    '#059669',
  red:      '#dc2626',
  amber:    '#d97706',
  blue:     '#2563eb',
  violet:   '#7c3aed',
  emerald:  '#059669',
  rose:     '#e11d48',
  slate:    '#0d9488',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.gray900,
    backgroundColor: '#ffffff',
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 52,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1.5, borderBottomColor: C.black },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand, marginRight: 5 },
  brandName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.black, letterSpacing: 0.3 },
  reportTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.black, marginBottom: 4 },
  reportSub: { fontSize: 9, color: C.gray500 },
  nwLabel: { fontSize: 8, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'right', marginBottom: 3 },
  nwValue: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: C.black, textAlign: 'right' },
  nwChange: { fontSize: 8, textAlign: 'right', marginTop: 2 },

  // ── Section heading ──────────────────────────────────────────────────────────
  sectionHeading: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.gray400, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 22, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: C.gray200 },

  // ── Cards (3-up, 4-up) ───────────────────────────────────────────────────────
  cardRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  card: { flex: 1, borderWidth: 0.5, borderColor: C.gray200, borderRadius: 6, padding: 10 },
  cardLabel: { fontSize: 7.5, color: C.gray400, marginBottom: 3 },
  cardValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.black },
  cardSmall: { flex: 1, backgroundColor: C.gray50, borderRadius: 6, padding: 8 },
  cardSmallLabel: { fontSize: 7, color: C.gray400, marginBottom: 2 },
  cardSmallValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.gray700 },
  cardSmallSub: { fontSize: 7, color: C.gray400, marginTop: 1 },

  // ── Indicator cards (4-up) ────────────────────────────────────────────────────
  indicatorCard: { flex: 1, backgroundColor: C.gray50, borderRadius: 6, padding: 9 },
  indicatorLabel: { fontSize: 6.5, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  indicatorValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.gray900, marginBottom: 2 },
  indicatorNote: { fontSize: 7, fontFamily: 'Helvetica-Bold' },

  // ── Tables ───────────────────────────────────────────────────────────────────
  tableHeader: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.gray300 as string, paddingBottom: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: C.gray100, paddingVertical: 3 },
  tableRowLast: { flexDirection: 'row', paddingTop: 5, borderTopWidth: 0.5, borderTopColor: C.gray200, marginTop: 2 },
  thText: { fontSize: 7, color: C.gray400, fontFamily: 'Helvetica-Bold' },
  tdText: { fontSize: 8, color: C.gray700 },
  tdMono: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.gray900 },
  tdRed:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.red },
  tdGray: { fontSize: 8, color: C.gray500 },
  tdSmall: { fontSize: 7, color: C.gray400 },

  // ── Asset class group ─────────────────────────────────────────────────────────
  assetGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, marginTop: 10 },
  assetGroupLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.gray700 },
  assetGroupTotal: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.gray700 },

  // ── Wing bars ─────────────────────────────────────────────────────────────────
  wingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  wingNameCol: { width: 110 },
  wingName: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.gray800 as string },
  wingLevel: { fontSize: 7, color: C.gray400 },
  wingBarBg: { flex: 1, height: 5, backgroundColor: C.gray100, borderRadius: 3, marginHorizontal: 10 },
  wingBarFill: { height: 5, borderRadius: 3 },
  wingLevelText: { width: 44, fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray600 as string, textAlign: 'right' },

  // ── Goal card ─────────────────────────────────────────────────────────────────
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalCard: { width: '47%', backgroundColor: C.gray50, borderRadius: 6, padding: 9 },
  goalCardLabel: { fontSize: 7, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  goalCardValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.gray800 as string },
  fireBanner: { backgroundColor: '#fffbeb', borderRadius: 6, padding: 10, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fireBannerText: { fontSize: 8, color: C.amber },
  fireBannerBold: { fontFamily: 'Helvetica-Bold', color: '#92400e' },

  // ── Action items ──────────────────────────────────────────────────────────────
  todoRow: { flexDirection: 'row', borderBottomWidth: 0.3, borderBottomColor: C.gray100, paddingVertical: 5, gap: 8 },
  todoNum: { fontSize: 8, color: C.gray300 as string, width: 14 },
  todoTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.gray900, flex: 1 },
  todoDesc: { fontSize: 7.5, color: C.gray500, marginTop: 1 },
  todoBadge: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8 },

  // ── Footer ────────────────────────────────────────────────────────────────────
  footer: { position: 'absolute', bottom: 28, left: 52, right: 52, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: C.gray200, paddingTop: 8 },
  footerText: { fontSize: 7, color: C.gray300 as string },
  footerDisclaimer: { fontSize: 7, color: C.gray300 as string, textAlign: 'right', maxWidth: 260 },
});

// ─── Formatters ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtPct = (n: number) => `${Number(n).toFixed(1)}%`;

const ASSET_CLASS_LABEL: Record<string, string> = {
  equity: 'Equities & Securities',
  real_estate: 'Real Estate',
  other: 'Cash & Other Assets',
  restricted: 'Restricted / Vesting',
};

const LIABILITY_TYPE_LABEL: Record<string, string> = {
  student_loan: 'Student Loan', auto: 'Auto Loan', heloc: 'HELOC',
  credit_card: 'Credit Card', cosigned: 'Co-signed', other: 'Other',
};

const GOAL_LABEL: Record<string, string> = {
  replace_spouse_income: 'Replace spouse income',
  buy_property: 'Buy property',
  exit_job: 'Exit job / FIRE',
  retire: 'Retire comfortably',
  build_generational: 'Build generational wealth',
  other: 'Other',
};

const WING_COLOR_HEX: Record<string, string> = {
  emerald: C.emerald, blue: C.blue, rose: C.rose,
  amber: C.amber, violet: C.violet, slate: C.slate,
};

function assetValue(a: ReportAsset): number {
  if (a.assetClass === 'real_estate') {
    const adj = Number(a.adjustedValue ?? a.estimatedValue ?? 0);
    const mort = Number(a.mortgageBalance ?? 0);
    return adj - mort;
  }
  return Number(a.currentValue ?? 0);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: string }) {
  return <Text style={s.sectionHeading}>{children}</Text>;
}

function PageFooter({ reportDate, pageNum }: { reportDate: string; pageNum?: number }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>
        Generated by LegacyOS · {reportDate}{pageNum != null ? `  ·  Page ${pageNum}` : ''}
      </Text>
      <Text style={s.footerDisclaimer}>
        For informational purposes only. Not financial, legal, or tax advice.
      </Text>
    </View>
  );
}

// ─── Main PDF Document ─────────────────────────────────────────────────────────

export default function FinancialReportPDF({
  userName, reportDate, nw, snapshots, assets, liabilities, goal, wings, todos,
}: FinancialReportPDFProps) {
  const totalAssets = Number(nw?.totalAssets ?? 0);
  const totalLiab   = Number(nw?.totalLiabilities ?? 0);
  const netWorth    = Number(nw?.netWorth ?? 0);

  const equityValue = Number(nw?.breakdown.equityValue ?? 0);
  const reValue     = Number(nw?.breakdown.realEstateValue ?? 0);
  const otherValue  = Number(nw?.breakdown.otherValue ?? 0);

  const debtToAsset    = totalAssets > 0 ? (totalLiab / totalAssets) * 100 : 0;
  const leverageRatio  = totalLiab > 0 ? netWorth / totalLiab : null;

  const monthlyDebt = liabilities.reduce((s, l) => s + Number(l.monthlyPayment ?? 0), 0);
  const totalWtRate = liabilities.reduce((s, l) => s + Number(l.balance) * Number(l.interestRate ?? 0), 0);
  const wtAvgRate   = totalLiab > 0 ? totalWtRate / totalLiab : 0;

  const trendSnaps  = snapshots.slice(-12);
  const latestSnap  = trendSnaps[trendSnaps.length - 1];
  const prevSnap    = trendSnaps[trendSnaps.length - 2];
  const momChange   = latestSnap && prevSnap
    ? Number(latestSnap.netWorth) - Number(prevSnap.netWorth) : null;
  const yoyChange   = trendSnaps.length >= 2
    ? Number(latestSnap.netWorth) - Number(trendSnaps[0].netWorth) : null;

  const classOrder  = ['equity', 'real_estate', 'other', 'restricted'];
  const assetsByClass = assets.reduce<Record<string, ReportAsset[]>>((acc, a) => {
    (acc[a.assetClass] ??= []).push(a); return acc;
  }, {});

  const assessedWings = wings.filter(w => w.assessed);
  const avgLevel = assessedWings.length
    ? assessedWings.reduce((s, w) => s + w.level, 0) / assessedWings.length : 0;

  const equityActual = totalAssets > 0 ? equityValue / totalAssets * 100 : 0;
  const reActual     = totalAssets > 0 ? reValue / totalAssets * 100 : 0;
  const otherActual  = totalAssets > 0 ? otherValue / totalAssets * 100 : 0;

  return (
    <Document title={`${userName} Financial Report — ${reportDate}`} author="LegacyOS">

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 1 — Balance sheet, health indicators, assets
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>

        {/* Header */}
        <View style={s.headerRow}>
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
            {momChange !== null && (
              <Text style={{ ...s.nwChange, color: momChange >= 0 ? C.green : C.red }}>
                {momChange >= 0 ? '▲' : '▼'} {fmt(Math.abs(momChange))} this month
              </Text>
            )}
            {yoyChange !== null && (
              <Text style={{ ...s.nwChange, color: yoyChange >= 0 ? C.green : C.red, marginTop: 1 }}>
                {yoyChange >= 0 ? '+' : ''}{fmt(yoyChange)} / 12 months
              </Text>
            )}
          </View>
        </View>

        {/* Balance Sheet */}
        <SectionHeading>Balance Sheet</SectionHeading>
        <View style={s.cardRow}>
          {[
            { label: 'Total Assets',      value: totalAssets, color: C.black },
            { label: 'Total Liabilities', value: totalLiab,   color: totalLiab > 0 ? C.red : C.black },
            { label: 'Net Worth',         value: netWorth,    color: netWorth >= 0 ? C.black : C.red },
          ].map(({ label, value, color }) => (
            <View key={label} style={s.card}>
              <Text style={s.cardLabel}>{label}</Text>
              <Text style={{ ...s.cardValue, color }}>{fmt(value)}</Text>
            </View>
          ))}
        </View>
        <View style={s.cardRow}>
          {[
            { label: 'Equities & Securities', value: equityValue },
            { label: 'Real Estate',           value: reValue },
            { label: 'Cash & Other',          value: otherValue },
          ].map(({ label, value }) => (
            <View key={label} style={s.cardSmall}>
              <Text style={s.cardSmallLabel}>{label}</Text>
              <Text style={s.cardSmallValue}>{fmt(value)}</Text>
              {totalAssets > 0 && (
                <Text style={s.cardSmallSub}>{fmtPct(value / totalAssets * 100)}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Financial Health Indicators */}
        <SectionHeading>Financial Health Indicators</SectionHeading>
        <View style={s.cardRow}>
          {[
            {
              label: 'Debt-to-Asset',
              value: fmtPct(debtToAsset),
              note: debtToAsset < 20 ? 'Strong' : debtToAsset < 40 ? 'Moderate' : 'High',
              good: debtToAsset < 40,
            },
            {
              label: 'Net Worth / Debt',
              value: leverageRatio != null ? `${leverageRatio.toFixed(1)}×` : '—',
              note: leverageRatio !== null && leverageRatio >= 2 ? 'Healthy' : 'Watch',
              good: leverageRatio !== null && leverageRatio >= 2,
            },
            {
              label: 'Monthly Debt Service',
              value: monthlyDebt > 0 ? fmt(monthlyDebt) : '—',
              note: 'Total minimum payments',
              good: true,
            },
            {
              label: 'Avg. Interest Rate',
              value: totalLiab > 0 ? fmtPct(wtAvgRate) : '—',
              note: wtAvgRate < 5 ? 'Low cost debt' : wtAvgRate < 10 ? 'Moderate' : 'High cost',
              good: wtAvgRate < 10,
            },
          ].map(({ label, value, note, good }) => (
            <View key={label} style={s.indicatorCard}>
              <Text style={s.indicatorLabel}>{label}</Text>
              <Text style={s.indicatorValue}>{value}</Text>
              <Text style={{ ...s.indicatorNote, color: good ? C.green : C.amber }}>{note}</Text>
            </View>
          ))}
        </View>

        {/* Asset Detail */}
        <SectionHeading>Asset Detail</SectionHeading>

        {classOrder.filter(cls => assetsByClass[cls]?.length).map(cls => {
          const clsAssets = assetsByClass[cls];
          const clsTotal  = clsAssets.reduce((sum, a) => sum + assetValue(a), 0);
          const isEquity  = cls === 'equity';
          const isRE      = cls === 'real_estate';

          return (
            <View key={cls} wrap={false}>
              <View style={s.assetGroupHeader}>
                <Text style={s.assetGroupLabel}>{ASSET_CLASS_LABEL[cls] ?? cls}</Text>
                <Text style={s.assetGroupTotal}>{fmt(clsTotal)}</Text>
              </View>

              {/* Table header */}
              <View style={s.tableHeader}>
                <Text style={{ ...s.thText, flex: isEquity ? 3 : 4 }}>Name</Text>
                {isEquity && <Text style={{ ...s.thText, flex: 1.5 }}>Ticker</Text>}
                {isEquity && <Text style={{ ...s.thText, flex: 2 }}>Sector</Text>}
                {isRE     && <Text style={{ ...s.thText, flex: 3 }}>Address</Text>}
                <Text style={{ ...s.thText, flex: 1.5, textAlign: 'right' }}>Value</Text>
                <Text style={{ ...s.thText, width: 32, textAlign: 'right' }}>%</Text>
              </View>

              {clsAssets.map((a, i) => {
                const val  = assetValue(a);
                const last = i === clsAssets.length - 1;
                return (
                  <View key={a.id} style={last ? { ...s.tableRow, borderBottomWidth: 0 } : s.tableRow}>
                    <View style={{ flex: isEquity ? 3 : 4, flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={s.tdText}>{a.name}</Text>
                      {a.isPretax && (
                        <Text style={{ fontSize: 6, color: C.violet, fontFamily: 'Helvetica-Bold', marginLeft: 3 }}>
                          PRE-TAX
                        </Text>
                      )}
                    </View>
                    {isEquity && <Text style={{ ...s.tdGray, flex: 1.5 }}>{a.ticker ?? '—'}</Text>}
                    {isEquity && <Text style={{ ...s.tdGray, flex: 2 }}>{a.sector ?? '—'}</Text>}
                    {isRE     && <Text style={{ ...s.tdGray, flex: 3 }}>{a.propertyAddress ?? '—'}</Text>}
                    <Text style={{ ...s.tdMono, flex: 1.5, textAlign: 'right' }}>{val > 0 ? fmt(val) : '—'}</Text>
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
          <Text style={{ fontSize: 8, color: C.gray400, fontStyle: 'italic' }}>No assets recorded yet.</Text>
        )}

        <PageFooter reportDate={reportDate} />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 2 — Liabilities, trend, allocation, goals, wings, actions
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>

        {/* Liabilities */}
        <SectionHeading>Liabilities Detail</SectionHeading>

        {liabilities.length > 0 ? (
          <View>
            <View style={s.tableHeader}>
              <Text style={{ ...s.thText, flex: 3 }}>Name</Text>
              <Text style={{ ...s.thText, flex: 2 }}>Type</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Balance</Text>
              <Text style={{ ...s.thText, flex: 1.5, textAlign: 'right' }}>Rate</Text>
              <Text style={{ ...s.thText, flex: 1.5, textAlign: 'right' }}>Monthly</Text>
            </View>
            {liabilities.map((l, i) => {
              const last = i === liabilities.length - 1;
              return (
                <View key={l.id} style={last ? { ...s.tableRow, borderBottomWidth: 0 } : s.tableRow}>
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
              );
            })}
            <View style={s.tableRowLast}>
              <Text style={{ ...s.tdText, flex: 3, fontFamily: 'Helvetica-Bold' }}>Total</Text>
              <Text style={{ ...s.tdGray, flex: 2 }}>{fmtPct(wtAvgRate)} avg.</Text>
              <Text style={{ ...s.tdRed, flex: 2, textAlign: 'right' }}>{fmt(totalLiab)}</Text>
              <Text style={{ ...s.tdGray, flex: 1.5, textAlign: 'right' }}>—</Text>
              <Text style={{ ...s.tdGray, flex: 1.5, textAlign: 'right' }}>
                {monthlyDebt > 0 ? fmt(monthlyDebt) : '—'}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 8, color: C.gray400, fontStyle: 'italic' }}>No liabilities recorded.</Text>
        )}

        {/* Net Worth Trend */}
        {trendSnaps.length >= 2 && (
          <>
            <SectionHeading>Net Worth Trend — Last 12 Months</SectionHeading>
            <View style={s.tableHeader}>
              <Text style={{ ...s.thText, flex: 2 }}>Month</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Net Worth</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Total Assets</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Total Liab.</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Change</Text>
            </View>
            {trendSnaps.map((snap, i) => {
              const prev   = trendSnaps[i - 1];
              const change = prev ? Number(snap.netWorth) - Number(prev.netWorth) : null;
              const date   = new Date(snap.snapshotDate);
              const label  = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              return (
                <View key={snap.snapshotDate} style={s.tableRow}>
                  <Text style={{ ...s.tdText, flex: 2 }}>{label}</Text>
                  <Text style={{ ...s.tdMono, flex: 2, textAlign: 'right' }}>{fmt(Number(snap.netWorth))}</Text>
                  <Text style={{ ...s.tdGray, flex: 2, textAlign: 'right' }}>{fmt(Number(snap.totalAssets))}</Text>
                  <Text style={{ ...s.tdGray, flex: 2, textAlign: 'right' }}>{fmt(Number(snap.totalLiabilities))}</Text>
                  <Text style={{
                    ...s.tdGray, flex: 2, textAlign: 'right',
                    color: change === null ? C.gray300 as string : change >= 0 ? C.green : C.red,
                    fontFamily: 'Helvetica-Bold',
                  }}>
                    {change === null ? '—' : `${change >= 0 ? '+' : ''}${fmt(change)}`}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {/* Portfolio Allocation */}
        {goal && (goal.targetEquityPct != null || goal.targetRealEstatePct != null) && (
          <>
            <SectionHeading>Portfolio Allocation — Target vs. Actual</SectionHeading>
            <View style={s.tableHeader}>
              <Text style={{ ...s.thText, flex: 3 }}>Asset Class</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Target</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Actual</Text>
              <Text style={{ ...s.thText, flex: 2, textAlign: 'right' }}>Δ</Text>
            </View>
            {[
              { label: 'Equities', target: goal.targetEquityPct, actual: equityActual },
              { label: 'Real Estate', target: goal.targetRealEstatePct, actual: reActual },
              { label: 'Cash & Other', target: goal.targetCashPct ?? goal.targetOtherPct, actual: otherActual },
            ].map(({ label, target, actual }) => {
              if (target == null) return null;
              const t = Number(target);
              const delta = actual - t;
              return (
                <View key={label} style={s.tableRow}>
                  <Text style={{ ...s.tdText, flex: 3 }}>{label}</Text>
                  <Text style={{ ...s.tdGray, flex: 2, textAlign: 'right' }}>{fmtPct(t)}</Text>
                  <Text style={{ ...s.tdMono, flex: 2, textAlign: 'right' }}>{fmtPct(actual)}</Text>
                  <Text style={{
                    ...s.tdGray, flex: 2, textAlign: 'right', fontFamily: 'Helvetica-Bold',
                    color: Math.abs(delta) < 2 ? C.gray400 : delta > 0 ? C.blue : C.amber,
                  }}>
                    {delta > 0 ? '+' : ''}{fmtPct(delta)}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {/* Goals */}
        {goal && (
          <>
            <SectionHeading>Financial Goals</SectionHeading>
            <View style={s.goalGrid}>
              {[
                {
                  label: 'Primary Goal',
                  value: goal.primaryGoalLabel
                    || GOAL_LABEL[goal.primaryGoal ?? '']
                    || goal.primaryGoal
                    || '—',
                },
                {
                  label: 'Risk Tolerance',
                  value: goal.riskTolerance
                    ? goal.riskTolerance.charAt(0).toUpperCase() + goal.riskTolerance.slice(1)
                    : '—',
                },
                {
                  label: 'Monthly Income Target',
                  value: goal.targetMonthlyIncome ? fmt(Number(goal.targetMonthlyIncome)) : '—',
                },
                {
                  label: 'Target Date',
                  value: goal.targetDate
                    ? new Date(goal.targetDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
                    : '—',
                },
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
                    <Text style={s.fireBannerBold}>FIRE Number: </Text>
                    {fmt(fireNum)}{'  '}(25× annual at 4% SWR){'    '}
                    {netWorth > 0 && (
                      <Text style={s.fireBannerBold}>{fmtPct(progress)} there</Text>
                    )}
                  </Text>
                </View>
              );
            })()}
          </>
        )}

        {/* Six Wing Assessment */}
        {assessedWings.length > 0 && (
          <>
            <SectionHeading>Six Wing Assessment</SectionHeading>
            {wings.map(wing => {
              const pct   = wing.assessed ? (wing.level / 5) : 0;
              const color = WING_COLOR_HEX[wing.color] ?? C.gray700;
              return (
                <View key={wing.id} style={s.wingRow}>
                  <View style={s.wingNameCol}>
                    <Text style={s.wingName}>{wing.emoji}  {wing.name}</Text>
                    <Text style={s.wingLevel}>
                      {wing.assessed ? wing.levelLabel : 'Not assessed'}
                    </Text>
                  </View>
                  <View style={s.wingBarBg}>
                    <View style={{ ...s.wingBarFill, width: `${pct * 100}%` as unknown as number, backgroundColor: color }} />
                  </View>
                  <Text style={s.wingLevelText}>
                    {wing.assessed ? `Lv ${wing.level} / 5` : '—'}
                  </Text>
                </View>
              );
            })}
            {assessedWings.length > 0 && (
              <Text style={{ fontSize: 7.5, color: C.gray400, marginTop: 4 }}>
                Average across {assessedWings.length} assessed wing{assessedWings.length !== 1 ? 's' : ''}:{' '}
                <Text style={{ fontFamily: 'Helvetica-Bold', color: C.gray600 as string }}>
                  {avgLevel.toFixed(1)} / 5
                </Text>
              </Text>
            )}
          </>
        )}

        {/* Priority Action Items */}
        {todos.length > 0 && (
          <>
            <SectionHeading>Priority Action Items</SectionHeading>
            {todos.map((todo, i) => {
              const badgeColor =
                todo.category === 'document' ? { bg: '#eff6ff', text: '#1d4ed8' } :
                todo.category === 'action'   ? { bg: '#fffbeb', text: '#b45309' } :
                                               { bg: '#f5f3ff', text: '#6d28d9' };
              return (
                <View key={todo.id} style={s.todoRow}>
                  <Text style={s.todoNum}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.todoTitle}>{todo.title}</Text>
                    {todo.description && (
                      <Text style={s.todoDesc}>{todo.description}</Text>
                    )}
                  </View>
                  <View style={{ ...s.todoBadge, backgroundColor: badgeColor.bg }}>
                    <Text style={{ ...s.todoBadge, color: badgeColor.text, backgroundColor: 'transparent', padding: 0 }}>
                      {(todo.category ?? '').toUpperCase()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <PageFooter reportDate={reportDate} />
      </Page>
    </Document>
  );
}
