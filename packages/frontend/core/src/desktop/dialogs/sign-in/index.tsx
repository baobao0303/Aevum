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
  const loggedIn = useLiveData(
    authService.session.status$.map(s => s === 'authenticated')
  );
  const onAuthenticated = useCallback(
    (status: AuthSessionStatus) => {
      if (status === 'authenticated') {
        close();
      }
    },
    [close]
  );
  const handleClose = useCallback(() => {
    if (loggedIn) {
      close();
    }
  }, [close, loggedIn]);
  return (
    <Modal
      open
      persistent
      withoutCloseButton={!loggedIn}
      onOpenChange={handleClose}
      width={400}
      overlayOptions={{
        style: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(10, 12, 18, 0.32)',
        },
      }}
      contentOptions={{
        ['data-testid' as string]: 'auth-modal',
        style: {
          padding: '40px 40px 24px',
          maxHeight: 650,
        },
      }}
    >
      <SignInPanel
        onSkip={handleClose}
        onAuthenticated={onAuthenticated}
        server={initialServerBaseUrl}
        initStep={step as SignInStep}
      />
    </Modal>
  );
};
