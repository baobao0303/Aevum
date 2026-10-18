import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { keyframes, style } from '@vanilla-extract/css';

const fadeSlideIn = keyframes({
  from: {
    opacity: 0,
    transform: 'translateY(4px)',
  },
  to: {
    opacity: 1,
    transform: 'translateY(0)',
  },
});

/**
 * UI HEIGHT & RADIUS STANDARD (Unified across Aevum & shadcn/ui):
 * - Default Toolbar / Table Inline Control (Input, Button, Select, Tabs): 28px (border-radius: 6px, font-size: 12px)
 * - Modal Form Control (Input, Select inside Dialog): 32px (border-radius: 6px, font-size: 13px)
 * - Compact Card Footer Select / Mini Button: 24px (border-radius: 5px, font-size: 11.5px)
 * - Badge / Status Pill: 22px (border-radius: 6px, font-size: 11.5px)
 */

export const pageContainer = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  backgroundColor: cssVarV2('layer/background/primary'),
  color: cssVarV2('text/primary'),
});

export const headerBar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  minWidth: 0,
  height: '100%',
  padding: '0 12px',
  gap: '10px',
  flexWrap: 'nowrap',
  overflow: 'hidden',
});

export const breadcrumbBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  fontWeight: 600,
  minWidth: 0,
  flex: '1 1 0%',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
});

export const toolbarContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 16px',
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  gap: '10px',
  flexWrap: 'wrap',
  backgroundColor: cssVarV2('layer/background/primary'),
});

export const toolbarGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexWrap: 'nowrap',
  flexShrink: 0,
});

export const viewSwitchGroup = style({
  display: 'inline-flex',
  alignItems: 'center',
  height: '28px',
  padding: '2px',
  borderRadius: '6px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  gap: '2px',
  boxSizing: 'border-box',
});

export const viewSwitchBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '5px',
  height: '22px',
  padding: '0 10px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 500,
  lineHeight: '18px',
  border: 'none',
  background: 'transparent',
  color: cssVarV2('text/secondary'),
  cursor: 'pointer',
  transition: 'all 150ms ease',
  selectors: {
    '&:hover': {
      color: cssVarV2('text/primary'),
    },
    '&[data-active="true"]': {
      backgroundColor: cssVarV2('layer/background/overlayPanel'),
      color: cssVarV2('text/primary'),
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)',
    },
  },
});

// Default 28px Input (Toolbar & Inline filters)
export const controlInput = style({
  height: '28px',
  padding: '0 10px',
  borderRadius: '6px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  fontSize: '12px',
  lineHeight: '18px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 140ms ease, background-color 140ms ease',
  selectors: {
    '&::placeholder': {
      color: cssVarV2('text/secondary'),
    },
    '&:hover': {
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    },
    '&:focus': {
      borderColor: cssVarV2('text/secondary'),
      backgroundColor: cssVarV2('layer/background/primary'),
    },
  },
});

// Modal 36px Input (Dialog forms)
export const modalInput = style({
  height: '36px',
  minHeight: '36px',
  padding: '0 10px',
  borderRadius: '6px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  fontSize: '13px',
  lineHeight: '20px',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 140ms ease, background-color 140ms ease',
  selectors: {
    '&::placeholder': {
      color: cssVarV2('text/secondary'),
    },
    '&:hover': {
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    },
    '&:focus': {
      borderColor: cssVarV2('text/secondary'),
      backgroundColor: cssVarV2('layer/background/primary'),
    },
  },
});

// Default 28px Button
export const actionButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  height: '28px',
  padding: '0 10px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 500,
  lineHeight: '18px',
  cursor: 'pointer',
  boxSizing: 'border-box',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  transition:
    'background-color 140ms ease, border-color 140ms ease, opacity 140ms ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    },
    '&[data-primary="true"]': {
      backgroundColor: cssVarV2('button/primary'),
      borderColor: cssVarV2('button/primary'),
      color: cssVarV2('button/pureWhiteText'),
    },
    '&[data-primary="true"]:hover': {
      opacity: 0.9,
      backgroundColor: cssVarV2('button/primary'),
    },
  },
});

// Custom Dropdown Trigger (28px default, 36px in modal, 24px compact)
export const selectTrigger = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '6px',
  height: '28px',
  padding: '0 10px',
  borderRadius: '6px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  fontSize: '12px',
  fontWeight: 500,
  lineHeight: '18px',
  cursor: 'pointer',
  outline: 'none',
  boxSizing: 'border-box',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  transition: 'border-color 140ms ease, background-color 140ms ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
      borderColor: cssVarV2('text/secondary'),
    },
    '&[data-size="modal"]': {
      height: '36px',
      minHeight: '36px',
      width: '100%',
      fontSize: '13px',
      fontWeight: 400,
    },
    '&[data-size="mini"]': {
      height: '24px',
      padding: '0 8px',
      borderRadius: '5px',
      fontSize: '11.5px',
    },
  },
});

