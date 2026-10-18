import {
  Avatar,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  type MenuProps,
} from '@affine/component';
import {
  type AuthAccountInfo,
  AuthService,
  ServerService,
} from '@affine/core/modules/cloud';
import {
  GlobalDialogService,
  WorkspaceDialogService,
} from '@affine/core/modules/dialogs';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { AccountIcon, SettingsIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback } from 'react';

import { Account } from './account';
import { AccountMenu } from './account-menu';
import { AIUsage } from './ai-usage';
import { CloudUsage } from './cloud-usage';
import * as styles from './index.css';
import { TeamList } from './team-list';
import { UnknownUserIcon } from './unknow-user';

export default function UserInfo() {
  const session = useService(AuthService).session;
  const account = useLiveData(session.account$);
  return account ? (
    <AuthorizedUserInfo account={account} />
  ) : (
    <UnauthorizedUserInfo />
  );
}

const menuContentOptions: MenuProps['contentOptions'] = {
  className: styles.operationMenu,
};
const AuthorizedUserInfo = ({ account }: { account: AuthAccountInfo }) => {
  return (
    <Menu items={<OperationMenu />} contentOptions={menuContentOptions}>
      <IconButton
        data-testid="sidebar-user-avatar"
        variant="plain"
        size="20"
        style={{ padding: 0 }}
        withoutHover
      >
        <Avatar size={20} name={account.label} url={account.avatar} />
      </IconButton>
    </Menu>
  );
};

const UnauthorizedUserInfo = () => {
  const globalDialogService = useService(GlobalDialogService);
  const workspaceDialogService = useService(WorkspaceDialogService);
  const t = useI18n();

  const openSignInModal = useCallback(() => {
    globalDialogService.open('sign-in', {});
  }, [globalDialogService]);

  const onOpenWorkspaceSetting = useCallback(() => {
    workspaceDialogService.open('setting', {
      activeTab: 'appearance',
    });
    track.$.navigationPanel.$.openSettings();
  }, [workspaceDialogService]);

  return (
    <Menu
      contentOptions={menuContentOptions}
      items={
        <>
          <MenuItem
            prefixIcon={<SettingsIcon />}
            data-testid="slider-bar-workspace-setting-button"
            onClick={onOpenWorkspaceSetting}
          >
            <span data-testid="settings-modal-trigger">
              {t['com.affine.settingSidebar.title']()}
            </span>
          </MenuItem>
          <MenuItem
            prefixIcon={<AccountIcon />}
            data-testid="workspace-modal-sign-in-option"
            onClick={openSignInModal}
          >
            {t['com.affine.workspace.cloud.account.login']()}
          </MenuItem>
        </>
      }
    >
      <IconButton data-testid="sidebar-user-avatar" variant="plain" size="20">
        <UnknownUserIcon />
      </IconButton>
    </Menu>
  );
};

const OperationMenu = () => {
  const serverService = useService(ServerService);
  const serverFeatures = useLiveData(serverService.server.features$);

  return (
    <>
      <Account />
      <Divider />
      <CloudUsage />
      {serverFeatures?.copilot ? <AIUsage /> : null}
      <Divider />
      <TeamList />
      <AccountMenu />
    </>
  );
};
