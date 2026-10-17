import clsx from 'clsx';
import type { FC } from 'react';

import { AevumIcon } from './aevum-logo';
import { authHeaderWrapper } from './share.css';

export const AuthHeader: FC<{
  title: string;
  subTitle?: string;
  className?: string;
}> = ({ title, subTitle, className }) => {
  const cleanSubTitle =
    subTitle && !subTitle.toLowerCase().includes('self-hosted')
      ? subTitle
      : undefined;
  return (
    <div className={clsx(authHeaderWrapper, className)}>
      <AevumIcon size={46} className="logo" />
      <p>{title}</p>
      {cleanSubTitle ? <p>{cleanSubTitle}</p> : null}
    </div>
  );
};
