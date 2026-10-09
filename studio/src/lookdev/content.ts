// Real content for the look-dev frames. Source: corpus/canon/data_contract.json (master §5.2, §6.3, §6.7, §6.18, §6.19)
// and corpus/canon/chapters.json labels. No invented figures: anything schematic is marked as such.

export type Receipt = {id: string; operator: 'A' | 'B'; amount_egp: number; status: 'OK' | 'FAILED'};
// data_contract.receipts (§5.2) — 4 / 6 OK = 66.67 %, OK total 400 EGP (A 250, B 150)
export const RECEIPTS: Receipt[] = [
  {id: 'T1', operator: 'A', amount_egp: 120, status: 'OK'},
  {id: 'T2', operator: 'A', amount_egp: 80, status: 'OK'},
  {id: 'T3', operator: 'B', amount_egp: 200, status: 'FAILED'},
  {id: 'T4', operator: 'A', amount_egp: 50, status: 'OK'},
  {id: 'T5', operator: 'B', amount_egp: 150, status: 'OK'},
  {id: 'T6', operator: 'B', amount_egp: 100, status: 'FAILED'},
];

// d:6.3:2 — rows surviving each of the nine logical stages (master line 364 order)
export const SQL_FUNNEL = [
  {stage: 'FROM', rows: 14},
  {stage: 'JOIN', rows: 13},
  {stage: 'WHERE', rows: 11},
  {stage: 'GROUP BY', rows: 2},
  {stage: 'HAVING', rows: 2},
  {stage: 'SELECT', rows: 2},
  {stage: 'DISTINCT', rows: 2},
  {stage: 'ORDER BY', rows: 2},
  {stage: 'LIMIT', rows: 1},
];
// d:6.3:1
export const SQL_LINES = [
  'SELECT c.tier, SUM(o.total) AS revenue',
  'FROM orders o',
  'JOIN customers c ON c.id = o.customer_id',
  "WHERE o.status = 'delivered'",
  'GROUP BY c.tier',
  'HAVING SUM(o.total) > 300',
  'ORDER BY revenue DESC',
  'LIMIT 1',
];

// §6.7: documented order → edit costs 5 s; `COPY . .` above `pip install` → 57 s. Base image tag deliberately unversioned.
export const DOCKER = {
  headline: '5 ثوانٍ مقابل 57', // chapters.json CH-34 labels_ar
  good: [
    {text: 'FROM python:slim', state: 'cached'},
    {text: 'WORKDIR /app', state: 'cached'},
    {text: 'COPY requirements.txt .', state: 'cached'},
    {text: 'RUN pip install -r requirements.txt', state: 'cached'},
    {text: 'COPY . .', state: 'edited'},
  ] as {text: string; state: 'cached' | 'edited' | 'cascade'}[],
  bad: [
    {text: 'FROM python:slim', state: 'cached'},
    {text: 'WORKDIR /app', state: 'cached'},
    {text: 'COPY . .', state: 'edited'},
    {text: 'RUN pip install -r requirements.txt', state: 'cascade'},
  ] as {text: string; state: 'cached' | 'edited' | 'cascade'}[],
  seconds: {good: 5, bad: 57},
};

// §6.18 — query and the two measured scores. The third neighbour has NO canonical score and is shown without one.
export const RAG = {
  queryAr: 'إزاي أمنع ⟦job⟧ إنها تحمّل نفس الصفوف مرتين', // S1 narration, CH-33 (w:S1:ar-natural:005957–005964)
  queryEn: 'how do I stop a job loading the same rows twice',
  before: {label: 'قسم الـroadmap', score: 0.165, note: 'من غير توسيع'},
  after: {label: 'قسم الـidempotency', score: 0.227, note: 'مع توسيع الـquery'},
  third: {label: 'chunk'},
};
