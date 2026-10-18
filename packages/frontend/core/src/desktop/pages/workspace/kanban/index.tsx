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

export interface PersonalBoard {
  id: string;
  name: string;
  description?: string;
  columns: string[];
  cards: PersonalTaskCard[];
  linkedDocId?: string;
  updatedAt?: string;
}

interface BotBoardDefinition {
  id: string;
  name: string;
  description: string;
  defaultTypeFilter: string;
  defaultGroupBy: 'state' | 'profile';
}

const BOT_HARNESS_BOARDS: BotBoardDefinition[] = [
  {
    id: 'bot-master-backlog',
    name: 'SLPC Master Harness Board (Backlog & 10 Bot Profiles)',
    description:
      'Bảng điều phối tổng thể các Epic, Feature, Task của 10 Agent Profiles (Supervisor, Lead, Peer, QC...)',
    defaultTypeFilter: 'MAIN',
    defaultGroupBy: 'state',
  },
  {
    id: 'bot-profile-allocation',
    name: 'Bot Profile Allocation Board (Phân bổ công việc theo 10 Bot)',
    description:
      'Gom cột trực tiếp theo từng Agent Profile để theo dõi và bàn giao task giữa các Bot',
    defaultTypeFilter: 'MAIN',
    defaultGroupBy: 'profile',
  },
  {
    id: 'bot-qc-testcases',
    name: 'QC ISTQB Verification & Testcases Board',
    description:
      'Bảng quản lý và nghiệm thu độc lập các Testcase ISTQB 5-Stage của Role QC',
    defaultTypeFilter: 'Testcase',
    defaultGroupBy: 'state',
  },
];

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

