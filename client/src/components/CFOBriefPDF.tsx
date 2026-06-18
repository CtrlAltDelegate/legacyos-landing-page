import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// ─── Types (mirrors ExportReport) ────────────────────────────────────────────

interface NetWorth {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  breakdown: { equityValue: number; realEstateValue: number; otherValue: number };
}
interface Snapshot { snapshotDate: string; netWorth: number; }
interface Asset {
  id: string; name: string; assetClass: string; assetType: string;
  currentValue: number | null; adjustedValue: number | null;
  estimatedValue: number | null; mortgageBalance: number | null;
  ticker: string | null; sharesHeld: number | null; isPretax: boolean;
  sector: string | null; propertyAddress: string | null;
}
interface Liability {
  id: string; name: string; liabilityType: string | null;
  balance: number; interestRate: number | null; monthlyPayment: number | null;
}
interface Goal {
  primaryGoal: string | null; primaryGoalLabel: string | null;
  targetMonthlyIncome: number | null; targetDate: string | null;
  riskTolerance: string | null;
  targetEquityPct: number | null; targetRealEstatePct: number | null;
  targetCashPct: number | null; targetBusinessPct: number | null; targetOtherPct: number | null;
  monthlyCryptoBudget: number | null; monthlyIncome: number | null; financialMode: string | null;
}
interface WingSummary {
  id: string; name: string; emoji: string; level: number; levelLabel: string;
  color: string; assessed: boolean;
}

