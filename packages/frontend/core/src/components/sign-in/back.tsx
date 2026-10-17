import { BackButton } from '@affine/component/auth-components';
import {
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
  useCallback,
} from 'react';

import type { SignInState } from '.';

interface BackButtonProps {
  changeState: Dispatch<SetStateAction<SignInState>>;
  style?: CSSProperties;
  className?: string;
}
export function Back({ changeState, style, className }: BackButtonProps) {
  const onClick = useCallback(() => {
    changeState(prev => ({
      ...prev,
      step: 'signIn',
    }));
  }, [changeState]);

  return <BackButton style={style} className={className} onClick={onClick} />;
}
