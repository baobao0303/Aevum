import { Menu, MenuItem, MenuSeparator, notify } from '@affine/component';
import { AuthService } from '@affine/core/modules/cloud';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '@affine/core/modules/workbench';
import { WorkspaceService } from '@affine/core/modules/workspace';
import {
  ArrowDownSmallIcon,
  ArrowLeftSmallIcon,
  ArrowRightSmallIcon,
  CheckBoxCheckSolidIcon,
  CopyIcon,
  DatabaseKanbanViewIcon,
  DatabaseTableViewIcon,
  DateTimeIcon,
  DeleteIcon,
  EditIcon,
  MoreVerticalIcon,
  PlusIcon,
  ResetIcon,
  SearchIcon,
  UserIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { cssVarV2 } from '@toeverything/theme/v2';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { AllDocSidebarTabs } from '../layouts/all-doc-sidebar-tabs';
import * as styles from './index.css';

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

const WORK_ITEM_TYPES: Array<KanbanCardItem['type']> = [
  'Feature',
  'Task',
  'Bug',
  'Epic',
  'Testcase',
];

const CARD_PRIORITIES: Array<KanbanCardItem['priority']> = [
  'Urgent',
  'High',
  'Medium',
  'Low',
];

const TABLE_STATUS_OPTIONS: TableRowStatus[] = [
  'In Process',
  'Done',
  'Planned',
];

const DEFAULT_REVIEWER_OPTIONS: string[] = [
  'Supervisor',
  'Bảo Bảo',
  'Team User',
];

function resolveCreatorDisplayName(
  email?: string | null,
  name?: string | null
): string {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (normalizedEmail === 'admin@aevum.io') return 'Supervisor';
  if (normalizedEmail === 'baoltb@aevum.app') return 'Bảo Bảo';
  if (normalizedEmail === 'team@affine.pro') return 'Team User';
  const trimmedName = (name || '').trim();
  if (
    trimmedName === 'Supervisor' ||
    trimmedName === 'Bảo Bảo' ||
    trimmedName === 'Team User'
  ) {
    return trimmedName;
  }
  return 'Supervisor';
}

const SECTION_TYPE_OPTIONS = [
  'Product Sprint',
  'Architecture',
  'Technical Approach',
  'Design System',
  'QA & Testing',
  'Operations',
] as const;

function getStatusDotColor(status: TableRowStatus): string {
  if (status === 'Done') return '#10b981';
  if (status === 'In Process') return '#f59e0b';
  return '#94a3b8';
}

function getPriorityTone(priority: KanbanCardItem['priority']): {
  dot: string;
  label: string;
} {
  switch (priority) {
    case 'Urgent':
      return { dot: '#ef4444', label: 'Urgent' };
    case 'High':
      return { dot: '#f59e0b', label: 'High' };
    case 'Medium':
      return { dot: '#3b82f6', label: 'Medium' };
    case 'Low':
    default:
      return { dot: '#94a3b8', label: 'Low' };
  }
}

interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  prefix?: ReactNode;
}

interface KanbanSelectProps<T extends string = string> {
  value: T;
  options: Array<SelectOption<T>>;
  onChange: (next: T) => void;
  size?: 'default' | 'modal' | 'mini';
  minWidth?: number;
  align?: 'start' | 'end';
}

function KanbanSelect<T extends string = string>({
  value,
  options,
  onChange,
  size = 'default',
  minWidth = 140,
  align = 'start',
}: KanbanSelectProps<T>) {
  const current = options.find(o => o.value === value) ?? {
    value,
    label: value,
  };

  return (
    <Menu
      contentOptions={{
        align,
        sideOffset: 4,
        style: {
          minWidth: `${minWidth}px`,
          zIndex: 1200,
        },
      }}
      items={
        <>
          {options.map(opt => (
            <MenuItem
              key={opt.value}
              checked={opt.value === value}
              prefix={opt.prefix}
              onSelect={() => onChange(opt.value)}
            >
              {opt.label}
            </MenuItem>
          ))}
        </>
      }
    >
      <button
        type="button"
        className={styles.selectTrigger}
        data-size={size === 'default' ? undefined : size}
        style={
          size === 'modal'
            ? {
                height: '36px',
                minHeight: '36px',
                width: '100%',
                fontSize: '13px',
                padding: '0 10px',
              }
            : { minWidth: `${minWidth}px` }
        }
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {current.prefix}
          <span>{current.label}</span>
        </span>
        <ArrowDownSmallIcon
          width={14}
          height={14}
          style={{ color: cssVarV2('text/secondary'), flexShrink: 0 }}
        />
      </button>
    </Menu>
  );
}

const PAGE_SIZE_OPTIONS: Array<SelectOption<string>> = [
  { value: '5', label: '5 dòng' },
  { value: '10', label: '10 dòng' },
  { value: '20', label: '20 dòng' },
  { value: '50', label: '50 dòng' },
];

const FLOCI_HARNESS_BOARD_ID = 'board-floci-harness';
const FLOCI_DEFAULT_COLUMNS = [
  'New',
  'Accepted',
  'Active',
  'Blocked',
  'Resolved',
  'Closed',
];

const memoryBoardsCache = new Map<string, KanbanBoardSummary[]>();
const memoryDetailsCache = new Map<string, KanbanBoardDetail>();

function buildDefaultFlociSummary(workspaceId: string): KanbanBoardSummary {
  const columnCounts: Record<string, number> = {};
  for (const col of FLOCI_DEFAULT_COLUMNS) columnCounts[col] = 0;
  return {
    id: FLOCI_HARNESS_BOARD_ID,
    workspaceId: workspaceId || 'default',
    kind: 'bot',
    name: 'SLPC Harness — Floci DynamoDB (harness-data)',
    description:
      'Đồng bộ trực tiếp bảng harness_work_items trên Floci Cloud (harness-data) — Chỉ hiển thị cho Admin.',
    sectionType: 'SLPC Harness',
    tableStatus: 'In Process',
    target: 0,
    limit: 0,
    reviewer: 'Supervisor',
    columns: FLOCI_DEFAULT_COLUMNS,
    cardCount: 0,
    completedCount: 0,
    inProgressCount: 0,
    completionRate: 0,
    columnCounts,
    createdAt: '2026-10-08',
    updatedAt: '2026-10-18',
  };
}

function summaryToPlaceholderDetail(
  summary: KanbanBoardSummary
): KanbanBoardDetail {
  return {
    ...summary,
    cards: [],
    stats: {
      totalCards: summary.cardCount,
      completedCards: summary.completedCount,
      inProgressCards: summary.inProgressCount,
      blockedCards: 0,
      completionRate: summary.completionRate,
      byColumn: summary.columnCounts,
      byPriority: {},
      byAssignee: {},
    },
  };
}

function readInitialKanbanBoards(
  workspaceId: string,
  role: 'admin' | 'member'
): KanbanBoardSummary[] {
  const key = `${workspaceId}:${role}`;
  const mem = memoryBoardsCache.get(key);
  if (mem) {
    return role === 'admin'
      ? mem
      : mem.filter(b => b.id !== FLOCI_HARNESS_BOARD_ID);
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`aevum:kanban:boards:v4:${key}`);
      if (raw) {
        const parsed = JSON.parse(raw) as KanbanBoardSummary[];
        if (Array.isArray(parsed)) {
          const filtered =
            role === 'admin'
              ? parsed
              : parsed.filter(b => b.id !== FLOCI_HARNESS_BOARD_ID);
          memoryBoardsCache.set(key, filtered);
          return filtered;
        }
      }
    } catch {
      // ignore
    }
  }

  const fallback =
    role === 'admin' ? [buildDefaultFlociSummary(workspaceId)] : [];
  memoryBoardsCache.set(key, fallback);
  return fallback;
}

function writeCachedKanbanBoards(
  workspaceId: string,
  role: 'admin' | 'member',
  boards: KanbanBoardSummary[]
) {
  const key = `${workspaceId}:${role}`;
  const filtered =
    role === 'admin'
      ? boards
      : boards.filter(b => b.id !== FLOCI_HARNESS_BOARD_ID);
  memoryBoardsCache.set(key, filtered);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        `aevum:kanban:boards:v4:${key}`,
        JSON.stringify(filtered)
      );
    } catch {
      // ignore
    }
  }
}

function readInitialKanbanDetail(
  workspaceId: string,
  boardId: string,
  boards: KanbanBoardSummary[]
): KanbanBoardDetail | null {
  const key = `${workspaceId}:${boardId}`;
  const mem = memoryDetailsCache.get(key);
  if (mem) return mem;

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`aevum:kanban:detail:v4:${key}`);
      if (raw) {
        const parsed = JSON.parse(raw) as KanbanBoardDetail;
        if (parsed && parsed.id === boardId) {
          memoryDetailsCache.set(key, parsed);
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  const summary =
    boards.find(b => b.id === boardId) ||
    (boardId === FLOCI_HARNESS_BOARD_ID
      ? buildDefaultFlociSummary(workspaceId)
      : null);
  return summary ? summaryToPlaceholderDetail(summary) : null;
}

function writeCachedKanbanDetail(
  workspaceId: string,
  boardId: string,
  detail: KanbanBoardDetail
) {
  const key = `${workspaceId}:${boardId}`;
  memoryDetailsCache.set(key, detail);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        `aevum:kanban:detail:v4:${key}`,
        JSON.stringify(detail)
      );
    } catch {
      // ignore
    }
  }
}

