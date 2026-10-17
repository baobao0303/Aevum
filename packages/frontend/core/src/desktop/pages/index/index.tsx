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

import { WorkspaceNavigator } from '../../../components/workspace-selector';
import { AuthService } from '../../../modules/cloud';
import { UnauthenticatedWorkspaceBackdrop } from '../../components/app-container';

/**
 * index page
 *
 * query string:
 * - initCloud: boolean, if true, when user is logged in, create a cloud workspace
 */
export const Component = ({
  children,
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
  const authRevalidating = useLiveData(authService.session.isRevalidating$);
  const loggedIn = sessionStatus === 'authenticated';
  const openedDialogs = useLiveData(globalDialogService.dialogs$);

  const workspacesService = useService(WorkspacesService);
  const list = useLiveData(workspacesService.list.workspaces$);
  const listIsLoading = useLiveData(workspacesService.list.isRevalidating$);

  const createOnceRef = useRef(false);

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

  const createCloudWorkspace = useCallback(() => {
    if (createOnceRef.current) return;
    createOnceRef.current = true;
    setCreateError(false);
    setCreating(true);
    buildShowcaseWorkspace(workspacesService, 'affine-cloud', 'Aevum Workspace')
      .then(() => {
        workspacesService.list.revalidate();
      })
      .catch(err => {
        console.error('Failed to create cloud workspace', err);
        createOnceRef.current = false;
        setCreateError(true);
      })
      .finally(() => {
        setCreating(false);
        setNavigating(false);
      });
  }, [workspacesService]);

  useEffect(() => {
    if (loggedIn) {
      workspacesService.list.revalidate();
    }
  }, [loggedIn, workspacesService]);

  useLayoutEffect(() => {
    if (listIsLoading) {
      return;
    }

    if (!loggedIn) {
      localStorage.removeItem('last_workspace_id');
      setNavigating(false);
      return;
    }

    const cloudWorkspaces = list.filter(w => w.flavour !== 'local');
    if (cloudWorkspaces.length === 0) {
      createCloudWorkspace();
      return;
    }

    setNavigating(false);
  }, [createCloudWorkspace, list, listIsLoading, loggedIn]);

  const desktopApi = useServiceOptional(DesktopApiService);

  useEffect(() => {
    desktopApi?.handler.ui.pingAppLayoutReady().catch(console.error);
  }, [desktopApi]);

  const retryCreate = useCallback(() => {
    createOnceRef.current = false;
    createCloudWorkspace();
  }, [createCloudWorkspace]);

  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVideoReady(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Automatically open the Sign-In modal when unauthenticated
  useEffect(() => {
    const hasQrCode =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('aevum_qr_code');
    if (
      sessionStatus === 'unauthenticated' &&
      !authRevalidating &&
      !hasQrCode &&
      videoReady &&
      !openedDialogs.some(d => d.type === 'sign-in')
    ) {
      globalDialogService.open('sign-in', {});
    }
  }, [
    authRevalidating,
    globalDialogService,
    openedDialogs,
    sessionStatus,
    videoReady,
  ]);

  if (createError && createErrorFallback) {
    return createErrorFallback(retryCreate);
  }

  return (
    children ?? (
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100dvh',
          overflow: 'hidden',
        }}
      >
        <UnauthenticatedWorkspaceBackdrop onReady={() => setVideoReady(true)} />
        {loggedIn &&
          !navigating &&
          !creating &&
          videoReady &&
          openedDialogs.length === 0 && (
            <div
              style={{
                position: 'fixed',
                left: 'calc(50% - 150px)',
                top: '35%',
                zIndex: 10,
              }}
            >
              <WorkspaceNavigator
                open={true}
                menuContentOptions={{
                  forceMount: true,
                  onInteractOutside: e => e.preventDefault(),
                  onEscapeKeyDown: e => e.preventDefault(),
                }}
              />
            </div>
          )}
      </div>
    )
  );
};
