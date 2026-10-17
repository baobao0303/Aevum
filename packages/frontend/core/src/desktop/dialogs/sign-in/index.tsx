import { Modal } from '@affine/component';
import { SignInPanel, type SignInStep } from '@affine/core/components/sign-in';
import { AuthService } from '@affine/core/modules/cloud';
import type { AuthSessionStatus } from '@affine/core/modules/cloud/entities/session';
import type {
  DialogComponentProps,
  GLOBAL_DIALOG_SCHEMA,
} from '@affine/core/modules/dialogs';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback } from 'react';

export const SignInDialog = ({
  close,
  server: initialServerBaseUrl,
  step,
}: DialogComponentProps<GLOBAL_DIALOG_SCHEMA['sign-in']>) => {
  const authService = useService(AuthService);
  const sessionStatus = useLiveData(authService.session.status$);
  const loggedIn = sessionStatus === 'authenticated';

  const onAuthenticated = useCallback(
    (status: AuthSessionStatus) => {
      if (status === 'authenticated') {
        close();
      }
    },
    [close]
  );
  return (
    <Modal
      open
      disableAutoFocus
      persistent={!loggedIn}
      withoutCloseButton={!loggedIn}
      onOpenChange={open => {
        if (!open && loggedIn) {
          close();
        }
      }}
      width={400}
      overlayOptions={{
        style: {
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          backgroundColor: 'transparent',
        },
      }}
      contentOptions={{
        ['data-testid' as string]: 'auth-modal',
        style: {
          padding: '40px 40px 24px',
          maxHeight: 650,
          transition: 'height 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        },
      }}
    >
      <SignInPanel
        onSkip={close}
        onAuthenticated={onAuthenticated}
        server={initialServerBaseUrl}
        initStep={step as SignInStep}
      />
    </Modal>
  );
};
