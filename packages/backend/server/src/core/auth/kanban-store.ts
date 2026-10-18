import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

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

interface RawHarnessItem {
  id: number;
  type?: string;
  title?: string;
  description?: string;
  acceptance_criteria?: string;
  state?: string;
  priority?: string;
  assigned_to_profile?: string;
  created_by_profile?: string;
  parent_item_id?: number;
  updated_at?: string;
}

const STORE_FILE = join(tmpdir(), 'aevum-kanban-boards-store-v1.json');

const ALLOWED_PROFILES = [
  'Supervisor',
  'Lead',
  'Peer',
  'QC',
  'Lead BA',
  'Peer BA',
  'Lead design',
  'Peer Design',
  'Lead Dev',
  'Peer Dev',
];

function normalizeProfile(raw?: string): string {
  if (!raw) return 'Peer';
  const match = ALLOWED_PROFILES.find(
    p => p.toLowerCase() === raw.trim().toLowerCase()
  );
  return match ?? raw;
}

function mapHarnessPriority(p?: string): KanbanCardItem['priority'] {
  if (p === 'P0') return 'Urgent';
  if (p === 'P1') return 'High';
  if (p === 'P2') return 'Medium';
  return 'Low';
}

function computeProgressFromState(state: string): number {
  if (state === 'Closed') return 100;
  if (state === 'Resolved') return 85;
  if (state === 'Active' || state === 'In Progress') return 55;
  if (state === 'Accepted' || state === 'In Review') return 30;
  return 0;
}

function loadRawHarnessItems(): RawHarnessItem[] {
  const candidates = [
    resolve(
      process.cwd(),
      'packages/frontend/core/public/harness-backlog.json'
    ),
    resolve(process.cwd(), '../frontend/core/public/harness-backlog.json'),
    resolve(process.cwd(), '../../frontend/core/public/harness-backlog.json'),
  ];
  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) {
        const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as {
          items?: RawHarnessItem[];
          testcases?: RawHarnessItem[];
        };
        return [...(parsed.items ?? []), ...(parsed.testcases ?? [])];
      }
    } catch {
      // continue
    }
  }
  return [];
}

function parseAcceptanceToSubtasks(
  cardId: string,
  acText?: string,
  state?: string
): KanbanSubtask[] {
  const isDone = state === 'Closed' || state === 'Resolved';
  if (!acText || !acText.trim()) {
    return [
      {
        id: `${cardId}-sub-1`,
        title: 'Phân tích yêu cầu & thiết kế kỹ thuật',
        done: isDone || state === 'Active',
      },
      {
        id: `${cardId}-sub-2`,
        title: 'Hiện thực hóa mã nguồn & kiểm thử đơn vị (Unit Test)',
        done: isDone,
      },
      {
        id: `${cardId}-sub-3`,
        title: 'Nghiệm thu độc lập & cập nhật tài liệu bàn giao',
        done: state === 'Closed',
      },
    ];
  }
  const parts = acText
    .split(/(?:\d+\.\s+|\n+)/)
    .map(s => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return [
      {
        id: `${cardId}-sub-1`,
        title: acText.trim(),
        done: isDone,
      },
    ];
  }
  return parts.slice(0, 6).map((text, idx) => ({
    id: `${cardId}-sub-${idx + 1}`,
    title: text,
    done: isDone || (state === 'Active' && idx === 0),
  }));
}

