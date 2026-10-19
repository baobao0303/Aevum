import { MenuLinkItem } from '@affine/core/modules/app-sidebar/views';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { CardPanelIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';

export const AppSidebarQuizletButton = () => {
  const workbench = useService(WorkbenchService).workbench;
  const location = useLiveData(workbench.location$);
  const isActive = location.pathname.startsWith('/quizlet');

  return (
    <MenuLinkItem
      data-testid="slider-bar-quizlet-button"
      active={isActive}
      to={'/quizlet'}
      icon={<CardPanelIcon />}
    >
      <span>Quizlet</span>
    </MenuLinkItem>
  );
};
