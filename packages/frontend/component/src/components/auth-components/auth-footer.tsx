import type { HTMLAttributes, PropsWithChildren } from 'react';
import clsx from 'clsx';

import { authFooter } from './share.css';

export function AuthFooter({
  children,
  className,
  style,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={clsx(authFooter, className)} style={style} {...props}>
      {children}
    </div>
  );
}
