import { Button, Modal, notify } from '@affine/component';
import {
  DateTimeIcon,
  DualLinkIcon,
  MultiPeopleIcon,
  PinIcon,
  ResetIcon,
  SettingsIcon,
  TodayIcon,
  UserIcon,
} from '@blocksuite/icons/rc';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

import * as styles from './hrm-rent-schedule-panel.css';

export interface HrmRentScheduleConfig {
  baseUrl: string;
  token: string;
  mode: 'related' | 'creator' | 'participant' | 'all';
  filterKeyword: string;
  customEndpoint: string;
}

export interface HrmScheduleItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  resourceName: string;
  ownerName: string;
  description?: string;
  status: string;
  role: 'creator' | 'participant' | 'related';
  members?: Array<{
    fullName?: string;
    email?: string;
    avatarUrl?: string;
  }>;
}

const STORAGE_KEY = 'aevum_hrm_rent_schedule_config_v1';
const CACHE_KEY = 'aevum_hrm_rent_schedule_cache_v1';
const CONFIG_EVENT = 'aevum:hrm-rent-schedule-config-changed';
const UPDATE_EVENT = 'aevum:hrm-rent-schedule-updated';
const DEFAULT_HRM_URL = '';

export interface HrmRentScheduleCache {
  items: HrmScheduleItem[];
  userProfile?: {
    fullName?: string;
    email?: string;
  } | null;
  fetchedAt: number;
  from: string;
  to: string;
}

let inMemoryCache: HrmRentScheduleCache | null = null;
let inflightPreloadPromise: Promise<HrmScheduleItem[] | null> | null = null;

export function loadHrmCache(): HrmRentScheduleCache | null {
  if (inMemoryCache) return inMemoryCache;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HrmRentScheduleCache;
    if (parsed && Array.isArray(parsed.items)) {
      inMemoryCache = parsed;
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveHrmCache(
  items: HrmScheduleItem[],
  userProfile: { fullName?: string; email?: string } | null | undefined,
  from: string,
  to: string
): HrmRentScheduleCache {
  const cache: HrmRentScheduleCache = {
    items,
    userProfile: userProfile ?? null,
    fetchedAt: Date.now(),
    from,
    to,
  };
  inMemoryCache = cache;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: cache }));
    } catch {
      // ignore
    }
  }
  return cache;
}

export async function preloadHrmRentSchedule(
  force = false
): Promise<HrmScheduleItem[] | null> {
  if (typeof window === 'undefined') return null;

  const currentConfig = loadHrmConfig();
  const hasConfig = Boolean(
    (currentConfig.baseUrl.trim() && currentConfig.token.trim()) ||
    currentConfig.customEndpoint.trim()
  );
  if (!hasConfig) return null;

  const cached = loadHrmCache();
  const now = Date.now();
  // Return immediately if cache is fresh (< 90 seconds) and not forced
  if (!force && cached && now - cached.fetchedAt < 90_000) {
    return cached.items;
  }

  // Deduplicate ongoing request
  if (inflightPreloadPromise) {
    return inflightPreloadPromise;
  }

  inflightPreloadPromise = (async () => {
    try {
      const center = dayjs();
      const from = center.subtract(30, 'day').format('YYYY-MM-DD');
      const to = center.add(60, 'day').format('YYYY-MM-DD');

      const res = await fetch('/api/auth/open-app/hrm-rent-schedule', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...currentConfig,
          from,
          to,
        }),
      });

      const body = (await res.json()) as {
        ok?: boolean;
        items?: HrmScheduleItem[];
        userProfile?: { fullName?: string; email?: string } | null;
        error?: string;
      };

      if (body.ok && Array.isArray(body.items)) {
        saveHrmCache(body.items, body.userProfile, from, to);
        return body.items;
      }
      return null;
    } catch (err) {
      console.warn('[HrmRentSchedule] Preload error:', err);
      return null;
    } finally {
      inflightPreloadPromise = null;
    }
  })();

  return inflightPreloadPromise;
}