function buildSeedBoardsForWorkspace(workspaceId: string): KanbanBoardRecord[] {
  const harnessItems = loadRawHarnessItems();
  const epics = harnessItems.filter(it => it.type === 'Epic');
  const botBoards: KanbanBoardRecord[] = [];

  for (const epic of epics) {
    const directChildren = harnessItems.filter(
      it => it.parent_item_id === epic.id
    );
    const directIds = new Set(directChildren.map(c => c.id));
    const grandChildren = harnessItems.filter(
      it => it.parent_item_id && directIds.has(it.parent_item_id)
    );
    const grandIds = new Set(grandChildren.map(c => c.id));
    const greatGrandChildren = harnessItems.filter(
      it => it.parent_item_id && grandIds.has(it.parent_item_id)
    );
    const allRelated = [
      epic,
      ...directChildren,
      ...grandChildren,
      ...greatGrandChildren,
    ];

    const cards: KanbanCardItem[] = allRelated.map(item => {
      const state = item.state || 'New';
      const type = (
        ['Epic', 'Feature', 'Task', 'Bug', 'Testcase'].includes(item.type || '')
          ? item.type
          : 'Task'
      ) as KanbanCardItem['type'];
      const cardId = `harness-${item.id}`;
      return {
        id: cardId,
        code: `#${item.id}`,
        title: item.title || `Work Item #${item.id}`,
        description:
          item.description ||
          `Hạng mục thuộc bảng "${epic.title}" do ${normalizeProfile(item.assigned_to_profile)} phụ trách.`,
        acceptanceCriteria: item.acceptance_criteria || '',
        status: state,
        type,
        priority: mapHarnessPriority(item.priority),
        assignee: normalizeProfile(item.assigned_to_profile),
        dueDate: (item.updated_at || '2026-10-20').slice(0, 10),
        progress: computeProgressFromState(state),
        tags: [type, normalizeProfile(item.assigned_to_profile)],
        subtasks: parseAcceptanceToSubtasks(
          cardId,
          item.acceptance_criteria,
          state
        ),
        updatedAt: (item.updated_at || '2026-10-18').slice(0, 10),
      };
    });

    const isAllClosed = cards.every(c => c.status === 'Closed');
    botBoards.push({
      id: `bot-epic-${epic.id}`,
      workspaceId,
      kind: 'bot',
      name: epic.title || `Epic #${epic.id}`,
      description:
        epic.description ||
        `Bảng Kanban điều phối các Feature, Task và Testcase thuộc ${epic.title}`,
      sectionType: 'SLPC Harness Epic',
      tableStatus: isAllClosed ? 'Done' : 'In Process',
      target: cards.length,
      limit: Math.max(10, cards.length),
      reviewer: normalizeProfile(epic.assigned_to_profile),
      columns: ['New', 'Accepted', 'Active', 'Blocked', 'Resolved', 'Closed'],
      cards,
      createdAt: (epic.updated_at || '2026-10-17').slice(0, 10),
      updatedAt: (epic.updated_at || '2026-10-18').slice(0, 10),
    });
  }

  // Also include a Master Bot Board if harnessItems exist
  if (harnessItems.length > 0) {
    const mainItems = harnessItems.filter(it => it.type !== 'Testcase');
    const masterCards: KanbanCardItem[] = mainItems.map(item => {
      const state = item.state || 'New';
      const type = (
        ['Epic', 'Feature', 'Task', 'Bug', 'Testcase'].includes(item.type || '')
          ? item.type
          : 'Task'
      ) as KanbanCardItem['type'];
      const cardId = `master-${item.id}`;
      return {
        id: cardId,
        code: `#${item.id}`,
        title: item.title || `Work Item #${item.id}`,
        description:
          item.description ||
          `Tác vụ hệ thống được điều phối qua quy trình SLPC 4 cổng.`,
        acceptanceCriteria: item.acceptance_criteria || '',
        status: state,
        type,
        priority: mapHarnessPriority(item.priority),
        assignee: normalizeProfile(item.assigned_to_profile),
        dueDate: (item.updated_at || '2026-10-20').slice(0, 10),
        progress: computeProgressFromState(state),
        tags: [type, normalizeProfile(item.assigned_to_profile)],
        subtasks: parseAcceptanceToSubtasks(
          cardId,
          item.acceptance_criteria,
          state
        ),
        updatedAt: (item.updated_at || '2026-10-18').slice(0, 10),
      };
    });

    botBoards.unshift({
      id: 'bot-master-slpc',
      workspaceId,
      kind: 'bot',
      name: 'SLPC Master Backlog — Điều phối 10 Bot Profiles',
      description:
        'Bảng tổng hợp toàn bộ Epic, Feature và Task của 10 Agent Profiles trong hệ thống',
      sectionType: '10 Bot Profiles',
      tableStatus: 'In Process',
      target: masterCards.length,
      limit: 25,
      reviewer: 'Supervisor',
      columns: ['New', 'Accepted', 'Active', 'Blocked', 'Resolved', 'Closed'],
      cards: masterCards,
      createdAt: '2026-10-17',
      updatedAt: '2026-10-18',
    });
  }

  const personalBoards: KanbanBoardRecord[] = [
    {
      id: 'board-aevum-sprint',
      workspaceId,
      kind: 'personal',
      name: 'Sprint Phát triển Tính năng Aevum Workspace',
      description:
        'Theo dõi tiến độ phát triển giao diện, tích hợp API Lịch, QR Mobile Handoff và Kanban đa dự án',
      sectionType: 'Product Sprint',
      tableStatus: 'In Process',
      target: 12,
      limit: 8,
      reviewer: 'Lead Dev',
      columns: ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'],
      createdAt: '2026-10-16',
      updatedAt: '2026-10-18',
      cards: [
        {
          id: 'card-sp-1',
          code: 'AEV-101',
          title:
            'Chuẩn hóa giao diện Dark Mode & hệ thống Icon chuẩn shadcn/ui',
          description:
            'Đồng bộ bảng màu cssVarV2, loại bỏ emoji rời rạc và áp dụng toàn bộ vector icon từ @blocksuite/icons/rc.',
          acceptanceCriteria:
            '1. Không dùng emoji trong giao diện.\n2. Viền 1px subtle border đồng nhất giữa các trang.\n3. Hỗ trợ custom scrollbar chuẩn CSS.',
          status: 'Done',
          type: 'Feature',
          priority: 'High',
          assignee: 'Peer Design',
          dueDate: '2026-10-18',
          progress: 100,
          tags: ['UI/UX', 'shadcn'],
          subtasks: [
            {
              id: 's1',
              title: 'Thay thế toàn bộ emoji bằng @blocksuite/icons/rc',
              done: true,
            },
            {
              id: 's2',
              title: 'Đồng bộ border và badge theo chuẩn shadcn/ui',
              done: true,
            },
          ],
          updatedAt: '2026-10-18',
        },
        {
          id: 'card-sp-2',
          code: 'AEV-102',
          title: 'Xây dựng API List & API Detail cho hệ thống Bảng Kanban',
          description:
            'Tách bạch API lấy danh sách các bảng Kanban đã tạo và API xem chi tiết từng bảng khi người dùng click vào 1 hàng.',
          acceptanceCriteria:
            '1. GET /api/auth/open-app/kanban/boards trả về danh sách bảng đã tạo.\n2. GET /api/auth/open-app/kanban/boards/:id trả về chi tiết bảng, cột, thống kê và danh sách thẻ.\n3. Click vào bất kỳ hàng nào trong Table sẽ mở ngay Detail Kanban của hàng đó.',
          status: 'In Progress',
          type: 'Feature',
          priority: 'Urgent',
          assignee: 'Lead Dev',
          dueDate: '2026-10-19',
          progress: 80,
          tags: ['Backend API', 'Kanban'],
          subtasks: [
            {
              id: 's3',
              title:
                'Thiết kế endpoint GET/POST/PATCH/DELETE cho Kanban Boards',
              done: true,
            },
            {
              id: 's4',
              title:
                'Kết nối click 1 hàng trên Table mở màn hình Detail Kanban',
              done: true,
            },
            {
              id: 's5',
              title:
                'Bổ sung Modal xem & chỉnh sửa chi tiết từng Card và Checklist',
              done: false,
            },
          ],
          updatedAt: '2026-10-18',
        },
        {
          id: 'card-sp-3',
          code: 'AEV-103',
          title: 'Tích hợp Config API đồng bộ Lịch cá nhân trên trang Journals',
          description:
            'Cho phép người dùng tự cấu hình URL và Bearer Token trong LocalStorage mà không lộ domain nội bộ khi commit.',
          acceptanceCriteria:
            '1. Lưu cấu hình trong LocalStorage.\n2. Proxy qua Backend chống lỗi CORS.\n3. Không hardcode domain trong mã nguồn.',
          status: 'Done',
          type: 'Task',
          priority: 'High',
          assignee: 'Peer Dev',
          dueDate: '2026-10-18',
          progress: 100,
          tags: ['Journals', 'Security'],
          subtasks: [
            { id: 's6', title: 'Tạo modal cấu hình URL & Token', done: true },
            {
              id: 's7',
              title: 'Xóa toàn bộ domain hardcode khỏi Git',
              done: true,
            },
          ],
          updatedAt: '2026-10-18',
        },
        {
          id: 'card-sp-4',
          code: 'AEV-104',
          title:
            'Kiểm thử E2E luồng kéo thả thẻ Kanban & đồng bộ thời gian thực',
          description:
            'Đảm bảo thao tác kéo thả thẻ qua lại giữa các cột lưu tức thì xuống Backend API.',
          acceptanceCriteria:
            '1. Kéo thả mượt giữa các cột.\n2. Tự động tính lại tỷ lệ hoàn thành của bảng.',
          status: 'In Review',
          type: 'Task',
          priority: 'Medium',
          assignee: 'QC',
          dueDate: '2026-10-20',
          progress: 65,
          tags: ['QA', 'E2E'],
          subtasks: [
            { id: 's8', title: 'Kiểm thử tạo bảng mới & xóa bảng', done: true },
            { id: 's9', title: 'Kiểm thử kéo thả card đổi cột', done: false },
          ],
          updatedAt: '2026-10-18',
        },
        {
          id: 'card-sp-5',
          code: 'AEV-105',
          title: 'Tối ưu hóa tốc độ tải trang tài liệu lớn trên Workspace',
          description:
            'Áp dụng lazy rendering và tối ưu bộ nhớ khi mở tài liệu có hàng nghìn block.',
          acceptanceCriteria: 'Thời gian mở tài liệu < 200ms.',
          status: 'To Do',
          type: 'Task',
          priority: 'Medium',
          assignee: 'Peer Dev',
          dueDate: '2026-10-22',
          progress: 15,
          tags: ['Performance'],
          subtasks: [
            {
              id: 's10',
              title: 'Đo đạc Flamegraph khi render Doc',
              done: false,
            },
          ],
          updatedAt: '2026-10-18',
        },
      ],
    },
    {
      id: 'board-architecture-roadmap',
      workspaceId,
      kind: 'personal',
      name: 'Kiến trúc Hệ thống & Đồng bộ Dữ liệu Đám mây',
      description:
        'Quản lý các hạng mục hạ tầng Backend NestJS, PostgreSQL, Redis, CRDT Sync và lưu trữ S3',
      sectionType: 'Architecture',
      tableStatus: 'In Process',
      target: 10,
      limit: 6,
      reviewer: 'Lead',
      columns: ['To Do', 'In Progress', 'In Review', 'Done'],
      createdAt: '2026-10-15',
      updatedAt: '2026-10-18',
      cards: [
        {
          id: 'card-ar-1',
          code: 'ARC-201',
          title: 'Xác thực người dùng bằng Argon2 Password & Session Exchange',
          description:
            'Hoàn thiện luồng đăng nhập trực tiếp bằng Email/Password và mã QR một lần cho thiết bị di động.',
          status: 'Done',
          type: 'Feature',
          priority: 'High',
          assignee: 'Lead Dev',
          dueDate: '2026-10-17',
          progress: 100,
          tags: ['Auth', 'Security'],
          subtasks: [
            { id: 'a1', title: 'Tích hợp Argon2 password login', done: true },
            { id: 'a2', title: 'Hỗ trợ QR Code Mobile Handoff', done: true },
          ],
          updatedAt: '2026-10-17',
        },
        {
          id: 'card-ar-2',
          code: 'ARC-202',
          title: 'Cơ chế phân quyền Admin Config cho phân khu Bot Harness',
          description:
            'Kiểm soát quyền truy cập các bảng điều phối Bot theo từng email người dùng.',
          status: 'In Progress',
          type: 'Task',
          priority: 'High',
          assignee: 'Supervisor',
          dueDate: '2026-10-19',
          progress: 70,
          tags: ['RBAC', 'Admin'],
          subtasks: [
            {
              id: 'a3',
              title: 'Cấu hình danh sách email được cấp quyền',
              done: true,
            },
            {
              id: 'a4',
              title: 'Chế độ xem thử dưới góc nhìn User thường',
              done: true,
            },
          ],
          updatedAt: '2026-10-18',
        },
        {
          id: 'card-ar-3',
          code: 'ARC-203',
          title: 'Sao lưu tự động Snapshot tài liệu lên Object Storage',
          description:
            'Định kỳ nén zstd và đồng bộ trạng thái tài liệu lên dịch vụ lưu trữ đám mây.',
          status: 'To Do',
          type: 'Feature',
          priority: 'Medium',
          assignee: 'Peer Dev',
          dueDate: '2026-10-25',
          progress: 0,
          tags: ['Storage', 'Sync'],
          subtasks: [
            {
              id: 'a5',
              title: 'Thiết lập worker nén snapshot định kỳ',
              done: false,
            },
          ],
          updatedAt: '2026-10-18',
        },
      ],
    },
    {
      id: 'board-personal-weekly',
      workspaceId,
      kind: 'personal',
      name: 'Kế hoạch Công việc Cá nhân & Ghi chú Tuần',
      description:
        'Bảng theo dõi các mục tiêu cá nhân, lịch họp quan trọng và tài liệu cần biên soạn trong tuần',
      sectionType: 'Personal',
      tableStatus: 'Planned',
      target: 8,
      limit: 5,
      reviewer: 'Peer',
      columns: ['Cần làm', 'Đang thực hiện', 'Chờ phản hồi', 'Hoàn thành'],
      createdAt: '2026-10-17',
      updatedAt: '2026-10-18',
      cards: [
        {
          id: 'card-pw-1',
          code: 'PER-01',
          title: 'Tổng hợp biên bản họp Sprint Review & kế hoạch tuần tới',
          description:
            'Ghi chú lại các quyết định quan trọng từ cuộc họp vào trang Journals và liên kết sang tài liệu.',
          status: 'Đang thực hiện',
          type: 'Task',
          priority: 'High',
          assignee: 'Peer',
          dueDate: '2026-10-19',
          progress: 50,
          tags: ['Meeting', 'Journal'],
          subtasks: [
            { id: 'p1', title: 'Đồng bộ lịch họp trong tuần', done: true },
            {
              id: 'p2',
              title: 'Soạn thảo tóm tắt mục tiêu Sprint mới',
              done: false,
            },
          ],
          updatedAt: '2026-10-18',
        },
        {
          id: 'card-pw-2',
          code: 'PER-02',
          title: 'Rà soát PR & dọn dẹp các nhánh tính năng đã merge',
          description:
            'Kiểm tra lại toàn bộ commit trước khi push để đảm bảo không chứa thông tin cấu hình nhạy cảm.',
          status: 'Hoàn thành',
          type: 'Task',
          priority: 'Medium',
          assignee: 'Lead Dev',
          dueDate: '2026-10-18',
          progress: 100,
          tags: ['Git', 'Review'],
          subtasks: [
            { id: 'p3', title: 'Kiểm tra git status & diff', done: true },
          ],
          updatedAt: '2026-10-18',
        },
      ],
    },
  ];

  return [...personalBoards, ...botBoards];
}

