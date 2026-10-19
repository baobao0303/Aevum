import { notify } from '@affine/component';
import { CollectionService } from '@affine/core/modules/collection';
import { FavoriteService } from '@affine/core/modules/favorite';
import { OrganizeService } from '@affine/core/modules/organize';
import { TagService } from '@affine/core/modules/tag';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '@affine/core/modules/workbench';
import {
  AiThinkingIcon,
  ArrowLeftSmallIcon,
  BookPanelIcon,
  CardPanelIcon,
  ChatWithAiIcon,
  CheckBoxCheckSolidIcon,
  DatabaseTableViewIcon,
  DeleteIcon,
  EditIcon,
  FilterIcon,
  FirePanelIcon,
  FolderIcon,
  PlusIcon,
  ResetIcon,
  SearchIcon,
  StarIcon,
  TagIcon,
  TimePanelIcon,
  ViewLayersIcon,
  VolumePanelIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useServiceOptional } from '@toeverything/infra';
import { cssVarV2 } from '@toeverything/theme/v2';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  FlashcardPlayer,
  MatchGameEngine,
  type MatchTile,
  QChatEngine,
  SpacedRepetitionSession,
  StreaksEngine,
  type StudySetModel,
  StudySetRepository,
  type TermCardModel,
  TtsSpeechService,
} from '../../../../modules/quizlet';
import * as styles from './index.css';