// Auto-trigger idle background preload when JS module is evaluated in browser
if (typeof window !== 'undefined') {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => {
      preloadHrmRentSchedule().catch(() => {});
    });
  } else {
    setTimeout(() => {
      preloadHrmRentSchedule().catch(() => {});
    }, 500);
  }
}

export function loadHrmConfig(): HrmRentScheduleConfig {
  if (typeof window === 'undefined') {
    return {
      baseUrl: DEFAULT_HRM_URL,
      token: '',
      mode: 'related',
      filterKeyword: '',
      customEndpoint: '',
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        baseUrl: DEFAULT_HRM_URL,
        token: '',
        mode: 'related',
        filterKeyword: '',
        customEndpoint: '',
      };
    }
    const parsed = JSON.parse(raw) as Partial<HrmRentScheduleConfig> & {
      bearerToken?: string;
    };
    return {
      baseUrl: parsed.baseUrl || DEFAULT_HRM_URL,
      token: parsed.token || parsed.bearerToken || '',
      mode: parsed.mode || 'related',
      filterKeyword: parsed.filterKeyword || '',
      customEndpoint: parsed.customEndpoint || '',
    };
  } catch {
    return {
      baseUrl: DEFAULT_HRM_URL,
      token: '',
      mode: 'related',
      filterKeyword: '',
      customEndpoint: '',
    };
  }
}

export function saveHrmConfig(config: HrmRentScheduleConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent(CONFIG_EVENT));
}

