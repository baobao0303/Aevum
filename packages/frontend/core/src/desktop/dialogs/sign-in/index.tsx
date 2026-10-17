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
      onOpenChange={close}
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
