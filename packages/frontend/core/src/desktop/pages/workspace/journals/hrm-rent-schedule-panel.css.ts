import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { globalStyle, style } from '@vanilla-extract/css';

export const card = style({
  marginBottom: 16,
  padding: '14px 16px',
  borderRadius: 8,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 12,
});

export const headerLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
});

export const headerIconBox = style({
  width: 32,
  height: 32,
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.secondary,
  color: cssVarV2.icon.primary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  flexShrink: 0,
});

export const headerTitleWrap = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
});

export const headerTitleRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
});

export const headerTitle = style({
  fontSize: 14,
  fontWeight: 500,
  lineHeight: '20px',
  color: cssVarV2.text.primary,
  letterSpacing: '-0.01em',
});

export const userBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 20,
  padding: '0 7px',
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.secondary,
  color: cssVarV2.text.secondary,
  fontSize: 11,
  fontWeight: 500,
  lineHeight: '18px',
});

export const headerSubtext = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 12,
  lineHeight: '18px',
  color: cssVarV2.text.secondary,
});

export const sourceLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  color: cssVarV2.text.secondary,
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
  transition: 'color 150ms ease',
  selectors: {
    '&:hover': {
      color: cssVarV2.text.primary,
    },
  },
});

export const toolbar = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
});

export const tabsList = style({
  display: 'inline-flex',
  alignItems: 'center',
  height: 28,
  padding: 2,
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.secondary,
  gap: 2,
});

export const tabsTrigger = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 22,
  padding: '0 10px',
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: '18px',
  border: 'none',
  background: 'transparent',
  color: cssVarV2.text.secondary,
  cursor: 'pointer',
  transition: 'all 150ms ease',
  fontVariantNumeric: 'tabular-nums',
  selectors: {
    '&:hover': {
      color: cssVarV2.text.primary,
    },
    '&[data-state="active"]': {
      backgroundColor: cssVarV2.layer.background.overlayPanel,
      color: cssVarV2.text.primary,
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)',
    },
  },
});

export const actionButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 28,
  padding: '0 10px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: '18px',
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.secondary,
  color: cssVarV2.text.primary,
  cursor: 'pointer',
  transition: 'background-color 150ms ease, border-color 150ms ease',
  selectors: {
    '&:hover:not(:disabled)': {
      backgroundColor: cssVarV2.layer.background.hoverOverlay,
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    '&[data-variant="primary"]': {
      backgroundColor: cssVarV2.button.primary,
      borderColor: cssVarV2.button.primary,
      color: cssVarV2.button.pureWhiteText,
    },
  },
});

export const buttonIcon = style({
  width: 14,
  height: 14,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: cssVarV2.icon.primary,
  flexShrink: 0,
  selectors: {
    [`${actionButton}[data-variant="primary"] &`]: {
      color: cssVarV2.button.pureWhiteText,
    },
  },
});

