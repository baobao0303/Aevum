import { useAppSettingHelper } from '@affine/core/components/hooks/affine/use-app-setting-helper';
import { RootAppSidebar } from '@affine/core/components/root-app-sidebar';
import { AppSidebarService } from '@affine/core/modules/app-sidebar';
import {
  AppSidebarFallback,
  OpenInAppCard,
  SidebarSwitch,
} from '@affine/core/modules/app-sidebar/views';
import { AppTabsHeader } from '@affine/core/modules/app-tabs-header';
import { NavigationButtons } from '@affine/core/modules/navigation';
import { WorkspaceService } from '@affine/core/modules/workspace';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import clsx from 'clsx';
import {
  forwardRef,
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactElement,
  useEffect,
  useRef,
} from 'react';

import * as styles from './styles.css';

export const UnauthenticatedWorkspaceBackdrop = ({
  onReady,
}: {
  onReady?: () => void;
} = {}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (v && v.readyState >= 2) {
      onReady?.();
    }
  }, [onReady]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        backgroundColor: '#000000',
        overflow: 'hidden',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        width={1920}
        height={1080}
        poster="/aevum-auth-bg.jpg?v=7"
        src="/aevum-auth-bg.mp4?v=7"
        onLoadedData={() => onReady?.()}
        onCanPlay={() => onReady?.()}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'blur(7px) brightness(0.92)',
          WebkitFilter: 'blur(7px) brightness(0.92)',
          transform: 'scale(1.03)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 45%, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.48) 100%)',
        }}
      />
    </div>
  );
};

const MainFallbackContent = () => null;

export const AppContainer = ({
  children,
  className,
  fallback = false,
  ...rest
}: PropsWithChildren<{
  className?: string;
  fallback?: boolean;
}>) => {
  const { appSettings } = useAppSettingHelper();

  const noisyBackground =
    BUILD_CONFIG.isElectron && appSettings.enableNoisyBackground;
  const blurBackground =
    BUILD_CONFIG.isElectron &&
    environment.isMacOs &&
    appSettings.enableBlurBackground;
  return (
    <div
      {...rest}
      className={clsx(styles.appStyle, className, {
        'noisy-background': noisyBackground,
        'blur-background': blurBackground,
      })}
      data-noise-background={noisyBackground}
      data-translucent={blurBackground}
    >
      <LayoutComponent fallback={fallback}>{children}</LayoutComponent>
    </div>
  );
};

const DesktopLayout = ({
  children,
  fallback = false,
}: PropsWithChildren<{ fallback?: boolean }>) => {
  const workspaceService = useServiceOptional(WorkspaceService);
  const isInWorkspace = !!workspaceService;
  return (
    <div className={styles.desktopAppViewContainer}>
      <div className={styles.desktopTabsHeader}>
        <AppTabsHeader
          left={
            <>
              {isInWorkspace && <SidebarSwitch show />}
              {isInWorkspace && <NavigationButtons />}
            </>
          }
        />
      </div>
      <div className={styles.desktopAppViewMain}>
        {fallback ? (
          <AppSidebarFallback />
        ) : (
          isInWorkspace && <RootAppSidebar />
        )}
        <MainContainer>
          {children ?? (fallback ? <MainFallbackContent /> : null)}
        </MainContainer>
      </div>
    </div>
  );
};

const BrowserLayout = ({
  children,
  fallback = false,
}: PropsWithChildren<{ fallback?: boolean }>) => {
  const workspaceService = useServiceOptional(WorkspaceService);
  const isInWorkspace = !!workspaceService;

  return (
    <div className={styles.browserAppViewContainer}>
      <OpenInAppCard />
      {fallback ? <AppSidebarFallback /> : isInWorkspace && <RootAppSidebar />}
      <MainContainer>
        {children ?? (fallback ? <MainFallbackContent /> : null)}
      </MainContainer>
    </div>
  );
};

const LayoutComponent = BUILD_CONFIG.isElectron ? DesktopLayout : BrowserLayout;

const MainContainer = forwardRef<
  HTMLDivElement,
  PropsWithChildren<HTMLAttributes<HTMLDivElement>>
>(function MainContainer({ className, children, ...props }, ref): ReactElement {
  const workspaceService = useServiceOptional(WorkspaceService);
  const isInWorkspace = !!workspaceService;
  const { appSettings } = useAppSettingHelper();
  const appSidebarService = useService(AppSidebarService).sidebar;
  const open = useLiveData(appSidebarService.open$);

  return (
    <div
      {...props}
      className={clsx(styles.mainContainerStyle, className)}
      data-is-desktop={BUILD_CONFIG.isElectron}
      data-transparent={false}
      data-client-border={appSettings.clientBorder}
      data-side-bar-open={open && isInWorkspace}
      data-testid="main-container"
      ref={ref}
    >
      {children}
    </div>
  );
});

MainContainer.displayName = 'MainContainer';
