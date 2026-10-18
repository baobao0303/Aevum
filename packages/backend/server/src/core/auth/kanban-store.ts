import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type TableRowStatus = 'In Process' | 'Done' | 'Planned';

export interface KanbanSubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface KanbanCardItem {
  id: string;
  code: string;
  title: string;
  description: string;
  acceptanceCriteria?: string;
  status: string;
  type: 'Epic' | 'Feature' | 'Task' | 'Bug' | 'Testcase';
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  assignee: string;
  dueDate: string;
  progress: number;
  tags: string[];
  subtasks: KanbanSubtask[];
  updatedAt: string;
}

export interface KanbanBoardRecord {
  id: string;
  workspaceId: string;
  kind: 'personal' | 'bot';
  name: string;
  description: string;
  sectionType: string;
  tableStatus: TableRowStatus;
  target: number;
  limit: number;
  reviewer: string;
  columns: string[];
  cards: KanbanCardItem[];
  linkedDocId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanBoardSummary {
  id: string;
  workspaceId: string;
  kind: 'personal' | 'bot';
  name: string;
  description: string;
  sectionType: string;
  tableStatus: TableRowStatus;
  target: number;
  limit: number;
  reviewer: string;
  columns: string[];
  cardCount: number;
  completedCount: number;
  inProgressCount: number;
  completionRate: number;
  columnCounts: Record<string, number>;
  linkedDocId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanBoardDetail extends KanbanBoardSummary {
  cards: KanbanCardItem[];
  stats: {
    totalCards: number;
    completedCards: number;
    inProgressCards: number;
    blockedCards: number;
    completionRate: number;
    byColumn: Record<string, number>;
    byPriority: Record<string, number>;
    byAssignee: Record<string, number>;
  };
}

export interface KanbanAccessContext {
  isAdmin?: boolean;
  userEmail?: string;
  userName?: string;
}

export const FLOCI_HARNESS_BOARD_ID = 'board-floci-harness';
const FLOCI_HARNESS_TABLE = 'harness_work_items';
const FLOCI_HARNESS_DEFAULT_COLUMNS = [
  'New',
  'Accepted',
  'Active',
  'Blocked',
  'Resolved',
  'Closed',
];

const STORE_FILE = join(tmpdir(), 'aevum-kanban-boards-store-v3.json');

const LEGACY_SEED_BOARD_IDS = new Set([
  'board-aevum-sprint',
  'board-architecture-roadmap',
]);

function cleanHtml(raw: string | undefined | null): string {
  if (!raw) return '';
  return String(raw)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFlociConfig() {
  const backend = (process.env.HARNESS_BACKEND || 'floci').trim().toLowerCase();
  const endpoint = (
    process.env.FLOCI_ENDPOINT ||
    process.env.AWS_ENDPOINT_URL ||
    ''
  ).trim();
  const s3Bucket = (process.env.FLOCI_S3_BUCKET || 'harness-data').trim();
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || 'test').trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || 'test').trim();
  const region = (process.env.AWS_REGION || 'us-east-1').trim();

  return {
    enabled: backend === 'floci' && Boolean(endpoint),
    backend,
    endpoint,
    s3Bucket,
    accessKeyId,
    secretAccessKey,
    region,
  };
}

interface DynamoAttributeValue {
  S?: string;
  N?: string;
  BOOL?: boolean;
  SS?: string[];
  L?: DynamoAttributeValue[];
}

type DynamoItem = Record<string, DynamoAttributeValue>;

let cachedFlociCards: { cards: KanbanCardItem[]; fetchedAt: number } | null =
  null;
const FLOCI_CACHE_TTL_MS = 5000;

async function callFlociDynamo(
  operation: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const cfg = getFlociConfig();
  if (!cfg.enabled) {
    throw new Error('Floci Harness backend is not configured in .env');
  }
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const isoTimestamp = `${dateStamp}T000000Z`;
  const res = await fetch(cfg.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Date': isoTimestamp,
      'X-Amz-Target': `DynamoDB_20120810.${operation}`,
      Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${dateStamp}/${cfg.region}/dynamodb/aws4_request, SignedHeaders=host;x-amz-date;x-amz-target, Signature=0000`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Floci DynamoDB ${operation} HTTP ${res.status}: ${errText}`
    );
  }
  return (await res.json()) as Record<string, unknown>;
}

