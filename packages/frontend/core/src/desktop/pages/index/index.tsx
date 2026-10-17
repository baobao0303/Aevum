import { DesktopApiService } from '@affine/core/modules/desktop-api';
import { GlobalDialogService } from '@affine/core/modules/dialogs';
import { WorkspacesService } from '@affine/core/modules/workspace';
import { buildShowcaseWorkspace } from '@affine/core/utils/first-app-data';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import {
  RouteLogic,
  useNavigateHelper,
} from '../../../components/hooks/use-navigate-helper';
import { WorkspaceNavigator } from '../../../components/workspace-selector';
import { AuthService } from '../../../modules/cloud';
import {
  AppContainer,
  UnauthenticatedWorkspaceBackdrop,
} from '../../components/app-container';

/**
 * index page
 *
 * query string:
 * - initCloud: boolean, if true, when user is logged in, create a cloud workspace
 */
export const Component = ({
  defaultIndexRoute = 'all',
  children,
  fallback,
  createErrorFallback,
}: {
  defaultIndexRoute?: string;
  children?: ReactNode;
  fallback?: ReactNode;
  createErrorFallback?: (retry: () => void) => ReactNode;
}) => {
  const [navigating, setNavigating] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(false);
  const authService = useService(AuthService);
  const globalDialogService = useService(GlobalDialogService);

  const sessionStatus = useLiveData(authService.session.status$);
  const loggedIn = sessionStatus === 'authenticated';

  const workspacesService = useService(WorkspacesService);
  const list = useLiveData(workspacesService.list.workspaces$);
  const listIsLoading = useLiveData(workspacesService.list.isRevalidating$);

  const { openPage, jumpToPage } = useNavigateHelper();

  const createOnceRef = useRef(false);
  const signInDialogOpenedRef = useRef(false);

  // Remove any legacy local Demo Workspace automatically
  useEffect(() => {
    const localWorkspaces = list.filter(w => w.flavour === 'local');
    if (localWorkspaces.length > 0) {
      localStorage.removeItem('last_workspace_id');
      localWorkspaces.forEach(w => {
        workspacesService.deleteWorkspace(w).catch(console.error);
      });
    }
  }, [list, workspacesService]);

  // Open persistent SignInDialog when unauthenticated
  useEffect(() => {
    if (sessionStatus === 'unauthenticated' && !signInDialogOpenedRef.current) {
      signInDialogOpenedRef.current = true;
      globalDialogService.open('sign-in', {});
    } else if (sessionStatus === 'authenticated') {
      signInDialogOpenedRef.current = false;
    }
  }, [globalDialogService, sessionStatus]);

  const createCloudWorkspace = useCallback(() => {
    if (createOnceRef.current) return;
    createOnceRef.current = true;
    setCreateError(false);
    setCreating(true);
    buildShowcaseWorkspace(workspacesService, 'affine-cloud', 'Aevum Workspace')
      .then(({ meta, defaultDocId }) => {
        if (defaultDocId) {
          jumpToPage(meta.id, defaultDocId);
        } else {
          openPage(meta.id, defaultIndexRoute);
        }
      })
      .catch(err => {
        console.error('Failed to create cloud workspace', err);
        createOnceRef.current = false;
        setCreateError(true);
      })
      .finally(() => {
        setCreating(false);
      });
  }, [defaultIndexRoute, jumpToPage, openPage, workspacesService]);

  useLayoutEffect(() => {
    if (!navigating || listIsLoading) {
      return;
    }

    if (!loggedIn) {
      localStorage.removeItem('last_workspace_id');
      return;
    }

    const cloudWorkspaces = list.filter(w => w.flavour !== 'local');
    if (cloudWorkspaces.length === 0) {
      createCloudWorkspace();
      return;
    }

    const lastId = localStorage.getItem('last_workspace_id');
    const openWorkspace =
      cloudWorkspaces.find(w => w.id === lastId) ?? cloudWorkspaces[0];
    openPage(openWorkspace.id, defaultIndexRoute, RouteLogic.REPLACE);
  }, [
    createCloudWorkspace,
    list,
    openPage,
    listIsLoading,
    loggedIn,
    navigating,
    defaultIndexRoute,
  ]);

  const desktopApi = useServiceOptional(DesktopApiService);

  useEffect(() => {
    desktopApi?.handler.ui.pingAppLayoutReady().catch(console.error);
  }, [desktopApi]);

  const retryCreate = useCallback(() => {
    createOnceRef.current = false;
    createCloudWorkspace();
  }, [createCloudWorkspace]);

  if (!loggedIn) {
    return (
      <div
        style={{
          filter: 'blur(4px)',
          WebkitFilter: 'blur(4px)',
          pointerEvents: 'none',
          userSelect: 'none',
          width: '100vw',
          height: '100dvh',
          overflow: 'hidden',
        }}
      >
        <UnauthenticatedWorkspaceBackdrop />
      </div>
    );
  }

  if (createError && createErrorFallback) {
    return createErrorFallback(retryCreate);
  }

  if (navigating || creating) {
    return fallback ?? <AppContainer fallback />;
  }

  return (
    children ?? (
      <div
        style={{
          position: 'fixed',
          left: 'calc(50% - 150px)',
          top: '50%',
        }}
      >
        <WorkspaceNavigator
          open={true}
          menuContentOptions={{
            forceMount: true,
          }}
        />
      </div>
    )
  );
};