interface StoreData {
  workspaces: Record<string, KanbanBoardRecord[]>;
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

function ensureWorkspaceBoards(workspaceId: string): KanbanBoardRecord[] {
  const key = workspaceId || 'default';
  const store = readStore();
  if (!store.workspaces[key] || store.workspaces[key].length === 0) {
    store.workspaces[key] = buildSeedBoardsForWorkspace(key);
    writeStore(store);
  }
  return store.workspaces[key];
}

function saveWorkspaceBoards(workspaceId: string, boards: KanbanBoardRecord[]) {
  const key = workspaceId || 'default';
  const store = readStore();
  store.workspaces[key] = boards;
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

export function listKanbanBoards(workspaceId: string): KanbanBoardSummary[] {
  const boards = ensureWorkspaceBoards(workspaceId);
  return boards.map(toBoardSummary);
}

export function getKanbanBoardDetail(
  workspaceId: string,
  boardId: string
): KanbanBoardDetail | null {
  const boards = ensureWorkspaceBoards(workspaceId);
  const found = boards.find(b => b.id === boardId);
  return found ? toBoardDetail(found) : null;
}

export function createKanbanBoard(
  workspaceId: string,
  input: Record<string, unknown>
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
  const prefix =
    name
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 3)
      .toUpperCase() || 'KAN';

  const defaultCards: KanbanCardItem[] = Array.isArray(input.cards)
    ? (input.cards as KanbanCardItem[])
    : [
        {
          id: `${boardId}-c1`,
          code: `${prefix}-01`,
          title: `Khởi tạo cấu trúc & phạm vi cho "${name}"`,
          description: `Xác định mục tiêu, danh sách đầu việc và tiêu chí nghiệm thu cho bảng "${name}".`,
          acceptanceCriteria:
            '1. Xác nhận danh sách cột trạng thái.\n2. Phân công người phụ trách từng hạng mục.',
          status: columns[1] ?? columns[0],
          type: 'Feature',
          priority: 'High',
          assignee: String(input.reviewer || 'Lead Dev'),
          dueDate: now,
          progress: 50,
          tags: [sectionType],
          subtasks: [
            {
              id: `${boardId}-s1`,
              title: 'Xác định phạm vi và mục tiêu chính',
              done: true,
            },
            {
              id: `${boardId}-s2`,
              title: 'Tạo các thẻ công việc chi tiết trong từng cột',
              done: false,
            },
          ],
          updatedAt: now,
        },
        {
          id: `${boardId}-c2`,
          code: `${prefix}-02`,
          title: `Triển khai các hạng mục trọng tâm của "${name}"`,
          description: `Thực hiện và theo dõi tiến độ các thẻ công việc trên bảng Kanban.`,
          status: columns[0],
          type: 'Task',
          priority: 'Medium',
          assignee: 'Peer Dev',
          dueDate: now,
          progress: 0,
          tags: ['Implementation'],
          subtasks: [
            {
              id: `${boardId}-s3`,
              title: 'Hoàn thành hạng mục cốt lõi và cập nhật tiến độ',
              done: false,
            },
          ],
          updatedAt: now,
        },
      ];

  const newBoard: KanbanBoardRecord = {
    id: boardId,
    workspaceId: workspaceId || 'default',
    kind,
    name,
    description: String(
      input.description ||
        `Bảng Kanban quản lý các cột và thẻ công việc cho "${name}"`
    ).trim(),
    sectionType,
    tableStatus,
    target: Number(input.target) || 10,
    limit: Number(input.limit) || 8,
    reviewer: String(input.reviewer || 'Lead Dev'),
    columns,
    cards: defaultCards,
    createdAt: now,
    updatedAt: now,
  };

  const next = [newBoard, ...boards];
  saveWorkspaceBoards(workspaceId, next);
  return toBoardDetail(newBoard);
}

export function updateKanbanBoard(
  workspaceId: string,
  boardId: string,
  patch: Record<string, unknown>
): KanbanBoardDetail | null {
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

export function deleteKanbanBoards(
  workspaceId: string,
  boardIds: string[]
): KanbanBoardSummary[] {
  const idSet = new Set(boardIds);
  const boards = ensureWorkspaceBoards(workspaceId).filter(
    b => !idSet.has(b.id)
  );
  saveWorkspaceBoards(workspaceId, boards);
  return boards.map(toBoardSummary);
}

export function upsertKanbanCard(
  workspaceId: string,
  boardId: string,
  cardInput: Record<string, unknown>
): KanbanBoardDetail | null {
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
      assignee: String(cardInput.assignee || board.reviewer || 'Peer'),
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

export function deleteKanbanCard(
  workspaceId: string,
  boardId: string,
  cardId: string
): KanbanBoardDetail | null {
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