function mapHarnessStateToColumn(rawState: string): string {
  const trimmed = rawState.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'new' || lower === 'open' || lower === 'to do') return 'New';
  if (lower === 'accepted' || lower === 'approved') return 'Accepted';
  if (
    lower === 'active' ||
    lower === 'in progress' ||
    lower === 'doing' ||
    lower === 'in review'
  ) {
    return 'Active';
  }
  if (lower === 'blocked') return 'Blocked';
  if (lower === 'resolved' || lower === 'ready for qc') return 'Resolved';
  if (lower === 'closed' || lower === 'done') return 'Closed';
  return 'New';
}

function mapHarnessPriority(rawPriority: string): KanbanCardItem['priority'] {
  const upper = rawPriority.trim().toUpperCase();
  if (
    upper === 'P0' ||
    upper === '1' ||
    upper === 'URGENT' ||
    upper === 'CRITICAL'
  ) {
    return 'Urgent';
  }
  if (upper === 'P1' || upper === '2' || upper === 'HIGH') {
    return 'High';
  }
  if (upper === 'P3' || upper === '4' || upper === 'LOW') {
    return 'Low';
  }
  return 'Medium';
}

function mapPriorityToHarness(priority: KanbanCardItem['priority']): string {
  switch (priority) {
    case 'Urgent':
      return 'P0';
    case 'High':
      return 'P1';
    case 'Low':
      return 'P3';
    case 'Medium':
    default:
      return 'P2';
  }
}

function mapHarnessType(rawType: string): KanbanCardItem['type'] {
  const lower = rawType.trim().toLowerCase();
  if (lower === 'epic') return 'Epic';
  if (lower === 'feature') return 'Feature';
  if (lower === 'bug') return 'Bug';
  if (lower === 'testcase' || lower === 'test case') return 'Testcase';
  return 'Task';
}

