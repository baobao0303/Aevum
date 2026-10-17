import { IconButton } from '@affine/component';
import { NotificationCountService } from '@affine/core/modules/notification';
import { track } from '@affine/track';
import { SidebarIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import { useCallback, useRef } from 'react';

import { AppSidebarService } from '../../services/app-sidebar';
import * as styles from './sidebar-switch.css';

export const SidebarSwitch = (_props: {
  show: boolean;
  className?: string;
}) => {
  return null;
};