export const contentArea = style({
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  overflowX: 'auto',
  overflowY: 'hidden',
  padding: '12px 16px',
  scrollbarWidth: 'thin',
  scrollbarColor: `${cssVarV2('layer/insideBorder/border')} transparent`,
});

export const kanbanBoardRow = style({
  display: 'flex',
  alignItems: 'stretch',
  gap: '12px',
  flex: 1,
  minHeight: 0,
  height: '100%',
  width: 'max-content',
  paddingRight: '16px',
  paddingBottom: '4px',
});

export const kanbanColumn = style({
  width: '288px',
  minWidth: '288px',
  height: '100%',
  minHeight: 0,
  maxHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '8px',
  padding: '10px',
  boxSizing: 'border-box',
  transition: 'border-color 150ms ease, background-color 150ms ease',
  selectors: {
    '&[data-drag-over="true"]': {
      borderColor: cssVarV2('text/secondary'),
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    },
  },
});

export const columnHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '2px 4px 10px',
  gap: '8px',
});

export const columnTitleGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  fontWeight: 600,
  overflow: 'hidden',
});

// Unified 22px Badge
export const countBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '22px',
  height: '20px',
  padding: '0 6px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 500,
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/primary'),
  color: cssVarV2('text/secondary'),
  fontVariantNumeric: 'tabular-nums',
});

export const columnCardsList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: `${cssVarV2('layer/insideBorder/border')} transparent`,
  flex: 1,
  paddingRight: '2px',
});

export const kanbanCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '12px',
  borderRadius: '8px',
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  cursor: 'grab',
  transition: 'border-color 140ms ease, background-color 140ms ease',
  selectors: {
    '&:hover': {
      borderColor: cssVarV2('text/secondary'),
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    },
    '&:active': {
      cursor: 'grabbing',
    },
  },
});

export const cardTopRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '6px',
});

export const cardTitle = style({
  fontSize: '13px',
  fontWeight: 500,
  lineHeight: '20px',
  color: cssVarV2('text/primary'),
  wordBreak: 'break-word',
});

export const cardFooter = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '6px',
  marginTop: '2px',
  paddingTop: '8px',
  borderTop: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  flexWrap: 'wrap',
});

export const pillBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  height: '22px',
  padding: '0 8px',
  borderRadius: '6px',
  fontSize: '11.5px',
  fontWeight: 500,
  lineHeight: '20px',
});

export const miniSelect = selectTrigger;