export const HrmScheduleConfigModal = ({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) => {
  const [form, setForm] = useState<HrmRentScheduleConfig>(() =>
    loadHrmConfig()
  );
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(loadHrmConfig());
    }
  }, [open]);

  const handleSave = useCallback(async () => {
    setTesting(true);
    try {
      saveHrmConfig(form);
      const from = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
      const to = dayjs().add(60, 'day').format('YYYY-MM-DD');
      const res = await fetch('/api/auth/open-app/hrm-rent-schedule', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...form,
          from,
          to,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        totalCount?: number;
        items?: HrmScheduleItem[];
        userProfile?: { fullName?: string; email?: string } | null;
        error?: string;
      };
      if (data.ok) {
        if (Array.isArray(data.items)) {
          saveHrmCache(data.items, data.userProfile, from, to);
        }
        notify.success({
          title: 'Đã lưu cấu hình API Lịch',
          message: `Đồng bộ thành công ${data.totalCount ?? 0} lịch liên quan tới bạn.`,
        });
        onOpenChange(false);
        onSaved?.();
      } else {
        notify.warning({
          title: 'Đã lưu cấu hình (Chưa lấy được dữ liệu)',
          message:
            data.error ||
            'Kiểm tra lại URL hoặc Bearer Token hệ thống lịch của bạn.',
        });
        onOpenChange(false);
        onSaved?.();
      }
    } catch (err) {
      notify.error({
        title: 'Lỗi kết nối API Lịch',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTesting(false);
    }
  }, [form, onOpenChange, onSaved]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      width={500}
      contentOptions={{
        style: {
          padding: '24px',
          borderRadius: '12px',
          overscrollBehavior: 'contain',
        },
      }}
    >
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            Cấu hình API Lịch (Rent Schedule)
          </div>
          <div className={styles.modalDescription}>
            Thông tin URL và Token chỉ lưu cục bộ trên trình duyệt của bạn
            (LocalStorage), không lưu cứng trong mã nguồn.
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Schedule URL / API Root</label>
          <input
            type="text"
            value={form.baseUrl}
            onChange={e =>
              setForm(prev => ({ ...prev, baseUrl: e.target.value }))
            }
            placeholder="https://your-portal.example.com/#/property-management/rent-schedule"
            className={styles.fieldControl}
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Bearer Token (Authorization)
          </label>
          <textarea
            rows={3}
            value={form.token}
            onChange={e =>
              setForm(prev => ({ ...prev, token: e.target.value }))
            }
            placeholder="Dán Bearer Token (eyJ...) lấy từ DevTools (F12) -> Network / LocalStorage"
            className={styles.fieldTextarea}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Phạm vi lịch hiển thị</label>
            <select
              value={form.mode}
              onChange={e =>
                setForm(prev => ({
                  ...prev,
                  mode: e.target.value as HrmRentScheduleConfig['mode'],
                }))
              }
              className={styles.fieldControl}
            >
              <option value="related">
                Liên quan tới tôi (Tôi đặt + Tham gia)
              </option>
              <option value="creator">Chỉ lịch do tôi tạo</option>
              <option value="participant">Chỉ lịch tôi được mời</option>
              <option value="all">Tất cả lịch tài sản</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Lọc theo Tên / Từ khóa</label>
            <input
              type="text"
              value={form.filterKeyword}
              onChange={e =>
                setForm(prev => ({ ...prev, filterKeyword: e.target.value }))
              }
              placeholder="VD: Phòng họp, tên thành viên..."
              className={styles.fieldControl}
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>
            Custom Endpoint (Tùy chọn)
          </label>
          <input
            type="text"
            value={form.customEndpoint}
            onChange={e =>
              setForm(prev => ({ ...prev, customEndpoint: e.target.value }))
            }
            placeholder="Để trống để dùng chuẩn Resource Ticket API"
            className={styles.fieldControl}
          />
        </div>

        <div className={styles.modalFooter}>
          <Button
            variant="secondary"
            onClick={() => {
              const cleared: HrmRentScheduleConfig = {
                baseUrl: DEFAULT_HRM_URL,
                token: '',
                mode: 'related',
                filterKeyword: '',
                customEndpoint: '',
              };
              setForm(cleared);
              saveHrmConfig(cleared);
              notify.success({ title: 'Đã xóa cấu hình API Lịch' });
            }}
          >
            Xóa cấu hình
          </Button>
          <div className={styles.modalFooterRight}>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                handleSave().catch(console.error);
              }}
              disabled={testing}
            >
              {testing ? 'Đang kiểm tra...' : 'Lưu & Đồng bộ'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const HrmRentScheduleSection = ({
  dateString,
  onSelectDate,
}: {
  dateString: string;
  onSelectDate?: (date: string) => void;
}) => {
  const [config, setConfig] = useState<HrmRentScheduleConfig>(() =>
    loadHrmConfig()
  );
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Synchronously seed initial state from cache for 0ms instantaneous render
  const initialCache = useMemo(() => loadHrmCache(), []);
  const [items, setItems] = useState<HrmScheduleItem[]>(
    () => initialCache?.items ?? []
  );
  const [userProfile, setUserProfile] = useState<{
    fullName?: string;
    email?: string;
  } | null>(() => initialCache?.userProfile ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewScope, setViewScope] = useState<'day' | 'range'>('day');

  useEffect(() => {
    const syncConfig = () => setConfig(loadHrmConfig());
    window.addEventListener(CONFIG_EVENT, syncConfig);
    return () => window.removeEventListener(CONFIG_EVENT, syncConfig);
  }, []);

  // Listen to background preload or other tabs updating the cache
  useEffect(() => {
    const handleCacheUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<HrmRentScheduleCache>;
      if (customEvent.detail && Array.isArray(customEvent.detail.items)) {
        setItems(customEvent.detail.items);
        if (customEvent.detail.userProfile !== undefined) {
          setUserProfile(customEvent.detail.userProfile);
        }
      }
    };
    window.addEventListener(UPDATE_EVENT, handleCacheUpdate);
    return () => window.removeEventListener(UPDATE_EVENT, handleCacheUpdate);
  }, []);

  const hasConfigured = Boolean(
    (config.baseUrl.trim() && config.token.trim()) ||
    config.customEndpoint.trim()
  );

  const fetchSchedules = useCallback(
    async (isManualRefresh = false) => {
      const current = loadHrmConfig();
      if (
        (!current.baseUrl.trim() || !current.token.trim()) &&
        !current.customEndpoint.trim()
      ) {
        setItems([]);
        setError(null);
        return;
      }
      if (isManualRefresh || items.length === 0) {
        setLoading(true);
      }
      setError(null);
      try {
        const fetched = await preloadHrmRentSchedule(isManualRefresh);
        if (fetched) {
          setItems(fetched);
          const cache = loadHrmCache();
          if (cache?.userProfile) {
            setUserProfile(cache.userProfile);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [items.length]
  );

  // Background silent revalidation on mount (Stale-While-Revalidate)
  useEffect(() => {
    if (!hasConfigured) return;
    const cache = loadHrmCache();
    const isStale = !cache || Date.now() - cache.fetchedAt > 60_000;
    if (isStale || items.length === 0) {
      fetchSchedules(false).catch(console.error);
    }
  }, [hasConfigured, config, fetchSchedules, items.length]);

  const dayItems = useMemo(() => {
    const targetDay = dayjs(dateString);
    return items.filter(item => {
      if (!item.startTime) return false;
      const start = dayjs(item.startTime);
      const end = item.endTime ? dayjs(item.endTime) : start;
      return (
        start.isSame(targetDay, 'day') ||
        end.isSame(targetDay, 'day') ||
        (start.isBefore(targetDay, 'day') && end.isAfter(targetDay, 'day'))
      );
    });
  }, [dateString, items]);

  const displayedItems = viewScope === 'day' ? dayItems : items;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIconBox}>
            <TodayIcon width={16} height={16} />
          </div>
          <div className={styles.headerTitleWrap}>
            <div className={styles.headerTitleRow}>
              <span className={styles.headerTitle}>
                Lịch liên quan tới tôi (Rent Schedule)
              </span>
              {userProfile?.fullName ? (
                <span className={styles.userBadge}>
                  <UserIcon width={12} height={12} />
                  {userProfile.fullName}
                </span>
              ) : null}
            </div>
            <div className={styles.headerSubtext}>
              <span>Đồng bộ lịch đặt phòng họp & tài sản cá nhân</span>
              {config.baseUrl ? (
                <>
                  <span>·</span>
                  <a
                    href={config.baseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.sourceLink}
                  >
                    Mở trang lịch
                    <DualLinkIcon width={12} height={12} />
                  </a>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.toolbar}>
          {hasConfigured && (
            <>
              <div className={styles.tabsList} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewScope === 'day'}
                  data-state={viewScope === 'day' ? 'active' : 'inactive'}
                  className={styles.tabsTrigger}
                  onClick={() => setViewScope('day')}
                >
                  Ngày {dayjs(dateString).format('DD/MM')} ({dayItems.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewScope === 'range'}
                  data-state={viewScope === 'range' ? 'active' : 'inactive'}
                  className={styles.tabsTrigger}
                  onClick={() => setViewScope('range')}
                >
                  Tất cả ({items.length})
                </button>
              </div>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => {
                  fetchSchedules(true).catch(console.error);
                }}
                disabled={loading}
              >
                <span className={styles.buttonIcon}>
                  <ResetIcon width={14} height={14} />
                </span>
                <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
              </button>
            </>
          )}
          <button
            type="button"
            data-variant={hasConfigured ? 'secondary' : 'primary'}
            className={styles.actionButton}
            onClick={() => setConfigModalOpen(true)}
            data-testid="hrm-schedule-config-button"
          >
            <span className={styles.buttonIcon}>
              <SettingsIcon width={14} height={14} />
            </span>
            <span>{hasConfigured ? 'Config API' : 'Setup API Lịch'}</span>
          </button>
        </div>
      </div>

      {!hasConfigured ? (
        <div className={styles.emptyBox}>
          <span>
            Chưa cấu hình kết nối <strong>Rent Schedule API</strong>. Bấm{' '}
            <strong>Setup API Lịch</strong> để nhập URL và Bearer Token của bạn.
          </span>
        </div>
      ) : error ? (
        <div className={styles.errorBox}>
          <span>Không tải được lịch: {error}</span>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => setConfigModalOpen(true)}
          >
            Cập nhật Config
          </button>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className={styles.emptyBox}>
          <span>
            {loading
              ? 'Đang đồng bộ dữ liệu lịch...'
              : viewScope === 'day'
                ? `Không có lịch thuê tài sản / cuộc họp nào liên quan tới bạn trong ngày ${dayjs(dateString).format('DD/MM/YYYY')}.`
                : 'Không có lịch nào trong khoảng 30 ngày gần đây.'}
          </span>
          {viewScope === 'day' && items.length > 0 ? (
            <button
              type="button"
              onClick={() => setViewScope('range')}
              className={styles.textLinkButton}
            >
              Xem {items.length} lịch ở các ngày khác
            </button>
          ) : null}
        </div>
      ) : (
        <div className={styles.listScroller}>
          {displayedItems.map(item => {
            const start = item.startTime ? dayjs(item.startTime) : null;
            const end = item.endTime ? dayjs(item.endTime) : null;
            const timeLabel =
              start && end
                ? `${start.format('HH:mm')} - ${end.format('HH:mm')}`
                : start
                  ? start.format('HH:mm')
                  : '--:--';
            const dateLabel = start ? start.format('DD/MM/YYYY') : '';
            const roleLabel =
              item.role === 'creator'
                ? 'Tôi đặt lịch'
                : item.role === 'participant'
                  ? 'Người tham gia'
                  : 'Liên quan';
            const clickable = Boolean(start && onSelectDate);

            return (
              <div
                key={item.id}
                data-clickable={clickable}
                className={styles.itemRow}
                onClick={() => {
                  if (start && onSelectDate) {
                    onSelectDate(start.format('YYYY-MM-DD'));
                    setViewScope('day');
                  }
                }}
              >
                <div className={styles.itemMain}>
                  <div className={styles.itemTopLine}>
                    <span className={styles.timeBadge}>
                      <span className={styles.metaIcon}>
                        <DateTimeIcon width={13} height={13} />
                      </span>
                      <span>
                        {viewScope === 'range' && dateLabel
                          ? `${dateLabel} · ${timeLabel}`
                          : timeLabel}
                      </span>
                    </span>
                    <span className={styles.roleBadge}>{roleLabel}</span>
                    <span className={styles.itemTitle}>{item.title}</span>
                  </div>

                  <div className={styles.metaRow}>
                    {item.resourceName ? (
                      <span className={styles.metaItem}>
                        <span className={styles.metaIcon}>
                          <PinIcon width={14} height={14} />
                        </span>
                        <span>{item.resourceName}</span>
                      </span>
                    ) : null}
                    {item.ownerName ? (
                      <span className={styles.metaItem}>
                        <span className={styles.metaIcon}>
                          <UserIcon width={14} height={14} />
                        </span>
                        <span>Người tạo: {item.ownerName}</span>
                      </span>
                    ) : null}
                    {item.members && item.members.length > 0 ? (
                      <span className={styles.metaItem}>
                        <span className={styles.metaIcon}>
                          <MultiPeopleIcon width={14} height={14} />
                        </span>
                        <span>{item.members.length} thành viên</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className={styles.statusBadge}>
                  <span
                    className={styles.statusDot}
                    data-status={item.status}
                  />
                  <span>{item.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <HrmScheduleConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        onSaved={() => {
          fetchSchedules(true).catch(console.error);
        }}
      />
    </div>
  );
};
