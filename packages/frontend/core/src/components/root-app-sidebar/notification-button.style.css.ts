import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const badge = style({
  backgroundColor: cssVarV2('button/primary'),
  color: cssVarV2('text/pureWhite'),
  minWidth: '16px',
  height: '16px',
  padding: '0px 4px',
  borderRadius: '4px',
  fontSize: '12px',
  textAlign: 'center',
  lineHeight: '16px',
  fontWeight: 500,
});

export const headerButtonWrapper = style({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: '8px',
  flexShrink: 0,
});

export const headerBadge = style({
  position: 'absolute',
  top: '-4px',
  right: '-4px',
  backgroundColor: cssVarV2('button/primary'),
  color: cssVarV2('text/pureWhite'),
  minWidth: '15px',
  height: '15px',
  padding: '0px 3px',
  borderRadius: '999px',
  fontSize: '10px',
  textAlign: 'center',
  lineHeight: '15px',
  fontWeight: 600,
  pointerEvents: 'none',
});
