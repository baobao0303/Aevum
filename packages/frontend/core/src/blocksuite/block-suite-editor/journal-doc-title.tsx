import { HrmRentScheduleSection } from '@affine/core/desktop/pages/workspace/journals/hrm-rent-schedule-panel';
import { JournalService } from '@affine/core/modules/journal';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { i18nTime, useI18n } from '@affine/i18n';
import type { Store } from '@blocksuite/affine/store';
import { useLiveData, useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import { useCallback } from 'react';

import * as styles from './styles.css';

export const BlocksuiteEditorJournalDocTitle = ({ page }: { page: Store }) => {
  const journalService = useService(JournalService);
  const workbench = useService(WorkbenchService).workbench;
  const journalDateStr = useLiveData(journalService.journalDate$(page.id));

  const handleSelectDate = useCallback(
    (targetDate: string) => {
      const docs = journalService.journalsByDate$(targetDate).value;
      if (docs.length > 0) {
        workbench.openDoc(docs[0].id, { at: 'active' });
      } else {
        workbench.open(`/journals?date=${targetDate}`, { at: 'active' });
      }
    },
    [journalService, workbench]
  );

  return (
    <>
      <BlocksuiteEditorJournalDocTitleUI date={journalDateStr} />
      {journalDateStr ? (
        <div className="doc-title-container" style={{ paddingTop: 0 }}>
          <HrmRentScheduleSection
            dateString={journalDateStr}
            onSelectDate={handleSelectDate}
          />
        </div>
      ) : null}
    </>
  );
};

export const BlocksuiteEditorJournalDocTitleUI = ({
  date: dateStr,
  overrideClassName,
}: {
  date?: string;
  /**
   * The `doc-title-container` class style is defined in editor,
   * which means if we use this component outside editor, the style will not work,
   * so we provide a className to override
   */
  overrideClassName?: string;
}) => {
  const localizedJournalDate = i18nTime(dateStr, {
    absolute: { accuracy: 'day' },
  });
  const t = useI18n();

  // TODO(catsjuice): i18n
  const today = dayjs();
  const date = dayjs(dateStr);
  const day = dayjs(date).format('dddd') ?? null;
  const isToday = date.isSame(today, 'day');

  return (
    <div
      className={overrideClassName ?? 'doc-title-container'}
      data-testid="journal-title"
    >
      <span data-testid="date">{localizedJournalDate}</span>
      {isToday ? (
        <span className={styles.titleTodayTag} data-testid="date-today-label">
          {t['com.affine.today']()}
        </span>
      ) : (
        <span className={styles.titleDayTag}>{day}</span>
      )}
    </div>
  );
};
