import { MenuLinkItem } from '@affine/core/modules/app-sidebar/views';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { DatabaseKanbanViewIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';

export const AppSidebarKanbanButton = () => {
  const workbench = useService(WorkbenchService).workbench;
  const location = useLiveData(workbench.location$);
  const isActive = location.pathname.startsWith('/kanban');

  return (
    <MenuLinkItem
      data-testid="slider-bar-kanban-button"
      active={isActive}
      to={'/kanban'}
      icon={<DatabaseKanbanViewIcon />}
    >
      <span>Kanban</span>
    </MenuLinkItem>
  );
};
