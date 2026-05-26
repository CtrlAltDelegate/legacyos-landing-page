// ─── Todo generation rules ────────────────────────────────────────────────────
// Each rule maps a family profile condition to an auto-generated todo item.
// `sourceKey` is a stable unique ID so the same todo is never duplicated.

export interface TodoRule {
  sourceKey: string;
  title: string;
  description: string;
  category: 'document' | 'action' | 'review';
  priority: number;   // 0 = highest urgency
  relatedWing?: string;
  actionUrl?: string;
  isInternal?: boolean;
  condition: (a: Record<string, unknown>) => boolean;
}

export const TODO_RULES: TodoRule[] = [
  // ── Emergency fund ───────────────────────────────────────────────────────
  {
    sourceKey: 'build_emergency_fund',
    title: 'Build your emergency fund',
    description: 'You need 3–6 months of living expenses in a high-yield savings account before investing. This is the single most important financial foundation.',
    category: 'action',
    priority: 5,
    relatedWing: 'preservation',
    actionUrl: '/wings/preservation',
    isInternal: true,
    condition: (a) => a.has_emergency_fund === false,
  },

  // ── Life insurance ────────────────────────────────────────────────────────
  {
    sourceKey: 'get_life_insurance',
    title: 'Get a life insurance quote',
    description: 'You have dependents but no life insurance. If something happened to you, your family would be financially exposed. Term life is inexpensive and fast to get.',
    category: 'action',
    priority: 10,
    relatedWing: 'preservation',
    actionUrl: 'https://www.policygenius.com/life-insurance/',
    condition: (a) =>
      a.has_life_insurance === false &&
      (a.has_kids === true || a.is_married === true),
  },

  // ── Will ──────────────────────────────────────────────────────────────────
  {
    sourceKey: 'create_will',
    title: 'Create a will and power of attorney',
    description: 'Without a will, courts decide what happens to your assets and — if you have children — who raises them. This takes less than an hour online.',
    category: 'action',
    priority: 15,
    relatedWing: 'preservation',
    actionUrl: 'https://trustandwill.com',
    condition: (a) => a.has_will === false,
  },

  // ── Disability insurance ───────────────────────────────────────────────────
  {
    sourceKey: 'get_disability_insurance',
    title: 'Get disability insurance',
    description: "You're the primary earner but have no disability coverage. Your ability to earn is your most valuable asset — protect it.",
    category: 'action',
    priority: 20,
    relatedWing: 'preservation',
    actionUrl: 'https://www.policygenius.com/disability-insurance/',
    condition: (a) =>
      a.has_disability_insurance === false && a.is_primary_earner === true,
  },

  // ── Beneficiaries ──────────────────────────────────────────────────────────
  {
    sourceKey: 'designate_beneficiaries',
    title: 'Designate beneficiaries on all accounts',
    description: 'Retirement accounts and life insurance pass outside your will. If beneficiaries are missing or outdated, assets may go to the wrong person — or to probate.',
    category: 'review',
    priority: 25,
    relatedWing: 'preservation',
    condition: (a) => a.beneficiaries_designated === false,
  },

  // ── Vehicle — leased ─────────────────────────────────────────────────────
  {
    sourceKey: 'upload_vehicle_lease',
    title: 'Upload your vehicle lease document',
    description: 'Your vehicle lease is a key financial document — LegacyOS will extract your payment, end date, and mileage terms so you can track it.',
    category: 'document',
    priority: 30,
    actionUrl: '/documents',
    isInternal: true,
    condition: (a) => a.vehicle_status === 'leased',
  },

  // ── Vehicle — financed ────────────────────────────────────────────────────
  {
    sourceKey: 'upload_vehicle_loan',
    title: 'Upload your vehicle loan document',
    description: 'Your auto loan is a liability — upload the statement and LegacyOS will track the remaining balance and payoff date.',
    category: 'document',
    priority: 31,
    actionUrl: '/documents',
    isInternal: true,
    condition: (a) => a.vehicle_status === 'financed',
  },

  // ── Second vehicle — leased ───────────────────────────────────────────────
  {
    sourceKey: 'upload_vehicle2_lease',
    title: 'Upload your second vehicle lease document',
    description: 'Track your second vehicle lease — payments, end date, and mileage terms.',
    category: 'document',
    priority: 32,
    actionUrl: '/documents',
    isInternal: true,
    condition: (a) =>
      a.has_multiple_vehicles === true && a.vehicle2_status === 'leased',
  },

  // ── Second vehicle — financed ─────────────────────────────────────────────
  {
    sourceKey: 'upload_vehicle2_loan',
    title: 'Upload your second vehicle loan document',
    description: 'Track your second auto loan balance and payoff timeline.',
    category: 'document',
    priority: 33,
    actionUrl: '/documents',
    isInternal: true,
    condition: (a) =>
      a.has_multiple_vehicles === true && a.vehicle2_status === 'financed',
  },

  // ── Living trust ──────────────────────────────────────────────────────────
  {
    sourceKey: 'consider_living_trust',
    title: 'Consider setting up a living trust',
    description: 'You have children but no trust. A revocable living trust keeps your estate out of probate, stays private, and lets you control exactly how assets reach your kids.',
    category: 'action',
    priority: 40,
    relatedWing: 'preservation',
    actionUrl: 'https://trustandwill.com',
    condition: (a) => a.has_trust === false && a.has_kids === true,
  },

  // ── Business entity ───────────────────────────────────────────────────────
  {
    sourceKey: 'form_business_entity',
    title: 'Form a business entity (LLC or S-Corp)',
    description: "You're self-employed without a formal business structure. An LLC separates your personal assets from business liability; an S-Corp can significantly reduce self-employment taxes.",
    category: 'action',
    priority: 45,
    relatedWing: 'operations',
    actionUrl: 'https://www.legalzoom.com/business/business-formation/',
    condition: (a) =>
      a.is_self_employed === true && a.has_business_entity === false,
  },

  // ── Custody / guardianship ────────────────────────────────────────────────
  {
    sourceKey: 'review_custody_docs',
    title: 'Review guardianship and custody documents',
    description: "You have children and aren't in a married co-parenting situation. Your will should explicitly name a guardian, and a family lawyer can help document custody and financial provisions.",
    category: 'review',
    priority: 50,
    relatedWing: 'legacy',
    condition: (a) =>
      a.has_kids === true &&
      a.co_parent_relationship !== 'married',
  },

  // ── Umbrella policy ────────────────────────────────────────────────────────
  {
    sourceKey: 'get_umbrella_policy',
    title: 'Get an umbrella liability policy',
    description: 'An umbrella policy covers you above and beyond your home and auto insurance — usually $1M+ for $200–400/year. As your net worth grows, this becomes essential protection.',
    category: 'action',
    priority: 60,
    relatedWing: 'preservation',
    condition: (a) => a.has_umbrella_policy === false,
  },

  // ── Upload mortgage documents ──────────────────────────────────────────────
  {
    sourceKey: 'upload_mortgage_statement',
    title: 'Upload your mortgage statement',
    description: 'Your mortgage statement lets LegacyOS track your exact balance, rate, and payoff timeline — and keep your home equity accurate.',
    category: 'document',
    priority: 70,
    actionUrl: '/documents',
    isInternal: true,
    condition: (a) => a.has_mortgage === true,
  },

  // ── Family mission ─────────────────────────────────────────────────────────
  {
    sourceKey: 'write_family_mission',
    title: 'Write your family mission statement',
    description: 'One paragraph that defines what your family stands for and what you are building together. Flo can help you draft it in minutes.',
    category: 'action',
    priority: 80,
    relatedWing: 'legacy',
    actionUrl: '/flo',
    isInternal: true,
    condition: (a) => a.has_kids === true,
  },
];

/** Generate todo items from family profile answers. */
export function generateTodoItems(
  answers: Record<string, unknown>
): Omit<TodoRule, 'condition'>[] {
  return TODO_RULES
    .filter((rule) => rule.condition(answers))
    .map(({ condition: _condition, ...rest }) => rest);
}