function mapDynamoItemToCard(item: DynamoItem): KanbanCardItem | null {
  const rawId = item.id?.N || item.id?.S || '';
  if (!rawId) return null;

  const rawState = item.state?.S || 'New';
  if (rawState.toLowerCase() === 'removed') return null;

  const status = mapHarnessStateToColumn(rawState);
  const rawType = item.type?.S || 'Task';
  const type = mapHarnessType(rawType);
  const priority = mapHarnessPriority(item.priority?.S || 'P2');
  const title = cleanHtml(item.title?.S || `Work Item #${rawId}`);
  const description = cleanHtml(item.description?.S || '');
  const acceptanceCriteria = cleanHtml(item.acceptance_criteria?.S || '');
  const assignee = cleanHtml(
    item.assigned_to?.S ||
      item.assigned_to_profile?.S ||
      item.created_by_profile?.S ||
      'Peer'
  );
  const updatedRaw = item.updated_at?.S || item.created_at?.S || '';
  const updatedAt = updatedRaw
    ? updatedRaw.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const progress =
    status === 'Closed'
      ? 100
      : status === 'Resolved'
        ? 90
        : status === 'Active'
          ? 55
          : status === 'Accepted'
            ? 25
            : status === 'Blocked'
              ? 35
              : 0;

  const tags: string[] = [rawType];
  if (item.source?.S) tags.push(item.source.S);
  if (item.iteration_path?.S) {
    const parts = item.iteration_path.S.split('\\');
    const lastPart = parts[parts.length - 1];
    if (lastPart) tags.push(lastPart);
  }

  // Parse numbered lines from acceptance_criteria into subtasks if present
  const subtasks: KanbanSubtask[] = [];
  if (acceptanceCriteria) {
    const segments = acceptanceCriteria
      .split(/(?:\r?\n|(?=\b\d+\.\s))/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    segments.forEach((seg, idx) => {
      subtasks.push({
        id: `wi-${rawId}-sub-${idx + 1}`,
        title: seg.replace(/^\d+\.\s*/, ''),
        done: status === 'Closed' || status === 'Resolved',
      });
    });
  }
  if (subtasks.length === 0) {
    subtasks.push({
      id: `wi-${rawId}-sub-1`,
      title: 'Thực thi và nghiệm thu theo chuẩn SLPC',
      done: status === 'Closed' || status === 'Resolved',
    });
  }

  return {
    id: `wi-${rawId}`,
    code: `WI-${rawId}`,
    title,
    description,
    acceptanceCriteria,
    status,
    type,
    priority,
    assignee,
    dueDate: updatedAt,
    progress,
    tags,
    subtasks,
    updatedAt,
  };
}

async function fetchFlociHarnessCards(
  forceRefresh = false
): Promise<KanbanCardItem[]> {
  if (
    !forceRefresh &&
    cachedFlociCards &&
    Date.now() - cachedFlociCards.fetchedAt < FLOCI_CACHE_TTL_MS
  ) {
    return cachedFlociCards.cards;
  }

  const allItems: DynamoItem[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const payload: Record<string, unknown> = {
      TableName: FLOCI_HARNESS_TABLE,
      FilterExpression: '#t <> :tc',
      ExpressionAttributeNames: { '#t': 'type' },
      ExpressionAttributeValues: { ':tc': { S: 'Testcase' } },
    };
    if (exclusiveStartKey) {
      payload.ExclusiveStartKey = exclusiveStartKey;
    }
    const data = await callFlociDynamo('Scan', payload);
    if (Array.isArray(data.Items)) {
      allItems.push(...(data.Items as DynamoItem[]));
    }
    exclusiveStartKey = data.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined;
  } while (exclusiveStartKey);

  const cards: KanbanCardItem[] = [];
  for (const item of allItems) {
    const mapped = mapDynamoItemToCard(item);
    if (mapped) cards.push(mapped);
  }

  // Sort by numeric ID descending so newest items appear first
  cards.sort((a, b) => {
    const numA = Number(a.id.replace(/^wi-/, '')) || 0;
    const numB = Number(b.id.replace(/^wi-/, '')) || 0;
    return numB - numA;
  });

  cachedFlociCards = {
    cards,
    fetchedAt: Date.now(),
  };
  return cards;
}

interface StoreData {
  workspaces: Record<string, KanbanBoardRecord[]>;
  flociBoardMeta?: Partial<KanbanBoardRecord>;
}

function readStore(): StoreData {
  try {
    if (existsSync(STORE_FILE)) {
      const raw = readFileSync(STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as StoreData;
      if (parsed && typeof parsed.workspaces === 'object') {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return { workspaces: {} };
}

function writeStore(data: StoreData) {
  try {
    writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write kanban store:', err);
  }
}

async function buildFlociHarnessBoardRecord(
  workspaceId: string,
  forceRefresh = false
): Promise<KanbanBoardRecord | null> {
  const cfg = getFlociConfig();
  if (!cfg.enabled) return null;

  try {
    const cards = await fetchFlociHarnessCards(forceRefresh);
    const store = readStore();
    const meta = store.flociBoardMeta || {};
    const now = new Date().toISOString().slice(0, 10);

    return {
      id: FLOCI_HARNESS_BOARD_ID,
      workspaceId: workspaceId || 'default',
      kind: 'bot',
      name: meta.name || `SLPC Harness — Floci DynamoDB (${cfg.s3Bucket})`,
      description:
        meta.description ||
        `Đồng bộ trực tiếp bảng ${FLOCI_HARNESS_TABLE} trên Floci Cloud (${cfg.s3Bucket}) — Chỉ hiển thị cho Admin.`,
      sectionType: meta.sectionType || 'SLPC Harness',
      tableStatus: meta.tableStatus || 'In Process',
      target: meta.target ?? cards.length,
      limit: meta.limit ?? 25,
      reviewer: meta.reviewer || 'Supervisor',
      columns:
        Array.isArray(meta.columns) && meta.columns.length > 0
          ? meta.columns
          : FLOCI_HARNESS_DEFAULT_COLUMNS,
      cards,
      linkedDocId: meta.linkedDocId,
      createdAt: '2026-10-08',
      updatedAt: cards[0]?.updatedAt || now,
    };
  } catch (err) {
    console.error('Failed to build Floci Harness board:', err);
    return null;
  }
}

function ensureWorkspaceBoards(workspaceId: string): KanbanBoardRecord[] {
  const key = workspaceId || 'default';
  const store = readStore();
  if (!Array.isArray(store.workspaces[key])) {
    store.workspaces[key] = [];
    writeStore(store);
  } else {
    const filtered = store.workspaces[key].filter(
      b => !LEGACY_SEED_BOARD_IDS.has(b.id) && b.id !== FLOCI_HARNESS_BOARD_ID
    );
    if (filtered.length !== store.workspaces[key].length) {
      store.workspaces[key] = filtered;
      writeStore(store);
    }
  }
  return store.workspaces[key];
}

function saveWorkspaceBoards(workspaceId: string, boards: KanbanBoardRecord[]) {
  const key = workspaceId || 'default';
  const store = readStore();
  store.workspaces[key] = boards.filter(b => b.id !== FLOCI_HARNESS_BOARD_ID);
  writeStore(store);
}

function isCompletedColumn(col: string): boolean {
  const lower = col.toLowerCase();
  return (
    lower === 'done' ||
    lower === 'closed' ||
    lower === 'resolved' ||
    lower === 'hoàn thành' ||
    lower === 'đã xong'
  );
}

function isInProgressColumn(col: string): boolean {
  const lower = col.toLowerCase();
  return (
    lower === 'in progress' ||
    lower === 'active' ||
    lower === 'in review' ||
    lower === 'accepted' ||
    lower === 'đang thực hiện' ||
    lower === 'đang làm'
  );
}

export function toBoardSummary(board: KanbanBoardRecord): KanbanBoardSummary {
  const columnCounts: Record<string, number> = {};
  for (const col of board.columns) {
    columnCounts[col] = 0;
  }
  let completedCount = 0;
  let inProgressCount = 0;
  for (const card of board.cards) {
    columnCounts[card.status] = (columnCounts[card.status] ?? 0) + 1;
    if (isCompletedColumn(card.status) || card.progress === 100) {
      completedCount += 1;
    } else if (isInProgressColumn(card.status)) {
      inProgressCount += 1;
    }
  }
  const cardCount = board.cards.length;
  const completionRate =
    cardCount > 0 ? Math.round((completedCount / cardCount) * 100) : 0;

  return {
    id: board.id,
    workspaceId: board.workspaceId,
    kind: board.kind,
    name: board.name,
    description: board.description,
    sectionType: board.sectionType,
    tableStatus: board.tableStatus,
    target: board.target,
    limit: board.limit,
    reviewer: board.reviewer,
    columns: board.columns,
    cardCount,
    completedCount,
    inProgressCount,
    completionRate,
    columnCounts,
    linkedDocId: board.linkedDocId,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

export function toBoardDetail(board: KanbanBoardRecord): KanbanBoardDetail {
  const summary = toBoardSummary(board);
  const byPriority: Record<string, number> = {};
  const byAssignee: Record<string, number> = {};
  let blockedCards = 0;

  for (const card of board.cards) {
    byPriority[card.priority] = (byPriority[card.priority] ?? 0) + 1;
    if (card.assignee) {
      byAssignee[card.assignee] = (byAssignee[card.assignee] ?? 0) + 1;
    }
    if (card.status.toLowerCase() === 'blocked') {
      blockedCards += 1;
    }
  }

  return {
    ...summary,
    cards: board.cards,
    stats: {
      totalCards: summary.cardCount,
      completedCards: summary.completedCount,
      inProgressCards: summary.inProgressCount,
      blockedCards,
      completionRate: summary.completionRate,
      byColumn: summary.columnCounts,
      byPriority,
      byAssignee,
    },
  };
}

export async function listKanbanBoards(
  workspaceId: string,
  access?: KanbanAccessContext
): Promise<KanbanBoardSummary[]> {
  const boards = ensureWorkspaceBoards(workspaceId);
  const summaries = boards.map(toBoardSummary);

  if (access?.isAdmin) {
    const flociBoard = await buildFlociHarnessBoardRecord(workspaceId);
    if (flociBoard) {
      return [toBoardSummary(flociBoard), ...summaries];
    }
  }

  return summaries;
}

export async function getKanbanBoardDetail(
  workspaceId: string,
  boardId: string,
  access?: KanbanAccessContext
): Promise<KanbanBoardDetail | null> {
  if (boardId === FLOCI_HARNESS_BOARD_ID) {
    if (!access?.isAdmin) return null;
    const flociBoard = await buildFlociHarnessBoardRecord(workspaceId);
    return flociBoard ? toBoardDetail(flociBoard) : null;
  }

  const boards = ensureWorkspaceBoards(workspaceId);
  const found = boards.find(b => b.id === boardId);
  return found ? toBoardDetail(found) : null;
}

export function createKanbanBoard(
  workspaceId: string,
  input: Record<string, unknown>,
  access?: KanbanAccessContext
): KanbanBoardDetail {
  const boards = ensureWorkspaceBoards(workspaceId);
  const now = new Date().toISOString().slice(0, 10);
  const kind = input.kind === 'bot' ? 'bot' : 'personal';
  const name = String(input.name || 'Bảng Kanban Mới').trim();
  const sectionType = String(
    input.sectionType || (kind === 'bot' ? 'SLPC Harness' : 'Project')
  ).trim();
  const tableStatus = (
    ['In Process', 'Done', 'Planned'].includes(String(input.tableStatus))
      ? input.tableStatus
      : 'In Process'
  ) as TableRowStatus;
  const columns =
    Array.isArray(input.columns) && input.columns.length > 0
      ? input.columns.map(String)
      : kind === 'bot'
        ? ['New', 'Accepted', 'Active', 'Blocked', 'Resolved', 'Closed']
        : ['To Do', 'In Progress', 'In Review', 'Done'];

  const boardId = `board-${Date.now()}`;
  const defaultCards: KanbanCardItem[] = Array.isArray(input.cards)
    ? (input.cards as KanbanCardItem[])
    : [];

  const creatorName = String(
    input.reviewer || access?.userName || 'Supervisor'
  ).trim();

  const newBoard: KanbanBoardRecord = {
    id: boardId,
    workspaceId: workspaceId || 'default',
    kind,
    name,
    description: String(input.description || '').trim(),
    sectionType,
    tableStatus,
    target: Number(input.target) || 10,
    limit: Number(input.limit) || 8,
    reviewer: creatorName || 'Supervisor',
    columns,
    cards: defaultCards,
    createdAt: now,
    updatedAt: now,
  };

  const next = [newBoard, ...boards];
  saveWorkspaceBoards(workspaceId, next);
  return toBoardDetail(newBoard);
}

export async function updateKanbanBoard(
  workspaceId: string,
  boardId: string,
  patch: Record<string, unknown>,
  access?: KanbanAccessContext
): Promise<KanbanBoardDetail | null> {
  if (boardId === FLOCI_HARNESS_BOARD_ID) {
    if (!access?.isAdmin) return null;
    const store = readStore();
    const prevMeta = store.flociBoardMeta || {};
    store.flociBoardMeta = {
      ...prevMeta,
      name: patch.name !== undefined ? String(patch.name) : prevMeta.name,
      description:
        patch.description !== undefined
          ? String(patch.description)
          : prevMeta.description,
      sectionType:
        patch.sectionType !== undefined
          ? String(patch.sectionType)
          : prevMeta.sectionType,
      tableStatus:
        patch.tableStatus !== undefined
          ? (patch.tableStatus as TableRowStatus)
          : prevMeta.tableStatus,
      target:
        patch.target !== undefined ? Number(patch.target) : prevMeta.target,
      limit: patch.limit !== undefined ? Number(patch.limit) : prevMeta.limit,
      reviewer:
        patch.reviewer !== undefined
          ? String(patch.reviewer)
          : prevMeta.reviewer,
      columns: Array.isArray(patch.columns)
        ? patch.columns.map(String)
        : prevMeta.columns,
      linkedDocId:
        patch.linkedDocId !== undefined
          ? String(patch.linkedDocId)
          : prevMeta.linkedDocId,
    };
    writeStore(store);
    const flociBoard = await buildFlociHarnessBoardRecord(workspaceId);
    return flociBoard ? toBoardDetail(flociBoard) : null;
  }

  const boards = ensureWorkspaceBoards(workspaceId);
  const idx = boards.findIndex(b => b.id === boardId);
  if (idx === -1) return null;

  const current = boards[idx];
  const now = new Date().toISOString().slice(0, 10);
  const updated: KanbanBoardRecord = {
    ...current,
    name: patch.name !== undefined ? String(patch.name) : current.name,
    description:
      patch.description !== undefined
        ? String(patch.description)
        : current.description,
    sectionType:
      patch.sectionType !== undefined
        ? String(patch.sectionType)
        : current.sectionType,
    tableStatus:
      patch.tableStatus !== undefined
        ? (patch.tableStatus as TableRowStatus)
        : current.tableStatus,
    target: patch.target !== undefined ? Number(patch.target) : current.target,
    limit: patch.limit !== undefined ? Number(patch.limit) : current.limit,
    reviewer:
      patch.reviewer !== undefined ? String(patch.reviewer) : current.reviewer,
    columns: Array.isArray(patch.columns)
      ? patch.columns.map(String)
      : current.columns,
    cards: Array.isArray(patch.cards)
      ? (patch.cards as KanbanCardItem[])
      : current.cards,
    linkedDocId:
      patch.linkedDocId !== undefined
        ? String(patch.linkedDocId)
        : current.linkedDocId,
    updatedAt: now,
  };

  const next = [...boards];
  next[idx] = updated;
  saveWorkspaceBoards(workspaceId, next);
  return toBoardDetail(updated);
}

export async function deleteKanbanBoards(
  workspaceId: string,
  boardIds: string[],
  access?: KanbanAccessContext
): Promise<KanbanBoardSummary[]> {
  const idSet = new Set(boardIds);
  const boards = ensureWorkspaceBoards(workspaceId).filter(
    b => !idSet.has(b.id)
  );
  saveWorkspaceBoards(workspaceId, boards);
  return listKanbanBoards(workspaceId, access);
}

export async function upsertKanbanCard(
  workspaceId: string,
  boardId: string,
  cardInput: Record<string, unknown>,
  access?: KanbanAccessContext
): Promise<KanbanBoardDetail | null> {
  if (boardId === FLOCI_HARNESS_BOARD_ID) {
    if (!access?.isAdmin) return null;
    const rawCardId = String(cardInput.id || '').trim();
    const numericMatch = rawCardId.match(/(\d+)$/);
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (numericMatch) {
      const numId = numericMatch[1];
      const existingCards = await fetchFlociHarnessCards(false);
      const prev = existingCards.find(c => c.id === `wi-${numId}`);

      const nextStatus =
        cardInput.status !== undefined
          ? String(cardInput.status)
          : prev?.status || 'New';
      const nextTitle = cleanHtml(
        cardInput.title !== undefined
          ? String(cardInput.title)
          : prev?.title || `Work Item #${numId}`
      );
      const nextDesc = cleanHtml(
        cardInput.description !== undefined
          ? String(cardInput.description)
          : prev?.description || ''
      );
      const nextCriteria = cleanHtml(
        cardInput.acceptanceCriteria !== undefined
          ? String(cardInput.acceptanceCriteria)
          : prev?.acceptanceCriteria || ''
      );
      const nextPriority =
        cardInput.priority !== undefined
          ? (cardInput.priority as KanbanCardItem['priority'])
          : prev?.priority || 'Medium';
      const nextAssignee = cleanHtml(
        cardInput.assignee !== undefined
          ? String(cardInput.assignee)
          : prev?.assignee || 'Peer'
      );

      await callFlociDynamo('UpdateItem', {
        TableName: FLOCI_HARNESS_TABLE,
        Key: { id: { N: numId } },
        UpdateExpression:
          'SET #st = :st, #ti = :ti, #de = :de, #ac = :ac, #pr = :pr, #as = :as, #up = :up',
        ExpressionAttributeNames: {
          '#st': 'state',
          '#ti': 'title',
          '#de': 'description',
          '#ac': 'acceptance_criteria',
          '#pr': 'priority',
          '#as': 'assigned_to',
          '#up': 'updated_at',
        },
        ExpressionAttributeValues: {
          ':st': { S: nextStatus },
          ':ti': { S: nextTitle },
          ':de': { S: nextDesc },
          ':ac': { S: nextCriteria },
          ':pr': { S: mapPriorityToHarness(nextPriority) },
          ':as': { S: nextAssignee },
          ':up': { S: nowStr },
        },
      });
    } else {
      const existingCards = await fetchFlociHarnessCards(false);
      let maxId = 1000;
      for (const c of existingCards) {
        const m = c.id.match(/(\d+)$/);
        if (m) {
          const val = Number(m[1]);
          if (val > maxId && val < 100000) maxId = val;
        }
      }
      const nextId = String(maxId + 1);
      const status = String(cardInput.status || 'New');
      const type = String(cardInput.type || 'Task');
      const priority = mapPriorityToHarness(
        (cardInput.priority as KanbanCardItem['priority']) || 'Medium'
      );
      const title = cleanHtml(
        String(cardInput.title || `Work Item #${nextId}`)
      );
      const description = cleanHtml(String(cardInput.description || ''));
      const acceptanceCriteria = cleanHtml(
        String(cardInput.acceptanceCriteria || '')
      );
      const assignee = cleanHtml(
        String(cardInput.assignee || access?.userName || 'Supervisor')
      );

      await callFlociDynamo('PutItem', {
        TableName: FLOCI_HARNESS_TABLE,
        Item: {
          id: { N: nextId },
          type: { S: type },
          title: { S: title },
          description: { S: description },
          acceptance_criteria: { S: acceptanceCriteria },
          state: { S: status },
          priority: { S: priority },
          assigned_to: { S: assignee },
          source: { S: 'local' },
          created_at: { S: nowStr },
          updated_at: { S: nowStr },
        },
      });
    }

    const updatedFloci = await buildFlociHarnessBoardRecord(workspaceId, true);
    return updatedFloci ? toBoardDetail(updatedFloci) : null;
  }

  const boards = ensureWorkspaceBoards(workspaceId);
  const idx = boards.findIndex(b => b.id === boardId);
  if (idx === -1) return null;

  const board = boards[idx];
  const now = new Date().toISOString().slice(0, 10);
  const cardId = String(cardInput.id || '').trim();

  let nextCards: KanbanCardItem[];
  const existingIdx = cardId ? board.cards.findIndex(c => c.id === cardId) : -1;

  if (existingIdx >= 0) {
    const prev = board.cards[existingIdx];
    const nextStatus =
      cardInput.status !== undefined ? String(cardInput.status) : prev.status;
    const nextSubtasks = Array.isArray(cardInput.subtasks)
      ? (cardInput.subtasks as KanbanSubtask[])
      : prev.subtasks;

    let nextProgress =
      cardInput.progress !== undefined
        ? Number(cardInput.progress)
        : prev.progress;
    if (cardInput.status !== undefined && cardInput.progress === undefined) {
      if (isCompletedColumn(nextStatus)) nextProgress = 100;
      else if (isInProgressColumn(nextStatus) && nextProgress === 0)
        nextProgress = 50;
    } else if (
      cardInput.subtasks !== undefined &&
      cardInput.progress === undefined &&
      nextSubtasks.length > 0
    ) {
      const doneSub = nextSubtasks.filter(s => s.done).length;
      nextProgress = Math.round((doneSub / nextSubtasks.length) * 100);
    }

    const updatedCard: KanbanCardItem = {
      ...prev,
      title:
        cardInput.title !== undefined ? String(cardInput.title) : prev.title,
      description:
        cardInput.description !== undefined
          ? String(cardInput.description)
          : prev.description,
      acceptanceCriteria:
        cardInput.acceptanceCriteria !== undefined
          ? String(cardInput.acceptanceCriteria)
          : prev.acceptanceCriteria,
      status: nextStatus,
      type:
        cardInput.type !== undefined
          ? (cardInput.type as KanbanCardItem['type'])
          : prev.type,
      priority:
        cardInput.priority !== undefined
          ? (cardInput.priority as KanbanCardItem['priority'])
          : prev.priority,
      assignee:
        cardInput.assignee !== undefined
          ? String(cardInput.assignee)
          : prev.assignee,
      dueDate:
        cardInput.dueDate !== undefined
          ? String(cardInput.dueDate)
          : prev.dueDate,
      progress: nextProgress,
      tags: Array.isArray(cardInput.tags)
        ? cardInput.tags.map(String)
        : prev.tags,
      subtasks: nextSubtasks,
      updatedAt: now,
    };
    nextCards = [...board.cards];
    nextCards[existingIdx] = updatedCard;
  } else {
    const newId = cardId || `card-${Date.now()}`;
    const status = String(cardInput.status || board.columns[0] || 'To Do');
    const newCard: KanbanCardItem = {
      id: newId,
      code: String(
        cardInput.code ||
          `TASK-${String(board.cards.length + 1).padStart(2, '0')}`
      ),
      title: String(cardInput.title || 'Thẻ công việc mới'),
      description: String(cardInput.description || ''),
      acceptanceCriteria: String(cardInput.acceptanceCriteria || ''),
      status,
      type: (cardInput.type as KanbanCardItem['type']) || 'Task',
      priority: (cardInput.priority as KanbanCardItem['priority']) || 'Medium',
      assignee: String(
        cardInput.assignee || access?.userName || board.reviewer || 'Supervisor'
      ),
      dueDate: String(cardInput.dueDate || now),
      progress: isCompletedColumn(status)
        ? 100
        : Number(cardInput.progress) || 0,
      tags: Array.isArray(cardInput.tags)
        ? cardInput.tags.map(String)
        : ['Task'],
      subtasks: Array.isArray(cardInput.subtasks)
        ? (cardInput.subtasks as KanbanSubtask[])
        : [
            {
              id: `${newId}-sub-1`,
              title: 'Thực hiện và kiểm tra kết quả',
              done: isCompletedColumn(status),
            },
          ],
      updatedAt: now,
    };
    nextCards = [newCard, ...board.cards];
  }

  const updatedBoard: KanbanBoardRecord = {
    ...board,
    cards: nextCards,
    updatedAt: now,
  };
  const nextBoards = [...boards];
  nextBoards[idx] = updatedBoard;
  saveWorkspaceBoards(workspaceId, nextBoards);
  return toBoardDetail(updatedBoard);
}

export async function deleteKanbanCard(
  workspaceId: string,
  boardId: string,
  cardId: string,
  access?: KanbanAccessContext
): Promise<KanbanBoardDetail | null> {
  if (boardId === FLOCI_HARNESS_BOARD_ID) {
    if (!access?.isAdmin) return null;
    const numericMatch = String(cardId).match(/(\d+)$/);
    if (numericMatch) {
      await callFlociDynamo('DeleteItem', {
        TableName: FLOCI_HARNESS_TABLE,
        Key: { id: { N: numericMatch[1] } },
      });
    }
    const updatedFloci = await buildFlociHarnessBoardRecord(workspaceId, true);
    return updatedFloci ? toBoardDetail(updatedFloci) : null;
  }

  const boards = ensureWorkspaceBoards(workspaceId);
  const idx = boards.findIndex(b => b.id === boardId);
  if (idx === -1) return null;

  const board = boards[idx];
  const updatedBoard: KanbanBoardRecord = {
    ...board,
    cards: board.cards.filter(c => c.id !== cardId),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  const nextBoards = [...boards];
  nextBoards[idx] = updatedBoard;
  saveWorkspaceBoards(workspaceId, nextBoards);
  return toBoardDetail(updatedBoard);
}