function getDefaultPersonalBoards(): PersonalBoard[] {
  return [
    {
      id: 'board-default-1',
      name: 'Dự án Cá nhân (My Project Board)',
      description: 'Bảng quản lý tiến độ công việc cá nhân trong Workspace',
      updatedAt: '2026-10-18',
      columns: ['To Do', 'In Progress', 'In Review', 'Done'],
      cards: [
        {
          id: 'card-1',
          title: 'Thiết kế giao diện màn hình đăng nhập & Workspace',
          status: 'Done',
          priority: 'High',
          dueDate: '2026-10-18',
          progress: 100,
        },
        {
          id: 'card-2',
          title: 'Tích hợp hệ thống Kanban & Table đa người dùng',
          status: 'In Progress',
          priority: 'Urgent',
          dueDate: '2026-10-19',
          progress: 75,
        },
        {
          id: 'card-3',
          title: 'Kiểm thử phân quyền Admin Config cho Bot Harness',
          status: 'In Review',
          priority: 'High',
          dueDate: '2026-10-20',
          progress: 90,
        },
        {
          id: 'card-4',
          title: 'Viết tài liệu hướng dẫn sử dụng Workspace mới',
          status: 'To Do',
          priority: 'Medium',
          dueDate: '2026-10-22',
          progress: 0,
        },
      ],
    },
    {
      id: 'board-default-2',
      name: 'Kế hoạch Tuần & Ghi chú Nhanh (Weekly Sprint)',
      description: 'Theo dõi các đầu việc ưu tiên trong tuần',
      updatedAt: '2026-10-18',
      columns: ['Backlog', 'Doing', 'Done'],
      cards: [
        {
          id: 'card-w1',
          title: 'Rà soát kiến trúc hệ thống và tối ưu hiệu năng',
          status: 'Doing',
          priority: 'High',
          dueDate: '2026-10-19',
          progress: 50,
        },
        {
          id: 'card-w2',
          title: 'Chuẩn bị bản demo tính năng mới',
          status: 'Backlog',
          priority: 'Medium',
          dueDate: '2026-10-21',
          progress: 0,
        },
      ],
    },
  ];
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
  // NAVIGATION STATE: null = Directory List Page, non-null = Board Detail
  // ========================================================================
  const [selectedBoardTarget, setSelectedBoardTarget] =
    useState<SelectedBoardTarget>(null);
  const [listFilterCategory, setListFilterCategory] = useState<
    'all' | 'bot' | 'personal'
  >('all');
  const [listSearchQuery, setListSearchQuery] = useState('');

  // New Personal Board Modal
  const [newBoardModalOpen, setNewBoardModalOpen] = useState(false);
  const [newBoardNameInput, setNewBoardNameInput] = useState('');
  const [newBoardDescInput, setNewBoardDescInput] = useState('');

  // If user loses Bot access while viewing a Bot board, return to list page
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
        if (res.ok) {
          const data = await res.json();
          const normalized: HarnessWorkItem[] = (data.items || []).map(
            (item: HarnessWorkItem) => ({
              ...item,
              assigned_to_profile: normalizeProfileName(
                item.assigned_to_profile
              ),
              state: item.state || 'New',
              priority: item.priority || 'P1',
            })
          );
          setBotItems(normalized);
          localStorage.setItem(harnessStorageKey, JSON.stringify(normalized));
        }
      } catch (err) {
        console.error('Failed to load Harness backlog', err);
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
        const matchProfile = item.assigned_to_profile.toLowerCase().includes(q);
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
  // ZONE 2 STATE: PERSONAL CUSTOM BOARDS (Isolated per workspaceId)
  // ========================================================================
  const personalStorageKey = `aevum_personal_boards_${workspaceId}`;
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
        BOT_HARNESS_BOARDS.find(b => b.id === selectedBoardTarget.boardId) ??
        BOT_HARNESS_BOARDS[0]
      );
    }
    return BOT_HARNESS_BOARDS[0];
  }, [selectedBoardTarget]);

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

  const handleCreatePersonalBoardSubmit = useCallback(() => {
    const trimmed = newBoardNameInput.trim();
    if (!trimmed) return;
    const newBoard: PersonalBoard = {
      id: `board-${Date.now()}`,
      name: trimmed,
      description:
        newBoardDescInput.trim() ||
        'Bảng công việc cá nhân (Hỗ trợ Kanban & Table View)',
      updatedAt: new Date().toISOString().slice(0, 10),
      columns: ['To Do', 'In Progress', 'In Review', 'Done'],
      cards: [
        {
          id: `card-${Date.now()}`,
          title: 'Công việc đầu tiên trong bảng mới',
          status: 'To Do',
          priority: 'Medium',
          dueDate: new Date().toISOString().slice(0, 10),
          progress: 0,
        },
      ],
    };
    updatePersonalBoards(prev => [newBoard, ...prev]);
    setNewBoardNameInput('');
    setNewBoardDescInput('');
    setNewBoardModalOpen(false);
    setSelectedBoardTarget({ kind: 'personal', boardId: newBoard.id });
    notify.success({
      title: 'Đã tạo bảng Kanban mới',
      message: `Đã mở bảng "${newBoard.name}".`,
    });
  }, [newBoardDescInput, newBoardNameInput, updatePersonalBoards]);

  const handleDeletePersonalBoard = useCallback(
    (boardId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      updatePersonalBoards(prev => prev.filter(b => b.id !== boardId));
      notify.success({
        title: 'Đã xóa bảng cá nhân',
      });
    },
    [updatePersonalBoards]
  );

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

  const filteredBotBoardsForList = useMemo(() => {
    if (!canViewBotHarnessBoard) return [];
    if (listFilterCategory === 'personal') return [];
    const q = listSearchQuery.trim().toLowerCase();
    if (!q) return BOT_HARNESS_BOARDS;
    return BOT_HARNESS_BOARDS.filter(
      b =>
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q)
    );
  }, [canViewBotHarnessBoard, listFilterCategory, listSearchQuery]);

  const filteredPersonalBoardsForList = useMemo(() => {
    if (listFilterCategory === 'bot') return [];
    const q = listSearchQuery.trim().toLowerCase();
    if (!q) return personalBoards;
    return personalBoards.filter(
      b =>
        b.name.toLowerCase().includes(q) ||
        (b.description ?? '').toLowerCase().includes(q)
    );
  }, [listFilterCategory, listSearchQuery, personalBoards]);

  return (
    <>
      <ViewTitle
        title={
          selectedBoardTarget === null
            ? 'Kanban Boards'
            : selectedBoardTarget.kind === 'bot'
              ? currentBotBoardDef.name
              : (currentPersonalBoard?.name ?? 'Kanban Board')
        }
      />
      <ViewIcon icon="allDocs" />
      <ViewHeader>
        <div className={styles.headerBar}>
          {/* Left Header: Either Directory Title or Back-to-List Breadcrumb */}
          {selectedBoardTarget === null ? (
            <div className={styles.breadcrumbBar}>
              <DatabaseKanbanViewIcon width={18} height={18} />
              <span>Danh sách Bảng Kanban (Kanban Boards)</span>
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
                <span>Danh sách Kanban</span>
              </button>
              <span style={{ opacity: 0.4 }}>/</span>
              <span>
                {selectedBoardTarget.kind === 'bot'
                  ? `🤖 ${currentBotBoardDef.name}`
                  : `👤 ${currentPersonalBoard?.name ?? ''}`}
              </span>
            </div>
          )}

          {/* Right Header Controls: Admin Config Button & Create New Board */}
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
                👁️ Đang xem thử như User thường (Bấm để bật lại Admin)
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
                <span>Admin Config (Phân quyền Bot Kanban)</span>
              </button>
            )}
            <button
              type="button"
              data-primary="true"
              className={styles.actionButton}
              onClick={() => setNewBoardModalOpen(true)}
            >
              <PlusIcon width={14} height={14} />
              <span>Tạo Bảng Kanban Mới</span>
            </button>
          </div>
        </div>
      </ViewHeader>

      <ViewBody>
        <div className={styles.pageContainer}>
          {/* ============================================================== */}
          {/* LEVEL 1: KANBAN BOARDS DIRECTORY LIST PAGE                     */}
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
                      <span>Tất cả bảng</span>
                      <span className={styles.countBadge}>
                        {(canViewBotHarnessBoard
                          ? BOT_HARNESS_BOARDS.length
                          : 0) + personalBoards.length}
                      </span>
                    </button>
                    {canViewBotHarnessBoard && (
                      <button
                        type="button"
                        data-active={listFilterCategory === 'bot'}
                        className={styles.zoneTabButton}
                        onClick={() => setListFilterCategory('bot')}
                      >
                        <span>🤖 Bảng Bot / Harness</span>
                        <span className={styles.countBadge}>
                          {BOT_HARNESS_BOARDS.length}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      data-active={listFilterCategory === 'personal'}
                      className={styles.zoneTabButton}
                      onClick={() => setListFilterCategory('personal')}
                    >
                      <span>👤 Bảng Cá Nhân (My Boards)</span>
                      <span className={styles.countBadge}>
                        {personalBoards.length}
                      </span>
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Tìm kiếm bảng Kanban..."
                    className={styles.controlInput}
                    style={{ minWidth: 240 }}
                    value={listSearchQuery}
                    onChange={e => setListSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.contentArea}>
                <div className={styles.boardListWrapper}>
                  {/* SECTION 1: BOT / HARNESS BOARDS (Only when Admin Config permits) */}
                  {canViewBotHarnessBoard &&
                    filteredBotBoardsForList.length > 0 && (
                      <div className={styles.boardSection}>
                        <div className={styles.boardSectionTitle}>
                          <span>
                            🤖 Bảng Quản Lý Bot / Harness (10 Agent Profiles)
                          </span>
                          <span className={styles.countBadge}>
                            {filteredBotBoardsForList.length}
                          </span>
                        </div>

                        {filteredBotBoardsForList.map(bDef => {
                          const itemCount =
                            bDef.defaultTypeFilter === 'Testcase'
                              ? botItems.filter(i => i.type === 'Testcase')
                                  .length
                              : botItems.filter(i => i.type !== 'Testcase')
                                  .length;
                          return (
                            <div
                              key={bDef.id}
                              data-testid={`kanban-list-item-${bDef.id}`}
                              className={styles.boardListRow}
                              onClick={() => handleOpenBotBoard(bDef)}
                            >
                              <div className={styles.boardRowLeft}>
                                <div className={styles.boardIconBox}>🤖</div>
                                <div>
                                  <div
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 600,
                                      marginBottom: 3,
                                    }}
                                  >
                                    {bDef.name}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      opacity: 0.7,
                                    }}
                                  >
                                    {bDef.description}
                                  </div>
                                </div>
                              </div>

                              <div className={styles.boardRowRight}>
                                <span
                                  className={styles.pillBadge}
                                  style={{
                                    backgroundColor: 'rgba(59, 130, 246, 0.16)',
                                    color: '#60a5fa',
                                  }}
                                >
                                  Harness DB · 10 Profiles
                                </span>
                                <span
                                  className={styles.pillBadge}
                                  style={{
                                    backgroundColor: 'rgba(16, 185, 129, 0.16)',
                                    color: '#34d399',
                                  }}
                                >
                                  {itemCount} Work Items
                                </span>
                                <span
                                  className={styles.pillBadge}
                                  style={{
                                    backgroundColor:
                                      'rgba(148, 163, 184, 0.16)',
                                    color: '#cbd5e1',
                                  }}
                                >
                                  Kanban & Table →
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                  {/* SECTION 2: PERSONAL CUSTOM BOARDS (Isolated per Workspace) */}
                  {filteredPersonalBoardsForList.length > 0 && (
                    <div className={styles.boardSection}>
                      <div className={styles.boardSectionTitle}>
                        <span>
                          👤 Bảng Cá Nhân Tự Tạo (My Workspace Boards)
                        </span>
                        <span className={styles.countBadge}>
                          {filteredPersonalBoardsForList.length}
                        </span>
                      </div>

                      {filteredPersonalBoardsForList.map(board => (
                        <div
                          key={board.id}
                          data-testid={`kanban-list-item-${board.id}`}
                          className={styles.boardListRow}
                          onClick={() => handleOpenPersonalBoard(board.id)}
                        >
                          <div className={styles.boardRowLeft}>
                            <div className={styles.boardIconBox}>📋</div>
                            <div>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  marginBottom: 3,
                                }}
                              >
                                {board.name}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  opacity: 0.7,
                                }}
                              >
                                {board.description ||
                                  `Gồm ${board.columns.length} cột trạng thái (${board.columns.join(' · ')})`}
                              </div>
                            </div>
                          </div>

                          <div className={styles.boardRowRight}>
                            <span
                              className={styles.pillBadge}
                              style={{
                                backgroundColor: 'rgba(168, 85, 247, 0.16)',
                                color: '#c084fc',
                              }}
                            >
                              {board.columns.length} cột
                            </span>
                            <span
                              className={styles.pillBadge}
                              style={{
                                backgroundColor: 'rgba(16, 185, 129, 0.16)',
                                color: '#34d399',
                              }}
                            >
                              {board.cards.length} thẻ công việc
                            </span>
                            <span
                              className={styles.pillBadge}
                              style={{
                                backgroundColor: 'rgba(148, 163, 184, 0.16)',
                                color: '#cbd5e1',
                              }}
                            >
                              Kanban & Table →
                            </span>
                            {personalBoards.length > 1 && (
                              <button
                                type="button"
                                title="Xóa bảng này"
                                className={styles.actionButton}
                                style={{ padding: '0 8px' }}
                                onClick={e =>
                                  handleDeletePersonalBoard(board.id, e)
                                }
                              >
                                <DeleteIcon width={14} height={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                                  </div>

                                  <div className={styles.cardTitle}>
                                    {item.title}
                                  </div>

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
                          <th className={styles.tableTh}>Cập nhật</th>
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
                              <td
                                className={styles.tableTd}
                                style={{
                                  fontSize: '12px',
                                  opacity: 0.75,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.updated_at}
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
      {/* MODAL 0: CREATE NEW PERSONAL KANBAN BOARD                            */}
      {/* ==================================================================== */}
      {newBoardModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setNewBoardModalOpen(false)}
        >
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              📋 Tạo Bảng Kanban & Table Cá Nhân Mới
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>
                Tên bảng Kanban
              </label>
              <input
                type="text"
                placeholder="VD: Sprint Tháng 10, Kế hoạch Sản phẩm..."
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
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleCreatePersonalBoardSubmit();
                  }
                }}
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
                Tạo & Mở Bảng Kanban
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
                  mới nhìn thấy danh sách bảng 🤖 Bot / Harness.
                </p>
              </div>
            </div>

            <div className={styles.userPermRow}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  👁️ Xem thử dưới góc nhìn User chưa được bật Config
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  Khi bật, nhóm bảng 🤖 Bot / Harness sẽ ẩn khỏi danh sách để
                  bạn kiểm tra giao diện của người dùng thường.
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
                          : '🔒 Đã tắt: Chỉ thấy 👤 Bảng Cá Nhân (My Boards)'}
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