export const emptyBox = style({
  padding: '12px 14px',
  borderRadius: 6,
  border: `1px dashed ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.secondary,
  fontSize: 12,
  lineHeight: '18px',
  color: cssVarV2.text.secondary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
});

export const errorBox = style({
  padding: '10px 12px',
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.error,
  color: cssVarV2.toast.iconState.error,
  fontSize: 12,
  lineHeight: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
});

export const textLinkButton = style({
  background: 'none',
  border: 'none',
  padding: 0,
  color: cssVarV2.text.primary,
  fontSize: 12,
  fontWeight: 500,
  textDecoration: 'underline',
  textUnderlineOffset: '3px',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      opacity: 0.85,
    },
  },
});

export const listScroller = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  maxHeight: 260,
  overflowY: 'auto',
  vars: {
    '--scrollbar-thumb': cssVarV2.layer.insideBorder.border,
    '--scrollbar-track': 'transparent',
  },
  scrollbarWidth: 'thin',
  scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)',
});

globalStyle(`${listScroller}::-webkit-scrollbar`, {
  '@supports': {
    'not (scrollbar-color: auto)': {
      width: 6,
      height: 6,
    },
  },
});

globalStyle(`${listScroller}::-webkit-scrollbar-thumb`, {
  '@supports': {
    'not (scrollbar-color: auto)': {
      background: 'var(--scrollbar-thumb)',
      borderRadius: 3,
    },
  },
});

globalStyle(`${listScroller}::-webkit-scrollbar-track`, {
  '@supports': {
    'not (scrollbar-color: auto)': {
      background: 'var(--scrollbar-track)',
    },
  },
});

export const itemRow = style({
  padding: '10px 12px',
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.secondary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  transition: 'background-color 150ms ease, border-color 150ms ease',
  selectors: {
    '&[data-clickable="true"]': {
      cursor: 'pointer',
    },
    '&[data-clickable="true"]:hover': {
      backgroundColor: cssVarV2.layer.background.hoverOverlay,
    },
  },
});

export const itemMain = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  minWidth: 0,
  flex: 1,
});

export const itemTopLine = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
});

export const timeBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  height: 22,
  padding: '0 8px',
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  color: cssVarV2.text.primary,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: '20px',
  fontVariantNumeric: 'tabular-nums',
  flexShrink: 0,
});

export const roleBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  height: 22,
  padding: '0 8px',
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: 'transparent',
  color: cssVarV2.text.secondary,
  fontSize: 11,
  fontWeight: 500,
  lineHeight: '20px',
  flexShrink: 0,
});

export const itemTitle = style({
  fontSize: 13,
  fontWeight: 500,
  lineHeight: '20px',
  color: cssVarV2.text.primary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const metaRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  flexWrap: 'wrap',
});

export const metaItem = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 12,
  lineHeight: '18px',
  color: cssVarV2.text.secondary,
});

export const metaIcon = style({
  width: 14,
  height: 14,
  color: cssVarV2.icon.secondary,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

export const statusBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 24,
  padding: '0 8px',
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.primary,
  color: cssVarV2.text.secondary,
  fontSize: 11,
  fontWeight: 500,
  lineHeight: '20px',
  flexShrink: 0,
});

export const statusDot = style({
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: cssVarV2.icon.secondary,
  selectors: {
    '&[data-status="Active"], &[data-status="Approved"]': {
      backgroundColor: '#10b981',
    },
    '&[data-status="Waiting"], &[data-status="Pending"]': {
      backgroundColor: '#f59e0b',
    },
  },
});

// Modal styles (shadcn Dialog aesthetic)
export const modalContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});

export const modalHeader = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const modalTitle = style({
  fontSize: 16,
  fontWeight: 600,
  lineHeight: '24px',
  color: cssVarV2.text.primary,
  letterSpacing: '-0.01em',
});

export const modalDescription = style({
  fontSize: 13,
  lineHeight: '20px',
  color: cssVarV2.text.secondary,
});

export const fieldGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
});

export const fieldRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
});

export const fieldLabel = style({
  fontSize: 12,
  fontWeight: 500,
  lineHeight: '16px',
  color: cssVarV2.text.primary,
});

export const fieldControl = style({
  width: '100%',
  height: 34,
  padding: '0 10px',
  borderRadius: 6,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  backgroundColor: cssVarV2.layer.background.secondary,
  color: cssVarV2.text.primary,
  fontSize: 13,
  lineHeight: '20px',
  outline: 'none',
  transition: 'border-color 150ms ease',
  selectors: {
    '&:focus': {
      borderColor: cssVar('primaryColor'),
    },
    '&::placeholder': {
      color: cssVarV2.text.tertiary,
    },
  },
});

export const fieldTextarea = style([
  fieldControl,
  {
    height: 'auto',
    minHeight: 72,
    padding: '8px 10px',
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 12,
    resize: 'vertical',
  },
]);

export const modalFooter = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  paddingTop: 4,
});

export const modalFooterRight = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});