// Text & PDF Card Parser Utility
async function extractCardsFromFile(
  file: File
): Promise<Array<{ term: string; definition: string; tags?: string[] }>> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let rawText = '';

  if (extension === 'pdf') {
    try {
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const decoder = new TextDecoder('latin1');
      const pdfStr = decoder.decode(uint8);

      // Extract uncompressed text in BT...ET blocks
      const btRegex = /BT[\s\S]*?ET/g;
      let match;
      while ((match = btRegex.exec(pdfStr)) !== null) {
        const block = match[0];
        const strRegex = /\((.*?)\)\s*T[jJ]|\[(.*?)\]\s*TJ/g;
        let strMatch;
        while ((strMatch = strRegex.exec(block)) !== null) {
          if (strMatch[1]) rawText += strMatch[1] + ' ';
          if (strMatch[2]) {
            const inner = strMatch[2].replace(/\((.*?)\)/g, '$1 ');
            rawText += inner + ' ';
          }
        }
        rawText += '\n';
      }

      // If compressed deflate streams exist and DecompressionStream is available
      if (
        rawText.trim().length < 20 &&
        typeof DecompressionStream !== 'undefined'
      ) {
        const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
        let sMatch;
        while ((sMatch = streamRegex.exec(pdfStr)) !== null) {
          try {
            const streamData = new TextEncoder().encode(sMatch[1]);
            const ds = new DecompressionStream('deflate');
            const writer = ds.writable.getWriter();
            writer.write(streamData).catch(() => {});
            writer.close().catch(() => {});
            const decompressed = await new Response(ds.readable).arrayBuffer();
            const dText = new TextDecoder().decode(decompressed);
            rawText += '\n' + dText;
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      console.error('PDF extraction error:', e);
    }
  } else {
    // txt, csv, md, json
    rawText = await file.text();
  }

  return parseRawTextToCards(rawText);
}

function parseRawTextToCards(
  text: string
): Array<{ term: string; definition: string; tags?: string[] }> {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  const result: Array<{ term: string; definition: string; tags?: string[] }> =
    [];

  for (const line of lines) {
    let term = '';
    let def = '';
    if (line.includes('\t')) {
      const parts = line.split('\t');
      term = parts[0].trim();
      def = parts.slice(1).join(' ').trim();
    } else if (
      line.includes(' - ') ||
      line.includes(' – ') ||
      line.includes(' — ')
    ) {
      const parts = line.split(/\s+[-–—]\s+/);
      term = parts[0].trim();
      def = parts.slice(1).join(' - ').trim();
    } else if (line.includes(': ') || line.includes('：')) {
      const parts = line.split(/[:：]\s*/);
      term = parts[0].trim();
      def = parts.slice(1).join(': ').trim();
    } else if (line.includes('=')) {
      const parts = line.split('=');
      term = parts[0].trim();
      def = parts.slice(1).join('=').trim();
    } else if (line.includes(',')) {
      const parts = line.split(',');
      term = parts[0].trim();
      def = parts.slice(1).join(',').trim();
    }

    term = term.replace(/^\d+[.)]\s*/, '').trim();
    if (term && def) {
      result.push({ term, definition: def });
    }
  }
  return result;
}

const DEFAULT_SAMPLE_SETS: Array<
  Omit<StudySetModel, 'id' | 'createdAt' | 'updatedAt'>
> = [
  {
    title: 'Từ Vựng IELTS Cốt Lõi (Core IELTS Vocabulary)',
    description:
      'Bộ thẻ từ vựng học thuật quan trọng nhất cho bài thi IELTS Academic & General',
    termLanguage: 'en',
    definitionLanguage: 'vi',
    isDiagram: false,
    isFavorite: true,
    folderName: 'Academic English',
    tags: ['IELTS', 'Academic', 'Vocabulary'],
    collectionName: 'Tiếng Anh Căn Bản',
    cards: [
      {
        id: 'c1',
        setId: 's1',
        term: 'Ubiquitous',
        definition: 'Có mặt ở khắp mọi nơi, rất phổ biến',
        isStarred: true,
        displayOrder: 0,
        tags: ['Band 8.0'],
      },
      {
        id: 'c2',
        setId: 's1',
        term: 'Ephemeral',
        definition: 'Phù du, chỉ tồn tại trong một thời gian rất ngắn',
        isStarred: false,
        displayOrder: 1,
        tags: ['Band 7.5'],
      },
      {
        id: 'c3',
        setId: 's1',
        term: 'Pragmatic',
        definition: 'Thực tế, thực dụng, dựa trên kết quả thực tiễn',
        isStarred: false,
        displayOrder: 2,
        tags: ['Writing'],
      },
      {
        id: 'c4',
        setId: 's1',
        term: 'Resilience',
        definition: 'Khả năng phục hồi, kiên cường vượt qua khó khăn',
        isStarred: true,
        displayOrder: 3,
        tags: ['Speaking'],
      },
      {
        id: 'c5',
        setId: 's1',
        term: 'Paradigm',
        definition: 'Mô hình chuẩn, hệ quy chiếu tư duy khuôn mẫu',
        isStarred: false,
        displayOrder: 4,
        tags: ['Band 8.0'],
      },
      {
        id: 'c6',
        setId: 's1',
        term: 'Meticulous',
        definition: 'Tỉ mỉ, cẩn thận, chú ý đến từng chi tiết nhỏ',
        isStarred: false,
        displayOrder: 5,
        tags: ['Reading'],
      },
    ],
  },
  {
    title: 'Sinh Học Tế Bào (Cell Biology)',
    description: 'Cấu trúc và chức năng các bào quan tế bào cơ bản',
    termLanguage: 'en',
    definitionLanguage: 'vi',
    isDiagram: true,
    isFavorite: false,
    folderName: 'Khoa Học Tự Nhiên',
    tags: ['Biology', 'Science'],
    collectionName: 'Ôn Thi Đại Học',
    diagramImageUrl:
      'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=800&auto=format&fit=crop&q=60',
    cards: [
      {
        id: 'b1',
        setId: 's2',
        term: 'Mitochondria',
        definition: 'Ty thể - nhà máy sản xuất năng lượng ATP của tế bào',
        displayOrder: 0,
        tags: ['Cell Organelle'],
      },
      {
        id: 'b2',
        setId: 's2',
        term: 'Nucleus',
        definition: 'Nhân tế bào - nơi lưu trữ thông tin di truyền ADN',
        displayOrder: 1,
        tags: ['Genetics'],
      },
      {
        id: 'b3',
        setId: 's2',
        term: 'Ribosome',
        definition: 'Bào quan chịu trách nhiệm dịch mã tổng hợp protein',
        displayOrder: 2,
        tags: ['Synthesis'],
      },
      {
        id: 'b4',
        setId: 's2',
        term: 'Chloroplast',
        definition:
          'Lục lạp - bào quan thực hiện quang hợp chuyển hóa ánh sáng',
        displayOrder: 3,
        tags: ['Plant Cell'],
      },
    ],
  },
];

export const QuizletWorkspacePage = () => {
  const repo = useMemo(() => new StudySetRepository(), []);
  const streakEngine = useMemo(() => new StreaksEngine(), []);

  // Workspace services for the 4 core categories shown in Sidebar (Hình 2)
  const organizeService = useServiceOptional(OrganizeService);
  const tagService = useServiceOptional(TagService);
  const collectionService = useServiceOptional(CollectionService);
  const favoriteService = useServiceOptional(FavoriteService);

  const workspaceFolders = useLiveData(
    organizeService?.folderTree.rootFolder.sortedChildren$
  );
  const workspaceTags = useLiveData(tagService?.tagList.tags$);
  const workspaceCollections = useLiveData(collectionService?.collectionMetas$);

  // LEVEL 1 vs LEVEL 2 Navigation Flow:
  // If activeSetId === null -> Show Study Sets List Page (Trang danh sách như bên Kanban)
  // If activeSetId !== null -> Show Study Detail Page (Trang show card ở giữa để học)
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'flashcards' | 'learn' | 'match' | 'qchat' | 'list'
  >('flashcards');
  const [sets, setSets] = useState<StudySetModel[]>([]);

  // Search & Filter state for the Study Sets List Page
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] =
    useState<string>('all');

  // Modals state: Create Study Set (with Category Mapping & Upload PDF / Manual Input)
  const [createSetModalOpen, setCreateSetModalOpen] = useState(false);
  const [createTab, setCreateTab] = useState<'upload' | 'manual'>('upload');
  const [newSetTitle, setNewSetTitle] = useState('');
  const [newSetDesc, setNewSetDesc] = useState('');
  const [newSetIsFav, setNewSetIsFav] = useState(false);
  const [newSetFolder, setNewSetFolder] = useState('');
  const [newSetTags, setNewSetTags] = useState('');
  const [newSetCollection, setNewSetCollection] = useState('');

  // Upload PDF / Document state
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedCards, setExtractedCards] = useState<
    Array<{ term: string; definition: string; tags: string }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual input state
  const [manualCards, setManualCards] = useState<
    Array<{ term: string; definition: string; tags: string }>
  >([
    { term: '', definition: '', tags: '' },
    { term: '', definition: '', tags: '' },
  ]);
  const [quickPasteText, setQuickPasteText] = useState('');

  // Modals state: Edit Study Set
  const [editSetModalOpen, setEditSetModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<StudySetModel | null>(null);
  const [editSetTitle, setEditSetTitle] = useState('');
  const [editSetDesc, setEditSetDesc] = useState('');
  const [editSetIsFav, setEditSetIsFav] = useState(false);
  const [editSetFolder, setEditSetFolder] = useState('');
  const [editSetTags, setEditSetTags] = useState('');
  const [editSetCollection, setEditSetCollection] = useState('');

  // Modals state: Add Card to active set
  const [addCardModalOpen, setAddCardModalOpen] = useState(false);
  const [newCardTerm, setNewCardTerm] = useState('');
  const [newCardDef, setNewCardDef] = useState('');
  const [newCardStarred, setNewCardStarred] = useState(false);
  const [newCardTags, setNewCardTags] = useState('');

  // Modals state: Edit Card
  const [editCardModalOpen, setEditCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<TermCardModel | null>(null);
  const [editCardTerm, setEditCardTerm] = useState('');
  const [editCardDef, setEditCardDef] = useState('');
  const [editCardStarred, setEditCardStarred] = useState(false);
  const [editCardTags, setEditCardTags] = useState('');

  // Quick Create Modal for Workspace Sidebar (Folders, Tags, Collections)
  const [quickCreateType, setQuickCreateType] = useState<
    'folder' | 'tag' | 'collection' | null
  >(null);
  const [quickCreateName, setQuickCreateName] = useState('');

  // Initial seeding & migration
  const refreshSets = useCallback(() => {
    let currentSets = repo.listSets();
    if (currentSets.length === 0) {
      DEFAULT_SAMPLE_SETS.forEach(sample => {
        repo.createSet({
          title: sample.title,
          description: sample.description,
          termLanguage: sample.termLanguage,
          definitionLanguage: sample.definitionLanguage,
          isDiagram: sample.isDiagram,
          diagramImageUrl: sample.diagramImageUrl,
          isFavorite: sample.isFavorite,
          folderName: sample.folderName,
          tags: sample.tags,
          collectionName: sample.collectionName,
          cards: sample.cards.map(c => ({
            term: c.term,
            definition: c.definition,
            isStarred: c.isStarred,
            displayOrder: c.displayOrder,
            tags: c.tags,
          })),
        });
      });
      currentSets = repo.listSets();
    } else {
      currentSets.forEach(s => {
        let changed = false;
        if (
          s.tags === undefined ||
          s.folderName === undefined ||
          s.collectionName === undefined
        ) {
          if (s.title.includes('IELTS')) {
            s.isFavorite = s.isFavorite ?? true;
            s.folderName = s.folderName ?? 'Academic English';
            s.tags = s.tags ?? ['IELTS', 'Academic', 'Vocabulary'];
            s.collectionName = s.collectionName ?? 'Tiếng Anh Căn Bản';
            changed = true;
          } else if (s.title.includes('Sinh Học')) {
            s.isFavorite = s.isFavorite ?? false;
            s.folderName = s.folderName ?? 'Khoa Học Tự Nhiên';
            s.tags = s.tags ?? ['Biology', 'Science'];
            s.collectionName = s.collectionName ?? 'Ôn Thi Đại Học';
            changed = true;
          } else {
            s.tags = s.tags ?? ['General'];
            s.folderName = s.folderName ?? 'Chung';
            s.collectionName = s.collectionName ?? 'Học Tập';
            changed = true;
          }
        }
        if (changed) {
          repo.updateSetMapping(s.id, {
            isFavorite: s.isFavorite,
            folderName: s.folderName,
            tags: s.tags,
            collectionName: s.collectionName,
          });
        }
      });
    }
    setSets(currentSets);
  }, [repo]);

  useEffect(() => {
    refreshSets();
  }, [refreshSets]);

  const currentSet = useMemo(() => {
    if (!activeSetId) return null;
    return sets.find(s => s.id === activeSetId) || null;
  }, [sets, activeSetId]);

  // Record streak activity when entering page
  useEffect(() => {
    streakEngine.recordStudyActivity();
  }, [streakEngine]);

  const streak = streakEngine.getState();

  // Aggregate available Folders from workspace + local sets
  const availableFolders = useMemo(() => {
    const list = new Set<string>();
    if (workspaceFolders) {
      workspaceFolders.forEach((node: any) => {
        const name = node.name$?.value;
        if (name) list.add(name);
      });
    }
    sets.forEach(s => {
      if (s.folderName) list.add(s.folderName);
    });
    return Array.from(list);
  }, [workspaceFolders, sets]);

  // Aggregate available Tags from workspace + local sets
  const availableTags = useMemo(() => {
    const list = new Set<string>();
    if (workspaceTags) {
      workspaceTags.forEach((tag: any) => {
        const val = tag.value$?.value;
        if (val) list.add(val);
      });
    }
    sets.forEach(s => {
      s.tags?.forEach(t => list.add(t));
      s.cards.forEach(c => c.tags?.forEach(t => list.add(t)));
    });
    return Array.from(list);
  }, [workspaceTags, sets]);

  // Aggregate available Collections from workspace + local sets
  const availableCollections = useMemo(() => {
    const list = new Set<string>();
    if (workspaceCollections) {
      workspaceCollections.forEach((c: any) => {
        if (c.name) list.add(c.name);
      });
    }
    sets.forEach(s => {
      if (s.collectionName) list.add(s.collectionName);
    });
    return Array.from(list);
  }, [workspaceCollections, sets]);

  // Filtering Sets for the Main Table List
  const filteredSets = useMemo(() => {
    return sets.filter(s => {
      if (searchTableQuery.trim()) {
        const q = searchTableQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchDesc = s.description.toLowerCase().includes(q);
        const matchTag = s.tags?.some(t => t.toLowerCase().includes(q));
        const matchFolder = s.folderName?.toLowerCase().includes(q);
        const matchCol = s.collectionName?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchTag && !matchFolder && !matchCol)
          return false;
      }
      if (selectedFilterCategory === 'favorites') {
        return !!s.isFavorite;
      }
      if (selectedFilterCategory.startsWith('folder:')) {
        const f = selectedFilterCategory.replace('folder:', '');
        return s.folderName === f;
      }
      if (selectedFilterCategory.startsWith('tag:')) {
        const t = selectedFilterCategory.replace('tag:', '');
        return s.tags?.includes(t);
      }
      if (selectedFilterCategory.startsWith('collection:')) {
        const c = selectedFilterCategory.replace('collection:', '');
        return s.collectionName === c;
      }
      return true;
    });
  }, [sets, searchTableQuery, selectedFilterCategory]);

  // Filtering Cards for the Cards Sub-table inside Study Page
  const filteredCards = useMemo(() => {
    if (!currentSet) return [];
    return currentSet.cards.filter(c => {
      if (searchTableQuery.trim()) {
        const q = searchTableQuery.toLowerCase();
        const matchTerm = c.term.toLowerCase().includes(q);
        const matchDef = c.definition.toLowerCase().includes(q);
        const matchTag = c.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchTerm && !matchDef && !matchTag) return false;
      }
      return true;
    });
  }, [currentSet, searchTableQuery]);

  // Learn Mode State
  const [learnSession, setLearnSession] =
    useState<SpacedRepetitionSession | null>(null);
  const [currentLearnQ, setCurrentLearnQ] = useState<any>(null);
  const [learnInput, setLearnInput] = useState('');
  const [learnFeedback, setLearnFeedback] = useState<string | null>(null);

  const initLearnMode = useCallback(() => {
    if (!currentSet || currentSet.cards.length === 0) return;
    const session = new SpacedRepetitionSession(currentSet.cards);
    setLearnSession(session);
    setCurrentLearnQ(session.getNextQuestion());
    setLearnInput('');
    setLearnFeedback(null);
  }, [currentSet]);

  useEffect(() => {
    if (activeTab === 'learn' && currentSet) {
      initLearnMode();
    }
  }, [activeTab, currentSet, initLearnMode]);

  const handleLearnSubmit = () => {
    if (!learnSession || !currentLearnQ || !learnInput.trim()) return;
    const res = learnSession.submitAnswer(learnInput.trim());
    if (res.isCorrect) {
      setLearnFeedback('Chính xác! Ghi nhận câu trả lời đúng.');
    } else {
      setLearnFeedback(`Chưa đúng. Đáp án: ${currentLearnQ.card.term}`);
    }
    setTimeout(() => {
      setLearnFeedback(null);
      setLearnInput('');
      setCurrentLearnQ(learnSession.getNextQuestion());
    }, 1200);
  };

  // Match Game State
  const [matchEngine, setMatchEngine] = useState<MatchGameEngine | null>(null);
  const [matchTiles, setMatchTiles] = useState<MatchTile[]>([]);
  const [matchStats, setMatchStats] = useState<any>(null);

  const initMatchGame = useCallback(() => {
    if (!currentSet || currentSet.cards.length === 0) return;
    const engine = new MatchGameEngine(currentSet.cards);
    setMatchEngine(engine);
    setMatchTiles(engine.getTiles());
    setMatchStats(engine.getStats());
  }, [currentSet]);

  useEffect(() => {
    if (activeTab === 'match' && currentSet) {
      initMatchGame();
    }
  }, [activeTab, currentSet, initMatchGame]);

  const handleTileClick = (tileId: string) => {
    if (!matchEngine) return;
    matchEngine.selectTile(tileId);
    setMatchTiles([...matchEngine.getTiles()]);
    setMatchStats({ ...matchEngine.getStats() });
  };

  // Q-Chat State
  const [qchatEngine, setQchatEngine] = useState<QChatEngine | null>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'ai' | 'user'; text: string }>
  >([]);
  const [userChatInput, setUserChatInput] = useState('');

  useEffect(() => {
    if (activeTab === 'qchat' && currentSet) {
      const engine = new QChatEngine(currentSet);
      setQchatEngine(engine);
      setChatMessages([
        {
          role: 'ai',
          text: `Xin chào! Tôi là Gia sư AI Q-Chat của học phần "${currentSet.title}". Bạn muốn kiểm tra từ vựng, đặt câu ví dụ hay giải thích khái niệm nào?`,
        },
      ]);
    }
  }, [activeTab, currentSet]);

  const handleSendChat = (text: string) => {
    if (!qchatEngine || !text.trim()) return;
    const userMsg = text.trim();
    setUserChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);

    setTimeout(() => {
      const aiReply = qchatEngine.sendMessage(userMsg);
      setChatMessages(prev => [...prev, { role: 'ai', text: aiReply.text }]);
    }, 400);
  };

  // --- CRUD: QUICK CREATE WORKSPACE ITEMS (Event Linking với Left Sidebar) ---
  const handleQuickCreateWorkspaceItem = () => {
    const name = quickCreateName.trim();
    if (!name || !quickCreateType) return;

    if (quickCreateType === 'folder' && organizeService) {
      try {
        const rf = organizeService.folderTree.rootFolder;
        const ieltsFolder = rf.sortedChildren$.value?.find(
          c => c.name$.value === 'IELTS'
        );
        if (
          ieltsFolder &&
          (name.startsWith('IELTS ') ||
            name === 'Reading' ||
            name === 'Writing' ||
            name === 'Vocabulary')
        ) {
          ieltsFolder.createFolder(name, ieltsFolder.indexAt('before'));
        } else {
          rf.createFolder(name, rf.indexAt('before'));
        }
        notify.success({
          title: `Đã tạo Thư mục "${name}" trên Sidebar Organize!`,
        });
      } catch (e) {
        console.warn('Folder create error:', e);
        notify.success({ title: `Đã lưu Thư mục "${name}" vào hệ thống` });
      }
    } else if (quickCreateType === 'tag' && tagService) {
      try {
        tagService.tagList.createTag(name);
        notify.success({ title: `Đã tạo Nhãn "${name}" trên Sidebar Tags!` });
      } catch (e) {
        console.warn('Tag create error:', e);
        notify.success({ title: `Đã lưu Nhãn "${name}" vào hệ thống` });
      }
    } else if (quickCreateType === 'collection' && collectionService) {
      try {
        collectionService.createCollection({ name });
        notify.success({
          title: `Đã tạo Bộ sưu tập "${name}" trên Sidebar Collections!`,
        });
      } catch (e) {
        console.warn('Collection create error:', e);
        notify.success({ title: `Đã lưu Bộ sưu tập "${name}" vào hệ thống` });
      }
    }

    setQuickCreateType(null);
    setQuickCreateName('');
    refreshSets();
  };

  // --- FILE UPLOAD (PDF / TXT / CSV) HANDLER ---
  const handleProcessUploadedFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsExtracting(true);
    notify.info({ title: `Đang trích xuất nội dung từ ${file.name}...` });

    try {
      const extracted = await extractCardsFromFile(file);
      setIsExtracting(false);
      if (extracted.length > 0) {
        setExtractedCards(
          extracted.map(c => ({
            term: c.term,
            definition: c.definition,
            tags: (c.tags || []).join(', '),
          }))
        );
        notify.success({
          title: `Đã trích xuất thành công ${extracted.length} thẻ từ file!`,
        });
      } else {
        notify.warning({
          title:
            'Không tìm thấy định dạng thuật ngữ - định nghĩa rõ ràng. Hãy kiểm tra hoặc nhập tay bên tab Nhập tay.',
        });
      }
    } catch (err) {
      setIsExtracting(false);
      console.error(err);
      notify.error({
        title: 'Không thể đọc file. Vui lòng thử file khác hoặc nhập tay.',
      });
    }
  };

  // --- QUICK PASTE TEXT HANDLER ---
  const handleParseQuickPaste = () => {
    if (!quickPasteText.trim()) return;
    const parsed = parseRawTextToCards(quickPasteText);
    if (parsed.length > 0) {
      setManualCards(prev => [
        ...prev.filter(c => c.term.trim() || c.definition.trim()),
        ...parsed.map(c => ({
          term: c.term,
          definition: c.definition,
          tags: (c.tags || []).join(', '),
        })),
      ]);
      setQuickPasteText('');
      notify.success({ title: `Đã thêm ${parsed.length} thẻ từ văn bản dán!` });
    } else {
      notify.warning({
        title:
          'Không nhận diện được định dạng. Thử dạng: "Từ - Định nghĩa" mỗi dòng một thẻ.',
      });
    }
  };

  // --- CRUD: CREATE STUDY SET (With Event Linking & Auto-Study Option) ---
  const handleCreateSet = (goToStudy: boolean = true) => {
    const title = newSetTitle.trim();
    if (!title) {
      notify.error({ title: 'Vui lòng nhập tên học phần' });
      return;
    }

    // Determine cards to save
    const cardsSource = createTab === 'upload' ? extractedCards : manualCards;
    const validCards = cardsSource
      .filter(c => c.term.trim() && c.definition.trim())
      .map((c, index) => ({
        term: c.term.trim(),
        definition: c.definition.trim(),
        displayOrder: index,
        tags: c.tags
          ? c.tags
              .split(',')
              .map(t => t.trim())
              .filter(Boolean)
          : [],
        isStarred: false,
      }));

    if (validCards.length === 0) {
      notify.error({
        title: 'Vui lòng thêm ít nhất 1 thẻ (hoặc upload file có chứa thẻ)',
      });
      return;
    }

    // Event linking: Sidebar Organize
    const folder = newSetFolder.trim();
    if (folder && organizeService) {
      const exists = availableFolders.includes(folder);
      if (!exists) {
        try {
          organizeService.folderTree.rootFolder.createFolder(folder);
        } catch (e) {
          console.warn('Folder event link:', e);
        }
      }
    }

    // Event linking: Sidebar Tags
    const tagsArray = newSetTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    if (tagsArray.length > 0 && tagService) {
      tagsArray.forEach(t => {
        if (!availableTags.includes(t)) {
          try {
            tagService.tagList.createTag(t);
          } catch (e) {
            console.warn('Tag event link:', e);
          }
        }
      });
    }

    // Event linking: Sidebar Collections
    const collection = newSetCollection.trim();
    if (collection && collectionService) {
      const exists = availableCollections.includes(collection);
      if (!exists) {
        try {
          collectionService.createCollection({ name: collection });
        } catch (e) {
          console.warn('Collection event link:', e);
        }
      }
    }

    // Save to repository
    const created = repo.createSet({
      title,
      description: newSetDesc.trim() || undefined,
      termLanguage: 'en',
      definitionLanguage: 'vi',
      isFavorite: newSetIsFav,
      folderName: folder || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      collectionName: collection || undefined,
      cards: validCards,
    });

    // Event linking: Sidebar Favorites
    if (newSetIsFav && favoriteService) {
      try {
        favoriteService.favoriteList.add('collection', created.id);
      } catch (e) {
        console.warn('Favorite sync:', e);
      }
    }

    refreshSets();
    setCreateSetModalOpen(false);
    setNewSetTitle('');
    setNewSetDesc('');
    setNewSetIsFav(false);
    setNewSetFolder('');
    setNewSetTags('');
    setNewSetCollection('');
    setExtractedCards([]);
    setUploadedFileName('');
    setManualCards([
      { term: '', definition: '', tags: '' },
      { term: '', definition: '', tags: '' },
    ]);

    if (goToStudy) {
      setActiveSetId(created.id);
      setActiveTab('flashcards');
      notify.success({ title: `Đã tạo học phần và mở trang học Flashcard!` });
    } else {
      notify.success({ title: 'Đã tạo học phần mới vào danh sách!' });
    }
  };

  // --- CRUD: EDIT STUDY SET ---
  const handleOpenEditSetModal = (s: StudySetModel) => {
    setEditingSet(s);
    setEditSetTitle(s.title);
    setEditSetDesc(s.description || '');
    setEditSetIsFav(!!s.isFavorite);
    setEditSetFolder(s.folderName || '');
    setEditSetTags((s.tags || []).join(', '));
    setEditSetCollection(s.collectionName || '');
    setEditSetModalOpen(true);
  };

  const handleSaveEditSet = () => {
    if (!editingSet || !editSetTitle.trim()) return;
    const tagsArray = editSetTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    repo.updateSet(editingSet.id, {
      title: editSetTitle.trim(),
      description: editSetDesc.trim(),
      isFavorite: editSetIsFav,
      folderName: editSetFolder.trim() || null,
      tags: tagsArray,
      collectionName: editSetCollection.trim() || null,
    });

    if (favoriteService) {
      try {
        if (editSetIsFav) {
          favoriteService.favoriteList.add('collection', editingSet.id);
        } else {
          favoriteService.favoriteList.remove('collection', editingSet.id);
        }
      } catch (e) {
        console.warn('Favorite sync:', e);
      }
    }

    refreshSets();
    setEditSetModalOpen(false);
    notify.success({ title: 'Đã cập nhật học phần thành công!' });
  };

  // --- CRUD: DELETE STUDY SET ---
  const handleDeleteSet = (setId: string) => {
    const target = sets.find(s => s.id === setId);
    if (!target) return;
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa học phần "${target.title}" không?`
      )
    ) {
      repo.deleteSet(setId);
      if (activeSetId === setId) {
        setActiveSetId(null);
      }
      refreshSets();
      notify.success({ title: 'Đã xóa học phần' });
    }
  };

  // --- CRUD: TOGGLE FAVORITE ON STUDY SET ---
  const handleToggleSetFavorite = (setId: string) => {
    const isFav = repo.toggleSetFavorite(setId);
    if (favoriteService) {
      try {
        favoriteService.favoriteList.toggle('collection', setId);
      } catch (e) {
        console.warn('Favorite toggle:', e);
      }
    }
    refreshSets();
    notify.success({
      title: isFav
        ? 'Đã thêm vào mục Yêu thích (Sidebar Favorites)'
        : 'Đã bỏ khỏi mục Yêu thích',
    });
  };

  // --- CRUD: ADD TERM CARD TO ACTIVE SET ---
  const handleAddCard = () => {
    if (!currentSet) return;
    const term = newCardTerm.trim();
    const def = newCardDef.trim();
    if (!term || !def) {
      notify.error({ title: 'Vui lòng nhập đầy đủ thuật ngữ và định nghĩa' });
      return;
    }
    const tagsArray = newCardTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const cardAdded = repo.addCardToSet(currentSet.id, {
      term,
      definition: def,
      isStarred: newCardStarred,
    });
    if (cardAdded && tagsArray.length > 0) {
      repo.updateCard(currentSet.id, cardAdded.id, { tags: tagsArray });
    }
    refreshSets();
    setAddCardModalOpen(false);
    setNewCardTerm('');
    setNewCardDef('');
    setNewCardStarred(false);
    setNewCardTags('');
    notify.success({ title: 'Đã thêm thẻ mới vào học phần' });
  };

  // --- CRUD: EDIT TERM CARD ---
  const handleOpenEditCardModal = (card: TermCardModel) => {
    setEditingCard(card);
    setEditCardTerm(card.term);
    setEditCardDef(card.definition);
    setEditCardStarred(!!card.isStarred);
    setEditCardTags((card.tags || []).join(', '));
    setEditCardModalOpen(true);
  };

  const handleSaveEditCard = () => {
    if (
      !editingCard ||
      !currentSet ||
      !editCardTerm.trim() ||
      !editCardDef.trim()
    )
      return;
    const tagsArray = editCardTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    repo.updateCard(currentSet.id, editingCard.id, {
      term: editCardTerm.trim(),
      definition: editCardDef.trim(),
      isStarred: editCardStarred,
      tags: tagsArray,
    });
    refreshSets();
    setEditCardModalOpen(false);
    notify.success({ title: 'Đã cập nhật thẻ từ vựng' });
  };

  // --- CRUD: DELETE TERM CARD ---
  const handleDeleteCard = (cardId: string) => {
    if (!currentSet) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa thẻ này khỏi học phần?')) {
      repo.deleteCard(currentSet.id, cardId);
      refreshSets();
      notify.success({ title: 'Đã xóa thẻ' });
    }
  };

  // ==========================================
  // RENDER: LEVEL 1 (TRANG DANH SÁCH HỌC PHẦN)
  // Khi activeSetId === null -> Giao diện dạng Bảng Danh sách như Kanban
  // ==========================================
  if (!activeSetId) {
    return (
      <>
        <ViewTitle title="Quizlet · Danh Sách Học Phần" />
        <ViewIcon icon="quizlet" />
        <ViewHeader>
          <div className={styles.headerBar}>
            <div className={styles.breadcrumbBar}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: cssVarV2('text/primary'),
                }}
              >
                <BookPanelIcon width={15} height={15} />
                <span>Danh Sách Học Phần</span>
              </span>

              {/* Streak Pill */}
              <span
                className={styles.outlinePill}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  color: '#f59e0b',
                  borderColor: 'rgba(245, 158, 11, 0.25)',
                }}
                title={`Kỷ lục liên tục: ${streak.longestStreak} ngày`}
              >
                <FirePanelIcon
                  width={13}
                  height={13}
                  style={{ color: '#f59e0b' }}
                />
                <span>{streak.currentStreak} ngày streak</span>
              </span>
            </div>

            {/* Right Action: Create New Study Set Button */}
            <div className={styles.toolbarGroup}>
              <button
                type="button"
                className={styles.actionButton}
                data-primary="true"
                onClick={() => setCreateSetModalOpen(true)}
                title="Tạo học phần mới bằng PDF hoặc nhập tay kèm 4 loại category"
              >
                <PlusIcon width={14} height={14} />
                <span>Tạo học phần mới</span>
              </button>
            </div>
          </div>
        </ViewHeader>

        <ViewBody>
          <div className={styles.pageContainer}>
            <div className={styles.contentArea}>
              {/* Filter, Search & Quick Create Workspace Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                {/* Search Input */}
                <div style={{ position: 'relative', width: '320px' }}>
                  <SearchIcon
                    width={13}
                    height={13}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '8px',
                      color: cssVarV2('text/secondary'),
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Tìm học phần theo tên, mô tả, tag, thư mục..."
                    value={searchTableQuery}
                    onChange={e => setSearchTableQuery(e.target.value)}
                    className={styles.controlInput}
                    style={{
                      width: '100%',
                      paddingLeft: '30px',
                      height: '30px',
                    }}
                  />
                </div>

                {/* Quick Create Buttons: Folder, Tag, Collection on Workspace Sidebar */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => {
                      setQuickCreateType('folder');
                      setQuickCreateName('');
                    }}
                    title="Tạo Thư mục mới liên kết Sidebar Organize"
                  >
                    <FolderIcon width={13} height={13} />
                    <span>+ Thư mục</span>
                  </button>

                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => {
                      setQuickCreateType('tag');
                      setQuickCreateName('');
                    }}
                    title="Tạo Nhãn mới liên kết Sidebar Tags"
                  >
                    <TagIcon width={13} height={13} />
                    <span>+ Tag</span>
                  </button>

                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => {
                      setQuickCreateType('collection');
                      setQuickCreateName('');
                    }}
                    title="Tạo Bộ sưu tập mới liên kết Sidebar Collections"
                  >
                    <ViewLayersIcon width={13} height={13} />
                    <span>+ Collection</span>
                  </button>
                </div>
              </div>

              {/* 4 Types Category Filter Bar */}
              <div className={styles.filterBar}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: cssVarV2('text/secondary'),
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <FilterIcon width={13} height={13} />
                  <span>Lọc theo 4 loại:</span>
                </div>

                <button
                  type="button"
                  className={styles.viewSwitchBtn}
                  data-active={selectedFilterCategory === 'all'}
                  onClick={() => setSelectedFilterCategory('all')}
                >
                  Tất cả ({sets.length})
                </button>

                <button
                  type="button"
                  className={styles.viewSwitchBtn}
                  data-active={selectedFilterCategory === 'favorites'}
                  onClick={() => setSelectedFilterCategory('favorites')}
                >
                  <StarIcon
                    width={12}
                    height={12}
                    style={{ color: '#f59e0b' }}
                  />
                  <span>Yêu thích (Favorites)</span>
                </button>

                {availableFolders.map(folder => (
                  <button
                    key={folder}
                    type="button"
                    className={styles.viewSwitchBtn}
                    data-active={selectedFilterCategory === `folder:${folder}`}
                    onClick={() =>
                      setSelectedFilterCategory(`folder:${folder}`)
                    }
                  >
                    <FolderIcon
                      width={12}
                      height={12}
                      style={{ color: '#3b82f6' }}
                    />
                    <span>{folder}</span>
                  </button>
                ))}

                {availableTags.slice(0, 5).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    className={styles.viewSwitchBtn}
                    data-active={selectedFilterCategory === `tag:${tag}`}
                    onClick={() => setSelectedFilterCategory(`tag:${tag}`)}
                  >
                    <TagIcon
                      width={12}
                      height={12}
                      style={{ color: '#10b981' }}
                    />
                    <span>{tag}</span>
                  </button>
                ))}

                {availableCollections.map(col => (
                  <button
                    key={col}
                    type="button"
                    className={styles.viewSwitchBtn}
                    data-active={selectedFilterCategory === `collection:${col}`}
                    onClick={() =>
                      setSelectedFilterCategory(`collection:${col}`)
                    }
                  >
                    <ViewLayersIcon
                      width={12}
                      height={12}
                      style={{ color: '#a855f7' }}
                    />
                    <span>{col}</span>
                  </button>
                ))}
              </div>

              {/* MAIN TABLE LIST: Quản lý Thêm, Xóa, Sửa Học Phần */}
              <div className={styles.shadcnTableContainer}>
                <table className={styles.shadcnTable}>
                  <thead className={styles.shadcnThead}>
                    <tr>
                      <th
                        className={styles.shadcnTh}
                        style={{ width: '40px', textAlign: 'center' }}
                      >
                        <StarIcon
                          width={13}
                          height={13}
                          style={{
                            color: cssVarV2('text/secondary'),
                            margin: '0 auto',
                            display: 'block',
                          }}
                        />
                      </th>
                      <th
                        className={styles.shadcnTh}
                        style={{ minWidth: '220px' }}
                      >
                        Học phần (Title)
                      </th>
                      <th
                        className={styles.shadcnTh}
                        style={{ width: '160px' }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <FolderIcon width={12} height={12} />
                          <span>Thư mục (Organize)</span>
                        </span>
                      </th>
                      <th
                        className={styles.shadcnTh}
                        style={{ minWidth: '160px' }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <TagIcon width={12} height={12} />
                          <span>Nhãn (Tags)</span>
                        </span>
                      </th>
                      <th
                        className={styles.shadcnTh}
                        style={{ width: '160px' }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <ViewLayersIcon width={12} height={12} />
                          <span>Bộ sưu tập (Collections)</span>
                        </span>
                      </th>
                      <th
                        className={styles.shadcnTh}
                        style={{ width: '80px', textAlign: 'center' }}
                      >
                        Số thẻ
                      </th>
                      <th
                        className={styles.shadcnTh}
                        style={{ width: '140px', textAlign: 'right' }}
                      >
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSets.length > 0 ? (
                      filteredSets.map(s => (
                        <tr key={s.id} className={styles.shadcnTr}>
                          {/* Star Column */}
                          <td
                            className={styles.shadcnTd}
                            style={{ textAlign: 'center' }}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleSetFavorite(s.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'none',
                                border: 'none',
                                color: s.isFavorite
                                  ? '#f59e0b'
                                  : cssVarV2('text/disable'),
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                              title={
                                s.isFavorite
                                  ? 'Bỏ yêu thích'
                                  : 'Đánh dấu yêu thích'
                              }
                            >
                              <StarIcon width={15} height={15} />
                            </button>
                          </td>

                          {/* Title & Description -> Click to open study page */}
                          <td className={styles.shadcnTd}>
                            <div
                              onClick={() => {
                                setActiveSetId(s.id);
                                setActiveTab('flashcards');
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: cssVarV2('text/primary'),
                                }}
                              >
                                {s.title}
                              </div>
                              {s.description && (
                                <div
                                  style={{
                                    fontSize: '11.5px',
                                    color: cssVarV2('text/secondary'),
                                    marginTop: '2px',
                                  }}
                                >
                                  {s.description}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Folder Column */}
                          <td className={styles.shadcnTd}>
                            {s.folderName ? (
                              <span className={styles.folderBadge}>
                                <FolderIcon width={11} height={11} />
                                <span>{s.folderName}</span>
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '12px',
                                  color: cssVarV2('text/disable'),
                                }}
                              >
                                Chưa gán
                              </span>
                            )}
                          </td>

                          {/* Tags Column */}
                          <td className={styles.shadcnTd}>
                            <div
                              style={{
                                display: 'flex',
                                gap: '4px',
                                flexWrap: 'wrap',
                              }}
                            >
                              {s.tags && s.tags.length > 0 ? (
                                s.tags.map(t => (
                                  <span key={t} className={styles.tagChip}>
                                    <TagIcon width={10} height={10} />
                                    <span>{t}</span>
                                  </span>
                                ))
                              ) : (
                                <span
                                  style={{
                                    fontSize: '12px',
                                    color: cssVarV2('text/disable'),
                                  }}
                                >
                                  Chưa có tag
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Collection Column */}
                          <td className={styles.shadcnTd}>
                            {s.collectionName ? (
                              <span className={styles.collectionBadge}>
                                <ViewLayersIcon width={11} height={11} />
                                <span>{s.collectionName}</span>
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '12px',
                                  color: cssVarV2('text/disable'),
                                }}
                              >
                                Chưa gán
                              </span>
                            )}
                          </td>

                          {/* Cards count */}
                          <td
                            className={styles.shadcnTd}
                            style={{ textAlign: 'center' }}
                          >
                            <span className={styles.countBadge}>
                              {s.cards.length}
                            </span>
                          </td>

                          {/* Actions Column */}
                          <td
                            className={styles.shadcnTd}
                            style={{ textAlign: 'right' }}
                          >
                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                              {/* Nút Học ngay */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSetId(s.id);
                                  setActiveTab('flashcards');
                                  notify.success({
                                    title: `Bắt đầu học "${s.title}"`,
                                  });
                                }}
                                className={styles.actionButton}
                                style={{
                                  height: '26px',
                                  padding: '0 8px',
                                  fontSize: '12px',
                                  color: '#3b82f6',
                                  borderColor: 'rgba(59, 130, 246, 0.3)',
                                }}
                                title="Mở trang học với flashcard ở giữa"
                              >
                                <CardPanelIcon width={12} height={12} />
                                <span>Học</span>
                              </button>

                              {/* Nút Sửa */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditSetModal(s)}
                                className={styles.actionButton}
                                style={{
                                  height: '26px',
                                  width: '26px',
                                  padding: 0,
                                }}
                                title="Chỉnh sửa thông tin học phần & 4 cate"
                              >
                                <EditIcon width={12} height={12} />
                              </button>

                              {/* Nút Xóa */}
                              <button
                                type="button"
                                onClick={() => handleDeleteSet(s.id)}
                                className={styles.actionButton}
                                style={{
                                  height: '26px',
                                  width: '26px',
                                  padding: 0,
                                  color: '#ef4444',
                                }}
                                title="Xóa học phần"
                              >
                                <DeleteIcon width={12} height={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            textAlign: 'center',
                            padding: '36px',
                            color: cssVarV2('text/secondary'),
                          }}
                        >
                          Không tìm thấy học phần nào. Bấm{' '}
                          <strong>+ Tạo học phần mới</strong> để thêm học phần.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ViewBody>

        {/* MODAL 1: TẠO HỌC PHẦN MỚI (VỚI CATE VÀ UPLOAD PDF / NHẬP TAY) */}
        {createSetModalOpen && (
          <div
            className={styles.modalOverlay}
            onClick={() => setCreateSetModalOpen(false)}
          >
            <div
              className={styles.modalContentLarge}
              onClick={e => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    margin: 0,
                    color: cssVarV2('text/primary'),
                  }}
                >
                  Tạo Học Phần Mới (Mapping 4 Loại & Upload PDF / Nhập Tay)
                </h3>
              </div>

              {/* Basic Info: Title & Description */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                }}
              >
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tên học phần *</label>
                  <input
                    type="text"
                    placeholder="VD: Từ Vựng IELTS Chuyên Đề Môi Trường"
                    value={newSetTitle}
                    onChange={e => setNewSetTitle(e.target.value)}
                    className={styles.controlInput}
                    style={{ height: '32px' }}
                    autoFocus
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Mô tả</label>
                  <input
                    type="text"
                    placeholder="VD: Tổng hợp 50 từ band 7.5+ kèm nghĩa và ngữ cảnh"
                    value={newSetDesc}
                    onChange={e => setNewSetDesc(e.target.value)}
                    className={styles.controlInput}
                    style={{ height: '32px' }}
                  />
                </div>
              </div>

              {/* 4 CATEGORIES MAPPING (Sidebar Integration) */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: cssVarV2('layer/background/secondary'),
                  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: cssVarV2('text/primary'),
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                  }}
                >
                  Phân loại thuộc danh mục nào (4 loại Sidebar Workspace)
                </span>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                  }}
                >
                  {/* Cate 1: Favorites */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <input
                      type="checkbox"
                      id="newSetFav"
                      checked={newSetIsFav}
                      onChange={e => setNewSetIsFav(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label
                      htmlFor="newSetFav"
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <StarIcon
                        width={13}
                        height={13}
                        style={{ color: '#f59e0b' }}
                      />
                      <span>Thêm vào mục Yêu thích (Favorites)</span>
                    </label>
                  </div>

                  {/* Cate 2: Organize / Folders */}
                  <div className={styles.formGroup}>
                    <label
                      className={styles.formLabel}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FolderIcon
                        width={12}
                        height={12}
                        style={{ color: '#3b82f6' }}
                      />
                      <span>Thư mục (Organize)</span>
                    </label>
                    <input
                      type="text"
                      list="create-folders"
                      placeholder="Chọn hoặc gõ tên thư mục..."
                      value={newSetFolder}
                      onChange={e => setNewSetFolder(e.target.value)}
                      className={styles.controlInput}
                      style={{ height: '30px' }}
                    />
                    <datalist id="create-folders">
                      {availableFolders.map(f => (
                        <option key={f} value={f} />
                      ))}
                    </datalist>
                  </div>

                  {/* Cate 3: Tags */}
                  <div className={styles.formGroup}>
                    <label
                      className={styles.formLabel}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <TagIcon
                        width={12}
                        height={12}
                        style={{ color: '#10b981' }}
                      />
                      <span>Nhãn (Tags - phân cách bởi dấu phẩy)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: IELTS, Academic, Speaking"
                      value={newSetTags}
                      onChange={e => setNewSetTags(e.target.value)}
                      className={styles.controlInput}
                      style={{ height: '30px' }}
                    />
                  </div>

                  {/* Cate 4: Collections */}
                  <div className={styles.formGroup}>
                    <label
                      className={styles.formLabel}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ViewLayersIcon
                        width={12}
                        height={12}
                        style={{ color: '#a855f7' }}
                      />
                      <span>Bộ sưu tập (Collections)</span>
                    </label>
                    <input
                      type="text"
                      list="create-collections"
                      placeholder="Chọn hoặc gõ tên bộ sưu tập..."
                      value={newSetCollection}
                      onChange={e => setNewSetCollection(e.target.value)}
                      className={styles.controlInput}
                      style={{ height: '30px' }}
                    />
                    <datalist id="create-collections">
                      {availableCollections.map(c => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* CARD INPUT METHODS: TẢI LÊN PDF vs NHẬP TAY */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: cssVarV2('text/primary'),
                    }}
                  >
                    Thêm nội dung thẻ từ vựng:
                  </span>
                  <div className={styles.viewSwitchGroup}>
                    <button
                      type="button"
                      className={styles.viewSwitchBtn}
                      data-active={createTab === 'upload'}
                      onClick={() => setCreateTab('upload')}
                    >
                      <span>📄 Tải lên PDF / File</span>
                    </button>
                    <button
                      type="button"
                      className={styles.viewSwitchBtn}
                      data-active={createTab === 'manual'}
                      onClick={() => setCreateTab('manual')}
                    >
                      <span>✍️ Nhập tay thẻ</span>
                    </button>
                  </div>
                </div>

                {/* TAB 1: UPLOAD PDF / TEXT */}
                {createTab === 'upload' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div
                      className={styles.dropzoneArea}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.txt,.csv,.md,.json"
                        style={{ display: 'none' }}
                        onChange={e => {
                          handleProcessUploadedFile(e).catch(console.error);
                        }}
                      />
                      <div style={{ fontSize: '24px', marginBottom: '6px' }}>
                        📄
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: cssVarV2('text/primary'),
                        }}
                      >
                        {uploadedFileName
                          ? `Đã chọn: ${uploadedFileName}`
                          : 'Bấm hoặc kéo thả file PDF, TXT, CSV vào đây'}
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: cssVarV2('text/secondary'),
                          marginTop: '4px',
                        }}
                      >
                        Hệ thống tự động quét và bóc tách các cặp Thuật ngữ -
                        Định nghĩa
                      </div>
                    </div>

                    {isExtracting && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#3b82f6',
                          textAlign: 'center',
                          padding: '6px',
                        }}
                      >
                        Đang đọc và trích xuất thẻ từ file...
                      </div>
                    )}

                    {extractedCards.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          maxHeight: '180px',
                          overflowY: 'auto',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#10b981',
                          }}
                        >
                          ✓ Đã trích xuất {extractedCards.length} thẻ từ file:
                        </div>
                        {extractedCards.map((c, i) => (
                          <div key={i} className={styles.cardInputRow}>
                            <input
                              type="text"
                              value={c.term}
                              onChange={e => {
                                const copy = [...extractedCards];
                                copy[i].term = e.target.value;
                                setExtractedCards(copy);
                              }}
                              className={styles.controlInput}
                              placeholder="Thuật ngữ"
                              style={{ height: '28px' }}
                            />
                            <input
                              type="text"
                              value={c.definition}
                              onChange={e => {
                                const copy = [...extractedCards];
                                copy[i].definition = e.target.value;
                                setExtractedCards(copy);
                              }}
                              className={styles.controlInput}
                              placeholder="Định nghĩa"
                              style={{ height: '28px' }}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setExtractedCards(prev =>
                                  prev.filter((_, idx) => idx !== i)
                                )
                              }
                              className={styles.actionButton}
                              style={{
                                height: '28px',
                                width: '28px',
                                padding: 0,
                                color: '#ef4444',
                              }}
                              title="Xóa thẻ"
                            >
                              <DeleteIcon width={12} height={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: MANUAL INPUT */}
                {createTab === 'manual' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {/* Quick paste text box */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Dán nhanh định dạng: 'Từ vựng - Định nghĩa' hoặc 'Từ : Nghĩa'..."
                        value={quickPasteText}
                        onChange={e => setQuickPasteText(e.target.value)}
                        onKeyDown={e =>
                          e.key === 'Enter' && handleParseQuickPaste()
                        }
                        className={styles.controlInput}
                        style={{ flex: 1, height: '30px' }}
                      />
                      <button
                        type="button"
                        onClick={handleParseQuickPaste}
                        className={styles.actionButton}
                        style={{ height: '30px', padding: '0 12px' }}
                      >
                        Thêm từ dán
                      </button>
                    </div>

                    {/* Manual cards list */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        maxHeight: '180px',
                        overflowY: 'auto',
                      }}
                    >
                      {manualCards.map((c, i) => (
                        <div key={i} className={styles.cardInputRow}>
                          <input
                            type="text"
                            value={c.term}
                            onChange={e => {
                              const copy = [...manualCards];
                              copy[i].term = e.target.value;
                              setManualCards(copy);
                            }}
                            className={styles.controlInput}
                            placeholder={`Thuật ngữ #${i + 1}`}
                            style={{ height: '28px' }}
                          />
                          <input
                            type="text"
                            value={c.definition}
                            onChange={e => {
                              const copy = [...manualCards];
                              copy[i].definition = e.target.value;
                              setManualCards(copy);
                            }}
                            className={styles.controlInput}
                            placeholder="Định nghĩa"
                            style={{ height: '28px' }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setManualCards(prev =>
                                prev.filter((_, idx) => idx !== i)
                              )
                            }
                            className={styles.actionButton}
                            style={{
                              height: '28px',
                              width: '28px',
                              padding: 0,
                              color: '#ef4444',
                            }}
                            title="Xóa dòng thẻ"
                          >
                            <DeleteIcon width={12} height={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setManualCards(prev => [
                          ...prev,
                          { term: '', definition: '', tags: '' },
                        ])
                      }
                      className={styles.actionButton}
                      style={{ alignSelf: 'flex-start', height: '28px' }}
                    >
                      <PlusIcon width={12} height={12} />
                      <span>+ Thêm dòng thẻ</span>
                    </button>
                  </div>
                )}
              </div>

              {/* MODAL FOOTER */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '10px',
                }}
              >
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => setCreateSetModalOpen(false)}
                >
                  Hủy
                </button>

                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => handleCreateSet(false)}
                  title="Lưu học phần và giữ nguyên ở danh sách"
                >
                  Lưu vào Danh sách
                </button>

                <button
                  type="button"
                  className={styles.actionButton}
                  data-primary="true"
                  onClick={() => handleCreateSet(true)}
                  title="Lưu học phần và chuyển sang trang show card ở giữa để học ngay"
                >
                  <CardPanelIcon width={13} height={13} />
                  <span>Lưu & Học Ngay</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QUICK CREATE WORKSPACE MODAL (Folder, Tag, Collection) */}
        {quickCreateType && (
          <div
            className={styles.modalOverlay}
            onClick={() => setQuickCreateType(null)}
          >
            <div
              className={styles.modalContent}
              onClick={e => e.stopPropagation()}
            >
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  margin: 0,
                  color: cssVarV2('text/primary'),
                }}
              >
                {quickCreateType === 'folder' &&
                  'Tạo Thư mục mới trên Sidebar Organize'}
                {quickCreateType === 'tag' && 'Tạo Nhãn mới trên Sidebar Tags'}
                {quickCreateType === 'collection' &&
                  'Tạo Bộ sưu tập mới trên Sidebar Collections'}
              </h3>
              <input
                type="text"
                placeholder="Nhập tên..."
                value={quickCreateName}
                onChange={e => setQuickCreateName(e.target.value)}
                onKeyDown={e =>
                  e.key === 'Enter' && handleQuickCreateWorkspaceItem()
                }
                className={styles.controlInput}
                style={{ height: '32px' }}
                autoFocus
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
                  onClick={() => setQuickCreateType(null)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  data-primary="true"
                  onClick={handleQuickCreateWorkspaceItem}
                >
                  Tạo mới
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT STUDY SET MODAL */}
        {editSetModalOpen && editingSet && (
          <div
            className={styles.modalOverlay}
            onClick={() => setEditSetModalOpen(false)}
          >
            <div
              className={styles.modalContent}
              onClick={e => e.stopPropagation()}
            >
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  margin: 0,
                  color: cssVarV2('text/primary'),
                }}
              >
                Chỉnh sửa học phần & Mapping 4 loại
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tên học phần *</label>
                <input
                  type="text"
                  value={editSetTitle}
                  onChange={e => setEditSetTitle(e.target.value)}
                  className={styles.controlInput}
                  style={{ height: '32px' }}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mô tả</label>
                <input
                  type="text"
                  value={editSetDesc}
                  onChange={e => setEditSetDesc(e.target.value)}
                  className={styles.controlInput}
                  style={{ height: '32px' }}
                />
              </div>

              {/* Favorite toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: cssVarV2('layer/background/secondary'),
                }}
              >
                <input
                  type="checkbox"
                  id="editSetFav"
                  checked={editSetIsFav}
                  onChange={e => setEditSetIsFav(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label
                  htmlFor="editSetFav"
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <StarIcon
                    width={13}
                    height={13}
                    style={{ color: '#f59e0b' }}
                  />
                  <span>Yêu thích (Sidebar Favorites)</span>
                </label>
              </div>

              {/* Folder */}
              <div className={styles.formGroup}>
                <label
                  className={styles.formLabel}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <FolderIcon
                    width={12}
                    height={12}
                    style={{ color: '#3b82f6' }}
                  />
                  <span>Thư mục (Sidebar Organize)</span>
                </label>
                <input
                  type="text"
                  list="edit-folders"
                  placeholder="Chọn hoặc nhập Thư mục..."
                  value={editSetFolder}
                  onChange={e => setEditSetFolder(e.target.value)}
                  className={styles.controlInput}
                  style={{ height: '32px' }}
                />
                <datalist id="edit-folders">
                  {availableFolders.map(f => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </div>

              {/* Tags */}
              <div className={styles.formGroup}>
                <label
                  className={styles.formLabel}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <TagIcon
                    width={12}
                    height={12}
                    style={{ color: '#10b981' }}
                  />
                  <span>Nhãn (Sidebar Tags)</span>
                </label>
                <input
                  type="text"
                  value={editSetTags}
                  onChange={e => setEditSetTags(e.target.value)}
                  className={styles.controlInput}
                  style={{ height: '32px' }}
                />
              </div>

              {/* Collections */}
              <div className={styles.formGroup}>
                <label
                  className={styles.formLabel}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ViewLayersIcon
                    width={12}
                    height={12}
                    style={{ color: '#a855f7' }}
                  />
                  <span>Bộ sưu tập (Sidebar Collections)</span>
                </label>
                <input
                  type="text"
                  list="edit-collections"
                  value={editSetCollection}
                  onChange={e => setEditSetCollection(e.target.value)}
                  className={styles.controlInput}
                  style={{ height: '32px' }}
                />
                <datalist id="edit-collections">
                  {availableCollections.map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '8px',
                }}
              >
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => setEditSetModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className={styles.actionButton}
                  data-primary="true"
                  onClick={handleSaveEditSet}
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ==========================================
  // RENDER: LEVEL 2 (TRANG SHOW CARD Ở GIỮA ĐỂ HỌC)
  // Khi activeSetId !== null -> Hiển thị Flashcard to ở giữa và các chế độ học tập
  // ==========================================
  return (
    <>
      <ViewTitle
        title={`Quizlet · ${currentSet?.title || 'Chi Tiết Học Phần'}`}
      />
      <ViewIcon icon="quizlet" />
      <ViewHeader>
        <div className={styles.headerBar}>
          <div className={styles.breadcrumbBar}>
            {/* Back Button to Study Sets List Page */}
            <button
              type="button"
              onClick={() => setActiveSetId(null)}
              className={styles.actionButton}
              style={{
                height: '32px',
                padding: '0 12px',
                gap: '6px',
                fontWeight: 600,
                fontSize: '13.5px',
              }}
              title="Quay lại Trang Danh Sách Học Phần"
            >
              <ArrowLeftSmallIcon width={16} height={16} />
              <span>Danh sách học phần</span>
            </button>

            <span style={{ color: cssVarV2('text/disable'), fontSize: '15px' }}>
              /
            </span>

            <span
              style={{
                fontWeight: 700,
                fontSize: '15px',
                color: cssVarV2('text/primary'),
              }}
            >
              {currentSet?.title || 'Chi Tiết Học Phần'}
            </span>

            {/* Streak Pill */}
            <span
              className={styles.outlinePill}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                height: '28px',
                padding: '0 10px',
                fontSize: '13px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: '#f59e0b',
                borderColor: 'rgba(245, 158, 11, 0.25)',
              }}
              title={`Kỷ lục liên tục: ${streak.longestStreak} ngày`}
            >
              <FirePanelIcon
                width={15}
                height={15}
                style={{ color: '#f59e0b' }}
              />
              <span>{streak.currentStreak} ngày streak</span>
            </span>
          </div>

          {/* Right Toolbar Actions */}
          <div className={styles.toolbarGroup}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => setAddCardModalOpen(true)}
              title="Thêm thẻ từ vựng mới vào học phần hiện tại"
            >
              <PlusIcon width={15} height={15} />
              <span>Thêm thẻ</span>
            </button>

            {currentSet && (
              <>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => handleOpenEditSetModal(currentSet)}
                  title="Chỉnh sửa thông tin học phần & 4 cate"
                >
                  <EditIcon width={15} height={15} />
                  <span>Sửa học phần</span>
                </button>

                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => {
                    if (currentSet.cards.length > 0) {
                      const shuffled = [...currentSet.cards].sort(
                        () => Math.random() - 0.5
                      );
                      repo.updateSet(currentSet.id, { cards: shuffled });
                      refreshSets();
                      notify.success({ title: 'Đã xáo trộn thứ tự các thẻ' });
                    }
                  }}
                  title="Xáo trộn ngẫu nhiên thứ tự thẻ"
                >
                  <ResetIcon width={15} height={15} />
                  <span>Xáo trộn</span>
                </button>
              </>
            )}
          </div>
        </div>
      </ViewHeader>

      <ViewBody>
        <div className={styles.pageContainer}>
          {/* Study Mode Navigation Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 24px 8px',
              width: '100%',
              flexShrink: 0,
            }}
          >
            <div className={styles.viewSwitchGroup}>
              <button
                type="button"
                className={styles.viewSwitchBtn}
                data-active={activeTab === 'flashcards'}
                onClick={() => setActiveTab('flashcards')}
                title="Học thẻ lật 3D ở chính giữa màn hình"
              >
                <CardPanelIcon width={16} height={16} />
                <span>Flashcards</span>
              </button>
              <button
                type="button"
                className={styles.viewSwitchBtn}
                data-active={activeTab === 'learn'}
                onClick={() => setActiveTab('learn')}
                title="Học thích ứng Spaced Repetition"
              >
                <AiThinkingIcon width={16} height={16} />
                <span>Học thích ứng</span>
              </button>
              <button
                type="button"
                className={styles.viewSwitchBtn}
                data-active={activeTab === 'match'}
                onClick={() => setActiveTab('match')}
                title="Đấu trường ghép thẻ"
              >
                <TimePanelIcon width={16} height={16} />
                <span>Ghép thẻ</span>
              </button>
              <button
                type="button"
                className={styles.viewSwitchBtn}
                data-active={activeTab === 'qchat'}
                onClick={() => setActiveTab('qchat')}
                title="Gia sư AI Q-Chat"
              >
                <ChatWithAiIcon width={16} height={16} />
                <span>Gia sư Q-Chat</span>
              </button>
              <button
                type="button"
                className={styles.viewSwitchBtn}
                data-active={activeTab === 'list'}
                onClick={() => setActiveTab('list')}
                title="Bảng chi tiết các thẻ"
              >
                <DatabaseTableViewIcon width={16} height={16} />
                <span>Bảng thẻ ({currentSet?.cards.length || 0})</span>
              </button>
            </div>
          </div>

          <div className={styles.contentArea}>
            {currentSet && (
              <>
                {/* TAB 1: FLASHCARDS SHOW Ở CHÍNH GIỮA MÀN HÌNH */}
                {activeTab === 'flashcards' && (
                  <div className={styles.centerStage}>
                    <FlashcardPlayer
                      cards={currentSet.cards}
                      termLang={currentSet.termLanguage}
                      defLang={currentSet.definitionLanguage}
                      onStarToggle={cardId => {
                        repo.toggleCardStar(currentSet.id, cardId);
                        refreshSets();
                      }}
                    />
                  </div>
                )}

                {/* TAB 2: LEARN MODE */}
                {activeTab === 'learn' && (
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '720px',
                      margin: '0 auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div className={styles.shadcnCard}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '14px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: cssVarV2('text/secondary'),
                          }}
                        >
                          Học thích ứng Spaced Repetition (SuperMemo-2)
                        </span>
                        <span className={styles.outlinePill}>
                          Đã thành thạo:{' '}
                          {learnSession?.getStats().mastered || 0} /{' '}
                          {currentSet.cards.length}
                        </span>
                      </div>

                      {currentLearnQ ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                          }}
                        >
                          <div
                            style={{
                              padding: '16px',
                              borderRadius: '8px',
                              backgroundColor: cssVarV2(
                                'layer/background/secondary'
                              ),
                            }}
                          >
                            <span
                              style={{
                                fontSize: '11px',
                                color: cssVarV2('text/secondary'),
                                textTransform: 'uppercase',
                                fontWeight: 600,
                              }}
                            >
                              Định nghĩa (
                              {currentSet.definitionLanguage.toUpperCase()})
                            </span>
                            <p
                              style={{
                                fontSize: '18px',
                                fontWeight: 500,
                                margin: '6px 0 0 0',
                                color: cssVarV2('text/primary'),
                              }}
                            >
                              {currentLearnQ.card.definition}
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="Nhập thuật ngữ tiếng Anh tương ứng..."
                              value={learnInput}
                              onChange={e => setLearnInput(e.target.value)}
                              onKeyDown={e =>
                                e.key === 'Enter' && handleLearnSubmit()
                              }
                              className={styles.controlInput}
                              style={{
                                flex: 1,
                                height: '36px',
                                fontSize: '14px',
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleLearnSubmit}
                              className={styles.actionButton}
                              data-primary="true"
                              style={{ height: '36px', padding: '0 16px' }}
                            >
                              Kiểm tra
                            </button>
                          </div>

                          {learnFeedback && (
                            <div
                              style={{
                                padding: '10px 14px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: 500,
                                backgroundColor: learnFeedback.includes(
                                  'Chính xác'
                                )
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : 'rgba(239, 68, 68, 0.12)',
                                color: learnFeedback.includes('Chính xác')
                                  ? '#10b981'
                                  : '#ef4444',
                                border: `1px solid ${learnFeedback.includes('Chính xác') ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                              }}
                            >
                              {learnFeedback}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <h3
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              color: '#10b981',
                              fontSize: '18px',
                              margin: '0 0 10px 0',
                            }}
                          >
                            <CheckBoxCheckSolidIcon
                              width={20}
                              height={20}
                              style={{ color: '#10b981' }}
                            />
                            <span>
                              Chúc mừng! Bạn đã hoàn thành phiên học thích ứng!
                            </span>
                          </h3>
                          <p
                            style={{
                              color: cssVarV2('text/secondary'),
                              fontSize: '13px',
                              margin: '0 0 20px 0',
                            }}
                          >
                            Tất cả các thẻ trong học phần này đã được kiểm tra
                            và ghi nhớ.
                          </p>
                          <button
                            type="button"
                            onClick={initLearnMode}
                            className={styles.actionButton}
                            data-primary="true"
                            style={{ height: '32px' }}
                          >
                            Học lại từ đầu
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: MATCH GAME */}
                {activeTab === 'match' && (
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '750px',
                      margin: '10px auto 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        className={styles.outlinePill}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#f59e0b',
                          borderColor: 'rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        <TimePanelIcon width={13} height={13} />
                        <span>
                          Thời gian: {matchStats?.totalTime || 0}s (Phạt: +
                          {matchStats?.penaltySeconds || 0}s)
                        </span>
                      </span>
                      <span className={styles.outlinePill}>
                        Đã ghép: {matchStats?.matchedPairs || 0} /{' '}
                        {matchStats?.totalPairs || 0}
                      </span>
                      <button
                        type="button"
                        onClick={initMatchGame}
                        className={styles.actionButton}
                        style={{ height: '26px' }}
                      >
                        <ResetIcon width={12} height={12} />
                        <span>Chơi lại</span>
                      </button>
                    </div>

                    {matchStats?.isGameOver ? (
                      <div
                        className={styles.shadcnCard}
                        style={{ textAlign: 'center', padding: '36px' }}
                      >
                        <h3
                          style={{
                            fontSize: '20px',
                            fontWeight: 700,
                            margin: '0 0 8px 0',
                            color: '#10b981',
                          }}
                        >
                          Xuất sắc! Bạn đã ghép thành công tất cả các cặp thẻ!
                        </h3>
                        <p
                          style={{
                            color: cssVarV2('text/secondary'),
                            fontSize: '14px',
                            margin: '0 0 20px 0',
                          }}
                        >
                          Tổng thời gian: {matchStats.totalTime} giây
                        </p>
                        <button
                          type="button"
                          onClick={initMatchGame}
                          className={styles.actionButton}
                          data-primary="true"
                          style={{ height: '34px', margin: '0 auto' }}
                        >
                          Chơi ván mới
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fill, minmax(150px, 1fr))',
                          gap: '10px',
                        }}
                      >
                        {matchTiles.map(tile => (
                          <div
                            key={tile.id}
                            onClick={() => handleTileClick(tile.id)}
                            style={{
                              minHeight: '80px',
                              padding: '12px',
                              borderRadius: '8px',
                              border: `1.5px solid ${tile.isSelected ? '#3b82f6' : tile.isMatched ? 'rgba(16, 185, 129, 0.3)' : cssVarV2('layer/insideBorder/border')}`,
                              backgroundColor: tile.isSelected
                                ? 'rgba(59, 130, 246, 0.12)'
                                : tile.isMatched
                                  ? 'rgba(16, 185, 129, 0.08)'
                                  : cssVarV2('layer/background/secondary'),
                              color: tile.isMatched
                                ? cssVarV2('text/disable')
                                : cssVarV2('text/primary'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textAlign: 'center',
                              fontSize: '13px',
                              fontWeight: 500,
                              cursor: tile.isMatched ? 'default' : 'pointer',
                              visibility: tile.isMatched ? 'hidden' : 'visible',
                              transition: 'all 0.15s ease',
                              userSelect: 'none',
                            }}
                          >
                            {!tile.isMatched && tile.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: Q-CHAT AI */}
                {activeTab === 'qchat' && (
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '750px',
                      margin: '0 auto',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '480px',
                      gap: '12px',
                    }}
                  >
                    <div
                      className={styles.shadcnCard}
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        padding: '16px',
                      }}
                    >
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          style={{
                            alignSelf:
                              msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            fontSize: '13.5px',
                            lineHeight: 1.5,
                            backgroundColor:
                              msg.role === 'user'
                                ? cssVarV2('button/primary')
                                : cssVarV2('layer/background/secondary'),
                            color:
                              msg.role === 'user'
                                ? cssVarV2('button/pureWhiteText')
                                : cssVarV2('text/primary'),
                            border:
                              msg.role === 'user'
                                ? 'none'
                                : `1px solid ${cssVarV2('layer/insideBorder/border')}`,
                          }}
                        >
                          {msg.text}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Hỏi Q-Chat: Đặt câu ví dụ, kiểm tra từ vựng..."
                        value={userChatInput}
                        onChange={e => setUserChatInput(e.target.value)}
                        onKeyDown={e =>
                          e.key === 'Enter' && handleSendChat(userChatInput)
                        }
                        className={styles.controlInput}
                        style={{ flex: 1, height: '34px' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSendChat(userChatInput)}
                        className={styles.actionButton}
                        data-primary="true"
                        style={{ height: '34px', padding: '0 16px' }}
                      >
                        Gửi
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 5: BẢNG CHI TIẾT THẺ (CARDS TABLE) */}
                {activeTab === 'list' && (
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '1050px',
                      margin: '0 auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: cssVarV2('text/secondary'),
                        }}
                      >
                        Danh sách các thẻ trong học phần: {currentSet.title} (
                        {currentSet.cards.length} thẻ)
                      </span>
                      <button
                        type="button"
                        className={styles.actionButton}
                        data-primary="true"
                        onClick={() => setAddCardModalOpen(true)}
                        style={{ height: '28px' }}
                      >
                        <PlusIcon width={12} height={12} />
                        <span>+ Thêm thẻ mới</span>
                      </button>
                    </div>

                    <div className={styles.shadcnTableContainer}>
                      <table className={styles.shadcnTable}>
                        <thead className={styles.shadcnThead}>
                          <tr>
                            <th
                              className={styles.shadcnTh}
                              style={{ width: '40px', textAlign: 'center' }}
                            >
                              <StarIcon
                                width={13}
                                height={13}
                                style={{
                                  color: cssVarV2('text/secondary'),
                                  margin: '0 auto',
                                  display: 'block',
                                }}
                              />
                            </th>
                            <th
                              className={styles.shadcnTh}
                              style={{ width: '240px' }}
                            >
                              Thuật ngữ (Term)
                            </th>
                            <th className={styles.shadcnTh}>
                              Định nghĩa (Definition)
                            </th>
                            <th
                              className={styles.shadcnTh}
                              style={{ width: '150px' }}
                            >
                              Nhãn thẻ (Tags)
                            </th>
                            <th
                              className={styles.shadcnTh}
                              style={{ width: '100px', textAlign: 'right' }}
                            >
                              Thao tác
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCards.map(card => (
                            <tr key={card.id} className={styles.shadcnTr}>
                              {/* Star */}
                              <td
                                className={styles.shadcnTd}
                                style={{ textAlign: 'center' }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    repo.toggleCardStar(currentSet.id, card.id);
                                    refreshSets();
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'none',
                                    border: 'none',
                                    color: card.isStarred
                                      ? '#f59e0b'
                                      : cssVarV2('text/disable'),
                                    cursor: 'pointer',
                                    padding: '4px',
                                  }}
                                  title="Gắn sao ưu tiên"
                                >
                                  <StarIcon width={15} height={15} />
                                </button>
                              </td>

                              {/* Term */}
                              <td
                                className={styles.shadcnTd}
                                style={{ fontWeight: 600 }}
                              >
                                {card.term}
                              </td>

                              {/* Definition */}
                              <td
                                className={styles.shadcnTd}
                                style={{ color: cssVarV2('text/secondary') }}
                              >
                                {card.definition}
                              </td>

                              {/* Tags */}
                              <td className={styles.shadcnTd}>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: '4px',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  {card.tags && card.tags.length > 0 ? (
                                    card.tags.map(t => (
                                      <span key={t} className={styles.tagChip}>
                                        <TagIcon width={9} height={9} />
                                        <span>{t}</span>
                                      </span>
                                    ))
                                  ) : (
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        color: cssVarV2('text/disable'),
                                      }}
                                    >
                                      —
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td
                                className={styles.shadcnTd}
                                style={{ textAlign: 'right' }}
                              >
                                <div
                                  style={{ display: 'inline-flex', gap: '4px' }}
                                >
                                  {/* Phát âm */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      TtsSpeechService.speak(
                                        card.term,
                                        currentSet.termLanguage
                                      ).catch(() => {});
                                    }}
                                    className={styles.actionButton}
                                    style={{
                                      height: '24px',
                                      width: '24px',
                                      padding: 0,
                                    }}
                                    title="Phát âm (TTS)"
                                  >
                                    <VolumePanelIcon width={13} height={13} />
                                  </button>

                                  {/* Sửa thẻ */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenEditCardModal(card)
                                    }
                                    className={styles.actionButton}
                                    style={{
                                      height: '24px',
                                      width: '24px',
                                      padding: 0,
                                    }}
                                    title="Chỉnh sửa thẻ"
                                  >
                                    <EditIcon width={12} height={12} />
                                  </button>

                                  {/* Xóa thẻ */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCard(card.id)}
                                    className={styles.actionButton}
                                    style={{
                                      height: '24px',
                                      width: '24px',
                                      padding: 0,
                                      color: '#ef4444',
                                    }}
                                    title="Xóa thẻ"
                                  >
                                    <DeleteIcon width={12} height={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </ViewBody>

      {/* MODAL: THÊM THẺ MỚI VÀO HỌC PHẦN HIỆN TẠI */}
      {addCardModalOpen && currentSet && (
        <div
          className={styles.modalOverlay}
          onClick={() => setAddCardModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={e => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                margin: 0,
                color: cssVarV2('text/primary'),
              }}
            >
              Thêm thẻ mới vào &ldquo;{currentSet.title}&rdquo;
            </h3>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Thuật ngữ (Term) *</label>
              <input
                type="text"
                placeholder="VD: Serendipity"
                value={newCardTerm}
                onChange={e => setNewCardTerm(e.target.value)}
                className={styles.controlInput}
                style={{ height: '32px' }}
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Định nghĩa (Definition) *
              </label>
              <input
                type="text"
                placeholder="VD: Sự may mắn tình cờ tìm thấy điều tốt đẹp"
                value={newCardDef}
                onChange={e => setNewCardDef(e.target.value)}
                className={styles.controlInput}
                style={{ height: '32px' }}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Nhãn thẻ (Tags - cách nhau bởi dấu phẩy)
              </label>
              <input
                type="text"
                placeholder="VD: IELTS, Vocabulary, Speaking"
                value={newCardTags}
                onChange={e => setNewCardTags(e.target.value)}
                className={styles.controlInput}
                style={{ height: '32px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="newCardStar"
                checked={newCardStarred}
                onChange={e => setNewCardStarred(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label
                htmlFor="newCardStar"
                style={{ fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
              >
                Đánh dấu sao ưu tiên học
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '8px',
              }}
            >
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => setAddCardModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.actionButton}
                data-primary="true"
                onClick={handleAddCard}
              >
                Thêm thẻ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SỬA THẺ */}
      {editCardModalOpen && editingCard && currentSet && (
        <div
          className={styles.modalOverlay}
          onClick={() => setEditCardModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={e => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                margin: 0,
                color: cssVarV2('text/primary'),
              }}
            >
              Chỉnh sửa thẻ từ vựng
            </h3>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Thuật ngữ (Term) *</label>
              <input
                type="text"
                value={editCardTerm}
                onChange={e => setEditCardTerm(e.target.value)}
                className={styles.controlInput}
                style={{ height: '32px' }}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Định nghĩa (Definition) *
              </label>
              <input
                type="text"
                value={editCardDef}
                onChange={e => setEditCardDef(e.target.value)}
                className={styles.controlInput}
                style={{ height: '32px' }}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nhãn thẻ (Tags)</label>
              <input
                type="text"
                value={editCardTags}
                onChange={e => setEditCardTags(e.target.value)}
                className={styles.controlInput}
                style={{ height: '32px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="editCardStar"
                checked={editCardStarred}
                onChange={e => setEditCardStarred(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label
                htmlFor="editCardStar"
                style={{ fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
              >
                Đánh dấu sao ưu tiên học
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '8px',
              }}
            >
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => setEditCardModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.actionButton}
                data-primary="true"
                onClick={handleSaveEditCard}
              >
                Lưu thẻ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SỬA HỌC PHẦN */}
      {editSetModalOpen && editingSet && (
        <div
          className={styles.modalOverlay}
          onClick={() => setEditSetModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={e => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                margin: 0,
                color: cssVarV2('text/primary'),
              }}
            >
              Chỉnh sửa học phần & Mapping 4 loại
            </h3>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Tên học phần *</label>
              <input
                type="text"
                value={editSetTitle}
                onChange={e => setEditSetTitle(e.target.value)}
                className={styles.controlInput}
                style={{ height: '32px' }}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Mô tả</label>
              <input
                type="text"
                value={editSetDesc}
                onChange={e => setEditSetDesc(e.target.value)}
                className={styles.controlInput}
                style={{ height: '32px' }}
              />
            </div>

            {/* Favorite toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: cssVarV2('layer/background/secondary'),
              }}
            >
              <input
                type="checkbox"
                id="editSetFavDetail"
                checked={editSetIsFav}
                onChange={e => setEditSetIsFav(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label
                htmlFor="editSetFavDetail"
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <StarIcon width={13} height={13} style={{ color: '#f59e0b' }} />
                <span>Yêu thích (Sidebar Favorites)</span>
              </label>
            </div>

            {/* Folder */}
            <div className={styles.formGroup}>
              <label
                className={styles.formLabel}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FolderIcon
                  width={12}
                  height={12}
                  style={{ color: '#3b82f6' }}
                />
                <span>Thư mục (Sidebar Organize)</span>
              </label>
              <input
                type="text"
                list="edit-folders-detail"
                value={editSetFolder}
                onChange={e => setEditSetFolder(e.target.value)}
                className={styles.controlInput}
                style={{ height: '32px' }}
              />
              <datalist id="edit-folders-detail">
                {availableFolders.map(f => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>

            {/* Tags */}
            <div className={styles.formGroup}>
              <label
                className={styles.formLabel}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <TagIcon width={12} height={12} style={{ color: '#10b981' }} />
                <span>Nhãn (Sidebar Tags)</span>
              </label>
              <input
                type="text"
                value={editSetTags}
                onChange={e => setEditSetTags(e.target.value)}
                className={styles.controlInput}
                style={{ height: '32px' }}
              />
            </div>

            {/* Collections */}
            <div className={styles.formGroup}>
              <label
                className={styles.formLabel}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <ViewLayersIcon
                  width={12}
                  height={12}
                  style={{ color: '#a855f7' }}
                />
                <span>Bộ sưu tập (Sidebar Collections)</span>
              </label>
              <input
                type="text"
                list="edit-collections-detail"
                value={editSetCollection}
                onChange={e => setEditSetCollection(e.target.value)}
                className={styles.controlInput}
                style={{ height: '32px' }}
              />
              <datalist id="edit-collections-detail">
                {availableCollections.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '8px',
              }}
            >
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => setEditSetModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.actionButton}
                data-primary="true"
                onClick={handleSaveEditSet}
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const Component = QuizletWorkspacePage;
