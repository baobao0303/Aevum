import clsx from 'clsx';
import { type ForwardedRef, forwardRef, type ReactNode, useId } from 'react';

import type { InputProps } from '../../ui/input';
import { Input } from '../../ui/input';
import * as styles from './share.css';
export type AuthInputProps = InputProps & {
  label?: string;
  error?: boolean;
  errorHint?: ReactNode;
  onEnter?: () => void;
};
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  function AuthInput(
    {
      label,
      error,
      errorHint,
      onEnter,
      className,
      id,
      ...inputProps
    }: AuthInputProps,
    ref: ForwardedRef<HTMLInputElement>
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const showError = Boolean(error && errorHint);

    return (
      <div
        className={clsx(styles.authInputWrapper, {
          'with-hint': showError,
        })}
      >
        {label ? <label htmlFor={inputId}>{label}</label> : null}
        <Input
          ref={ref}
          id={inputId}
          className={clsx(className)}
          size="extraLarge"
          status={error ? 'error' : 'default'}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={showError ? errorId : undefined}
          aria-errormessage={showError ? errorId : undefined}
          onEnter={onEnter}
          {...inputProps}
        />
        {showError ? (
          <div
            id={errorId}
            role="alert"
            aria-live="polite"
            className={styles.authInputError}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <circle
                cx="8"
                cy="8"
                r="6.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M8 4.75V8.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="8" cy="11.25" r="0.85" fill="currentColor" />
            </svg>
            <span>{errorHint}</span>
          </div>
        ) : null}
      </div>
    );
  }
);