export interface CFOBriefProps {
  userName: string;
  reportDate: string;
  nw: NetWorth | null;
  snapshots: Snapshot[];
  assets: Asset[];
  liabilities: Liability[];
  goal: Goal | null;
  wings: WingSummary[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const fmtSign = (n: number) => `${n >= 0 ? '+' : ''}${fmt(n)}`;

// ─── Design tokens ────────────────────────────────────────────────────────────

const BRAND = '#3a47ec';
const GREEN = '#059669';
const RED   = '#dc2626';
const GRAY  = '#6b7280';
const LIGHT = '#f9fafb';
const BORDER = '#e5e7eb';

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', backgroundColor: '#fff', padding: 32 },
  header:      { backgroundColor: BRAND, padding: '14 20', marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 11, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  headerSub:   { color: '#c7d2fe', fontSize: 8 },

  secLabel:    { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: GRAY, letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' },
  section:     { marginBottom: 14 },
  divider:     { borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 14 },

  row:         { flexDirection: 'row' },
  col:         { flex: 1 },
  colL:        { flex: 1, marginRight: 10 },

  // Stat boxes
  statBox:     { flex: 1, backgroundColor: LIGHT, borderRadius: 5, padding: '8 10', marginRight: 6 },
  statBoxLast: { flex: 1, backgroundColor: LIGHT, borderRadius: 5, padding: '8 10' },
  statLabel:   { fontSize: 7, color: GRAY, marginBottom: 2 },
  statValue:   { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827' },
  statValueLg: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: BRAND },

  // Table
  th:          { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRAY, flex: 1 },
  thR:         { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRAY, flex: 1, textAlign: 'right' },
  td:          { fontSize: 8, color: '#374151', flex: 1, paddingTop: 4 },
  tdR:         { fontSize: 8, color: '#374151', flex: 1, textAlign: 'right', paddingTop: 4 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 3 },
  tableRow:    { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 3 },

  // Wing chips
  wingRow:     { flexDirection: 'row', flexWrap: 'wrap' },
  wingChip:    { width: '30%', marginRight: '3%', marginBottom: 5, backgroundColor: LIGHT, borderRadius: 4, padding: '5 7' },
  wingName:    { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#111827' },
  wingLevel:   { fontSize: 7, color: GRAY, marginTop: 1 },

  // Footer
  footer:      { position: 'absolute', bottom: 16, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between' },
  footerText:  { fontSize: 6.5, color: '#9ca3af' },
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function CFOBriefPDF({
  userName, reportDate, nw, snapshots, assets, liabilities, goal, wings,
}: CFOBriefProps) {
  const totalAssets = Number(nw?.totalAssets ?? 0);
  const totalLiab   = Number(nw?.totalLiabilities ?? 0);
  const netWorth    = Number(nw?.netWorth ?? 0);

  const trendSnaps = snapshots.slice(-13);
  const latest = trendSnaps[trendSnaps.length - 1];
  const prev   = trendSnaps[trendSnaps.length - 2];
  const oldest = trendSnaps[0];
  const momChange = latest && prev ? Number(latest.netWorth) - Number(prev.netWorth) : null;
  const yoyChange = trendSnaps.length >= 2 ? Number(latest?.netWorth ?? 0) - Number(oldest.netWorth) : null;
  const momPct = momChange != null && Number(prev?.netWorth ?? 0) > 0
    ? (momChange / Number(prev!.netWorth)) * 100 : null;

  // Cash flow
  const income     = Number(goal?.monthlyIncome ?? 0);
  const accum      = Number(goal?.monthlyCryptoBudget ?? 0);
  const obligations = liabilities.reduce((s, l) => s + Number(l.monthlyPayment ?? 0), 0);
  const netCF      = income - obligations;

  // Mortgage obligations from assets
  const mortgageDebt = assets
    .filter(a => a.assetClass === 'real_estate' && Number(a.mortgageBalance ?? 0) > 0)
    .map(a => ({ name: a.name || a.propertyAddress || 'Property', balance: Number(a.mortgageBalance ?? 0) }));

  // Asset allocation
  const equityVal = Number(nw?.breakdown.equityValue ?? 0);
  const reVal     = Number(nw?.breakdown.realEstateValue ?? 0);
  const otherVal  = Number(nw?.breakdown.otherValue ?? 0);
  const allocation = [
    { label: 'Equities & Securities', value: equityVal },
    { label: 'Real Estate (Equity)',   value: reVal     },
    { label: 'Cash & Other Assets',    value: otherVal  },
  ].filter(r => r.value > 0);

  // Liquidity estimate (cash/other minus non-liquid real estate equity)
  const liquidEstimate = otherVal;

  const activeLiabilities = liabilities.filter(l => l.balance > 0).slice(0, 6);

  return (
    <Document title={`CFO Brief — ${userName} — ${reportDate}`}>
      <Page size="LETTER" style={s.page}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>CFO BRIEF</Text>
            <Text style={[s.headerSub, { marginTop: 3 }]}>{userName}</Text>
          </View>
          <Text style={s.headerSub}>{reportDate}</Text>
        </View>

        {/* ── Net Worth Statement ─────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.secLabel}>Net Worth Statement</Text>
          <View style={s.row}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Total Assets</Text>
              <Text style={[s.statValue, { color: GREEN }]}>{fmt(totalAssets)}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>Total Liabilities</Text>
              <Text style={[s.statValue, { color: RED }]}>{fmt(totalLiab)}</Text>
            </View>
            <View style={s.statBoxLast}>
              <Text style={s.statLabel}>Net Worth</Text>
              <Text style={s.statValueLg}>{fmt(netWorth)}</Text>
            </View>
          </View>
          {(momChange != null || yoyChange != null) && (
            <View style={[s.row, { marginTop: 7 }]}>
              {momChange != null && (
                <Text style={{ fontSize: 8, color: momChange >= 0 ? GREEN : RED, marginRight: 20 }}>
                  MoM: {fmtSign(momChange)}{momPct != null ? ` (${fmtPct(momPct)})` : ''}
                </Text>
              )}
              {yoyChange != null && (
                <Text style={{ fontSize: 8, color: yoyChange >= 0 ? GREEN : RED }}>
                  YoY: {fmtSign(yoyChange)}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={s.divider} />

        {/* ── Two-column: Cash Flow + Asset Allocation ─────────────────────────── */}
        <View style={[s.row, { marginBottom: 14 }]}>

          {/* Cash Flow */}
          <View style={[s.colL, { backgroundColor: LIGHT, borderRadius: 6, padding: '10 12' }]}>
            <Text style={s.secLabel}>Cash Flow (Monthly)</Text>
            {[
              { label: 'Current Income',      value: income,      color: GREEN },
              { label: 'Debt Obligations',     value: -obligations, color: RED  },
              { label: 'Accumulation Budget',  value: -accum,      color: '#7c3aed' },
            ].filter(r => r.value !== 0).map(({ label, value, color }) => (
              <View key={label} style={[s.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
                <Text style={{ fontSize: 8, color: GRAY }}>{label}</Text>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color }}>
                  {value < 0 ? `(${fmt(Math.abs(value))})` : fmt(value)}
                </Text>
              </View>
            ))}
            <View style={{ borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4, paddingTop: 5 }}>
              <View style={[s.row, { justifyContent: 'space-between' }]}>
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#111827' }}>Net Available</Text>
                <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: netCF - accum >= 0 ? GREEN : RED }}>
                  {fmt(netCF - accum)}
                </Text>
              </View>
            </View>
          </View>

          {/* Asset Allocation */}
          <View style={[s.col, { backgroundColor: LIGHT, borderRadius: 6, padding: '10 12' }]}>
            <Text style={s.secLabel}>Asset Allocation</Text>
            {allocation.map(({ label, value }) => (
              <View key={label} style={[s.row, { justifyContent: 'space-between', marginBottom: 5 }]}>
                <Text style={{ fontSize: 8, color: GRAY, flex: 2 }}>{label}</Text>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#111827', textAlign: 'right', flex: 1 }}>{fmt(value)}</Text>
                <Text style={{ fontSize: 8, color: GRAY, textAlign: 'right', flex: 1, marginLeft: 4 }}>
                  {totalAssets > 0 ? `${((value / totalAssets) * 100).toFixed(0)}%` : '—'}
                </Text>
              </View>
            ))}
            {liquidEstimate > 0 && (
              <>
                <View style={{ borderTopWidth: 1, borderTopColor: BORDER, marginTop: 4, paddingTop: 5 }}>
                  <View style={[s.row, { justifyContent: 'space-between' }]}>
                    <Text style={{ fontSize: 7.5, color: GRAY }}>Est. Liquid / Deployable</Text>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: GREEN }}>{fmt(liquidEstimate)}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Liabilities ──────────────────────────────────────────────────────── */}
        {(activeLiabilities.length > 0 || mortgageDebt.length > 0) && (
          <View style={s.section}>
            <Text style={s.secLabel}>Liabilities</Text>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 2.5 }]}>Name</Text>
              <Text style={s.thR}>Balance</Text>
              <Text style={s.thR}>Rate</Text>
              <Text style={s.thR}>Monthly</Text>
            </View>
            {mortgageDebt.map((m, i) => (
              <View key={`mort-${i}`} style={s.tableRow}>
                <Text style={[s.td, { flex: 2.5 }]}>{m.name} (Mortgage)</Text>
                <Text style={[s.tdR, { color: RED }]}>{fmt(m.balance)}</Text>
                <Text style={s.tdR}>—</Text>
                <Text style={s.tdR}>—</Text>
              </View>
            ))}
            {activeLiabilities.map(l => (
              <View key={l.id} style={s.tableRow}>
                <Text style={[s.td, { flex: 2.5 }]}>{l.name}</Text>
                <Text style={[s.tdR, { color: RED }]}>{fmt(Number(l.balance))}</Text>
                <Text style={s.tdR}>{l.interestRate != null ? `${Number(l.interestRate).toFixed(2)}%` : '—'}</Text>
                <Text style={s.tdR}>{l.monthlyPayment != null ? fmt(Number(l.monthlyPayment)) : '—'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Financial Strategy ───────────────────────────────────────────────── */}
        {goal?.financialMode && (
          <View style={[s.section, { backgroundColor: '#eff6ff', borderRadius: 6, padding: '9 12', borderLeftWidth: 3, borderLeftColor: BRAND }]}>
            <Text style={[s.secLabel, { marginBottom: 4 }]}>Financial Strategy</Text>
            <Text style={{ fontSize: 8.5, color: '#1e3a8a', lineHeight: 1.55 }}>{goal.financialMode}</Text>
          </View>
        )}

        {/* ── Legacy Wings ─────────────────────────────────────────────────────── */}
        {wings.length > 0 && (
          <View style={s.section}>
            <Text style={s.secLabel}>Legacy Wings</Text>
            <View style={s.wingRow}>
              {wings.map(w => (
                <View key={w.id} style={s.wingChip}>
                  <Text style={s.wingName}>{w.emoji}  {w.name}</Text>
                  <Text style={s.wingLevel}>
                    {w.assessed ? `Level ${w.level} / 5 · ${w.levelLabel}` : 'Not assessed'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>LegacyOS · CFO Brief · Confidential — not financial advice</Text>
          <Text style={s.footerText}>{reportDate}</Text>
        </View>

      </Page>
    </Document>
  );
}
