import { MenuLinkItem } from '@affine/core/modules/app-sidebar/views';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { AiThinkingIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';

export const AppSidebarSkillsButton = () => {
  const workbench = useService(WorkbenchService).workbench;
  const location = useLiveData(workbench.location$);
  const isActive = location.pathname.startsWith('/skills');

  return (
    <MenuLinkItem
      data-testid="slider-bar-skills-button"
      active={isActive}
      to={'/skills'}
      icon={<AiThinkingIcon />}
    >
      <span>Skills</span>
    </MenuLinkItem>
  );
};
