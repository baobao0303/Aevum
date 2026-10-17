import { useI18n } from '@affine/i18n';
import { ArrowLeftSmallIcon } from '@blocksuite/icons/rc';
import type { FC } from 'react';

import type { ButtonProps } from '../../ui/button';
import { Button } from '../../ui/button';

export const BackButton: FC<ButtonProps> = ({ style, ...props }) => {
  const t = useI18n();
  return (
    <Button
      variant="plain"
      style={{
        padding: '4px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        ...style,
      }}
      prefix={<ArrowLeftSmallIcon />}
      {...props}
    >
      {t['com.affine.backButton']()}
    </Button>
  );
};