export const WorkspaceKanbanPage = () => {
  const workspaceService = useService(WorkspaceService);
  const authService = useService(AuthService);
  const account = useLiveData(authService.session.account$);
  const workspaceId = workspaceService.workspace.id;

  const userEmail = (account?.email || '').trim().toLowerCase();
  const userRole: 'admin' | 'member' =
    userEmail === 'admin@aevum.io' ? 'admin' : 'member';
  const creatorName = resolveCreatorDisplayName(account?.email, account?.name);

  // Level 1: API List state — preloaded synchronously on frame 0 so there is zero flash!
  const [boards, setBoards] = useState<KanbanBoardSummary[]>(() =>
    readInitialKanbanBoards(workspaceId, userRole)
  );
  const [reviewerOptions, setReviewerOptions] = useState<string[]>(
    DEFAULT_REVIEWER_OPTIONS
  );
  const [loadingList, setLoadingList] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(
    () => new Set()
  );
  const [boardPage, setBoardPage] = useState<number>(1);
  const [boardPageSize, setBoardPageSize] = useState<number>(5);

  // Level 2: API Detail state
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [boardDetail, setBoardDetail] = useState<KanbanBoardDetail | null>(
    null
  );
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailViewMode, setDetailViewMode] = useState<'kanban' | 'table'>(
    'kanban'
  );
  const [cardSearch, setCardSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [cardPage, setCardPage] = useState<number>(1);
  const [cardPageSize, setCardPageSize] = useState<number>(5);

  // Board Create / Edit Modal
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [boardFormName, setBoardFormName] = useState('');
  const [boardFormDesc, setBoardFormDesc] = useState('');
  const [boardFormType, setBoardFormType] = useState<string>('Product Sprint');
  const [boardFormStatus, setBoardFormStatus] =
    useState<TableRowStatus>('In Process');
  const [boardFormTarget, setBoardFormTarget] = useState<number>(12);
  const [boardFormLimit, setBoardFormLimit] = useState<number>(8);
  const [boardFormReviewer, setBoardFormReviewer] =
    useState<string>(creatorName);
  const [boardFormColumns, setBoardFormColumns] = useState<string>(
    'Backlog, To Do, In Progress, In Review, Done'
  );

  // Add Column Modal
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Card Create / Detail Modal
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardFormCode, setCardFormCode] = useState('');
  const [cardFormTitle, setCardFormTitle] = useState('');
  const [cardFormDesc, setCardFormDesc] = useState('');
  const [cardFormCriteria, setCardFormCriteria] = useState('');
  const [cardFormStatus, setCardFormStatus] = useState('To Do');
  const [cardFormType, setCardFormType] =
    useState<KanbanCardItem['type']>('Task');
  const [cardFormPriority, setCardFormPriority] =
    useState<KanbanCardItem['priority']>('Medium');
  const [cardFormAssignee, setCardFormAssignee] = useState(creatorName);
  const [cardFormDueDate, setCardFormDueDate] = useState('2026-10-20');
  const [cardFormProgress, setCardFormProgress] = useState(0);
  const [cardFormSubtasks, setCardFormSubtasks] = useState<KanbanSubtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // 1. Fetch API List: GET /api/auth/open-app/kanban/boards (with background detail preload)
  const fetchBoardsList = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/auth/open-app/kanban/boards?workspaceId=${encodeURIComponent(workspaceId)}&role=${encodeURIComponent(userRole)}&userEmail=${encodeURIComponent(userEmail)}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data?.reviewers) && data.reviewers.length > 0) {
        setReviewerOptions(data.reviewers as string[]);
      }
      if (Array.isArray(data?.boards)) {
        const rawBoards = data.boards as KanbanBoardSummary[];
        const fetchedBoards =
          userRole === 'admin'
            ? rawBoards
            : rawBoards.filter(b => b.id !== FLOCI_HARNESS_BOARD_ID);
        setBoards(fetchedBoards);
        writeCachedKanbanBoards(workspaceId, userRole, fetchedBoards);

        // Preload Detail Kanban in the background so clicking a row opens in 0ms
        for (const b of fetchedBoards.slice(0, 3)) {
          void fetch(
            `/api/auth/open-app/kanban/boards/${encodeURIComponent(b.id)}?workspaceId=${encodeURIComponent(workspaceId)}&role=${encodeURIComponent(userRole)}&userEmail=${encodeURIComponent(userEmail)}`,
            { credentials: 'include' }
          )
            .then(r => (r.ok ? r.json() : null))
            .then(d => {
              if (d?.board) {
                writeCachedKanbanDetail(
                  workspaceId,
                  b.id,
                  d.board as KanbanBoardDetail
                );
              }
            })
            .catch(() => undefined);
        }
      }
    } catch (err) {
      console.error('Failed to fetch Kanban boards list:', err);
    } finally {
      setLoadingList(false);
    }
  }, [workspaceId, userRole, userEmail]);

  // 2. Fetch API Detail: GET /api/auth/open-app/kanban/boards/:boardId
  const fetchBoardDetail = useCallback(
    async (boardId: string, showSpinner = false) => {
      if (showSpinner) setLoadingDetail(true);
      try {
        const res = await fetch(
          `/api/auth/open-app/kanban/boards/${encodeURIComponent(boardId)}?workspaceId=${encodeURIComponent(workspaceId)}&role=${encodeURIComponent(userRole)}&userEmail=${encodeURIComponent(userEmail)}`,
          { credentials: 'include' }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data?.reviewers) && data.reviewers.length > 0) {
          setReviewerOptions(data.reviewers as string[]);
        }
        if (data?.board) {
          const detail = data.board as KanbanBoardDetail;
          setBoardDetail(detail);
          writeCachedKanbanDetail(workspaceId, boardId, detail);
        }
      } catch (err) {
        console.error('Failed to fetch Kanban board detail:', err);
        notify.error({
          title: 'Không thể tải chi tiết bảng Kanban',
          message: 'Vui lòng thử lại.',
        });
      } finally {
        setLoadingDetail(false);
      }
    },
    [workspaceId, userRole, userEmail]
  );

  useEffect(() => {
    setBoards(readInitialKanbanBoards(workspaceId, userRole));
    if (userRole !== 'admin' && activeBoardId === FLOCI_HARNESS_BOARD_ID) {
      setActiveBoardId(null);
      setBoardDetail(null);
    }
    fetchBoardsList().catch(console.error);
  }, [workspaceId, userRole, activeBoardId, fetchBoardsList]);

  const handleOpenBoardDetail = useCallback(
    (boardId: string) => {
      const cachedDetail = readInitialKanbanDetail(
        workspaceId,
        boardId,
        boards
      );
      setActiveBoardId(boardId);
      setBoardDetail(cachedDetail);
      setCardSearch('');
      setPriorityFilter('ALL');
      setAssigneeFilter('ALL');
      setCardPage(1);
      fetchBoardDetail(boardId, !cachedDetail).catch(console.error);
    },
    [workspaceId, boards, fetchBoardDetail]
  );

  const handleBackToList = useCallback(() => {
    setActiveBoardId(null);
    setBoardDetail(null);
    fetchBoardsList().catch(console.error);
  }, [fetchBoardsList]);

  // Inline update board metadata (status, target, limit, reviewer)
  const handlePatchBoardMeta = useCallback(
    async (boardId: string, patch: Record<string, unknown>) => {
      try {
        const res = await fetch(
          `/api/auth/open-app/kanban/boards/${encodeURIComponent(boardId)}`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId,
              role: userRole,
              userEmail,
              action: 'update-board',
              ...patch,
            }),
          }
        );
        const data = await res.json();
        if (data?.board) {
          const updated: KanbanBoardDetail = data.board;
          setBoards(prev => {
            const next = prev.map(b =>
              b.id === boardId ? { ...b, ...updated } : b
            );
            writeCachedKanbanBoards(workspaceId, userRole, next);
            return next;
          });
          writeCachedKanbanDetail(workspaceId, boardId, updated);
          if (activeBoardId === boardId) {
            setBoardDetail(updated);
          }
        }
      } catch (err) {
        console.error('Failed to update board metadata:', err);
      }
    },
    [workspaceId, userRole, userEmail, activeBoardId]
  );

  // Open Create Board Modal
  const openCreateBoardModal = useCallback(() => {
    setEditingBoardId(null);
    setBoardFormName('');
    setBoardFormDesc('');
    setBoardFormType('Product Sprint');
    setBoardFormStatus('In Process');
    setBoardFormTarget(12);
    setBoardFormLimit(8);
    setBoardFormReviewer(creatorName);
    setBoardFormColumns('Backlog, To Do, In Progress, In Review, Done');
    setBoardModalOpen(true);
  }, [creatorName]);

  // Open Edit Board Modal
  const openEditBoardModal = useCallback(
    (board: KanbanBoardSummary) => {
      setEditingBoardId(board.id);
      setBoardFormName(board.name);
      setBoardFormDesc(board.description || '');
      setBoardFormType(board.sectionType || 'Product Sprint');
      setBoardFormStatus(board.tableStatus || 'In Process');
      setBoardFormTarget(board.target ?? 12);
      setBoardFormLimit(board.limit ?? 8);
      setBoardFormReviewer(board.reviewer || creatorName);
      setBoardFormColumns(
        (board.columns || ['To Do', 'In Progress', 'In Review', 'Done']).join(
          ', '
        )
      );
      setBoardModalOpen(true);
    },
    [creatorName]
  );

  const handleSaveBoardModal = useCallback(async () => {
    const trimmedName = boardFormName.trim();
    if (!trimmedName) {
      notify.error({ title: 'Vui lòng nhập tên bảng Kanban' });
      return;
    }
    const parsedColumns = boardFormColumns
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);
    const columns =
      parsedColumns.length > 0
        ? parsedColumns
        : ['To Do', 'In Progress', 'In Review', 'Done'];

    try {
      if (editingBoardId) {
        await handlePatchBoardMeta(editingBoardId, {
          name: trimmedName,
          description: boardFormDesc.trim(),
          sectionType: boardFormType.trim() || 'Product Sprint',
          tableStatus: boardFormStatus,
          target: boardFormTarget,
          limit: boardFormLimit,
          reviewer: boardFormReviewer,
          columns,
        });
        notify.success({ title: 'Đã cập nhật bảng Kanban' });
      } else {
        const res = await fetch('/api/auth/open-app/kanban/boards', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            role: userRole,
            userEmail,
            action: 'create',
            name: trimmedName,
            description: boardFormDesc.trim(),
            sectionType: boardFormType.trim() || 'Product Sprint',
            tableStatus: boardFormStatus,
            target: boardFormTarget,
            limit: boardFormLimit,
            reviewer: boardFormReviewer || creatorName,
            columns,
          }),
        });
        const data = await res.json();
        if (data?.board) {
          await fetchBoardsList();
          notify.success({ title: 'Đã tạo bảng Kanban mới' });
        }
      }
      setBoardModalOpen(false);
    } catch (err) {
      console.error(err);
      notify.error({ title: 'Không thể lưu bảng Kanban' });
    }
  }, [
    boardFormName,
    boardFormColumns,
    boardFormDesc,
    boardFormType,
    boardFormStatus,
    boardFormTarget,
    boardFormLimit,
    boardFormReviewer,
    creatorName,
    editingBoardId,
    handlePatchBoardMeta,
    workspaceId,
    userRole,
    userEmail,
    fetchBoardsList,
  ]);

  const handleDuplicateBoard = useCallback(
    async (board: KanbanBoardSummary) => {
      try {
        const detailRes = await fetch(
          `/api/auth/open-app/kanban/boards/${encodeURIComponent(board.id)}?workspaceId=${encodeURIComponent(workspaceId)}`
        );
        const detailData = await detailRes.json();
        const sourceCards: KanbanCardItem[] = detailData?.board?.cards ?? [];

        await fetch('/api/auth/open-app/kanban/boards', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            role: userRole,
            userEmail,
            action: 'create',
            name: `${board.name} (Bản sao)`,
            description: board.description,
            sectionType: board.sectionType,
            tableStatus: board.tableStatus,
            target: board.target,
            limit: board.limit,
            reviewer: creatorName,
            columns: board.columns,
            cards: sourceCards.map((c, idx) => ({
              ...c,
              id: `dup-${Date.now()}-${idx}`,
            })),
          }),
        });
        await fetchBoardsList();
        notify.success({ title: 'Đã nhân bản bảng Kanban' });
      } catch (err) {
        console.error(err);
      }
    },
    [workspaceId, userRole, userEmail, creatorName, fetchBoardsList]
  );

  const handleDeleteBoards = useCallback(
    async (boardIds: string[]) => {
      if (boardIds.length === 0) return;
      try {
        const res = await fetch('/api/auth/open-app/kanban/boards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            action: 'delete',
            boardIds,
          }),
        });
        const data = await res.json();
        if (Array.isArray(data?.boards)) {
          setBoards(data.boards);
          setSelectedRowIds(new Set());
          notify.success({
            title: `Đã xóa ${boardIds.length} bảng Kanban`,
          });
        }
      } catch (err) {
        console.error(err);
      }
    },
    [workspaceId]
  );

  // Add / Remove column in Detail Kanban
  const handleAddColumn = useCallback(async () => {
    if (!boardDetail) return;
    const col = newColumnName.trim();
    if (!col) return;
    if (boardDetail.columns.includes(col)) {
      notify.error({ title: 'Cột này đã tồn tại trong bảng' });
      return;
    }
    const nextCols = [...boardDetail.columns, col];
    await handlePatchBoardMeta(boardDetail.id, { columns: nextCols });
    setNewColumnName('');
    setColumnModalOpen(false);
    notify.success({ title: `Đã thêm cột "${col}"` });
  }, [boardDetail, newColumnName, handlePatchBoardMeta]);

  const handleDeleteColumn = useCallback(
    async (colName: string) => {
      if (!boardDetail) return;
      if (boardDetail.columns.length <= 1) {
        notify.error({ title: 'Bảng Kanban cần tối thiểu 1 cột' });
        return;
      }
      const nextCols = boardDetail.columns.filter(c => c !== colName);
      await handlePatchBoardMeta(boardDetail.id, { columns: nextCols });
    },
    [boardDetail, handlePatchBoardMeta]
  );

  // Open Card Create / Detail Modal
  const openCreateCardModal = useCallback(
    (defaultColumn?: string) => {
      if (!boardDetail) return;
      const nextIndex = boardDetail.cards.length + 1;
      setEditingCardId(null);
      setCardFormCode(`AEV-${100 + nextIndex}`);
      setCardFormTitle('');
      setCardFormDesc('');
      setCardFormCriteria('');
      setCardFormStatus(defaultColumn || boardDetail.columns[0] || 'To Do');
      setCardFormType('Task');
      setCardFormPriority('Medium');
      setCardFormAssignee(creatorName);
      setCardFormDueDate(new Date().toISOString().slice(0, 10));
      setCardFormProgress(0);
      setCardFormSubtasks([
        {
          id: `sub-${Date.now()}-1`,
          title: 'Thực hiện & kiểm tra tiêu chí nghiệm thu',
          done: false,
        },
      ]);
      setNewSubtaskTitle('');
      setCardModalOpen(true);
    },
    [boardDetail, creatorName]
  );

  const openEditCardModal = useCallback(
    (card: KanbanCardItem) => {
      setEditingCardId(card.id);
      setCardFormCode(card.code || 'TASK-01');
      setCardFormTitle(card.title);
      setCardFormDesc(card.description || '');
      setCardFormCriteria(card.acceptanceCriteria || '');
      setCardFormStatus(card.status);
      setCardFormType(card.type || 'Task');
      setCardFormPriority(card.priority || 'Medium');
      setCardFormAssignee(card.assignee || creatorName);
      setCardFormDueDate(card.dueDate || '2026-10-20');
      setCardFormProgress(card.progress ?? 0);
      setCardFormSubtasks(card.subtasks ? [...card.subtasks] : []);
      setNewSubtaskTitle('');
      setCardModalOpen(true);
    },
    [creatorName]
  );

  const handleSaveCardModal = useCallback(async () => {
    if (!boardDetail) return;
    const trimmedTitle = cardFormTitle.trim();
    if (!trimmedTitle) {
      notify.error({ title: 'Vui lòng nhập tiêu đề thẻ công việc' });
      return;
    }
    try {
      const res = await fetch(
        `/api/auth/open-app/kanban/boards/${encodeURIComponent(boardDetail.id)}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            role: userRole,
            userEmail,
            action: 'upsert-card',
            card: {
              id: editingCardId || undefined,
              code: cardFormCode.trim() || 'TASK-01',
              title: trimmedTitle,
              description: cardFormDesc.trim(),
              acceptanceCriteria: cardFormCriteria.trim(),
              status: cardFormStatus,
              type: cardFormType,
              priority: cardFormPriority,
              assignee: cardFormAssignee,
              dueDate: cardFormDueDate,
              progress: cardFormProgress,
              subtasks: cardFormSubtasks,
            },
          }),
        }
      );
      const data = await res.json();
      if (data?.board) {
        const updated = data.board as KanbanBoardDetail;
        setBoardDetail(updated);
        writeCachedKanbanDetail(workspaceId, boardDetail.id, updated);
        if (Array.isArray(data?.boards)) {
          setBoards(data.boards);
          writeCachedKanbanBoards(workspaceId, userRole, data.boards);
        }
        setCardModalOpen(false);
        notify.success({
          title: editingCardId
            ? 'Đã lưu chi tiết thẻ công việc'
            : 'Đã thêm thẻ công việc mới',
        });
      }
    } catch (err) {
      console.error(err);
      notify.error({ title: 'Không thể lưu thẻ công việc' });
    }
  }, [
    boardDetail,
    cardFormTitle,
    workspaceId,
    userRole,
    userEmail,
    editingCardId,
    cardFormCode,
    cardFormDesc,
    cardFormCriteria,
    cardFormStatus,
    cardFormType,
    cardFormPriority,
    cardFormAssignee,
    cardFormDueDate,
    cardFormProgress,
    cardFormSubtasks,
  ]);

  const handleQuickMoveCard = useCallback(
    async (cardId: string, nextColumn: string) => {
      if (!boardDetail) return;
      try {
        const res = await fetch(
          `/api/auth/open-app/kanban/boards/${encodeURIComponent(boardDetail.id)}`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId,
              role: userRole,
              userEmail,
              action: 'upsert-card',
              card: {
                id: cardId,
                status: nextColumn,
              },
            }),
          }
        );
        const data = await res.json();
        if (data?.board) {
          const updated = data.board as KanbanBoardDetail;
          setBoardDetail(updated);
          writeCachedKanbanDetail(workspaceId, boardDetail.id, updated);
          if (Array.isArray(data?.boards)) {
            setBoards(data.boards);
            writeCachedKanbanBoards(workspaceId, userRole, data.boards);
          }
        }
      } catch (err) {
        console.error(err);
      }
    },
    [boardDetail, workspaceId, userRole, userEmail]
  );

  const handleDeleteCard = useCallback(
    async (cardId: string) => {
      if (!boardDetail) return;
      try {
        const res = await fetch(
          `/api/auth/open-app/kanban/boards/${encodeURIComponent(boardDetail.id)}`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId,
              role: userRole,
              userEmail,
              action: 'delete-card',
              cardId,
            }),
          }
        );
        const data = await res.json();
        if (data?.board) {
          const updated = data.board as KanbanBoardDetail;
          setBoardDetail(updated);
          writeCachedKanbanDetail(workspaceId, boardDetail.id, updated);
          if (Array.isArray(data?.boards)) {
            setBoards(data.boards);
            writeCachedKanbanBoards(workspaceId, userRole, data.boards);
          }
          setCardModalOpen(false);
          notify.success({ title: 'Đã xóa thẻ công việc' });
        }
      } catch (err) {
        console.error(err);
      }
    },
    [boardDetail, workspaceId, userRole, userEmail]
  );

  // Filtered boards for Level 1 Table
  const filteredBoards = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return boards;
    return boards.filter(
      b =>
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.sectionType.toLowerCase().includes(q) ||
        b.reviewer.toLowerCase().includes(q)
    );
  }, [boards, listSearch]);

  const totalBoardPages = Math.max(
    1,
    Math.ceil(filteredBoards.length / boardPageSize)
  );
  const safeBoardPage = Math.min(boardPage, totalBoardPages);
  const paginatedBoards = useMemo(() => {
    const start = (safeBoardPage - 1) * boardPageSize;
    return filteredBoards.slice(start, start + boardPageSize);
  }, [filteredBoards, safeBoardPage, boardPageSize]);
  const boardStartIdx =
    filteredBoards.length === 0 ? 0 : (safeBoardPage - 1) * boardPageSize + 1;
  const boardEndIdx = Math.min(
    filteredBoards.length,
    safeBoardPage * boardPageSize
  );

  // Filtered cards for Level 2 Detail Kanban
  const filteredCards = useMemo(() => {
    if (!boardDetail) return [];
    const q = cardSearch.trim().toLowerCase();
    return boardDetail.cards.filter(card => {
      if (priorityFilter !== 'ALL' && card.priority !== priorityFilter) {
        return false;
      }
      if (assigneeFilter !== 'ALL' && card.assignee !== assigneeFilter) {
        return false;
      }
      if (q) {
        const hay =
          `${card.code} ${card.title} ${card.description} ${card.assignee}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [boardDetail, cardSearch, priorityFilter, assigneeFilter]);

  const totalCardPages = Math.max(
    1,
    Math.ceil(filteredCards.length / cardPageSize)
  );
  const safeCardPage = Math.min(cardPage, totalCardPages);
  const paginatedCards = useMemo(() => {
    const start = (safeCardPage - 1) * cardPageSize;
    return filteredCards.slice(start, start + cardPageSize);
  }, [filteredCards, safeCardPage, cardPageSize]);
  const cardStartIdx =
    filteredCards.length === 0 ? 0 : (safeCardPage - 1) * cardPageSize + 1;
  const cardEndIdx = Math.min(
    filteredCards.length,
    safeCardPage * cardPageSize
  );

  const uniqueAssignees = useMemo(() => {
    if (!boardDetail) return [];
    const set = new Set<string>();
    for (const c of boardDetail.cards) {
      if (c.assignee) set.add(c.assignee);
    }
    return Array.from(set);
  }, [boardDetail]);

  const allSelected =
    paginatedBoards.length > 0 &&
    paginatedBoards.every(b => selectedRowIds.has(b.id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedRowIds(prev => {
        const next = new Set(prev);
        for (const b of paginatedBoards) next.delete(b.id);
        return next;
      });
    } else {
      setSelectedRowIds(prev => {
        const next = new Set(prev);
        for (const b of paginatedBoards) next.add(b.id);
        return next;
      });
    }
  }, [allSelected, paginatedBoards]);

  const toggleSelectRow = useCallback((id: string) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Reusable options for KanbanSelect
  const statusSelectOptions = useMemo<Array<SelectOption<TableRowStatus>>>(
    () =>
      TABLE_STATUS_OPTIONS.map(st => ({
        value: st,
        label: st,
        prefix: (
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '999px',
              backgroundColor: getStatusDotColor(st),
            }}
          />
        ),
      })),
    []
  );

  const reviewerSelectOptions = useMemo<Array<SelectOption<string>>>(
    () =>
      reviewerOptions.map(r => ({
        value: r,
        label: r,
      })),
    [reviewerOptions]
  );

  const sectionTypeSelectOptions = useMemo<Array<SelectOption<string>>>(
    () =>
      SECTION_TYPE_OPTIONS.map(t => ({
        value: t,
        label: t,
      })),
    []
  );

  const priorityFilterOptions = useMemo<Array<SelectOption<string>>>(
    () => [
      { value: 'ALL', label: 'Tất cả mức ưu tiên' },
      ...CARD_PRIORITIES.map(p => ({
        value: p,
        label: `Ưu tiên: ${p}`,
        prefix: (
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '999px',
              backgroundColor: getPriorityTone(p).dot,
            }}
          />
        ),
      })),
    ],
    []
  );

  const assigneeFilterOptions = useMemo<Array<SelectOption<string>>>(
    () => [
      { value: 'ALL', label: 'Tất cả người phụ trách' },
      ...uniqueAssignees.map(a => ({
        value: a,
        label: `Phụ trách: ${a}`,
      })),
    ],
    [uniqueAssignees]
  );

  return (
    <>
      <ViewTitle
        title={boardDetail ? `Kanban · ${boardDetail.name}` : 'Kanban'}
      />
      <ViewIcon icon="allDocs" />
      <ViewHeader>
        <div className={styles.headerBar}>
          <div className={styles.breadcrumbBar}>
            {activeBoardId ? (
              <>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={handleBackToList}
                >
                  <ArrowLeftSmallIcon width={14} height={14} />
                  <span>Danh sách bảng</span>
                </button>
                <span
                  style={{
                    color: cssVarV2('text/secondary'),
                    flexShrink: 0,
                  }}
                >
                  /
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: cssVarV2('text/primary'),
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                  }}
                  title={boardDetail?.name || ''}
                >
                  {boardDetail?.name || 'Đang tải...'}
                </span>
                {boardDetail ? (
                  <span
                    className={styles.outlinePill}
                    style={{ flexShrink: 0 }}
                  >
                    {boardDetail.sectionType}
                  </span>
                ) : null}
              </>
            ) : (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <DatabaseKanbanViewIcon width={16} height={16} />
                <span>Bảng Kanban</span>
                <span className={styles.countBadge}>{boards.length}</span>
              </div>
            )}
          </div>

          <div className={styles.toolbarGroup}>
            {activeBoardId && boardDetail ? (
              <>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => openEditBoardModal(boardDetail)}
                >
                  <EditIcon width={14} height={14} />
                  <span>Cấu hình bảng</span>
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => setColumnModalOpen(true)}
                >
                  <PlusIcon width={14} height={14} />
                  <span>Thêm cột</span>
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  data-primary="true"
                  onClick={() => openCreateCardModal()}
                >
                  <PlusIcon width={14} height={14} />
                  <span>Thêm thẻ công việc</span>
                </button>
              </>
            ) : (
              <>
                {userRole === 'admin' ? (
                  <span
                    className={styles.outlinePill}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '28px',
                      padding: '0 10px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '999px',
                        backgroundColor: '#10b981',
                      }}
                    />
                    <span>Admin · Floci Harness</span>
                  </span>
                ) : null}
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => void fetchBoardsList()}
                  title="Làm mới danh sách từ API"
                >
                  <ResetIcon width={14} height={14} />
                  <span>Làm mới</span>
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  data-primary="true"
                  onClick={openCreateBoardModal}
                >
                  <PlusIcon width={14} height={14} />
                  <span>Tạo bảng Kanban</span>
                </button>
              </>
            )}
          </div>
        </div>
      </ViewHeader>

      <ViewBody>
        <div className={styles.pageContainer}>
          {/* ========================================================= */}
          {/* LEVEL 1: TABLE OF CREATED KANBAN BOARDS (API LIST)        */}
          {/* ========================================================= */}
          {!activeBoardId ? (
            <div className={styles.contentArea}>
              <div
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* Clean Top Filter Bar (All controls unified at 28px height) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <SearchIcon
                        width={14}
                        height={14}
                        style={{
                          position: 'absolute',
                          left: '9px',
                          color: cssVarV2('text/secondary'),
                          pointerEvents: 'none',
                        }}
                      />
                      <input
                        type="text"
                        className={styles.controlInput}
                        style={{ width: '260px', paddingLeft: '28px' }}
                        placeholder="Tìm kiếm bảng Kanban..."
                        value={listSearch}
                        onChange={e => {
                          setListSearch(e.target.value);
                          setBoardPage(1);
                        }}
                      />
                    </div>

                    {selectedRowIds.size > 0 ? (
                      <button
                        type="button"
                        className={styles.actionButton}
                        style={{
                          color: '#ef4444',
                          borderColor: 'rgba(239, 68, 68, 0.35)',
                        }}
                        onClick={() =>
                          void handleDeleteBoards(Array.from(selectedRowIds))
                        }
                      >
                        <DeleteIcon width={14} height={14} />
                        <span>Xóa {selectedRowIds.size} bảng đã chọn</span>
                      </button>
                    ) : null}
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Click vào bất kỳ hàng nào để mở chi tiết bảng Kanban
                  </div>
                </div>

                {/* Fixed-Height Shadcn Data Table + Sticky Header + Pinned Pagination */}
                <div className={styles.shadcnTableContainer}>
                  <div className={styles.shadcnTableScroll}>
                    <table className={styles.shadcnTable}>
                      <thead>
                        <tr className={styles.shadcnTheadTr}>
                          <th
                            className={styles.shadcnTh}
                            style={{ width: '36px' }}
                          >
                            <input
                              type="checkbox"
                              className={styles.shadcnCheckbox}
                              checked={allSelected}
                              onChange={toggleSelectAll}
                            />
                          </th>
                          <th className={styles.shadcnTh}>Tên bảng Kanban</th>
                          <th className={styles.shadcnTh}>Phân loại</th>
                          <th className={styles.shadcnTh}>Trạng thái</th>
                          <th className={styles.shadcnTh}>
                            Cấu trúc & Tiến độ
                          </th>
                          <th
                            className={styles.shadcnTh}
                            style={{ textAlign: 'right', width: '76px' }}
                          >
                            Target
                          </th>
                          <th
                            className={styles.shadcnTh}
                            style={{ textAlign: 'right', width: '76px' }}
                          >
                            Limit
                          </th>
                          <th className={styles.shadcnTh}>Reviewer</th>
                          <th className={styles.shadcnTh} />
                        </tr>
                      </thead>
                      <tbody>
                        {loadingList ? (
                          <tr>
                            <td
                              colSpan={9}
                              className={styles.shadcnTd}
                              style={{
                                height: '350px',
                                borderBottom: 'none',
                                textAlign: 'center',
                                color: cssVarV2('text/secondary'),
                              }}
                            >
                              Đang tải danh sách bảng Kanban...
                            </td>
                          </tr>
                        ) : paginatedBoards.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className={styles.shadcnTd}
                              style={{
                                height: '350px',
                                borderBottom: 'none',
                                textAlign: 'center',
                                color: cssVarV2('text/secondary'),
                              }}
                            >
                              Chưa có bảng Kanban nào. Bấm{' '}
                              <strong>Tạo bảng Kanban</strong> ở góc phải để
                              khởi tạo.
                            </td>
                          </tr>
                        ) : (
                          paginatedBoards.map(row => {
                            const isSelected = selectedRowIds.has(row.id);

                            return (
                              <tr
                                key={row.id}
                                className={styles.shadcnTr}
                                data-selected={isSelected}
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleOpenBoardDetail(row.id)}
                              >
                                {/* Checkbox */}
                                <td
                                  className={styles.shadcnTd}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    className={styles.shadcnCheckbox}
                                    checked={isSelected}
                                    onChange={() => toggleSelectRow(row.id)}
                                  />
                                </td>

                                {/* Board Name + Description */}
                                <td className={styles.shadcnTd}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px',
                                    }}
                                  >
                                    <span className={styles.headerCellLink}>
                                      <DatabaseKanbanViewIcon
                                        width={14}
                                        height={14}
                                        style={{
                                          color: cssVarV2('text/secondary'),
                                          flexShrink: 0,
                                        }}
                                      />
                                      <span>{row.name}</span>
                                    </span>
                                    {row.description ? (
                                      <span
                                        style={{
                                          fontSize: '12px',
                                          color: cssVarV2('text/secondary'),
                                          paddingLeft: '22px',
                                          lineHeight: '18px',
                                        }}
                                      >
                                        {row.description}
                                      </span>
                                    ) : null}
                                  </div>
                                </td>

                                {/* Section Type */}
                                <td className={styles.shadcnTd}>
                                  <span className={styles.outlinePill}>
                                    {row.sectionType}
                                  </span>
                                </td>

                                {/* Status (Radix Portal Dropdown — 28px) */}
                                <td
                                  className={styles.shadcnTd}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <KanbanSelect
                                    value={row.tableStatus}
                                    options={statusSelectOptions}
                                    minWidth={122}
                                    onChange={next =>
                                      void handlePatchBoardMeta(row.id, {
                                        tableStatus: next,
                                      })
                                    }
                                  />
                                </td>

                                {/* Structure Summary: Columns · Cards · Progress */}
                                <td className={styles.shadcnTd}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        color: cssVarV2('text/primary'),
                                      }}
                                    >
                                      {row.columns.length} cột · {row.cardCount}{' '}
                                      thẻ
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '11.5px',
                                        color: cssVarV2('text/secondary'),
                                      }}
                                    >
                                      Hoàn thành {row.completedCount}/
                                      {row.cardCount} ({row.completionRate}%)
                                    </span>
                                  </div>
                                </td>

                                {/* Target (28px inline input) */}
                                <td
                                  className={styles.shadcnTd}
                                  style={{ textAlign: 'right' }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <input
                                    type="number"
                                    className={styles.inlineNumInput}
                                    defaultValue={row.target}
                                    onBlur={e => {
                                      const val = Number(e.target.value);
                                      if (
                                        !Number.isNaN(val) &&
                                        val !== row.target
                                      ) {
                                        handlePatchBoardMeta(row.id, {
                                          target: val,
                                        }).catch(console.error);
                                      }
                                    }}
                                  />
                                </td>

                                {/* Limit (28px inline input) */}
                                <td
                                  className={styles.shadcnTd}
                                  style={{ textAlign: 'right' }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  {row.id === FLOCI_HARNESS_BOARD_ID ? (
                                    <span style={{ fontSize: '16px', color: cssVarV2('text/secondary'), paddingRight: '8px' }}>∞</span>
                                  ) : (
                                    <input
                                      type="number"
                                      className={styles.inlineNumInput}
                                      defaultValue={row.limit}
                                      onBlur={e => {
                                        const val = Number(e.target.value);
                                        if (
                                          !Number.isNaN(val) &&
                                          val !== row.limit
                                        ) {
                                          handlePatchBoardMeta(row.id, {
                                            limit: val,
                                          }).catch(console.error);
                                        }
                                      }}
                                    />
                                  )}
                                </td>

                                {/* Reviewer (Radix Portal Dropdown — 28px) */}
                                <td
                                  className={styles.shadcnTd}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <KanbanSelect
                                    value={row.reviewer}
                                    options={reviewerSelectOptions}
                                    minWidth={150}
                                    onChange={next =>
                                      void handlePatchBoardMeta(row.id, {
                                        reviewer: next,
                                      })
                                    }
                                  />
                                </td>

                                {/* Row Actions Menu (Radix Portal Menu — never overlaps!) */}
                                <td
                                  className={styles.shadcnTd}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <Menu
                                    contentOptions={{
                                      align: 'end',
                                      sideOffset: 4,
                                    }}
                                    items={
                                      <>
                                        <MenuItem
                                          prefixIcon={
                                            <DatabaseKanbanViewIcon />
                                          }
                                          onSelect={() =>
                                            handleOpenBoardDetail(row.id)
                                          }
                                        >
                                          Mở chi tiết Kanban
                                        </MenuItem>
                                        <MenuItem
                                          prefixIcon={<EditIcon />}
                                          onSelect={() =>
                                            openEditBoardModal(row)
                                          }
                                        >
                                          Chỉnh sửa bảng
                                        </MenuItem>
                                        <MenuItem
                                          prefixIcon={<CopyIcon />}
                                          onSelect={() =>
                                            void handleDuplicateBoard(row)
                                          }
                                        >
                                          Nhân bản
                                        </MenuItem>
                                        <MenuSeparator />
                                        <MenuItem
                                          type="danger"
                                          prefixIcon={<DeleteIcon />}
                                          onSelect={() =>
                                            void handleDeleteBoards([row.id])
                                          }
                                        >
                                          Xóa bảng
                                        </MenuItem>
                                      </>
                                    }
                                  >
                                    <button
                                      type="button"
                                      className={styles.rowMenuBtn}
                                      aria-label="Tùy chọn bảng"
                                    >
                                      <MoreVerticalIcon
                                        width={15}
                                        height={15}
                                      />
                                    </button>
                                  </Menu>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pinned Shadcn Data Table Pagination Footer (28px controls) */}
                  <div className={styles.paginationBar}>
                    <div>
                      Đã chọn {selectedRowIds.size} / {filteredBoards.length}{' '}
                      hàng · Hiển thị {boardStartIdx}–{boardEndIdx} trên tổng{' '}
                      {filteredBoards.length} bảng Kanban
                    </div>

                    <div className={styles.paginationControls}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>Số dòng / trang</span>
                        <KanbanSelect
                          value={String(boardPageSize)}
                          options={PAGE_SIZE_OPTIONS}
                          minWidth={86}
                          align="end"
                          onChange={val => {
                            setBoardPageSize(Number(val));
                            setBoardPage(1);
                          }}
                        />
                      </div>

                      <span
                        style={{
                          fontWeight: 500,
                          color: cssVarV2('text/primary'),
                          minWidth: '78px',
                          textAlign: 'center',
                        }}
                      >
                        Trang {safeBoardPage} / {totalBoardPages}
                      </span>

                      <div className={styles.pageBtnGroup}>
                        <button
                          type="button"
                          className={styles.pageBtn}
                          disabled={safeBoardPage <= 1}
                          onClick={() => setBoardPage(1)}
                          title="Trang đầu"
                        >
                          «
                        </button>
                        <button
                          type="button"
                          className={styles.pageBtn}
                          disabled={safeBoardPage <= 1}
                          onClick={() => setBoardPage(p => Math.max(1, p - 1))}
                          title="Trang trước"
                        >
                          <ArrowLeftSmallIcon width={14} height={14} />
                        </button>

                        {Array.from(
                          { length: totalBoardPages },
                          (_, i) => i + 1
                        ).map(p => (
                          <button
                            key={p}
                            type="button"
                            className={styles.pageBtn}
                            data-active={p === safeBoardPage}
                            onClick={() => setBoardPage(p)}
                          >
                            {p}
                          </button>
                        ))}

                        <button
                          type="button"
                          className={styles.pageBtn}
                          disabled={safeBoardPage >= totalBoardPages}
                          onClick={() =>
                            setBoardPage(p => Math.min(totalBoardPages, p + 1))
                          }
                          title="Trang sau"
                        >
                          <ArrowRightSmallIcon width={14} height={14} />
                        </button>
                        <button
                          type="button"
                          className={styles.pageBtn}
                          disabled={safeBoardPage >= totalBoardPages}
                          onClick={() => setBoardPage(totalBoardPages)}
                          title="Trang cuối"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* LEVEL 2: DETAIL KANBAN BOARD (API DETAIL)                 */
            /* ========================================================= */
            <>
              {/* Board Detail Summary Banner */}
              {boardDetail ? (
                <div
                  style={{
                    padding: '10px 16px',
                    borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
                    backgroundColor: cssVarV2('layer/background/secondary'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      minWidth: '260px',
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: cssVarV2('text/primary'),
                        }}
                      >
                        {boardDetail.name}
                      </span>
                      <span className={styles.outlinePill}>
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '999px',
                            backgroundColor: getStatusDotColor(
                              boardDetail.tableStatus
                            ),
                          }}
                        />
                        <span>{boardDetail.tableStatus}</span>
                      </span>
                      <span className={styles.outlinePill}>
                        <UserIcon width={12} height={12} />
                        <span>Reviewer: {boardDetail.reviewer}</span>
                      </span>
                    </div>
                    {boardDetail.description ? (
                      <div
                        style={{
                          fontSize: '12px',
                          color: cssVarV2('text/secondary'),
                        }}
                      >
                        {boardDetail.description}
                      </div>
                    ) : null}
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: cssVarV2('text/secondary'),
                      }}
                    >
                      Luồng cột ({boardDetail.columns.length}):{' '}
                      <strong style={{ color: cssVarV2('text/primary') }}>
                        {boardDetail.columns.join(' → ')}
                      </strong>
                    </div>
                  </div>

                  {/* 4 Summary Metric Pills */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
                        backgroundColor: cssVarV2('layer/background/primary'),
                        minWidth: '88px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: cssVarV2('text/secondary'),
                        }}
                      >
                        Tổng số thẻ
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: cssVarV2('text/primary'),
                        }}
                      >
                        {boardDetail.stats.totalCards}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
                        backgroundColor: cssVarV2('layer/background/primary'),
                        minWidth: '88px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: cssVarV2('text/secondary'),
                        }}
                      >
                        Đang thực hiện
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: cssVarV2('text/primary'),
                        }}
                      >
                        {boardDetail.stats.inProgressCards}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
                        backgroundColor: cssVarV2('layer/background/primary'),
                        minWidth: '104px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: cssVarV2('text/secondary'),
                        }}
                      >
                        Hoàn thành
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: cssVarV2('text/primary'),
                        }}
                      >
                        {boardDetail.stats.completedCards}/
                        {boardDetail.stats.totalCards} (
                        {boardDetail.stats.completionRate}%)
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
                        backgroundColor: cssVarV2('layer/background/primary'),
                        minWidth: '88px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          color: cssVarV2('text/secondary'),
                        }}
                      >
                        Target / Limit
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: cssVarV2('text/primary'),
                        }}
                      >
                        {boardDetail.target} / {!boardDetail.limit || boardDetail.limit <= 0 || boardDetail.id === FLOCI_HARNESS_BOARD_ID ? '∞' : boardDetail.limit}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Detail Toolbar: All controls unified at 28px height */}
              <div className={styles.toolbarContainer}>
                <div className={styles.toolbarGroup}>
                  <div className={styles.viewSwitchGroup}>
                    <button
                      type="button"
                      className={styles.viewSwitchBtn}
                      data-active={detailViewMode === 'kanban'}
                      onClick={() => setDetailViewMode('kanban')}
                    >
                      <DatabaseKanbanViewIcon width={13} height={13} />
                      <span>Kanban</span>
                    </button>
                    <button
                      type="button"
                      className={styles.viewSwitchBtn}
                      data-active={detailViewMode === 'table'}
                      onClick={() => setDetailViewMode('table')}
                    >
                      <DatabaseTableViewIcon width={13} height={13} />
                      <span>Danh sách thẻ</span>
                    </button>
                  </div>

                  <KanbanSelect
                    value={priorityFilter}
                    options={priorityFilterOptions}
                    minWidth={145}
                    onChange={setPriorityFilter}
                  />

                  <KanbanSelect
                    value={assigneeFilter}
                    options={assigneeFilterOptions}
                    minWidth={165}
                    onChange={setAssigneeFilter}
                  />
                </div>

                <div className={styles.toolbarGroup}>
                  <div
                    style={{
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    <SearchIcon
                      width={14}
                      height={14}
                      style={{
                        position: 'absolute',
                        left: '9px',
                        color: cssVarV2('text/secondary'),
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      type="text"
                      className={styles.controlInput}
                      style={{ width: '230px', paddingLeft: '28px' }}
                      placeholder="Tìm mã thẻ, tiêu đề..."
                      value={cardSearch}
                      onChange={e => setCardSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Detail Content */}
              <div className={styles.contentArea}>
                {loadingDetail || !boardDetail ? (
                  <div
                    style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Đang tải chi tiết bảng Kanban...
                  </div>
                ) : detailViewMode === 'kanban' ? (
                  <div className={styles.kanbanBoardRow}>
                    {boardDetail.columns.map(col => {
                      const colCards = filteredCards.filter(
                        c => c.status === col
                      );
                      const colSelectOptions = boardDetail.columns.map(c => ({
                        value: c,
                        label: c,
                      }));

                      return (
                        <div
                          key={col}
                          className={styles.kanbanColumn}
                          data-drag-over={dragOverColumn === col}
                          onDragOver={e => {
                            e.preventDefault();
                            setDragOverColumn(col);
                          }}
                          onDragLeave={() => setDragOverColumn(null)}
                          onDrop={e => {
                            e.preventDefault();
                            setDragOverColumn(null);
                            const cardId = e.dataTransfer.getData('text/plain');
                            if (cardId) {
                              handleQuickMoveCard(cardId, col).catch(
                                console.error
                              );
                            }
                          }}
                        >
                          <div className={styles.columnHeader}>
                            <div className={styles.columnTitleGroup}>
                              <span>{col}</span>
                              <span className={styles.countBadge}>
                                {colCards.length}
                              </span>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <button
                                type="button"
                                className={styles.rowMenuBtn}
                                title={`Thêm thẻ vào cột ${col}`}
                                onClick={() => openCreateCardModal(col)}
                              >
                                <PlusIcon width={14} height={14} />
                              </button>
                              {boardDetail.columns.length > 1 &&
                              colCards.length === 0 ? (
                                <button
                                  type="button"
                                  className={styles.rowMenuBtn}
                                  title={`Xóa cột trống ${col}`}
                                  onClick={() => void handleDeleteColumn(col)}
                                >
                                  <DeleteIcon width={13} height={13} />
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <div className={styles.columnCardsList}>
                            {colCards.map(card => {
                              const prio = getPriorityTone(card.priority);
                              const totalSubs = card.subtasks?.length ?? 0;
                              const doneSubs =
                                card.subtasks?.filter(s => s.done).length ?? 0;

                              return (
                                <div
                                  key={card.id}
                                  className={styles.kanbanCard}
                                  draggable
                                  onDragStart={e => {
                                    e.dataTransfer.setData(
                                      'text/plain',
                                      card.id
                                    );
                                  }}
                                  onClick={() => openEditCardModal(card)}
                                >
                                  {/* Top Row: Code + Type + Priority */}
                                  <div className={styles.cardTopRow}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: '11.5px',
                                          fontWeight: 600,
                                          color: cssVarV2('text/secondary'),
                                        }}
                                      >
                                        {card.code}
                                      </span>
                                      <span className={styles.outlinePill}>
                                        {card.type}
                                      </span>
                                    </div>
                                    <span className={styles.outlinePill}>
                                      <span
                                        style={{
                                          width: '6px',
                                          height: '6px',
                                          borderRadius: '999px',
                                          backgroundColor: prio.dot,
                                        }}
                                      />
                                      <span>{prio.label}</span>
                                    </span>
                                  </div>

                                  {/* Card Title */}
                                  <div className={styles.cardTitle}>
                                    {card.title}
                                  </div>

                                  {/* Card Description Preview */}
                                  {card.description ? (
                                    <div
                                      style={{
                                        fontSize: '12px',
                                        color: cssVarV2('text/secondary'),
                                        lineHeight: '18px',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      {card.description}
                                    </div>
                                  ) : null}

                                  {/* Checklist & Progress */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '5px',
                                      marginTop: '2px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        fontSize: '11px',
                                        color: cssVarV2('text/secondary'),
                                      }}
                                    >
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}
                                      >
                                        <CheckBoxCheckSolidIcon
                                          width={12}
                                          height={12}
                                        />
                                        <span>
                                          {doneSubs}/{totalSubs} subtasks
                                        </span>
                                      </span>
                                      <span>{card.progress}%</span>
                                    </div>
                                    <div
                                      style={{
                                        width: '100%',
                                        height: '4px',
                                        borderRadius: '999px',
                                        backgroundColor: cssVarV2(
                                          'layer/background/secondary'
                                        ),
                                        overflow: 'hidden',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${Math.min(100, Math.max(0, card.progress))}%`,
                                          height: '100%',
                                          backgroundColor:
                                            cssVarV2('button/primary'),
                                          transition: 'width 160ms ease',
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Card Footer */}
                                  <div
                                    className={styles.cardFooter}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <div
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '11.5px',
                                        color: cssVarV2('text/secondary'),
                                      }}
                                    >
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}
                                      >
                                        <UserIcon width={12} height={12} />
                                        <span>{card.assignee}</span>
                                      </span>
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}
                                      >
                                        <DateTimeIcon width={12} height={12} />
                                        <span>{card.dueDate}</span>
                                      </span>
                                    </div>

                                    <KanbanSelect
                                      value={card.status}
                                      options={colSelectOptions}
                                      size="mini"
                                      minWidth={102}
                                      align="end"
                                      onChange={next =>
                                        void handleQuickMoveCard(card.id, next)
                                      }
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            className={styles.addCardBtn}
                            onClick={() => openCreateCardModal(col)}
                          >
                            <PlusIcon width={13} height={13} />
                            <span>Thêm thẻ</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Flat Table View of Cards inside this Board (Fixed-height + Pagination) */
                  <div className={styles.shadcnTableContainer}>
                    <div className={styles.shadcnTableScroll}>
                      <table className={styles.shadcnTable}>
                        <thead>
                          <tr className={styles.shadcnTheadTr}>
                            <th
                              className={styles.shadcnTh}
                              style={{ width: '90px' }}
                            >
                              Mã thẻ
                            </th>
                            <th className={styles.shadcnTh}>
                              Tiêu đề & Mô tả công việc
                            </th>
                            <th className={styles.shadcnTh}>Loại</th>
                            <th className={styles.shadcnTh}>Cột trạng thái</th>
                            <th className={styles.shadcnTh}>Độ ưu tiên</th>
                            <th className={styles.shadcnTh}>Phụ trách</th>
                            <th className={styles.shadcnTh}>Checklist</th>
                            <th className={styles.shadcnTh}>Hạn chót</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCards.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                className={styles.shadcnTd}
                                style={{
                                  height: '350px',
                                  borderBottom: 'none',
                                  textAlign: 'center',
                                  color: cssVarV2('text/secondary'),
                                }}
                              >
                                Không có thẻ công việc nào phù hợp bộ lọc.
                              </td>
                            </tr>
                          ) : (
                            paginatedCards.map(card => {
                              const prio = getPriorityTone(card.priority);
                              const totalSubs = card.subtasks?.length ?? 0;
                              const doneSubs =
                                card.subtasks?.filter(s => s.done).length ?? 0;
                              const colSelectOptions = boardDetail.columns.map(
                                c => ({
                                  value: c,
                                  label: c,
                                })
                              );
                              return (
                                <tr
                                  key={card.id}
                                  className={styles.shadcnTr}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => openEditCardModal(card)}
                                >
                                  <td className={styles.shadcnTd}>
                                    <strong>{card.code}</strong>
                                  </td>
                                  <td className={styles.shadcnTd}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px',
                                      }}
                                    >
                                      <span style={{ fontWeight: 500 }}>
                                        {card.title}
                                      </span>
                                      {card.description ? (
                                        <span
                                          style={{
                                            fontSize: '12px',
                                            color: cssVarV2('text/secondary'),
                                          }}
                                        >
                                          {card.description}
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className={styles.shadcnTd}>
                                    <span className={styles.outlinePill}>
                                      {card.type}
                                    </span>
                                  </td>
                                  <td
                                    className={styles.shadcnTd}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <KanbanSelect
                                      value={card.status}
                                      options={colSelectOptions}
                                      minWidth={128}
                                      onChange={next =>
                                        void handleQuickMoveCard(card.id, next)
                                      }
                                    />
                                  </td>
                                  <td className={styles.shadcnTd}>
                                    <span className={styles.outlinePill}>
                                      <span
                                        style={{
                                          width: '6px',
                                          height: '6px',
                                          borderRadius: '999px',
                                          backgroundColor: prio.dot,
                                        }}
                                      />
                                      <span>{prio.label}</span>
                                    </span>
                                  </td>
                                  <td className={styles.shadcnTd}>
                                    {card.assignee}
                                  </td>
                                  <td className={styles.shadcnTd}>
                                    {doneSubs}/{totalSubs} ({card.progress}%)
                                  </td>
                                  <td className={styles.shadcnTd}>
                                    {card.dueDate}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pinned Shadcn Data Table Pagination Footer (28px controls) */}
                    <div className={styles.paginationBar}>
                      <div>
                        Hiển thị {cardStartIdx}–{cardEndIdx} trên tổng{' '}
                        {filteredCards.length} thẻ công việc
                      </div>

                      <div className={styles.paginationControls}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span>Số dòng / trang</span>
                          <KanbanSelect
                            value={String(cardPageSize)}
                            options={PAGE_SIZE_OPTIONS}
                            minWidth={86}
                            align="end"
                            onChange={val => {
                              setCardPageSize(Number(val));
                              setCardPage(1);
                            }}
                          />
                        </div>

                        <span
                          style={{
                            fontWeight: 500,
                            color: cssVarV2('text/primary'),
                            minWidth: '78px',
                            textAlign: 'center',
                          }}
                        >
                          Trang {safeCardPage} / {totalCardPages}
                        </span>

                        <div className={styles.pageBtnGroup}>
                          <button
                            type="button"
                            className={styles.pageBtn}
                            disabled={safeCardPage <= 1}
                            onClick={() => setCardPage(1)}
                            title="Trang đầu"
                          >
                            «
                          </button>
                          <button
                            type="button"
                            className={styles.pageBtn}
                            disabled={safeCardPage <= 1}
                            onClick={() => setCardPage(p => Math.max(1, p - 1))}
                            title="Trang trước"
                          >
                            <ArrowLeftSmallIcon width={14} height={14} />
                          </button>

                          {Array.from(
                            { length: totalCardPages },
                            (_, i) => i + 1
                          ).map(p => (
                            <button
                              key={p}
                              type="button"
                              className={styles.pageBtn}
                              data-active={p === safeCardPage}
                              onClick={() => setCardPage(p)}
                            >
                              {p}
                            </button>
                          ))}

                          <button
                            type="button"
                            className={styles.pageBtn}
                            disabled={safeCardPage >= totalCardPages}
                            onClick={() =>
                              setCardPage(p => Math.min(totalCardPages, p + 1))
                            }
                            title="Trang sau"
                          >
                            <ArrowRightSmallIcon width={14} height={14} />
                          </button>
                          <button
                            type="button"
                            className={styles.pageBtn}
                            disabled={safeCardPage >= totalCardPages}
                            onClick={() => setCardPage(totalCardPages)}
                            title="Trang cuối"
                          >
                            »
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ViewBody>

      {/* ========================================================= */}
      {/* MODAL 1: CREATE / EDIT KANBAN BOARD (32px modal inputs)   */}
      {/* ========================================================= */}
      {boardModalOpen ? (
        <div
          className={styles.modalBackdrop}
          onClick={() => setBoardModalOpen(false)}
        >
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                paddingBottom: '12px',
                borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                }}
              >
                <DatabaseKanbanViewIcon width={16} height={16} />
                <span>
                  {editingBoardId
                    ? 'Chỉnh sửa Bảng Kanban'
                    : 'Tạo Bảng Kanban mới'}
                </span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: cssVarV2('text/secondary'),
                }}
              >
                Thiết lập thông tin bảng và danh sách các cột trạng thái.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}
              >
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: cssVarV2('text/secondary'),
                  }}
                >
                  Tên bảng Kanban
                </label>
                <input
                  type="text"
                  className={`${styles.controlInput} ${styles.modalInput ?? ''}`}
                  style={{
                    height: '36px',
                    minHeight: '36px',
                    fontSize: '13px',
                    padding: '0 10px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  placeholder="VD: Sprint Phát triển Tính năng Aevum..."
                  value={boardFormName}
                  onChange={e => setBoardFormName(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Phân loại
                  </label>
                  <KanbanSelect
                    size="modal"
                    value={boardFormType}
                    options={sectionTypeSelectOptions}
                    onChange={setBoardFormType}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Trạng thái
                  </label>
                  <KanbanSelect
                    size="modal"
                    value={boardFormStatus}
                    options={statusSelectOptions}
                    onChange={setBoardFormStatus}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1.4fr',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Target
                  </label>
                  <input
                    type="number"
                    className={`${styles.controlInput} ${styles.modalInput ?? ''}`}
                    style={{
                      height: '36px',
                      minHeight: '36px',
                      fontSize: '13px',
                      padding: '0 10px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    value={boardFormTarget}
                    onChange={e => setBoardFormTarget(Number(e.target.value))}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Limit
                  </label>
                  <input
                    type="number"
                    className={`${styles.controlInput} ${styles.modalInput ?? ''}`}
                    style={{
                      height: '36px',
                      minHeight: '36px',
                      fontSize: '13px',
                      padding: '0 10px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    value={boardFormLimit}
                    onChange={e => setBoardFormLimit(Number(e.target.value))}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Reviewer
                  </label>
                  <KanbanSelect
                    size="modal"
                    value={boardFormReviewer}
                    options={reviewerSelectOptions}
                    onChange={setBoardFormReviewer}
                  />
                </div>
              </div>

              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}
              >
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: cssVarV2('text/secondary'),
                  }}
                >
                  Các cột trạng thái (ngăn cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  className={`${styles.controlInput} ${styles.modalInput ?? ''}`}
                  style={{
                    height: '36px',
                    minHeight: '36px',
                    fontSize: '13px',
                    padding: '0 10px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  value={boardFormColumns}
                  onChange={e => setBoardFormColumns(e.target.value)}
                />
              </div>

              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}
              >
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: cssVarV2('text/secondary'),
                  }}
                >
                  Mô tả bảng Kanban
                </label>
                <textarea
                  className={`${styles.controlInput} ${styles.modalInput ?? ''}`}
                  style={{
                    height: 'auto',
                    minHeight: '68px',
                    fontSize: '13px',
                    lineHeight: '20px',
                    padding: '8px 10px',
                    width: '100%',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Mô tả mục tiêu và phạm vi của bảng Kanban này..."
                  value={boardFormDesc}
                  onChange={e => setBoardFormDesc(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                paddingTop: '12px',
                borderTop: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
              }}
            >
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => setBoardModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.actionButton}
                data-primary="true"
                onClick={() => void handleSaveBoardModal()}
              >
                {editingBoardId ? 'Lưu thay đổi' : 'Tạo bảng Kanban'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ========================================================= */}
      {/* MODAL 2: ADD COLUMN MODAL                                 */}
      {/* ========================================================= */}
      {columnModalOpen ? (
        <div
          className={styles.modalBackdrop}
          onClick={() => setColumnModalOpen(false)}
        >
          <div
            className={styles.modalCard}
            style={{ width: '400px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '15px', fontWeight: 600 }}>
              Thêm cột trạng thái mới
            </div>
            <input
              type="text"
              className={`${styles.controlInput} ${styles.modalInput ?? ''}`}
              style={{
                height: '36px',
                minHeight: '36px',
                fontSize: '13px',
                padding: '0 10px',
                width: '100%',
                boxSizing: 'border-box',
              }}
              placeholder="VD: QA Testing, Blocked, Staging..."
              value={newColumnName}
              onChange={e => setNewColumnName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddColumn().catch(console.error);
                }
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => setColumnModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.actionButton}
                data-primary="true"
                onClick={() => void handleAddColumn()}
              >
                Thêm cột
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ========================================================= */}
      {/* MODAL 3: CARD DETAIL & SUBTASKS MODAL                     */}
      {/* ========================================================= */}
      {cardModalOpen && boardDetail ? (
        <div
          className={styles.modalBackdrop}
          onClick={() => setCardModalOpen(false)}
        >
          <div
            className={styles.modalCard}
            style={{ width: '580px' }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span className={styles.outlinePill}>{cardFormCode}</span>
                <span style={{ fontSize: '15px', fontWeight: 600 }}>
                  {editingCardId
                    ? 'Chi tiết Thẻ công việc'
                    : 'Thêm Thẻ công việc mới'}
                </span>
              </div>
              {editingCardId ? (
                <button
                  type="button"
                  className={styles.actionButton}
                  style={{
                    color: '#ef4444',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                  }}
                  onClick={() => void handleDeleteCard(editingCardId)}
                >
                  <DeleteIcon width={14} height={14} />
                  <span>Xóa thẻ</span>
                </button>
              ) : null}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Mã thẻ
                  </label>
                  <input
                    type="text"
                    className={`${styles.controlInput} ${styles.modalInput ?? ''}`}
                    style={{
                      height: '36px',
                      minHeight: '36px',
                      fontSize: '13px',
                      padding: '0 10px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    value={cardFormCode}
                    onChange={e => setCardFormCode(e.target.value)}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Tiêu đề công việc
                  </label>
                  <input
                    type="text"
                    className={`${styles.controlInput} ${styles.modalInput ?? ''}`}
                    style={{
                      height: '36px',
                      minHeight: '36px',
                      fontSize: '13px',
                      padding: '0 10px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Nhập tiêu đề thẻ công việc..."
                    value={cardFormTitle}
                    onChange={e => setCardFormTitle(e.target.value)}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Cột trạng thái
                  </label>
                  <KanbanSelect
                    size="modal"
                    value={cardFormStatus}
                    options={boardDetail.columns.map(c => ({
                      value: c,
                      label: c,
                    }))}
                    onChange={setCardFormStatus}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Loại thẻ
                  </label>
                  <KanbanSelect
                    size="modal"
                    value={cardFormType}
                    options={WORK_ITEM_TYPES.map(t => ({
                      value: t,
                      label: t,
                    }))}
                    onChange={setCardFormType}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Độ ưu tiên
                  </label>
                  <KanbanSelect
                    size="modal"
                    value={cardFormPriority}
                    options={CARD_PRIORITIES.map(p => ({
                      value: p,
                      label: p,
                      prefix: (
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '999px',
                            backgroundColor: getPriorityTone(p).dot,
                          }}
                        />
                      ),
                    }))}
                    onChange={setCardFormPriority}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Người phụ trách
                  </label>
                  <KanbanSelect
                    size="modal"
                    value={cardFormAssignee}
                    options={reviewerSelectOptions}
                    onChange={setCardFormAssignee}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Hạn chót
                  </label>
                  <input
                    type="date"
                    className={`${styles.controlInput} ${styles.modalInput ?? ''}`}
                    style={{
                      height: '36px',
                      minHeight: '36px',
                      fontSize: '13px',
                      padding: '0 10px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    value={cardFormDueDate}
                    onChange={e => setCardFormDueDate(e.target.value)}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: cssVarV2('text/secondary'),
                    }}
                  >
                    Tiến độ ({cardFormProgress}%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={`${styles.controlInput} ${styles.modalInput ?? ''}`}
                    style={{
                      height: '36px',
                      minHeight: '36px',
                      fontSize: '13px',
                      padding: '0 10px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                    value={cardFormProgress}
                    onChange={e =>
                      setCardFormProgress(
                        Math.min(100, Math.max(0, Number(e.target.value)))
                      )
                    }
                  />
                </div>
              </div>

              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}
              >
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: cssVarV2('text/secondary'),
                  }}
                >
                  Mô tả chi tiết
                </label>
                <textarea
                  className={`${styles.controlInput} ${styles.modalInput ?? ''}`}
                  style={{
                    height: 'auto',
                    minHeight: '64px',
                    fontSize: '13px',
                    lineHeight: '20px',
                    padding: '8px 10px',
                    width: '100%',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Mô tả phạm vi và nội dung thực hiện..."
                  value={cardFormDesc}
                  onChange={e => setCardFormDesc(e.target.value)}
                />
              </div>

              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}
              >
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: cssVarV2('text/secondary'),
                  }}
                >
                  Tiêu chí nghiệm thu (Acceptance Criteria)
                </label>
                <textarea
                  className={`${styles.controlInput} ${styles.modalInput ?? ''}`}
                  style={{
                    height: 'auto',
                    minHeight: '60px',
                    fontSize: '13px',
                    lineHeight: '20px',
                    padding: '8px 10px',
                    width: '100%',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Các điều kiện cần đạt để hoàn thành thẻ..."
                  value={cardFormCriteria}
                  onChange={e => setCardFormCriteria(e.target.value)}
                />
              </div>

              {/* Subtasks / Checklist */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
                  backgroundColor: cssVarV2('layer/background/secondary'),
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: cssVarV2('text/primary'),
                  }}
                >
                  Checklist công việc con (
                  {cardFormSubtasks.filter(s => s.done).length}/
                  {cardFormSubtasks.length})
                </div>

                {cardFormSubtasks.map(sub => (
                  <div
                    key={sub.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        textDecoration: sub.done ? 'line-through' : 'none',
                        color: sub.done
                          ? cssVarV2('text/secondary')
                          : cssVarV2('text/primary'),
                      }}
                    >
                      <input
                        type="checkbox"
                        className={styles.shadcnCheckbox}
                        checked={sub.done}
                        onChange={() => {
                          const next = cardFormSubtasks.map(s =>
                            s.id === sub.id ? { ...s, done: !s.done } : s
                          );
                          setCardFormSubtasks(next);
                          if (next.length > 0) {
                            const doneCount = next.filter(s => s.done).length;
                            setCardFormProgress(
                              Math.round((doneCount / next.length) * 100)
                            );
                          }
                        }}
                      />
                      <span>{sub.title}</span>
                    </label>
                    <button
                      type="button"
                      className={styles.rowMenuBtn}
                      onClick={() =>
                        setCardFormSubtasks(prev =>
                          prev.filter(s => s.id !== sub.id)
                        )
                      }
                    >
                      <DeleteIcon width={13} height={13} />
                    </button>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="text"
                    className={styles.controlInput}
                    style={{
                      flex: 1,
                      height: '34px',
                      minHeight: '34px',
                      fontSize: '13px',
                      padding: '0 10px',
                    }}
                    placeholder="Thêm công việc con (Subtask)..."
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                        e.preventDefault();
                        setCardFormSubtasks(prev => [
                          ...prev,
                          {
                            id: `sub-${Date.now()}`,
                            title: newSubtaskTitle.trim(),
                            done: false,
                          },
                        ]);
                        setNewSubtaskTitle('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => {
                      if (!newSubtaskTitle.trim()) return;
                      setCardFormSubtasks(prev => [
                        ...prev,
                        {
                          id: `sub-${Date.now()}`,
                          title: newSubtaskTitle.trim(),
                          done: false,
                        },
                      ]);
                      setNewSubtaskTitle('');
                    }}
                  >
                    <PlusIcon width={13} height={13} />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                paddingTop: '12px',
                borderTop: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
              }}
            >
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => setCardModalOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className={styles.actionButton}
                data-primary="true"
                onClick={() => void handleSaveCardModal()}
              >
                Lưu thẻ công việc
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AllDocSidebarTabs />
    </>
  );
};

export const Component = WorkspaceKanbanPage;
export default WorkspaceKanbanPage;
