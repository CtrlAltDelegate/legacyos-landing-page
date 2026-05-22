import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { getErrorMessage } from '@/api/client';
import {
  getAdminUsers,
  updateAdminUser,
  getAffiliateLinks,
  upsertAffiliateLink,
  deleteAffiliateLink,
  type AdminUser,
  type AdminAffiliateLink,
} from '@/api/admin';
import Spinner from '@/components/Spinner';

type Tab = 'users' | 'affiliates';

const PLAN_OPTIONS = ['free', 'core', 'premium'];

const LEVEL_LABELS = ['Foundation', 'Building', 'Established', 'Advanced'];

// ─── Affiliate link row editor ────────────────────────────────────────────────

function AffiliateLinkRow({
  link,
  onSave,
  onReset,
}: {
  link: AdminAffiliateLink;
  onSave: (wingId: string, level: number, url: string, label: string) => Promise<void>;
  onReset: (wingId: string, level: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(link.actionUrl);
  const [label, setLabel] = useState(link.actionLabel);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(link.wingId, link.level, url, label);
    setSaving(false);
    setEditing(false);
  }

  async function handleReset() {
    setSaving(true);
    await onReset(link.wingId, link.level);
    setSaving(false);
    setEditing(false);
  }

  return (
    <tr className="border-t border-gray-100">
      <td className="py-3 pl-4 pr-3 text-sm">
        <span className="mr-1">{link.wingEmoji}</span>
        <span className="font-medium text-gray-900">{link.wingName}</span>
      </td>
      <td className="px-3 py-3 text-sm text-gray-500">{LEVEL_LABELS[link.level]}</td>
      <td className="px-3 py-3 text-sm text-gray-700">{link.productName}</td>
      <td className="px-3 py-3 text-sm">
        {editing ? (
          <div className="space-y-1.5">
            <input
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
              placeholder="Button label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <input
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
              placeholder="https://your-affiliate-link.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        ) : (
          <a
            href={link.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-600 hover:underline break-all"
          >
            {link.actionUrl}
          </a>
        )}
      </td>
      <td className="px-3 py-3 text-center">
        {link.hasOverride ? (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            Live
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
            Default
          </span>
        )}
      </td>
      <td className="py-3 pl-3 pr-4 text-right text-xs">
        {editing ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !url}
              className="rounded bg-brand-600 px-3 py-1 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? <Spinner className="h-3 w-3" /> : 'Save'}
            </button>
            {link.hasOverride && (
              <button
                onClick={handleReset}
                disabled={saving}
                className="rounded bg-red-50 px-3 py-1 font-semibold text-red-600 hover:bg-red-100"
              >
                Reset
              </button>
            )}
            <button
              onClick={() => { setEditing(false); setUrl(link.actionUrl); setLabel(link.actionLabel); }}
              className="text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="rounded border border-gray-200 px-3 py-1 font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50"
          >
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Admin page ───────────────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('users');

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');

  // Affiliates state
  const [links, setLinks] = useState<AdminAffiliateLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [linksError, setLinksError] = useState('');

  // Guard — redirect non-admins immediately
  useEffect(() => {
    if (user && !user.isAdmin) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .catch((err) => setUsersError(getErrorMessage(err)))
      .finally(() => setUsersLoading(false));

    getAffiliateLinks()
      .then(setLinks)
      .catch((err) => setLinksError(getErrorMessage(err)))
      .finally(() => setLinksLoading(false));
  }, []);

  async function handlePlanChange(userId: string, plan: string) {
    try {
      await updateAdminUser(userId, { plan });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, plan } : u));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  async function handleAdminToggle(userId: string, isAdmin: boolean) {
    try {
      await updateAdminUser(userId, { isAdmin });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isAdmin } : u));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  async function handleAffiliateSave(wingId: string, level: number, actionUrl: string, actionLabel: string) {
    try {
      await upsertAffiliateLink(wingId, level, { actionUrl, actionLabel });
      const updated = await getAffiliateLinks();
      setLinks(updated);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  async function handleAffiliateReset(wingId: string, level: number) {
    try {
      await deleteAffiliateLink(wingId, level);
      const updated = await getAffiliateLinks();
      setLinks(updated);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-semibold border-b-2 transition ${
      tab === t
        ? 'border-brand-600 text-brand-700'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage users, plans, and affiliate links.</p>
        </div>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
          Admin only
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-2">
        <button className={tabClass('users')} onClick={() => setTab('users')}>
          Users
          {!usersLoading && (
            <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
              {users.length}
            </span>
          )}
        </button>
        <button className={tabClass('affiliates')} onClick={() => setTab('affiliates')}>
          Affiliate Links
          {!linksLoading && (
            <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
              {links.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Users tab ─────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {usersLoading ? (
            <div className="flex justify-center p-12"><Spinner className="h-6 w-6" /></div>
          ) : usersError ? (
            <p className="p-6 text-sm text-red-600">{usersError}</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['User', 'Plan', 'Wings', 'Assets', 'Admin', 'Joined'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.fullName ?? '—'}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.plan}
                        onChange={(e) => handlePlanChange(u.id, e.target.value)}
                        className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium focus:border-brand-500 focus:outline-none"
                      >
                        {PLAN_OPTIONS.map((p) => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u._count.wingAssessments} / 6</td>
                    <td className="px-4 py-3 text-gray-600">{u._count.assets}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleAdminToggle(u.id, !u.isAdmin)}
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
                          u.isAdmin
                            ? 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {u.isAdmin ? 'Admin' : 'User'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Affiliate Links tab ────────────────────────────────────────────── */}
      {tab === 'affiliates' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Set your real affiliate tracking URLs here. Each row shows the current URL (either your live override or the default from the config). Changes take effect immediately for all users.
          </p>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {linksLoading ? (
              <div className="flex justify-center p-12"><Spinner className="h-6 w-6" /></div>
            ) : linksError ? (
              <p className="p-6 text-sm text-red-600">{linksError}</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Wing', 'Level', 'Product', 'URL / Action Label', 'Status', ''].map((h) => (
                      <th key={h} className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 ${h === '' ? 'pr-4 text-right' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => (
                    <AffiliateLinkRow
                      key={`${link.wingId}-${link.level}`}
                      link={link}
                      onSave={handleAffiliateSave}
                      onReset={handleAffiliateReset}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-xs text-gray-400">
            "Reset" removes your override and restores the default URL from the app config.
          </p>
        </div>
      )}

    </div>
  );
}
