import { IconButton } from '@affine/component';
import { NavigationPanelService } from '@affine/core/modules/navigation-panel';
import { TagService } from '@affine/core/modules/tag';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { AddTagIcon } from '@blocksuite/icons/rc';
import { useLiveData, useServices } from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CollapsibleSection } from '../../layouts/collapsible-section';
import { NavigationPanelTagNode } from '../../nodes/tag';
import { NavigationPanelTreeRoot } from '../../tree';
import { RootEmpty } from './empty';
import * as styles from './styles.css';

export const NavigationPanelTags = () => {
  const { tagService, navigationPanelService } = useServices({
    TagService,
    NavigationPanelService,
  });
  const path = useMemo(() => ['tags'], []);
  const collapsed = useLiveData(navigationPanelService.collapsed$(path));
  const [newTagId, setNewTagId] = useState<string | null>(null);
  const tags = useLiveData(tagService.tagList.tags$);

  const t = useI18n();

  const handleCreateTag = useCallback(() => {
    const defaultName =
      t['com.affine.rootAppSidebar.tags.new-tag']() || 'New tag';
    const newTag = tagService.tagList.createTag(
      defaultName,
      tagService.randomTagColor()
    );
    track.$.navigationPanel.organize.createOrganizeItem({ type: 'tag' });
    setNewTagId(newTag.id);
    navigationPanelService.setCollapsed(path, false);
  }, [navigationPanelService, path, t, tagService]);

  useEffect(() => {
    if (collapsed) setNewTagId(null);
  }, [collapsed]);

  return (
    <CollapsibleSection
      path={path}
      testId="navigation-panel-tags"
      headerClassName={styles.draggedOverHighlight}
      title={t['com.affine.rootAppSidebar.tags']()}
      actions={
        <div className={styles.iconContainer}>
          <IconButton
            data-testid="navigation-panel-bar-add-tag-button"
            onClick={handleCreateTag}
            size="16"
            tooltip={t[
              'com.affine.rootAppSidebar.explorer.tag-section-add-tooltip'
            ]()}
          >
            <AddTagIcon />
          </IconButton>
        </div>
      }
    >
      <NavigationPanelTreeRoot placeholder={<RootEmpty />}>
        {tags.map(tag => (
          <NavigationPanelTagNode
            key={tag.id}
            tagId={tag.id}
            defaultRenaming={tag.id === newTagId}
            reorderable={false}
            location={{
              at: 'navigation-panel:tags:list',
            }}
            parentPath={path}
          />
        ))}
      </NavigationPanelTreeRoot>
    </CollapsibleSection>
  );
};