export const addCardBtn = style({
  marginTop: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  height: '28px',
  padding: '0 10px',
  borderRadius: '6px',
  border: `1px dashed ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: 'transparent',
  color: cssVarV2('text/secondary'),
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 140ms ease',
  selectors: {
    '&:hover': {
      color: cssVarV2('text/primary'),
      backgroundColor: cssVarV2('layer/background/primary'),
    },
  },
});

export const shadcnTableContainer = style({
  width: '100%',
  flex: 1,
  height: 'calc(100dvh - 140px)',
  minHeight: '560px',
  maxHeight: 'calc(100dvh - 140px)',
  display: 'flex',
  flexDirection: 'column',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '8px',
  backgroundColor: cssVarV2('layer/background/primary'),
  overflow: 'hidden',
  boxSizing: 'border-box',
});

export const shadcnTableScroll = style({
  flex: 1,
  width: '100%',
  overflow: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: `${cssVarV2('layer/insideBorder/border')} transparent`,
  containerType: 'inline-size',
});

export const shadcnTable = style({
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontSize: '13px',
  textAlign: 'left',
});

export const shadcnTheadTr = style({
  backgroundColor: cssVarV2('layer/background/secondary'),
});

export const shadcnTh = style({
  position: 'sticky',
  insetBlockStart: 0,
  zIndex: 2,
  height: '38px',
  padding: '0 12px',
  fontWeight: 500,
  fontSize: '12px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/secondary'),
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  whiteSpace: 'nowrap',
  userSelect: 'none',
  selectors: {
    '&:first-child': {
      width: '36px',
      paddingLeft: '12px',
      paddingRight: '4px',
    },
    '&:last-child': {
      width: '44px',
      textAlign: 'right',
      paddingRight: '12px',
    },
  },
});

export const shadcnTr = style({
  transition: 'background-color 120ms ease',
  backgroundColor: 'transparent',
  selectors: {
    '&:hover': {
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    },
    '&[data-selected="true"]': {
      backgroundColor: cssVarV2('layer/background/secondary'),
    },
  },
});

export const shadcnTd = style({
  height: '56px',
  padding: '8px 12px',
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  color: cssVarV2('text/primary'),
  verticalAlign: 'middle',
  selectors: {
    '&:first-child': {
      width: '36px',
      paddingLeft: '12px',
      paddingRight: '4px',
    },
    '&:last-child': {
      width: '44px',
      textAlign: 'right',
      paddingRight: '12px',
    },
  },
});

export const paginationBar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  flexWrap: 'wrap',
  minHeight: '44px',
  padding: '8px 14px',
  borderTop: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  fontSize: '12px',
  color: cssVarV2('text/secondary'),
  boxSizing: 'border-box',
});

export const paginationControls = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap',
});

export const pageBtnGroup = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
});

export const pageBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '28px',
  height: '28px',
  padding: '0 6px',
  borderRadius: '6px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/primary'),
  color: cssVarV2('text/primary'),
  fontSize: '12px',
  fontWeight: 500,
  lineHeight: '18px',
  cursor: 'pointer',
  boxSizing: 'border-box',
  userSelect: 'none',
  fontVariantNumeric: 'tabular-nums',
  transition:
    'background-color 120ms ease, border-color 120ms ease, opacity 120ms ease',
  selectors: {
    '&:hover:not(:disabled)': {
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
      borderColor: cssVarV2('text/secondary'),
    },
    '&:disabled': {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
    '&[data-active="true"]': {
      backgroundColor: cssVarV2('button/primary'),
      borderColor: cssVarV2('button/primary'),
      color: cssVarV2('button/pureWhiteText'),
    },
  },
});

export const shadcnCheckbox = style({
  width: '14px',
  height: '14px',
  borderRadius: '4px',
  cursor: 'pointer',
  accentColor: cssVarV2('text/primary'),
  verticalAlign: 'middle',
});

export const headerCellLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  fontWeight: 500,
  fontSize: '13px',
  lineHeight: '20px',
  color: cssVarV2('text/primary'),
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
  selectors: {
    '&:hover': {
      textDecoration: 'underline',
      textUnderlineOffset: '3px',
    },
  },
});

// Unified 22px Outline Badge
export const outlinePill = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  height: '22px',
  padding: '0 8px',
  borderRadius: '6px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/secondary'),
  fontSize: '11.5px',
  fontWeight: 500,
  lineHeight: '20px',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
});

// Unified 28px Status Button
export const statusPillBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '28px',
  padding: '0 10px',
  borderRadius: '6px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  fontSize: '12px',
  fontWeight: 500,
  lineHeight: '18px',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  boxSizing: 'border-box',
  transition: 'border-color 120ms ease, background-color 120ms ease',
  selectors: {
    '&:hover': {
      borderColor: cssVarV2('text/secondary'),
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    },
  },
});

// Unified 28px Inline Number Input
export const inlineNumInput = style({
  width: '56px',
  height: '28px',
  padding: '0 8px',
  borderRadius: '6px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  fontSize: '12px',
  fontWeight: 500,
  textAlign: 'right',
  outline: 'none',
  boxSizing: 'border-box',
  fontVariantNumeric: 'tabular-nums',
  transition: 'border-color 120ms ease, background-color 120ms ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    },
    '&:focus': {
      borderColor: cssVarV2('text/secondary'),
      backgroundColor: cssVarV2('layer/background/primary'),
    },
  },
});

export const reviewerSelect = selectTrigger;

// Unified 28px Icon Button
export const rowMenuBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: '6px',
  border: '1px solid transparent',
  backgroundColor: 'transparent',
  color: cssVarV2('text/secondary'),
  cursor: 'pointer',
  boxSizing: 'border-box',
  transition:
    'background-color 120ms ease, color 120ms ease, border-color 120ms ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVarV2('layer/background/secondary'),
      borderColor: cssVarV2('layer/insideBorder/border'),
      color: cssVarV2('text/primary'),
    },
  },
});

export const modalBackdrop = style({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.55)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
});

export const modalCard = style({
  width: '500px',
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: 'calc(100dvh - 48px)',
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: `${cssVarV2('layer/insideBorder/border')} transparent`,
  backgroundColor: cssVarV2('layer/background/overlayPanel'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '8px',
  padding: '20px',
  boxShadow: cssVar('menuShadow'),
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  animation: `${fadeSlideIn} 160ms cubic-bezier(0.22, 1, 0.36, 1)`,
});
