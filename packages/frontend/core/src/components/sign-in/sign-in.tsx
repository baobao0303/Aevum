import { Button, notify } from '@affine/component';
import {
  AuthContainer,
  AuthContent,
  AuthFooter,
  AuthHeader,
  AuthInput,
} from '@affine/component/auth-components';
import { OAuth } from '@affine/core/components/affine/auth/oauth';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import {
  AuthService,
  CaptchaService,
  ServerService,
} from '@affine/core/modules/cloud';
import type { AuthSessionStatus } from '@affine/core/modules/cloud/entities/session';
import { UserFriendlyError } from '@affine/error';
import { ServerDeploymentType } from '@affine/graphql';
import { Trans, useI18n } from '@affine/i18n';
import { ArrowRightBigIcon, PublishIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useSelfhostLoginVersionGuard } from '../hooks/affine/use-selfhost-login-version-guard';
import type { SignInState } from '.';
import { Back } from './back';
import { Captcha } from './captcha';
import * as style from './style.css';

const emailRegex =
  /^(?:(?:[^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@(?:(?:\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|((?:[a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

function validateEmail(email: string) {
  return emailRegex.test(email);
}

export const SignInStep = ({
  state,
  changeState,
  onAuthenticated,
}: {
  state: SignInState;
  changeState: Dispatch<SetStateAction<SignInState>>;
  onSkip: () => void;
  onAuthenticated?: (status: AuthSessionStatus) => void;
}) => {
  const t = useI18n();
  const serverService = useService(ServerService);
  const versionError = useSelfhostLoginVersionGuard(serverService.server);
  const isSelfhosted = useLiveData(
    serverService.server.config$.selector(
      c => c.type === ServerDeploymentType.Selfhosted
    )
  );
  const authService = useService(AuthService);
  const captchaService = useService(CaptchaService);
  const verifyToken = useLiveData(captchaService.verifyToken$);
  const needCaptcha = useLiveData(captchaService.needCaptcha$);
  const challenge = useLiveData(captchaService.challenge$);
  const [isMutating, setIsMutating] = useState(false);

  const [email, setEmail] = useState(state.email ?? '');
  const [password, setPassword] = useState('');

  const [emailErrorHint, setEmailErrorHint] = useState('');
  const [passwordErrorHint, setPasswordErrorHint] = useState('');

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const emailInteractedRef = useRef(false);
  const passwordInteractedRef = useRef(false);

  const validateEmailField = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Please enter your email address';
    }
    if (!validateEmail(trimmed)) {
      return 'Please enter a valid email address (e.g. name@example.com)';
    }
    return '';
  }, []);

  const validatePasswordField = useCallback((value: string) => {
    if (!value) {
      return 'Please enter your password';
    }
    return '';
  }, []);

  const loginStatus = useLiveData(authService.session.status$);

  useEffect(() => {
    if (loginStatus === 'authenticated') {
      notify.success({
        title: t['com.affine.auth.toast.title.signed-in'](),
        message: t['com.affine.auth.toast.message.signed-in'](),
      });
    }
    onAuthenticated?.(loginStatus);
  }, [loginStatus, onAuthenticated, t]);

  const onContinue = useAsyncCallback(async () => {
    if (isMutating || (!verifyToken && needCaptcha)) return;

    emailInteractedRef.current = true;
    passwordInteractedRef.current = true;

    const nextEmailError = validateEmailField(email);
    const nextPasswordError = validatePasswordField(password);

    setEmailErrorHint(nextEmailError);
    setPasswordErrorHint(nextPasswordError);

    if (nextEmailError) {
      emailInputRef.current?.focus();
      return;
    }

    if (nextPasswordError) {
      passwordInputRef.current?.focus();
      return;
    }

    setIsMutating(true);

    try {
      await authService.signInPassword({
        email: email.trim(),
        password,
        verifyToken,
        challenge,
      });
    } catch (err: any) {
      console.error(err);
      const error = UserFriendlyError.fromAny(err);

      if (
        error.is('WRONG_SIGN_IN_CREDENTIALS') ||
        error.is('PASSWORD_REQUIRED') ||
        error.is('WRONG_SIGN_IN_METHOD')
      ) {
        const errorMsg =
          t[`error.${error.name}`]?.(error.data) ??
          'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
        setPasswordErrorHint(errorMsg);
        notify.error({
          title: t['com.affine.auth.toast.title.failed'](),
          message: errorMsg,
        });
        passwordInputRef.current?.focus();
      } else {
        setPasswordErrorHint('');
        notify.error({
          title: t['com.affine.auth.toast.title.failed'](),
          message: error.is('REQUEST_ABORTED')
            ? t['error.NETWORK_ERROR']()
            : (t[`error.${error.name}`]?.(error.data) ?? error.message),
        });
      }
      captchaService.revalidate();
    } finally {
      setIsMutating(false);
    }
  }, [
    authService,
    captchaService,
    challenge,
    email,
    isMutating,
    needCaptcha,
    password,
    t,
    validateEmailField,
    validatePasswordField,
    verifyToken,
  ]);

  if (versionError && isSelfhosted) {
    return (
      <AuthContainer>
        <AuthHeader title={t['com.affine.auth.sign.in']()} />
        <AuthContent>
          <div>{versionError}</div>
        </AuthContent>
      </AuthContainer>
    );
  }

  return (
    <AuthContainer>
      <AuthHeader title={t['com.affine.auth.sign.in']()} />

      <AuthContent>
        <OAuth redirectUrl={state.redirectUrl} />

        <form
          noValidate
          onSubmit={event => {
            event.preventDefault();
            onContinue();
          }}
        >
          <AuthInput
            ref={emailInputRef}
            className={style.authInput}
            label={t['com.affine.settings.email']()}
            placeholder={t['com.affine.auth.sign.email.placeholder']()}
            value={email}
            onChange={(value: string) => {
              setEmail(value);
              emailInteractedRef.current = true;
              if (emailErrorHint) {
                const err = validateEmailField(value);
                if (!err) {
                  setEmailErrorHint('');
                }
              }
            }}
            onBlur={() => {
              if (emailInteractedRef.current) {
                setEmailErrorHint(validateEmailField(email));
              }
            }}
            error={Boolean(emailErrorHint)}
            errorHint={emailErrorHint}
            onEnter={onContinue}
            type="email"
            id="email"
            name="username"
            autoComplete="username"
            required
          />

          <AuthInput
            ref={passwordInputRef}
            className={style.authInput}
            data-testid="password-input"
            label={t['com.affine.auth.password']()}
            placeholder={t['com.affine.auth.password']()}
            value={password}
            onChange={(value: string) => {
              setPassword(value);
              passwordInteractedRef.current = true;
              if (passwordErrorHint) {
                const err = validatePasswordField(value);
                if (!err) {
                  setPasswordErrorHint('');
                }
              }
            }}
            onBlur={() => {
              if (passwordInteractedRef.current) {
                setPasswordErrorHint(validatePasswordField(password));
              }
            }}
            error={Boolean(passwordErrorHint)}
            errorHint={passwordErrorHint}
            onEnter={onContinue}
            type="password"
            id="current-password"
            name="password"
            autoComplete="current-password"
            required
          />

          {!verifyToken && needCaptcha && <Captcha />}

          <Button
            className={style.signInButton}
            style={{ width: '100%' }}
            size="extraLarge"
            data-testid="continue-login-button"
            block
            loading={isMutating}
            disabled={isMutating || (!verifyToken && needCaptcha)}
            suffix={<ArrowRightBigIcon style={{ color: 'inherit' }} />}
            suffixStyle={{
              width: 20,
              height: 20,
              color: 'var(--affine-text-primary-color)',
            }}
          >
            {t['com.affine.auth.sign.email.continue']()}
          </Button>
        </form>

        {!isSelfhosted && (
          <div className={style.authMessage}>
            {/*prettier-ignore*/}
            <Trans i18nKey="com.affine.auth.sign.message">
              By clicking &quot;Continue with Google/Email&quot; above, you acknowledge that
              you agree to Aevum&apos;s <a href="https://affine.pro/terms" target="_blank" rel="noreferrer">Terms of Conditions</a> and <a href="https://affine.pro/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.
            </Trans>
          </div>
        )}
        <div className={style.skipDivider}>
          <div className={style.skipDividerLine} />
          <span className={style.skipDividerText}>or</span>
          <div className={style.skipDividerLine} />
        </div>
        <div className={style.skipSection}>
          <Button
            variant="plain"
            className={style.addSelfhostedButton}
            prefix={<PublishIcon className={style.addSelfhostedButtonPrefix} />}
            onClick={() => {
              changeState(prev => ({
                ...prev,
                step: 'addSelfhosted',
              }));
            }}
          >
            {t['com.affine.auth.sign.add-selfhosted']()}
          </Button>
        </div>
      </AuthContent>
      {isSelfhosted && state.step !== 'signIn' && (
        <AuthFooter>
          <Back changeState={changeState} />
        </AuthFooter>
      )}
    </AuthContainer>
  );
};
