import { notify } from '@affine/component';
import { AuthService } from '@affine/core/modules/cloud';
import { DocsService } from '@affine/core/modules/doc';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { WorkspaceService } from '@affine/core/modules/workspace';
import {
  ArrowLeftSmallIcon,
  DatabaseKanbanViewIcon,
  DatabaseTableViewIcon,
  DeleteIcon,
  PlusIcon,
  SettingsIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AllDocSidebarTabs } from '../layouts/all-doc-sidebar-tabs';
import * as styles from './index.css';

const ALLOWED_BOT_PROFILES = [
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
] as const;

const HARNESS_STATES = [
  'New',
  'Accepted',
  'Active',
  'Blocked',
  'Resolved',
  'Closed',
] as const;

const WORK_ITEM_TYPES = [
  'Epic',
  'Feature',
  'Task',
  'Bug',
  'User Story',
  'Technical Story',
  'Testcase',
] as const;

const STATE_COLORS: Record<string, { bg: string; fg: string; dot: string }> = {
  New: { bg: 'rgba(148, 163, 184, 0.16)', fg: '#94a3b8', dot: '#94a3b8' },
  Accepted: { bg: 'rgba(56, 189, 248, 0.16)', fg: '#38bdf8', dot: '#38bdf8' },
  Active: { bg: 'rgba(59, 130, 246, 0.18)', fg: '#60a5fa', dot: '#3b82f6' },
  Blocked: { bg: 'rgba(239, 68, 68, 0.18)', fg: '#f87171', dot: '#ef4444' },
  Resolved: { bg: 'rgba(245, 158, 11, 0.18)', fg: '#fbbf24', dot: '#f59e0b' },
  Closed: { bg: 'rgba(34, 197, 94, 0.18)', fg: '#4ade80', dot: '#22c55e' },
};

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  Epic: { bg: 'rgba(168, 85, 247, 0.18)', fg: '#c084fc' },
  Feature: { bg: 'rgba(59, 130, 246, 0.18)', fg: '#60a5fa' },
  Task: { bg: 'rgba(16, 185, 129, 0.18)', fg: '#34d399' },
  Bug: { bg: 'rgba(239, 68, 68, 0.18)', fg: '#f87171' },
  Testcase: { bg: 'rgba(148, 163, 184, 0.16)', fg: '#94a3b8' },
};

export interface HarnessWorkItem {
  id: number;
  type: string;
  title: string;
  description?: string;
  state: string;
  priority: string;
  assigned_to_profile: string;
  created_by_profile?: string;
  parent_item_id?: number;
  updated_at: string;
}

export interface PersonalTaskCard {
  id: string;
  title: string;
  status: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  dueDate: string;
  progress: number;
  notes?: string;
}

export type TableRowStatus = 'In Process' | 'Done' | 'Planned';

export interface PersonalBoard {
  id: string;
  name: string;
  description?: string;
  sectionType: string;
  tableStatus: TableRowStatus;
  target: number;
  limit: number;
  reviewer: string;
  category?: 'personal' | 'bot';
  columns: string[];
  cards: PersonalTaskCard[];
  linkedDocId?: string;
  updatedAt?: string;
}

export interface BotBoardDefinition {
  id: string;
  name: string;
  description: string;
  sectionType: string;
  tableStatus: TableRowStatus;
  target: number;
  limit: number;
  reviewer: string;
  defaultTypeFilter: string;
  defaultGroupBy: 'state' | 'profile';
}

const DEFAULT_BOT_HARNESS_BOARDS: BotBoardDefinition[] = [
  {
    id: 'bot-master-backlog',
    name: 'SLPC Master Harness Board (10 Bot Profiles)',
    description:
      'Bảng điều phối tổng thể các Epic, Feature, Task của 10 Agent Profiles (Supervisor, Lead, Peer, QC...)',
    sectionType: 'SLPC Harness',
    tableStatus: 'In Process',
    target: 41,
    limit: 25,
    reviewer: 'Supervisor',
    defaultTypeFilter: 'MAIN',
    defaultGroupBy: 'state',
  },
  {
    id: 'bot-profile-allocation',
    name: 'Bot Profile Allocation Matrix (10 Agents)',
    description:
      'Gom cột trực tiếp theo từng Agent Profile để theo dõi và bàn giao task giữa các Bot',
    sectionType: '10 Bot Profiles',
    tableStatus: 'In Process',
    target: 30,
    limit: 15,
    reviewer: 'Lead',
    defaultTypeFilter: 'MAIN',
    defaultGroupBy: 'profile',
  },
  {
    id: 'bot-qc-testcases',
    name: 'QC ISTQB 5-Stage Verification & Testcases',
    description:
      'Bảng quản lý và nghiệm thu độc lập các Testcase ISTQB 5-Stage của Role QC',
    sectionType: 'ISTQB 5-Stage',
    tableStatus: 'Done',
    target: 20,
    limit: 20,
    reviewer: 'QC',
    defaultTypeFilter: 'Testcase',
    defaultGroupBy: 'state',
  },
];

const REVIEWER_OPTIONS = [
  'Assign reviewer',
  'Eddie Lake',
  'Jamik Tashpulatov',
  'Emily Whalen',
  'Supervisor',
  'Lead',
  'Peer',
  'QC',
  'Lead BA',
  'Lead design',
  'Lead Dev',
] as const;

interface AdminKanbanConfig {
  enabledUsers: Record<string, boolean>;
  simulateStandardUser: boolean;
}

const ADMIN_CONFIG_STORAGE_KEY = 'aevum_kanban_admin_config_v1';

const DEFAULT_ADMIN_EMAILS = new Set([
  'admin@aevum.io',
  'baoltb@aevum.app',
  'admin@aevum.local',
  'lcho332002@gmail.com',
]);

function normalizeProfileName(raw: string | undefined): string {
  if (!raw) return 'Peer';
  const match = ALLOWED_BOT_PROFILES.find(
    p => p.toLowerCase() === raw.trim().toLowerCase()
  );
  return match ?? raw;
}

function loadAdminConfig(currentEmail: string): AdminKanbanConfig {
  try {
    const raw = localStorage.getItem(ADMIN_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AdminKanbanConfig;
      return {
        enabledUsers: parsed.enabledUsers ?? {},
        simulateStandardUser: Boolean(parsed.simulateStandardUser),
      };
    }
  } catch (e) {
    console.error(e);
  }
  const initialUsers: Record<string, boolean> = {
    'admin@aevum.io': true,
    'baoltb@aevum.app': true,
    'dev.member@aevum.io': false,
    'guest.viewer@aevum.io': false,
  };
  if (currentEmail) {
    initialUsers[currentEmail] = true;
  }
  return {
    enabledUsers: initialUsers,
    simulateStandardUser: false,
  };
}

function buildDefaultCardsForSection(sectionTitle: string): PersonalTaskCard[] {
  return [
    {
      id: `card-${sectionTitle}-1`,
      title: `Soạn thảo nội dung & cấu trúc cho "${sectionTitle}"`,
      status: 'Done',
      priority: 'High',
      dueDate: '2026-10-18',
      progress: 100,
    },
    {
      id: `card-${sectionTitle}-2`,
      title: `Rà soát tiêu chuẩn thiết kế & dữ liệu thực thi "${sectionTitle}"`,
      status: 'In Progress',
      priority: 'Urgent',
      dueDate: '2026-10-19',
      progress: 65,
    },
    {
      id: `card-${sectionTitle}-3`,
      title: `Kiểm thử nghiệm thu & phê duyệt "${sectionTitle}"`,
      status: 'In Review',
      priority: 'Medium',
      dueDate: '2026-10-21',
      progress: 40,
    },
    {
      id: `card-${sectionTitle}-4`,
      title: `Hoàn thiện tài liệu bàn giao "${sectionTitle}"`,
      status: 'To Do',
      priority: 'Low',
      dueDate: '2026-10-24',
      progress: 0,
    },
  ];
}

function getDefaultPersonalBoards(): PersonalBoard[] {
  const defaultRows: Array<{
    id: string;
    name: string;
    sectionType: string;
    tableStatus: TableRowStatus;
    target: number;
    limit: number;
    reviewer: string;
  }> = [
    {
      id: 'section-cover-page',
      name: 'Cover page',
      sectionType: 'Cover page',
      tableStatus: 'In Process',
      target: 18,
      limit: 5,
      reviewer: 'Eddie Lake',
    },
    {
      id: 'section-toc',
      name: 'Table of contents',
      sectionType: 'Table of contents',
      tableStatus: 'Done',
      target: 29,
      limit: 24,
      reviewer: 'Eddie Lake',
    },
    {
      id: 'section-exec-summary',
      name: 'Executive summary',
      sectionType: 'Narrative',
      tableStatus: 'Done',
      target: 10,
      limit: 13,
      reviewer: 'Eddie Lake',
    },
    {
      id: 'section-tech-approach',
      name: 'Technical approach',
      sectionType: 'Narrative',
      tableStatus: 'Done',
      target: 27,
      limit: 23,
      reviewer: 'Jamik Tashpulatov',
    },
    {
      id: 'section-design',
      name: 'Design',
      sectionType: 'Narrative',
      tableStatus: 'In Process',
      target: 2,
      limit: 16,
      reviewer: 'Jamik Tashpulatov',
    },
    {
      id: 'section-capabilities',
      name: 'Capabilities',
      sectionType: 'Narrative',
      tableStatus: 'In Process',
      target: 20,
      limit: 8,
      reviewer: 'Jamik Tashpulatov',
    },
    {
      id: 'section-integration',
      name: 'Integration with existing systems',
      sectionType: 'Narrative',
      tableStatus: 'In Process',
      target: 19,
      limit: 21,
      reviewer: 'Jamik Tashpulatov',
    },
    {
      id: 'section-innovation',
      name: 'Innovation and Advantages',
      sectionType: 'Narrative',
      tableStatus: 'Done',
      target: 25,
      limit: 26,
      reviewer: 'Assign reviewer',
    },
  ];

  return defaultRows.map(r => ({
    id: r.id,
    name: r.name,
    description: `Bảng Kanban quản lý chi tiết cho hạng mục "${r.name}" (${r.sectionType})`,
    sectionType: r.sectionType,
    tableStatus: r.tableStatus,
    target: r.target,
    limit: r.limit,
    reviewer: r.reviewer,
    category: 'personal',
    updatedAt: '2026-10-18',
    columns: ['To Do', 'In Progress', 'In Review', 'Done'],
    cards: buildDefaultCardsForSection(r.name),
  }));
}

type SelectedBoardTarget =
  | { kind: 'bot'; boardId: string }
  | { kind: 'personal'; boardId: string }
  | null;

export const WorkspaceKanbanPage = () => {
  const authService = useService(AuthService);
  const workspaceService = useService(WorkspaceService);
  const docsService = useService(DocsService);
  const workbench = useService(WorkbenchService).workbench;

  const account = useLiveData(authService.session.account$);
  const workspaceId = workspaceService.workspace.id;
  const currentUserEmail = (
    account?.email ||
    account?.label ||
    'admin@aevum.io'
  )
    .trim()
    .toLowerCase();

  const isOwnerAdmin = useMemo(() => {
    if (!account) return true;
    return (
      DEFAULT_ADMIN_EMAILS.has(currentUserEmail) ||
      currentUserEmail.includes('admin') ||
      currentUserEmail.includes('bao')
    );
  }, [account, currentUserEmail]);

  const [adminConfig, setAdminConfig] = useState<AdminKanbanConfig>(() =>
    loadAdminConfig(currentUserEmail)
  );
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [newUserEmailInput, setNewUserEmailInput] = useState('');

  const saveAdminConfig = useCallback((next: AdminKanbanConfig) => {
    setAdminConfig(next);
    try {
      localStorage.setItem(ADMIN_CONFIG_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const canViewBotHarnessBoard = useMemo(() => {
    if (adminConfig.simulateStandardUser) {
      return false;
    }
    if (adminConfig.enabledUsers[currentUserEmail] !== undefined) {
      return adminConfig.enabledUsers[currentUserEmail];
    }
    return isOwnerAdmin;
  }, [adminConfig, currentUserEmail, isOwnerAdmin]);

  // ========================================================================
  // NAVIGATION STATE: null = Shadcn Data Table, non-null = Kanban Board
  // ========================================================================
  const [selectedBoardTarget, setSelectedBoardTarget] =
    useState<SelectedBoardTarget>(null);
  const [listFilterCategory, setListFilterCategory] = useState<
    'all' | 'bot' | 'personal'
  >('all');
  const [listSearchQuery, setListSearchQuery] = useState('');

  // Table selection, action menu, and row drag-and-drop
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [openMenuRowId, setOpenMenuRowId] = useState<string | null>(null);
  const [draggedTableRowId, setDraggedTableRowId] = useState<string | null>(
    null
  );

  // Add / Edit Row Modal State (supports both Add and Edit for Bot & Personal rows)
  const [newBoardModalOpen, setNewBoardModalOpen] = useState(false);
  const [editingRowTarget, setEditingRowTarget] = useState<{
    kind: 'bot' | 'personal';
    id: string;
  } | null>(null);
  const [newBoardNameInput, setNewBoardNameInput] = useState('');
  const [newBoardDescInput, setNewBoardDescInput] = useState('');
  const [newBoardSectionType, setNewBoardSectionType] = useState('Narrative');
  const [newBoardStatus, setNewBoardStatus] =
    useState<TableRowStatus>('In Process');
  const [newBoardTargetNum, setNewBoardTargetNum] = useState<number>(20);
  const [newBoardLimitNum, setNewBoardLimitNum] = useState<number>(15);
  const [newBoardReviewer, setNewBoardReviewer] =
    useState<string>('Assign reviewer');
  const [newBoardCategory, setNewBoardCategory] = useState<'personal' | 'bot'>(
    'personal'
  );

  // Close 3-dot row menu when clicking anywhere outside
  useEffect(() => {
    if (!openMenuRowId) return;
    const close = () => setOpenMenuRowId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openMenuRowId]);

  // If user loses Bot access while viewing a Bot board, return to Table page
  useEffect(() => {
    if (!canViewBotHarnessBoard && selectedBoardTarget?.kind === 'bot') {
      setSelectedBoardTarget(null);
    }
    if (!canViewBotHarnessBoard && listFilterCategory === 'bot') {
      setListFilterCategory('all');
    }
  }, [canViewBotHarnessBoard, listFilterCategory, selectedBoardTarget]);

  // ========================================================================
  // ZONE 1 STATE: BOT / HARNESS BOARD (Table & Kanban, 10 Agent Profiles)
  // ========================================================================
  const harnessStorageKey = `aevum_bot_harness_items_${workspaceId}`;
  const [botItems, setBotItems] = useState<HarnessWorkItem[]>([]);
  const [botViewMode, setBotViewMode] = useState<'kanban' | 'table'>('kanban');
  const [botGroupBy, setBotGroupBy] = useState<'state' | 'profile'>('state');
  const [botProfileFilter, setBotProfileFilter] = useState<string>('ALL');
  const [botTypeFilter, setBotTypeFilter] = useState<string>('MAIN');
  const [botSearchQuery, setBotSearchQuery] = useState<string>('');
  const [draggedBotItemId, setDraggedBotItemId] = useState<number | null>(null);
  const [dragOverBotCol, setDragOverBotCol] = useState<string | null>(null);

  const [newBotTaskModalOpen, setNewBotTaskModalOpen] = useState(false);
  const [newBotTaskTitle, setNewBotTaskTitle] = useState('');
  const [newBotTaskType, setNewBotTaskType] = useState<string>('Task');
  const [newBotTaskState, setNewBotTaskState] = useState<string>('New');
  const [newBotTaskProfile, setNewBotTaskProfile] =
    useState<string>('Supervisor');
  const [newBotTaskPriority, setNewBotTaskPriority] = useState<string>('P1');

  const fetchHarnessBacklog = useCallback(
    async (forceReset = false) => {
      try {
        if (!forceReset) {
          const cached = localStorage.getItem(harnessStorageKey);
          if (cached) {
            const parsed = JSON.parse(cached) as HarnessWorkItem[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setBotItems(parsed);
              return;
            }
          }
        }
        const res = await fetch('/harness-backlog.json');
        if (!res.ok) return;
        const data = (await res.json()) as {
          items?: HarnessWorkItem[];
          testcases?: HarnessWorkItem[];
        };
        const merged = [...(data.items ?? []), ...(data.testcases ?? [])].map(
          item => ({
            ...item,
            assigned_to_profile: normalizeProfileName(item.assigned_to_profile),
            state: item.state || 'New',
            priority: item.priority || 'P1',
          })
        );
        setBotItems(merged);
        localStorage.setItem(harnessStorageKey, JSON.stringify(merged));
      } catch (err) {
        console.error('Failed to load harness backlog:', err);
      }
    },
    [harnessStorageKey]
  );

  useEffect(() => {
    fetchHarnessBacklog(false).catch(console.error);
  }, [fetchHarnessBacklog]);

  const updateBotItems = useCallback(
    (updater: (prev: HarnessWorkItem[]) => HarnessWorkItem[]) => {
      setBotItems(prev => {
        const next = updater(prev);
        try {
          localStorage.setItem(harnessStorageKey, JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
        return next;
      });
    },
    [harnessStorageKey]
  );

  const filteredBotItems = useMemo(() => {
    return botItems.filter(item => {
      if (botTypeFilter === 'MAIN' && item.type === 'Testcase') {
        return false;
      }
      if (
        botTypeFilter !== 'ALL' &&
        botTypeFilter !== 'MAIN' &&
        item.type !== botTypeFilter
      ) {
        return false;
      }
      if (
        botProfileFilter !== 'ALL' &&
        normalizeProfileName(item.assigned_to_profile) !== botProfileFilter
      ) {
        return false;
      }
      if (botSearchQuery.trim()) {
        const q = botSearchQuery.trim().toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchId = `#${item.id}`.includes(q) || String(item.id) === q;
        const matchProfile = (item.assigned_to_profile || '')
          .toLowerCase()
          .includes(q);
        return matchTitle || matchId || matchProfile;
      }
      return true;
    });
  }, [botItems, botProfileFilter, botSearchQuery, botTypeFilter]);

  const botColumns = useMemo(() => {
    return botGroupBy === 'state'
      ? [...HARNESS_STATES]
      : [...ALLOWED_BOT_PROFILES];
  }, [botGroupBy]);

  const handleBotDropOnColumn = useCallback(
    (targetColumn: string) => {
      if (draggedBotItemId === null) return;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      updateBotItems(prev =>
        prev.map(item => {
          if (item.id !== draggedBotItemId) return item;
          return botGroupBy === 'state'
            ? { ...item, state: targetColumn, updated_at: now }
            : {
                ...item,
                assigned_to_profile: targetColumn,
                updated_at: now,
              };
        })
      );
      setDraggedBotItemId(null);
      setDragOverBotCol(null);
    },
    [botGroupBy, draggedBotItemId, updateBotItems]
  );

  const handleCreateBotTask = useCallback(() => {
    const trimmed = newBotTaskTitle.trim();
    if (!trimmed) return;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    updateBotItems(prev => {
      const maxId = prev.reduce((acc, it) => Math.max(acc, it.id), 313);
      const nextItem: HarnessWorkItem = {
        id: maxId + 1,
        title: trimmed,
        type: newBotTaskType,
        state: newBotTaskState,
        priority: newBotTaskPriority,
        assigned_to_profile: newBotTaskProfile,
        created_by_profile: 'Supervisor',
        updated_at: now,
      };
      return [nextItem, ...prev];
    });
    setNewBotTaskTitle('');
    setNewBotTaskModalOpen(false);
    notify.success({
      title: 'Đã tạo Task mới cho Bot',
      message: `Đã giao "${trimmed}" cho profile ${newBotTaskProfile}.`,
    });
  }, [
    newBotTaskPriority,
    newBotTaskProfile,
    newBotTaskState,
    newBotTaskTitle,
    newBotTaskType,
    updateBotItems,
  ]);

  // ========================================================================
  // PERSISTED BOT BOARD ROWS & PERSONAL BOARD ROWS FOR SHADCN TABLE
  // ========================================================================
  const botBoardsStorageKey = `aevum_bot_boards_v2_${workspaceId}`;
  const [botBoards, setBotBoards] = useState<BotBoardDefinition[]>(() => {
    try {
      const saved = localStorage.getItem(botBoardsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as BotBoardDefinition[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_BOT_HARNESS_BOARDS;
  });

  const updateBotBoards = useCallback(
    (updater: (prev: BotBoardDefinition[]) => BotBoardDefinition[]) => {
      setBotBoards(prev => {
        const next = updater(prev);
        try {
          localStorage.setItem(botBoardsStorageKey, JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
        return next;
      });
    },
    [botBoardsStorageKey]
  );

  const personalStorageKey = `aevum_personal_boards_v2_${workspaceId}`;
  const [personalBoards, setPersonalBoards] = useState<PersonalBoard[]>(() => {
    try {
      const saved = localStorage.getItem(personalStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as PersonalBoard[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return getDefaultPersonalBoards();
  });

  const [personalViewMode, setPersonalViewMode] = useState<'kanban' | 'table'>(
    'kanban'
  );
  const [personalSearch, setPersonalSearch] = useState('');
  const [draggedPersonalCardId, setDraggedPersonalCardId] = useState<
    string | null
  >(null);
  const [dragOverPersonalCol, setDragOverPersonalCol] = useState<string | null>(
    null
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(personalStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as PersonalBoard[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPersonalBoards(parsed);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    setPersonalBoards(getDefaultPersonalBoards());
  }, [personalStorageKey]);

  const updatePersonalBoards = useCallback(
    (updater: (prev: PersonalBoard[]) => PersonalBoard[]) => {
      setPersonalBoards(prev => {
        const next = updater(prev);
        try {
          localStorage.setItem(personalStorageKey, JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
        return next;
      });
    },
    [personalStorageKey]
  );

  const currentPersonalBoard = useMemo(() => {
    if (selectedBoardTarget?.kind === 'personal') {
      return (
        personalBoards.find(b => b.id === selectedBoardTarget.boardId) ??
        personalBoards[0]
      );
    }
    return personalBoards[0];
  }, [personalBoards, selectedBoardTarget]);

  const currentBotBoardDef = useMemo(() => {
    if (selectedBoardTarget?.kind === 'bot') {
      return (
        botBoards.find(b => b.id === selectedBoardTarget.boardId) ??
        botBoards[0] ??
        DEFAULT_BOT_HARNESS_BOARDS[0]
      );
    }
    return botBoards[0] ?? DEFAULT_BOT_HARNESS_BOARDS[0];
  }, [botBoards, selectedBoardTarget]);

  const handleOpenBotBoard = useCallback((boardDef: BotBoardDefinition) => {
    setBotTypeFilter(boardDef.defaultTypeFilter);
    setBotGroupBy(boardDef.defaultGroupBy);
    setBotViewMode('kanban');
    setSelectedBoardTarget({ kind: 'bot', boardId: boardDef.id });
  }, []);

  const handleOpenPersonalBoard = useCallback((boardId: string) => {
    setPersonalViewMode('kanban');
    setSelectedBoardTarget({ kind: 'personal', boardId });
  }, []);

  // Open Modal for Creating a New Row
  const handleOpenAddRowModal = useCallback(() => {
    setEditingRowTarget(null);
    setNewBoardNameInput('');
    setNewBoardDescInput('');
    setNewBoardSectionType('Narrative');
    setNewBoardStatus('In Process');
    setNewBoardTargetNum(18);
    setNewBoardLimitNum(10);
    setNewBoardReviewer('Assign reviewer');
    setNewBoardCategory(listFilterCategory === 'bot' ? 'bot' : 'personal');
    setNewBoardModalOpen(true);
  }, [listFilterCategory]);

  // Open Modal for Editing an Existing Row (Bot or Personal)
  const handleOpenEditRowModal = useCallback(
    (row: {
      kind: 'bot' | 'personal';
      id: string;
      name: string;
      description: string;
      sectionType: string;
      tableStatus: TableRowStatus;
      target: number;
      limit: number;
      reviewer: string;
    }) => {
      setEditingRowTarget({ kind: row.kind, id: row.id });
      setNewBoardNameInput(row.name);
      setNewBoardDescInput(row.description);
      setNewBoardSectionType(row.sectionType);
      setNewBoardStatus(row.tableStatus);
      setNewBoardTargetNum(row.target);
      setNewBoardLimitNum(row.limit);
      setNewBoardReviewer(row.reviewer);
      setNewBoardCategory(row.kind);
      setNewBoardModalOpen(true);
      setOpenMenuRowId(null);
    },
    []
  );

  // Submit Add or Edit Row in the Shadcn Table
  const handleCreatePersonalBoardSubmit = useCallback(() => {
    const trimmed = newBoardNameInput.trim();
    if (!trimmed) return;

    if (editingRowTarget) {
      if (editingRowTarget.kind === 'bot') {
        updateBotBoards(prev =>
          prev.map(b =>
            b.id === editingRowTarget.id
              ? {
                  ...b,
                  name: trimmed,
                  description: newBoardDescInput.trim() || b.description,
                  sectionType: newBoardSectionType.trim() || 'SLPC Harness',
                  tableStatus: newBoardStatus,
                  target: Number(newBoardTargetNum) || 0,
                  limit: Number(newBoardLimitNum) || 0,
                  reviewer: newBoardReviewer,
                }
              : b
          )
        );
      } else {
        updatePersonalBoards(prev =>
          prev.map(b =>
            b.id === editingRowTarget.id
              ? {
                  ...b,
                  name: trimmed,
                  description: newBoardDescInput.trim() || b.description,
                  sectionType: newBoardSectionType.trim() || 'Narrative',
                  tableStatus: newBoardStatus,
                  target: Number(newBoardTargetNum) || 0,
                  limit: Number(newBoardLimitNum) || 0,
                  reviewer: newBoardReviewer,
                }
              : b
          )
        );
      }
      setNewBoardModalOpen(false);
      setEditingRowTarget(null);
      notify.success({
        title: 'Đã cập nhật dòng dữ liệu',
        message: `Đã lưu thay đổi cho "${trimmed}".`,
      });
      return;
    }

    if (newBoardCategory === 'bot' && canViewBotHarnessBoard) {
      const newBotRow: BotBoardDefinition = {
        id: `bot-custom-${Date.now()}`,
        name: trimmed,
        description:
          newBoardDescInput.trim() || 'Bảng điều phối công việc Bot / Harness',
        sectionType: newBoardSectionType.trim() || 'SLPC Harness',
        tableStatus: newBoardStatus,
        target: Number(newBoardTargetNum) || 20,
        limit: Number(newBoardLimitNum) || 10,
        reviewer:
          newBoardReviewer === 'Assign reviewer'
            ? 'Supervisor'
            : newBoardReviewer,
        defaultTypeFilter: 'MAIN',
        defaultGroupBy: 'state',
      };
      updateBotBoards(prev => [newBotRow, ...prev]);
      setNewBoardModalOpen(false);
      notify.success({
        title: 'Đã thêm mục Bot / Harness mới',
        message: `Đã thêm "${newBotRow.name}" vào bảng.`,
      });
      return;
    }

    const newBoard: PersonalBoard = {
      id: `board-${Date.now()}`,
      name: trimmed,
      description:
        newBoardDescInput.trim() ||
        `Bảng Kanban quản lý công việc cho "${trimmed}"`,
      sectionType: newBoardSectionType.trim() || 'Narrative',
      tableStatus: newBoardStatus,
      target: Number(newBoardTargetNum) || 18,
      limit: Number(newBoardLimitNum) || 10,
      reviewer: newBoardReviewer,
      category: 'personal',
      updatedAt: new Date().toISOString().slice(0, 10),
      columns: ['To Do', 'In Progress', 'In Review', 'Done'],
      cards: buildDefaultCardsForSection(trimmed),
    };
    updatePersonalBoards(prev => [newBoard, ...prev]);
    setNewBoardModalOpen(false);
    notify.success({
      title: 'Đã thêm mục mới vào Table',
      message: `Click vào "${newBoard.name}" để mở Kanban Board.`,
    });
  }, [
    canViewBotHarnessBoard,
    editingRowTarget,
    newBoardCategory,
    newBoardDescInput,
    newBoardLimitNum,
    newBoardNameInput,
    newBoardReviewer,
    newBoardSectionType,
    newBoardStatus,
    newBoardTargetNum,
    updateBotBoards,
    updatePersonalBoards,
  ]);

  // Inline Update for any Row in the Shadcn Table
  const handleInlineUpdateRow = useCallback(
    (
      kind: 'bot' | 'personal',
      id: string,
      patch: Partial<{
        name: string;
        sectionType: string;
        tableStatus: TableRowStatus;
        target: number;
        limit: number;
        reviewer: string;
      }>
    ) => {
      if (kind === 'bot') {
        updateBotBoards(prev =>
          prev.map(b => (b.id === id ? { ...b, ...patch } : b))
        );
      } else {
        updatePersonalBoards(prev =>
          prev.map(b => (b.id === id ? { ...b, ...patch } : b))
        );
      }
    },
    [updateBotBoards, updatePersonalBoards]
  );

  // Duplicate Row in the Shadcn Table
  const handleDuplicateRow = useCallback(
    (kind: 'bot' | 'personal', id: string) => {
      if (kind === 'bot') {
        const found = botBoards.find(b => b.id === id);
        if (!found) return;
        const copy: BotBoardDefinition = {
          ...found,
          id: `bot-copy-${Date.now()}`,
          name: `${found.name} (Copy)`,
        };
        updateBotBoards(prev => [copy, ...prev]);
      } else {
        const found = personalBoards.find(b => b.id === id);
        if (!found) return;
        const copy: PersonalBoard = {
          ...found,
          id: `board-copy-${Date.now()}`,
          name: `${found.name} (Copy)`,
        };
        updatePersonalBoards(prev => [copy, ...prev]);
      }
      setOpenMenuRowId(null);
      notify.success({ title: 'Đã nhân bản dòng dữ liệu' });
    },
    [botBoards, personalBoards, updateBotBoards, updatePersonalBoards]
  );

  // Delete single Row in the Shadcn Table
  const handleDeleteTableRow = useCallback(
    (kind: 'bot' | 'personal', id: string) => {
      if (kind === 'bot') {
        updateBotBoards(prev => prev.filter(b => b.id !== id));
      } else {
        updatePersonalBoards(prev => prev.filter(b => b.id !== id));
      }
      setSelectedRowIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setOpenMenuRowId(null);
      notify.success({ title: 'Đã xóa mục khỏi bảng' });
    },
    [updateBotBoards, updatePersonalBoards]
  );

  // Bulk Delete Selected Rows
  const handleBulkDeleteSelected = useCallback(() => {
    if (selectedRowIds.size === 0) return;
    const count = selectedRowIds.size;
    updateBotBoards(prev => prev.filter(b => !selectedRowIds.has(b.id)));
    updatePersonalBoards(prev => prev.filter(b => !selectedRowIds.has(b.id)));
    setSelectedRowIds(new Set());
    notify.success({
      title: `Đã xóa ${count} mục đã chọn`,
    });
  }, [selectedRowIds, updateBotBoards, updatePersonalBoards]);

  const handleAddPersonalColumn = useCallback(() => {
    if (!currentPersonalBoard) return;
    const colName = window.prompt('Nhập tên cột trạng thái mới:', 'Backlog');
    if (!colName || !colName.trim()) return;
    const trimmed = colName.trim();
    if (currentPersonalBoard.columns.includes(trimmed)) return;
    updatePersonalBoards(prev =>
      prev.map(b =>
        b.id === currentPersonalBoard.id
          ? { ...b, columns: [...b.columns, trimmed] }
          : b
      )
    );
  }, [currentPersonalBoard, updatePersonalBoards]);

  const handleAddPersonalCard = useCallback(
    (statusCol: string) => {
      if (!currentPersonalBoard) return;
      const newCard: PersonalTaskCard = {
        id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: 'Thẻ công việc mới (Bấm để sửa)',
        status: statusCol,
        priority: 'Medium',
        dueDate: new Date().toISOString().slice(0, 10),
        progress: 0,
      };
      updatePersonalBoards(prev =>
        prev.map(b =>
          b.id === currentPersonalBoard.id
            ? { ...b, cards: [...b.cards, newCard] }
            : b
        )
      );
    },
    [currentPersonalBoard, updatePersonalBoards]
  );

  const handleUpdatePersonalCard = useCallback(
    (cardId: string, patch: Partial<PersonalTaskCard>) => {
      if (!currentPersonalBoard) return;
      updatePersonalBoards(prev =>
        prev.map(b =>
          b.id === currentPersonalBoard.id
            ? {
                ...b,
                cards: b.cards.map(c =>
                  c.id === cardId ? { ...c, ...patch } : c
                ),
              }
            : b
        )
      );
    },
    [currentPersonalBoard, updatePersonalBoards]
  );

  const handleDeletePersonalCard = useCallback(
    (cardId: string) => {
      if (!currentPersonalBoard) return;
      updatePersonalBoards(prev =>
        prev.map(b =>
          b.id === currentPersonalBoard.id
            ? { ...b, cards: b.cards.filter(c => c.id !== cardId) }
            : b
        )
      );
    },
    [currentPersonalBoard, updatePersonalBoards]
  );

  const handleOpenInBlockSuiteDoc = useCallback(() => {
    if (!currentPersonalBoard) return;
    if (currentPersonalBoard.linkedDocId) {
      const existing = docsService.list.doc$(
        currentPersonalBoard.linkedDocId
      ).value;
      if (existing && !existing.trash$.value) {
        workbench.openDoc(currentPersonalBoard.linkedDocId);
        return;
      }
    }
    const newDoc = docsService.createDoc({
      title: currentPersonalBoard.name,
      primaryMode: 'page',
    });
    docsService.list.doc$(newDoc.id).value?.setProperty('fullWidth', true);
    updatePersonalBoards(prev =>
      prev.map(b =>
        b.id === currentPersonalBoard.id ? { ...b, linkedDocId: newDoc.id } : b
      )
    );
    workbench.openDoc(newDoc.id);
  }, [currentPersonalBoard, docsService, updatePersonalBoards, workbench]);

  const filteredPersonalCards = useMemo(() => {
    if (!currentPersonalBoard) return [];
    if (!personalSearch.trim()) return currentPersonalBoard.cards;
    const q = personalSearch.trim().toLowerCase();
    return currentPersonalBoard.cards.filter(
      c =>
        c.title.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        c.priority.toLowerCase().includes(q)
    );
  }, [currentPersonalBoard, personalSearch]);

  // Unified Table Rows for Level 1 Shadcn Data Table
  const unifiedTableRows = useMemo(() => {
    const q = listSearchQuery.trim().toLowerCase();
    const rows: Array<{
      kind: 'bot' | 'personal';
      id: string;
      name: string;
      description: string;
      sectionType: string;
      tableStatus: TableRowStatus;
      target: number;
      limit: number;
      reviewer: string;
      botDef?: BotBoardDefinition;
    }> = [];

    if (canViewBotHarnessBoard && listFilterCategory !== 'personal') {
      for (const b of botBoards) {
        if (
          !q ||
          b.name.toLowerCase().includes(q) ||
          b.sectionType.toLowerCase().includes(q) ||
          b.reviewer.toLowerCase().includes(q)
        ) {
          rows.push({
            kind: 'bot',
            id: b.id,
            name: b.name,
            description: b.description,
            sectionType: b.sectionType || 'SLPC Harness',
            tableStatus: b.tableStatus || 'In Process',
            target: b.target ?? 41,
            limit: b.limit ?? 20,
            reviewer: b.reviewer || 'Supervisor',
            botDef: b,
          });
        }
      }
    }

    if (listFilterCategory !== 'bot') {
      for (const p of personalBoards) {
        const sType = p.sectionType || 'Narrative';
        const rev = p.reviewer || 'Assign reviewer';
        if (
          !q ||
          p.name.toLowerCase().includes(q) ||
          sType.toLowerCase().includes(q) ||
          rev.toLowerCase().includes(q)
        ) {
          rows.push({
            kind: 'personal',
            id: p.id,
            name: p.name,
            description: p.description ?? '',
            sectionType: sType,
            tableStatus: p.tableStatus || 'In Process',
            target: p.target ?? p.cards.length,
            limit: p.limit ?? 15,
            reviewer: rev,
          });
        }
      }
    }

    return rows;
  }, [
    botBoards,
    canViewBotHarnessBoard,
    listFilterCategory,
    listSearchQuery,
    personalBoards,
  ]);

  const allVisibleSelected =
    unifiedTableRows.length > 0 &&
    unifiedTableRows.every(r => selectedRowIds.has(r.id));

  const handleToggleSelectAll = useCallback(() => {
    if (allVisibleSelected) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(unifiedTableRows.map(r => r.id)));
    }
  }, [allVisibleSelected, unifiedTableRows]);

  const handleToggleSelectRow = useCallback((id: string) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCycleRowStatus = useCallback(
    (kind: 'bot' | 'personal', id: string, current: TableRowStatus) => {
      const order: TableRowStatus[] = ['In Process', 'Done', 'Planned'];
      const nextStatus = order[(order.indexOf(current) + 1) % order.length];
      handleInlineUpdateRow(kind, id, { tableStatus: nextStatus });
    },
    [handleInlineUpdateRow]
  );

  const handleDropTableRow = useCallback(
    (targetRowId: string) => {
      if (!draggedTableRowId || draggedTableRowId === targetRowId) {
        setDraggedTableRowId(null);
        return;
      }
      updatePersonalBoards(prev => {
        const fromIdx = prev.findIndex(b => b.id === draggedTableRowId);
        const toIdx = prev.findIndex(b => b.id === targetRowId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const copy = [...prev];
        const [moved] = copy.splice(fromIdx, 1);
        copy.splice(toIdx, 0, moved);
        return copy;
      });
      updateBotBoards(prev => {
        const fromIdx = prev.findIndex(b => b.id === draggedTableRowId);
        const toIdx = prev.findIndex(b => b.id === targetRowId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const copy = [...prev];
        const [moved] = copy.splice(fromIdx, 1);
        copy.splice(toIdx, 0, moved);
        return copy;
      });
      setDraggedTableRowId(null);
    },
    [draggedTableRowId, updateBotBoards, updatePersonalBoards]
  );

  return (
    <>
      <ViewTitle
        title={
          selectedBoardTarget === null
            ? 'Kanban'
            : selectedBoardTarget.kind === 'bot'
              ? currentBotBoardDef.name
              : (currentPersonalBoard?.name ?? 'Kanban Board')
        }
      />
      <ViewIcon icon="allDocs" />
      <ViewHeader>
        <div className={styles.headerBar}>
          {/* Left Header: Either Table Overview Title or Back-to-Table Breadcrumb */}
          {selectedBoardTarget === null ? (
            <div className={styles.breadcrumbBar}>
              <DatabaseTableViewIcon width={18} height={18} />
              <span>
                Quản lý Hạng mục & Bảng Kanban (Click vào mục để mở Kanban)
              </span>
            </div>
          ) : (
            <div className={styles.breadcrumbBar}>
              <button
                type="button"
                data-testid="back-to-kanban-list"
                className={styles.actionButton}
                onClick={() => setSelectedBoardTarget(null)}
              >
                <ArrowLeftSmallIcon width={16} height={16} />
                <span>Quay lại Bảng (Table)</span>
              </button>
              <span style={{ opacity: 0.4 }}>/</span>
              <span>
                {selectedBoardTarget.kind === 'bot'
                  ? `🤖 ${currentBotBoardDef.name}`
                  : `📋 ${currentPersonalBoard?.name ?? ''}`}
              </span>
              <span className={styles.outlinePill}>
                {selectedBoardTarget.kind === 'bot'
                  ? currentBotBoardDef.sectionType
                  : currentPersonalBoard?.sectionType}
              </span>
            </div>
          )}

          {/* Right Header Controls: Admin Config & Add Section */}
          <div className={styles.toolbarGroup}>
            {isOwnerAdmin && adminConfig.simulateStandardUser && (
              <button
                type="button"
                className={styles.actionButton}
                style={{
                  borderColor: '#f59e0b',
                  color: '#fbbf24',
                }}
                onClick={() =>
                  saveAdminConfig({
                    ...adminConfig,
                    simulateStandardUser: false,
                  })
                }
              >
                👁️ Đang xem như User thường (Bấm để bật lại Admin)
              </button>
            )}
            {isOwnerAdmin && (
              <button
                type="button"
                data-testid="kanban-admin-config-button"
                className={styles.actionButton}
                onClick={() => setAdminModalOpen(true)}
              >
                <SettingsIcon width={15} height={15} />
                <span>Admin Config</span>
              </button>
            )}
            <button
              type="button"
              data-primary="true"
              data-testid="kanban-add-section-btn"
              className={styles.actionButton}
              onClick={handleOpenAddRowModal}
            >
              <PlusIcon width={14} height={14} />
              <span>Add Section / Thêm mới</span>
            </button>
          </div>
        </div>
      </ViewHeader>

      <ViewBody>
        <div className={styles.pageContainer}>
          {/* ============================================================== */}
          {/* LEVEL 1: SHADCN DASHBOARD-01 DATA TABLE (Add / Edit / Delete)  */}
          {/* Click any row's Header to open its Kanban Board!               */}
          {/* ============================================================== */}
          {selectedBoardTarget === null ? (
            <>
              <div className={styles.toolbarContainer}>
                <div className={styles.toolbarGroup}>
                  <div className={styles.zoneTabsWrapper}>
                    <button
                      type="button"
                      data-active={listFilterCategory === 'all'}
                      className={styles.zoneTabButton}
                      onClick={() => setListFilterCategory('all')}
                    >
                      <span>Outline (Tất cả)</span>
                      <span className={styles.countBadge}>
                        {(canViewBotHarnessBoard ? botBoards.length : 0) +
                          personalBoards.length}
                      </span>
                    </button>
                    {canViewBotHarnessBoard && (
                      <button
                        type="button"
                        data-active={listFilterCategory === 'bot'}
                        className={styles.zoneTabButton}
                        onClick={() => setListFilterCategory('bot')}
                      >
                        <span>🤖 Bot / Harness</span>
                        <span className={styles.countBadge}>
                          {botBoards.length}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      data-active={listFilterCategory === 'personal'}
                      className={styles.zoneTabButton}
                      onClick={() => setListFilterCategory('personal')}
                    >
                      <span>👤 Cá nhân (Sections)</span>
                      <span className={styles.countBadge}>
                        {personalBoards.length}
                      </span>
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Tìm kiếm Header, Section Type, Reviewer..."
                    className={styles.controlInput}
                    style={{ minWidth: 240 }}
                    value={listSearchQuery}
                    onChange={e => setListSearchQuery(e.target.value)}
                  />
                </div>

                <div className={styles.toolbarGroup}>
                  {selectedRowIds.size > 0 && (
                    <button
                      type="button"
                      data-testid="kanban-bulk-delete-btn"
                      className={styles.actionButton}
                      style={{
                        borderColor: 'rgba(239, 68, 68, 0.5)',
                        backgroundColor: 'rgba(239, 68, 68, 0.14)',
                        color: '#f87171',
                      }}
                      onClick={handleBulkDeleteSelected}
                    >
                      <DeleteIcon width={14} height={14} />
                      <span>Xóa ({selectedRowIds.size}) mục đã chọn</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={handleOpenAddRowModal}
                  >
                    <PlusIcon width={14} height={14} />
                    <span>Add Section</span>
                  </button>
                </div>
              </div>

              <div className={styles.contentArea}>
                <div className={styles.shadcnTableContainer}>
                  <table className={styles.shadcnTable}>
                    <thead>
                      <tr className={styles.shadcnTheadTr}>
                        <th className={styles.shadcnTh} aria-label="Drag" />
                        <th className={styles.shadcnTh}>
                          <input
                            type="checkbox"
                            aria-label="Select all rows"
                            className={styles.shadcnCheckbox}
                            checked={allVisibleSelected}
                            onChange={handleToggleSelectAll}
                          />
                        </th>
                        <th className={styles.shadcnTh}>Header</th>
                        <th className={styles.shadcnTh}>Section Type</th>
                        <th className={styles.shadcnTh}>Status</th>
                        <th
                          className={styles.shadcnTh}
                          style={{ textAlign: 'right', width: '90px' }}
                        >
                          Target
                        </th>
                        <th
                          className={styles.shadcnTh}
                          style={{ textAlign: 'right', width: '90px' }}
                        >
                          Limit
                        </th>
                        <th className={styles.shadcnTh}>Reviewer</th>
                        <th className={styles.shadcnTh} aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {unifiedTableRows.map(row => {
                        const isSelected = selectedRowIds.has(row.id);
                        const isDragging = draggedTableRowId === row.id;
                        const isUnassigned =
                          !row.reviewer || row.reviewer === 'Assign reviewer';

                        return (
                          <tr
                            key={row.id}
                            data-testid={`kanban-table-row-${row.id}`}
                            data-selected={isSelected}
                            data-dragging={isDragging}
                            className={styles.shadcnTr}
                            draggable
                            onDragStart={() => setDraggedTableRowId(row.id)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => handleDropTableRow(row.id)}
                          >
                            {/* 1. Six-dot Grip Handle */}
                            <td className={styles.shadcnTd}>
                              <span
                                className={styles.gripHandle}
                                title="Kéo thả để sắp xếp thứ tự dòng"
                              >
                                ⋮⋮
                              </span>
                            </td>

                            {/* 2. Row Checkbox */}
                            <td className={styles.shadcnTd}>
                              <input
                                type="checkbox"
                                aria-label={`Select ${row.name}`}
                                className={styles.shadcnCheckbox}
                                checked={isSelected}
                                onChange={() => handleToggleSelectRow(row.id)}
                              />
                            </td>

                            {/* 3. Header (Click to Open Kanban Board!) */}
                            <td className={styles.shadcnTd}>
                              <button
                                type="button"
                                data-testid={`open-kanban-${row.id}`}
                                className={styles.headerCellLink}
                                title="Click để mở Bảng Kanban của mục này"
                                onClick={() => {
                                  if (row.kind === 'bot' && row.botDef) {
                                    handleOpenBotBoard(row.botDef);
                                  } else {
                                    handleOpenPersonalBoard(row.id);
                                  }
                                }}
                              >
                                {row.kind === 'bot' && (
                                  <span title="Bảng Bot / Harness">🤖</span>
                                )}
                                <span>{row.name}</span>
                              </button>
                            </td>

                            {/* 4. Section Type (Rounded Outline Pill) */}
                            <td className={styles.shadcnTd}>
                              <span className={styles.outlinePill}>
                                {row.sectionType}
                              </span>
                            </td>

                            {/* 5. Status (Clickable Pill with Icon: Done / In Process / Planned) */}
                            <td className={styles.shadcnTd}>
                              <button
                                type="button"
                                title="Bấm để đổi trạng thái (In Process / Done / Planned)"
                                className={styles.statusPillBtn}
                                onClick={() =>
                                  handleCycleRowStatus(
                                    row.kind,
                                    row.id,
                                    row.tableStatus
                                  )
                                }
                              >
                                {row.tableStatus === 'Done' ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 14,
                                      height: 14,
                                      borderRadius: '50%',
                                      backgroundColor: '#22c55e',
                                      color: '#052e16',
                                      fontSize: 9,
                                      fontWeight: 800,
                                    }}
                                  >
                                    ✓
                                  </span>
                                ) : row.tableStatus === 'In Process' ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#a1a1aa',
                                      fontSize: 12,
                                    }}
                                  >
                                    ✻
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#60a5fa',
                                      fontSize: 11,
                                    }}
                                  >
                                    ○
                                  </span>
                                )}
                                <span>{row.tableStatus}</span>
                              </button>
                            </td>

                            {/* 6. Target (Inline Editable Number Input) */}
                            <td
                              className={styles.shadcnTd}
                              style={{ textAlign: 'right' }}
                            >
                              <input
                                type="number"
                                aria-label={`${row.name} Target`}
                                className={styles.inlineNumInput}
                                value={row.target}
                                onChange={e =>
                                  handleInlineUpdateRow(row.kind, row.id, {
                                    target: Number(e.target.value) || 0,
                                  })
                                }
                              />
                            </td>

                            {/* 7. Limit (Inline Editable Number Input) */}
                            <td
                              className={styles.shadcnTd}
                              style={{ textAlign: 'right' }}
                            >
                              <input
                                type="number"
                                aria-label={`${row.name} Limit`}
                                className={styles.inlineNumInput}
                                value={row.limit}
                                onChange={e =>
                                  handleInlineUpdateRow(row.kind, row.id, {
                                    limit: Number(e.target.value) || 0,
                                  })
                                }
                              />
                            </td>

                            {/* 8. Reviewer (Inline Select Dropdown matching Shadcn screenshot) */}
                            <td className={styles.shadcnTd}>
                              <select
                                aria-label={`${row.name} Reviewer`}
                                data-Assigned={!isUnassigned}
                                className={styles.reviewerSelect}
                                style={
                                  isUnassigned
                                    ? { opacity: 0.75 }
                                    : { fontWeight: 400 }
                                }
                                value={row.reviewer}
                                onChange={e =>
                                  handleInlineUpdateRow(row.kind, row.id, {
                                    reviewer: e.target.value,
                                  })
                                }
                              >
                                {REVIEWER_OPTIONS.map(opt => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* 9. Three-dot Action Menu (Open Kanban / Edit / Duplicate / Delete) */}
                            <td className={styles.shadcnTd}>
                              <button
                                type="button"
                                data-testid={`row-menu-btn-${row.id}`}
                                className={styles.rowMenuBtn}
                                title="Thêm thao tác (Sửa / Mở Kanban / Xóa)"
                                onClick={e => {
                                  e.stopPropagation();
                                  setOpenMenuRowId(prev =>
                                    prev === row.id ? null : row.id
                                  );
                                }}
                              >
                                ⋮
                              </button>

                              {openMenuRowId === row.id && (
                                <div
                                  className={styles.rowDropdownMenu}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className={styles.rowDropdownItem}
                                    onClick={() => {
                                      setOpenMenuRowId(null);
                                      if (row.kind === 'bot' && row.botDef) {
                                        handleOpenBotBoard(row.botDef);
                                      } else {
                                        handleOpenPersonalBoard(row.id);
                                      }
                                    }}
                                  >
                                    <span>📋 Mở Kanban Board</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.rowDropdownItem}
                                    onClick={() => handleOpenEditRowModal(row)}
                                  >
                                    <span>✏️ Chỉnh sửa (Edit)</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.rowDropdownItem}
                                    onClick={() =>
                                      handleDuplicateRow(row.kind, row.id)
                                    }
                                  >
                                    <span>📑 Nhân bản (Make a copy)</span>
                                  </button>
                                  <div
                                    style={{
                                      height: 1,
                                      backgroundColor:
                                        'rgba(148, 163, 184, 0.15)',
                                      margin: '3px 0',
                                    }}
                                  />
                                  <button
                                    type="button"
                                    data-danger="true"
                                    className={styles.rowDropdownItem}
                                    onClick={() =>
                                      handleDeleteTableRow(row.kind, row.id)
                                    }
                                  >
                                    <span>🗑️ Xóa dòng (Delete)</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Shadcn Data Table Footer */}
                <div className={styles.tableFooterBar}>
                  <div>
                    {selectedRowIds.size} of {unifiedTableRows.length} row(s)
                    selected.
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 16 }}
                  >
                    <span>
                      Click trực tiếp vào cột <strong>Header</strong> để mở{' '}
                      <strong>Kanban Board</strong> hoặc bấm <strong>⋮</strong>{' '}
                      để Sửa / Xóa
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      Page 1 of 1 ({unifiedTableRows.length} mục)
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : selectedBoardTarget.kind === 'bot' && canViewBotHarnessBoard ? (
            /* ============================================================== */
            /* LEVEL 2A: BOT / HARNESS BOARD DETAIL (Kanban & Table)          */
            /* ============================================================== */
            <>
              <div className={styles.toolbarContainer}>
                <div className={styles.toolbarGroup}>
                  <div className={styles.viewSwitchGroup}>
                    <button
                      type="button"
                      data-testid="bot-view-kanban"
                      data-active={botViewMode === 'kanban'}
                      className={styles.viewSwitchBtn}
                      onClick={() => setBotViewMode('kanban')}
                    >
                      <DatabaseKanbanViewIcon width={14} height={14} />
                      <span>Kanban</span>
                    </button>
                    <button
                      type="button"
                      data-testid="bot-view-table"
                      data-active={botViewMode === 'table'}
                      className={styles.viewSwitchBtn}
                      onClick={() => setBotViewMode('table')}
                    >
                      <DatabaseTableViewIcon width={14} height={14} />
                      <span>Table</span>
                    </button>
                  </div>

                  {botViewMode === 'kanban' && (
                    <div className={styles.viewSwitchGroup}>
                      <button
                        type="button"
                        data-active={botGroupBy === 'state'}
                        className={styles.viewSwitchBtn}
                        onClick={() => setBotGroupBy('state')}
                      >
                        Gom cột: Trạng thái (State)
                      </button>
                      <button
                        type="button"
                        data-active={botGroupBy === 'profile'}
                        className={styles.viewSwitchBtn}
                        onClick={() => setBotGroupBy('profile')}
                      >
                        Gom cột: 10 Bot Profiles
                      </button>
                    </div>
                  )}

                  <select
                    className={styles.controlInput}
                    value={botProfileFilter}
                    onChange={e => setBotProfileFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả 10 Bot Profiles</option>
                    {ALLOWED_BOT_PROFILES.map(profile => (
                      <option key={profile} value={profile}>
                        🤖 Profile: {profile}
                      </option>
                    ))}
                  </select>

                  <select
                    className={styles.controlInput}
                    value={botTypeFilter}
                    onChange={e => setBotTypeFilter(e.target.value)}
                  >
                    <option value="MAIN">
                      Epic / Feature / Task (Ẩn Testcase)
                    </option>
                    <option value="ALL">Tất cả (Gồm cả Testcase)</option>
                    {WORK_ITEM_TYPES.map(t => (
                      <option key={t} value={t}>
                        Loại: {t}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Tìm theo #ID, tiêu đề, Bot..."
                    className={styles.controlInput}
                    style={{ minWidth: 200 }}
                    value={botSearchQuery}
                    onChange={e => setBotSearchQuery(e.target.value)}
                  />
                </div>

                <div className={styles.toolbarGroup}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => {
                      fetchHarnessBacklog(true).catch(console.error);
                      notify.success({
                        title: 'Đã đồng bộ Harness DB',
                        message:
                          'Đã tải lại danh sách Work Items & 10 Profiles từ Harness.',
                      });
                    }}
                  >
                    🔄 Đồng bộ Harness
                  </button>
                  <button
                    type="button"
                    data-primary="true"
                    className={styles.actionButton}
                    onClick={() => setNewBotTaskModalOpen(true)}
                  >
                    <PlusIcon width={14} height={14} />
                    <span>Giao Task cho Bot</span>
                  </button>
                </div>
              </div>

              <div className={styles.contentArea}>
                {botViewMode === 'kanban' ? (
                  <div className={styles.kanbanBoardRow}>
                    {botColumns.map(colKey => {
                      const colItems = filteredBotItems.filter(item =>
                        botGroupBy === 'state'
                          ? item.state === colKey
                          : normalizeProfileName(item.assigned_to_profile) ===
                            colKey
                      );
                      const stateColor = STATE_COLORS[colKey];
                      return (
                        <div
                          key={colKey}
                          className={styles.kanbanColumn}
                          data-drag-over={dragOverBotCol === colKey}
                          onDragOver={e => {
                            e.preventDefault();
                            if (dragOverBotCol !== colKey) {
                              setDragOverBotCol(colKey);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverBotCol === colKey) {
                              setDragOverBotCol(null);
                            }
                          }}
                          onDrop={e => {
                            e.preventDefault();
                            handleBotDropOnColumn(colKey);
                          }}
                        >
                          <div className={styles.columnHeader}>
                            <div className={styles.columnTitleGroup}>
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: stateColor?.dot ?? '#60a5fa',
                                  flexShrink: 0,
                                }}
                              />
                              <span>
                                {botGroupBy === 'profile'
                                  ? `🤖 ${colKey}`
                                  : colKey}
                              </span>
                            </div>
                            <span className={styles.countBadge}>
                              {colItems.length}
                            </span>
                          </div>

                          <div className={styles.columnCardsList}>
                            {colItems.map(item => {
                              const tColor = TYPE_COLORS[item.type] ?? {
                                bg: 'rgba(148, 163, 184, 0.16)',
                                fg: '#cbd5e1',
                              };
                              return (
                                <div
                                  key={item.id}
                                  draggable
                                  onDragStart={() =>
                                    setDraggedBotItemId(item.id)
                                  }
                                  onDragEnd={() => {
                                    setDraggedBotItemId(null);
                                    setDragOverBotCol(null);
                                  }}
                                  className={styles.kanbanCard}
                                >
                                  <div className={styles.cardTopRow}>
                                    <span
                                      className={styles.pillBadge}
                                      style={{
                                        backgroundColor: tColor.bg,
                                        color: tColor.fg,
                                      }}
                                    >
                                      #{item.id} · {item.type}
                                    </span>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                      }}
                                    >
                                      <span
                                        className={styles.pillBadge}
                                        style={{
                                          backgroundColor:
                                            'rgba(245, 158, 11, 0.14)',
                                          color: '#fbbf24',
                                        }}
                                      >
                                        {item.priority || 'P1'}
                                      </span>
                                      <button
                                        type="button"
                                        title="Xóa Task này"
                                        onClick={() =>
                                          updateBotItems(prev =>
                                            prev.filter(it => it.id !== item.id)
                                          )
                                        }
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: 'inherit',
                                          opacity: 0.55,
                                          cursor: 'pointer',
                                          padding: 2,
                                        }}
                                      >
                                        <DeleteIcon width={13} height={13} />
                                      </button>
                                    </div>
                                  </div>

                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={e => {
                                      const val = e.target.value;
                                      updateBotItems(prev =>
                                        prev.map(it =>
                                          it.id === item.id
                                            ? { ...it, title: val }
                                            : it
                                        )
                                      );
                                    }}
                                    className={styles.cardTitle}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      outline: 'none',
                                      width: '100%',
                                    }}
                                  />

                                  <div className={styles.cardFooter}>
                                    <select
                                      className={styles.miniSelect}
                                      title="Đổi trạng thái (State)"
                                      value={item.state}
                                      onChange={e => {
                                        const nextState = e.target.value;
                                        updateBotItems(prev =>
                                          prev.map(it =>
                                            it.id === item.id
                                              ? { ...it, state: nextState }
                                              : it
                                          )
                                        );
                                      }}
                                    >
                                      {HARNESS_STATES.map(st => (
                                        <option key={st} value={st}>
                                          {st}
                                        </option>
                                      ))}
                                    </select>

                                    <select
                                      className={styles.miniSelect}
                                      title="Đổi Bot Profile phụ trách"
                                      value={normalizeProfileName(
                                        item.assigned_to_profile
                                      )}
                                      onChange={e => {
                                        const nextProfile = e.target.value;
                                        updateBotItems(prev =>
                                          prev.map(it =>
                                            it.id === item.id
                                              ? {
                                                  ...it,
                                                  assigned_to_profile:
                                                    nextProfile,
                                                }
                                              : it
                                          )
                                        );
                                      }}
                                    >
                                      {ALLOWED_BOT_PROFILES.map(prof => (
                                        <option key={prof} value={prof}>
                                          🤖 {prof}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            className={styles.addCardBtn}
                            onClick={() => {
                              if (botGroupBy === 'state') {
                                setNewBotTaskState(colKey);
                              } else {
                                setNewBotTaskProfile(colKey);
                              }
                              setNewBotTaskModalOpen(true);
                            }}
                          >
                            <PlusIcon width={13} height={13} />
                            <span>Thêm Task vào cột này</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.tableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th className={styles.tableTh}>ID</th>
                          <th className={styles.tableTh}>Loại (Type)</th>
                          <th className={styles.tableTh}>Tiêu đề công việc</th>
                          <th className={styles.tableTh}>Trạng thái (State)</th>
                          <th className={styles.tableTh}>
                            Bot Profile (Harness)
                          </th>
                          <th className={styles.tableTh}>Ưu tiên</th>
                          <th className={styles.tableTh}>Xóa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBotItems.map(item => {
                          const tColor = TYPE_COLORS[item.type] ?? {
                            bg: 'rgba(148, 163, 184, 0.16)',
                            fg: '#cbd5e1',
                          };
                          return (
                            <tr key={item.id} className={styles.tableRow}>
                              <td
                                className={styles.tableTd}
                                style={{ fontWeight: 600 }}
                              >
                                #{item.id}
                              </td>
                              <td className={styles.tableTd}>
                                <span
                                  className={styles.pillBadge}
                                  style={{
                                    backgroundColor: tColor.bg,
                                    color: tColor.fg,
                                  }}
                                >
                                  {item.type}
                                </span>
                              </td>
                              <td
                                className={styles.tableTd}
                                style={{ maxWidth: 480 }}
                              >
                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={e => {
                                    const val = e.target.value;
                                    updateBotItems(prev =>
                                      prev.map(it =>
                                        it.id === item.id
                                          ? { ...it, title: val }
                                          : it
                                      )
                                    );
                                  }}
                                  style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'inherit',
                                    fontSize: '13px',
                                    outline: 'none',
                                  }}
                                />
                              </td>
                              <td className={styles.tableTd}>
                                <select
                                  className={styles.miniSelect}
                                  value={item.state}
                                  onChange={e => {
                                    const nextState = e.target.value;
                                    updateBotItems(prev =>
                                      prev.map(it =>
                                        it.id === item.id
                                          ? { ...it, state: nextState }
                                          : it
                                      )
                                    );
                                  }}
                                >
                                  {HARNESS_STATES.map(st => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className={styles.tableTd}>
                                <select
                                  className={styles.miniSelect}
                                  value={normalizeProfileName(
                                    item.assigned_to_profile
                                  )}
                                  onChange={e => {
                                    const nextProf = e.target.value;
                                    updateBotItems(prev =>
                                      prev.map(it =>
                                        it.id === item.id
                                          ? {
                                              ...it,
                                              assigned_to_profile: nextProf,
                                            }
                                          : it
                                      )
                                    );
                                  }}
                                >
                                  {ALLOWED_BOT_PROFILES.map(prof => (
                                    <option key={prof} value={prof}>
                                      🤖 {prof}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className={styles.tableTd}>
                                <select
                                  className={styles.miniSelect}
                                  value={item.priority || 'P1'}
                                  onChange={e => {
                                    const nextPrio = e.target.value;
                                    updateBotItems(prev =>
                                      prev.map(it =>
                                        it.id === item.id
                                          ? { ...it, priority: nextPrio }
                                          : it
                                      )
                                    );
                                  }}
                                >
                                  <option value="P0">P0</option>
                                  <option value="P1">P1</option>
                                  <option value="P2">P2</option>
                                </select>
                              </td>
                              <td className={styles.tableTd}>
                                <button
                                  type="button"
                                  className={styles.actionButton}
                                  onClick={() =>
                                    updateBotItems(prev =>
                                      prev.filter(it => it.id !== item.id)
                                    )
                                  }
                                >
                                  <DeleteIcon width={14} height={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ============================================================== */
            /* LEVEL 2B: PERSONAL BOARD DETAIL (Kanban & Table)               */
            /* ============================================================== */
            <>
              <div className={styles.toolbarContainer}>
                <div className={styles.toolbarGroup}>
                  <div className={styles.viewSwitchGroup}>
                    <button
                      type="button"
                      data-testid="personal-view-kanban"
                      data-active={personalViewMode === 'kanban'}
                      className={styles.viewSwitchBtn}
                      onClick={() => setPersonalViewMode('kanban')}
                    >
                      <DatabaseKanbanViewIcon width={14} height={14} />
                      <span>Kanban</span>
                    </button>
                    <button
                      type="button"
                      data-testid="personal-view-table"
                      data-active={personalViewMode === 'table'}
                      className={styles.viewSwitchBtn}
                      onClick={() => setPersonalViewMode('table')}
                    >
                      <DatabaseTableViewIcon width={14} height={14} />
                      <span>Table</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Tìm kiếm thẻ công việc..."
                    className={styles.controlInput}
                    style={{ minWidth: 220 }}
                    value={personalSearch}
                    onChange={e => setPersonalSearch(e.target.value)}
                  />
                </div>

                <div className={styles.toolbarGroup}>
                  {currentPersonalBoard && (
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() =>
                        handleOpenEditRowModal({
                          kind: 'personal',
                          id: currentPersonalBoard.id,
                          name: currentPersonalBoard.name,
                          description: currentPersonalBoard.description ?? '',
                          sectionType:
                            currentPersonalBoard.sectionType || 'Narrative',
                          tableStatus:
                            currentPersonalBoard.tableStatus || 'In Process',
                          target: currentPersonalBoard.target ?? 18,
                          limit: currentPersonalBoard.limit ?? 10,
                          reviewer:
                            currentPersonalBoard.reviewer || 'Assign reviewer',
                        })
                      }
                    >
                      <span>✏️ Sửa thông tin mục này</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={handleAddPersonalColumn}
                  >
                    <PlusIcon width={13} height={13} />
                    <span>Thêm cột trạng thái</span>
                  </button>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={handleOpenInBlockSuiteDoc}
                  >
                    <span>Mở dưới dạng trang Doc</span>
                  </button>
                </div>
              </div>

              <div className={styles.contentArea}>
                {personalViewMode === 'kanban' ? (
                  <div className={styles.kanbanBoardRow}>
                    {(currentPersonalBoard?.columns ?? []).map(colName => {
                      const colCards = filteredPersonalCards.filter(
                        c => c.status === colName
                      );
                      return (
                        <div
                          key={colName}
                          className={styles.kanbanColumn}
                          data-drag-over={dragOverPersonalCol === colName}
                          onDragOver={e => {
                            e.preventDefault();
                            if (dragOverPersonalCol !== colName) {
                              setDragOverPersonalCol(colName);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverPersonalCol === colName) {
                              setDragOverPersonalCol(null);
                            }
                          }}
                          onDrop={e => {
                            e.preventDefault();
                            if (draggedPersonalCardId) {
                              handleUpdatePersonalCard(draggedPersonalCardId, {
                                status: colName,
                              });
                            }
                            setDraggedPersonalCardId(null);
                            setDragOverPersonalCol(null);
                          }}
                        >
                          <div className={styles.columnHeader}>
                            <div className={styles.columnTitleGroup}>
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor:
                                    colName === 'Done'
                                      ? '#22c55e'
                                      : colName === 'In Progress' ||
                                          colName === 'Doing'
                                        ? '#3b82f6'
                                        : '#94a3b8',
                                }}
                              />
                              <span>{colName}</span>
                            </div>
                            <span className={styles.countBadge}>
                              {colCards.length}
                            </span>
                          </div>

                          <div className={styles.columnCardsList}>
                            {colCards.map(card => (
                              <div
                                key={card.id}
                                draggable
                                onDragStart={() =>
                                  setDraggedPersonalCardId(card.id)
                                }
                                onDragEnd={() => {
                                  setDraggedPersonalCardId(null);
                                  setDragOverPersonalCol(null);
                                }}
                                className={styles.kanbanCard}
                              >
                                <div className={styles.cardTopRow}>
                                  <select
                                    className={styles.miniSelect}
                                    value={card.priority}
                                    onChange={e =>
                                      handleUpdatePersonalCard(card.id, {
                                        priority: e.target
                                          .value as PersonalTaskCard['priority'],
                                      })
                                    }
                                  >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                  </select>
                                  <button
                                    type="button"
                                    title="Xóa thẻ"
                                    onClick={() =>
                                      handleDeletePersonalCard(card.id)
                                    }
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'inherit',
                                      opacity: 0.55,
                                      cursor: 'pointer',
                                      padding: 2,
                                    }}
                                  >
                                    <DeleteIcon width={14} height={14} />
                                  </button>
                                </div>

                                <input
                                  type="text"
                                  value={card.title}
                                  onChange={e =>
                                    handleUpdatePersonalCard(card.id, {
                                      title: e.target.value,
                                    })
                                  }
                                  className={styles.cardTitle}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    width: '100%',
                                  }}
                                />

                                <div className={styles.cardFooter}>
                                  <input
                                    type="date"
                                    value={card.dueDate}
                                    onChange={e =>
                                      handleUpdatePersonalCard(card.id, {
                                        dueDate: e.target.value,
                                      })
                                    }
                                    className={styles.miniSelect}
                                  />
                                  <span style={{ fontSize: 11, opacity: 0.8 }}>
                                    {card.progress}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            className={styles.addCardBtn}
                            onClick={() => handleAddPersonalCard(colName)}
                          >
                            <PlusIcon width={13} height={13} />
                            <span>Thêm thẻ mới</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.tableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th className={styles.tableTh}>Tiêu đề công việc</th>
                          <th className={styles.tableTh}>Trạng thái (Cột)</th>
                          <th className={styles.tableTh}>Độ ưu tiên</th>
                          <th className={styles.tableTh}>Hạn hoàn thành</th>
                          <th className={styles.tableTh}>Tiến độ (%)</th>
                          <th className={styles.tableTh}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPersonalCards.map(card => (
                          <tr key={card.id} className={styles.tableRow}>
                            <td className={styles.tableTd}>
                              <input
                                type="text"
                                value={card.title}
                                onChange={e =>
                                  handleUpdatePersonalCard(card.id, {
                                    title: e.target.value,
                                  })
                                }
                                style={{
                                  width: '100%',
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'inherit',
                                  fontSize: '13px',
                                  outline: 'none',
                                }}
                              />
                            </td>
                            <td className={styles.tableTd}>
                              <select
                                className={styles.miniSelect}
                                value={card.status}
                                onChange={e =>
                                  handleUpdatePersonalCard(card.id, {
                                    status: e.target.value,
                                  })
                                }
                              >
                                {(currentPersonalBoard?.columns ?? []).map(
                                  col => (
                                    <option key={col} value={col}>
                                      {col}
                                    </option>
                                  )
                                )}
                              </select>
                            </td>
                            <td className={styles.tableTd}>
                              <select
                                className={styles.miniSelect}
                                value={card.priority}
                                onChange={e =>
                                  handleUpdatePersonalCard(card.id, {
                                    priority: e.target
                                      .value as PersonalTaskCard['priority'],
                                  })
                                }
                              >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                              </select>
                            </td>
                            <td className={styles.tableTd}>
                              <input
                                type="date"
                                className={styles.miniSelect}
                                value={card.dueDate}
                                onChange={e =>
                                  handleUpdatePersonalCard(card.id, {
                                    dueDate: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className={styles.tableTd}>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={5}
                                value={card.progress}
                                onChange={e =>
                                  handleUpdatePersonalCard(card.id, {
                                    progress: Number(e.target.value),
                                  })
                                }
                              />{' '}
                              <span style={{ fontSize: 12 }}>
                                {card.progress}%
                              </span>
                            </td>
                            <td className={styles.tableTd}>
                              <button
                                type="button"
                                className={styles.actionButton}
                                onClick={() =>
                                  handleDeletePersonalCard(card.id)
                                }
                              >
                                <DeleteIcon width={14} height={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ padding: 12 }}>
                      <button
                        type="button"
                        className={styles.addCardBtn}
                        style={{ width: '100%', marginTop: 0 }}
                        onClick={() =>
                          handleAddPersonalCard(
                            currentPersonalBoard?.columns[0] ?? 'To Do'
                          )
                        }
                      >
                        <PlusIcon width={14} height={14} />
                        <span>Thêm dòng công việc mới</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ViewBody>

      {/* ==================================================================== */}
      {/* MODAL 0: ADD / EDIT SECTION & KANBAN ROW (Shadcn Table CRUD)         */}
      {/* ==================================================================== */}
      {newBoardModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setNewBoardModalOpen(false)}
        >
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              {editingRowTarget
                ? '✏️ Chỉnh sửa mục & Bảng Kanban (Edit Section)'
                : '➕ Thêm Mục & Bảng Kanban Mới (Add Section)'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>
                Header (Tên mục / Bảng Kanban)
              </label>
              <input
                type="text"
                placeholder="VD: Cover page, Technical approach, Sprint 10..."
                className={styles.controlInput}
                style={{ height: 34 }}
                value={newBoardNameInput}
                onChange={e => setNewBoardNameInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleCreatePersonalBoardSubmit();
                  }
                }}
                autoFocus
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <label style={{ fontSize: 12, fontWeight: 500 }}>
                    Section Type
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Narrative, Technical, SLPC Harness..."
                    className={styles.controlInput}
                    style={{ height: 34 }}
                    value={newBoardSectionType}
                    onChange={e => setNewBoardSectionType(e.target.value)}
                  />
                </div>

                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <label style={{ fontSize: 12, fontWeight: 500 }}>
                    Status (Trạng thái)
                  </label>
                  <select
                    className={styles.controlInput}
                    style={{ height: 34 }}
                    value={newBoardStatus}
                    onChange={e =>
                      setNewBoardStatus(e.target.value as TableRowStatus)
                    }
                  >
                    <option value="In Process">✻ In Process</option>
                    <option value="Done">✓ Done</option>
                    <option value="Planned">○ Planned</option>
                  </select>
                </div>

                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <label style={{ fontSize: 12, fontWeight: 500 }}>
                    Target
                  </label>
                  <input
                    type="number"
                    className={styles.controlInput}
                    style={{ height: 34 }}
                    value={newBoardTargetNum}
                    onChange={e =>
                      setNewBoardTargetNum(Number(e.target.value) || 0)
                    }
                  />
                </div>

                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <label style={{ fontSize: 12, fontWeight: 500 }}>Limit</label>
                  <input
                    type="number"
                    className={styles.controlInput}
                    style={{ height: 34 }}
                    value={newBoardLimitNum}
                    onChange={e =>
                      setNewBoardLimitNum(Number(e.target.value) || 0)
                    }
                  />
                </div>

                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <label style={{ fontSize: 12, fontWeight: 500 }}>
                    Reviewer
                  </label>
                  <select
                    className={styles.controlInput}
                    style={{ height: 34 }}
                    value={newBoardReviewer}
                    onChange={e => setNewBoardReviewer(e.target.value)}
                  >
                    {REVIEWER_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {!editingRowTarget && canViewBotHarnessBoard && (
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                  >
                    <label style={{ fontSize: 12, fontWeight: 500 }}>
                      Phân loại (Category)
                    </label>
                    <select
                      className={styles.controlInput}
                      style={{ height: 34 }}
                      value={newBoardCategory}
                      onChange={e =>
                        setNewBoardCategory(
                          e.target.value as 'personal' | 'bot'
                        )
                      }
                    >
                      <option value="personal">👤 Cá nhân (Section)</option>
                      <option value="bot">🤖 Bot / Harness</option>
                    </select>
                  </div>
                )}
              </div>

              <label style={{ fontSize: 12, fontWeight: 500 }}>
                Mô tả ngắn (Tuỳ chọn)
              </label>
              <input
                type="text"
                placeholder="Mô tả mục tiêu của bảng công việc này..."
                className={styles.controlInput}
                style={{ height: 34 }}
                value={newBoardDescInput}
                onChange={e => setNewBoardDescInput(e.target.value)}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 8,
              }}
            >
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => setNewBoardModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                data-primary="true"
                className={styles.actionButton}
                onClick={handleCreatePersonalBoardSubmit}
              >
                {editingRowTarget ? 'Lưu thay đổi' : 'Thêm vào Bảng (Table)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: ADMIN CONFIG GATE (Manage User Access to Bot/Harness Board) */}
      {/* ==================================================================== */}
      {adminModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setAdminModalOpen(false)}
        >
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                  👑 Admin Config — Phân quyền Bot / Harness Kanban
                </h3>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 12,
                    opacity: 0.75,
                  }}
                >
                  Chỉ những người dùng được bạn (Admin) bật công tắc dưới đây
                  mới nhìn thấy các mục 🤖 Bot / Harness trong Bảng.
                </p>
              </div>
            </div>

            <div className={styles.userPermRow}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  👁️ Xem thử dưới góc nhìn User chưa được bật Config
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  Khi bật, các dòng 🤖 Bot / Harness sẽ ẩn khỏi Bảng để bạn kiểm
                  tra giao diện của người dùng thường.
                </div>
              </div>
              <input
                type="checkbox"
                checked={adminConfig.simulateStandardUser}
                onChange={e =>
                  saveAdminConfig({
                    ...adminConfig,
                    simulateStandardUser: e.target.checked,
                  })
                }
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                placeholder="Nhập email người dùng (vd: member@aevum.io)..."
                className={styles.controlInput}
                style={{ flex: 1, height: 34 }}
                value={newUserEmailInput}
                onChange={e => setNewUserEmailInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newUserEmailInput.trim()) {
                    const emailKey = newUserEmailInput.trim().toLowerCase();
                    saveAdminConfig({
                      ...adminConfig,
                      enabledUsers: {
                        ...adminConfig.enabledUsers,
                        [emailKey]: true,
                      },
                    });
                    setNewUserEmailInput('');
                  }
                }}
              />
              <button
                type="button"
                data-primary="true"
                className={styles.actionButton}
                style={{ height: 34 }}
                onClick={() => {
                  if (!newUserEmailInput.trim()) return;
                  const emailKey = newUserEmailInput.trim().toLowerCase();
                  saveAdminConfig({
                    ...adminConfig,
                    enabledUsers: {
                      ...adminConfig.enabledUsers,
                      [emailKey]: true,
                    },
                  });
                  setNewUserEmailInput('');
                }}
              >
                + Cấp quyền
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {Object.entries(adminConfig.enabledUsers).map(
                ([emailKey, enabled]) => (
                  <div key={emailKey} className={styles.userPermRow}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {emailKey}{' '}
                        {emailKey === currentUserEmail && (
                          <span
                            style={{
                              fontSize: 11,
                              color: '#60a5fa',
                              fontWeight: 600,
                            }}
                          >
                            (Bạn)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>
                        {enabled
                          ? '✅ Đã bật: Được phép thấy 🤖 Bot / Harness Kanban'
                          : '🔒 Đã tắt: Chỉ thấy 👤 Cá Nhân (Sections)'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={e =>
                        saveAdminConfig({
                          ...adminConfig,
                          enabledUsers: {
                            ...adminConfig.enabledUsers,
                            [emailKey]: e.target.checked,
                          },
                        })
                      }
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                  </div>
                )
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 4,
              }}
            >
              <button
                type="button"
                data-primary="true"
                className={styles.actionButton}
                onClick={() => setAdminModalOpen(false)}
              >
                Đóng & Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: CREATE NEW BOT TASK IN HARNESS                              */}
      {/* ==================================================================== */}
      {newBotTaskModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setNewBotTaskModalOpen(false)}
        >
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              🤖 Giao Task mới cho Bot Profile (Harness)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>
                Tiêu đề công việc
              </label>
              <input
                type="text"
                placeholder="Nhập tên Task / Feature / Epic giao cho Bot..."
                className={styles.controlInput}
                style={{ height: 34 }}
                value={newBotTaskTitle}
                onChange={e => setNewBotTaskTitle(e.target.value)}
                autoFocus
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <label style={{ fontSize: 12, fontWeight: 500 }}>
                    Giao cho Bot Profile
                  </label>
                  <select
                    className={styles.controlInput}
                    value={newBotTaskProfile}
                    onChange={e => setNewBotTaskProfile(e.target.value)}
                  >
                    {ALLOWED_BOT_PROFILES.map(p => (
                      <option key={p} value={p}>
                        🤖 {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <label style={{ fontSize: 12, fontWeight: 500 }}>
                    Loại Work Item
                  </label>
                  <select
                    className={styles.controlInput}
                    value={newBotTaskType}
                    onChange={e => setNewBotTaskType(e.target.value)}
                  >
                    {WORK_ITEM_TYPES.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <label style={{ fontSize: 12, fontWeight: 500 }}>
                    Trạng thái ban đầu
                  </label>
                  <select
                    className={styles.controlInput}
                    value={newBotTaskState}
                    onChange={e => setNewBotTaskState(e.target.value)}
                  >
                    {HARNESS_STATES.map(st => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                >
                  <label style={{ fontSize: 12, fontWeight: 500 }}>
                    Độ ưu tiên
                  </label>
                  <select
                    className={styles.controlInput}
                    value={newBotTaskPriority}
                    onChange={e => setNewBotTaskPriority(e.target.value)}
                  >
                    <option value="P0">P0 (Khẩn cấp)</option>
                    <option value="P1">P1 (Cao)</option>
                    <option value="P2">P2 (Bình thường)</option>
                  </select>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 8,
              }}
            >
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => setNewBotTaskModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                data-primary="true"
                className={styles.actionButton}
                onClick={handleCreateBotTask}
              >
                Tạo & Giao cho Bot
              </button>
            </div>
          </div>
        </div>
      )}

      <AllDocSidebarTabs />
    </>
  );
};

export const Component = () => {
  return <WorkspaceKanbanPage />;
};
