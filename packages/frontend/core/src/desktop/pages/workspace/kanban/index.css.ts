import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { keyframes, style } from '@vanilla-extract/css';

const fadeSlideIn = keyframes({
  from: {
    opacity: 0,
    transform: 'translateY(6px)',
  },
  to: {
    opacity: 1,
    transform: 'translateY(0)',
  },
});

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
  padding: '0 16px',
  gap: '12px',
  flexWrap: 'wrap',
});

export const zoneTabsWrapper = style({
  display: 'inline-flex',
  alignItems: 'center',
  backgroundColor: cssVarV2('layer/background/secondary'),
  padding: '3px',
  borderRadius: '8px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  gap: '4px',
});

export const zoneTabButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '5px 12px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  color: cssVarV2('text/secondary'),
  transition: 'all 160ms ease',
  selectors: {
    '&:hover': {
      color: cssVarV2('text/primary'),
    },
    '&[data-active="true"]': {
      backgroundColor: cssVarV2('layer/background/overlayPanel'),
      color: cssVarV2('text/primary'),
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.14)',
    },
  },
});

export const toolbarContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 24px',
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  gap: '12px',
  flexWrap: 'wrap',
  backgroundColor: cssVarV2('layer/background/primary'),
});

export const toolbarGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
});

export const viewSwitchGroup = style({
  display: 'inline-flex',
  alignItems: 'center',
  backgroundColor: cssVarV2('layer/background/secondary'),
  padding: '2px',
  borderRadius: '7px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const viewSwitchBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '4px 10px',
  borderRadius: '5px',
  fontSize: '12px',
  fontWeight: 500,
  border: 'none',
  background: 'transparent',
  color: cssVarV2('text/secondary'),
  cursor: 'pointer',
  transition: 'all 150ms ease',
  selectors: {
    '&[data-active="true"]': {
      backgroundColor: cssVarV2('layer/background/overlayPanel'),
      color: cssVarV2('text/primary'),
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)',
    },
  },
});

export const controlInput = style({
  height: '30px',
  padding: '0 10px',
  borderRadius: '6px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  fontSize: '12px',
  outline: 'none',
  selectors: {
    '&:focus': {
      borderColor: cssVar('primaryColor'),
    },
  },
});

export const actionButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '30px',
  padding: '0 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  transition: 'all 150ms ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    },
    '&[data-primary="true"]': {
      backgroundColor: cssVar('primaryColor'),
      color: '#ffffff',
      borderColor: 'transparent',
    },
    '&[data-primary="true"]:hover': {
      opacity: 0.92,
    },
  },
});

export const contentArea = style({
  flex: 1,
  overflow: 'auto',
  padding: '20px 24px',
  animation: `${fadeSlideIn} 200ms cubic-bezier(0.22, 1, 0.36, 1)`,
});

export const kanbanBoardRow = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '16px',
  minHeight: 'calc(100% - 8px)',
  paddingBottom: '16px',
});

export const kanbanColumn = style({
  width: '286px',
  minWidth: '286px',
  maxHeight: 'calc(100dvh - 180px)',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '10px',
  padding: '10px',
  transition: 'border-color 150ms ease, background-color 150ms ease',
  selectors: {
    '&[data-drag-over="true"]': {
      borderColor: cssVar('primaryColor'),
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    },
  },
});

export const columnHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 6px 10px',
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

export const countBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '20px',
  height: '18px',
  padding: '0 6px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 600,
  backgroundColor: cssVarV2('layer/background/overlayPanel'),
  color: cssVarV2('text/secondary'),
});

export const columnCardsList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  overflowY: 'auto',
  flex: 1,
  paddingRight: '2px',
});

export const kanbanCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '12px',
  borderRadius: '8px',
  backgroundColor: cssVarV2('layer/background/overlayPanel'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
  cursor: 'grab',
  transition:
    'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('primaryColor'),
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
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
  lineHeight: '1.45',
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
  padding: '2px 7px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 600,
  lineHeight: '16px',
});

export const miniSelect = style({
  fontSize: '11px',
  padding: '2px 6px',
  borderRadius: '4px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  cursor: 'pointer',
  outline: 'none',
});

export const addCardBtn = style({
  marginTop: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '7px',
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
      backgroundColor: cssVarV2('layer/background/overlayPanel'),
    },
  },
});

export const tableWrapper = style({
  width: '100%',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '10px',
  overflow: 'hidden',
  backgroundColor: cssVarV2('layer/background/overlayPanel'),
});

export const dataTable = style({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
  textAlign: 'left',
});

export const tableTh = style({
  padding: '10px 14px',
  fontWeight: 600,
  fontSize: '12px',
  color: cssVarV2('text/secondary'),
  backgroundColor: cssVarV2('layer/background/secondary'),
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  whiteSpace: 'nowrap',
});

export const tableTd = style({
  padding: '10px 14px',
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  verticalAlign: 'middle',
});

export const tableRow = style({
  transition: 'background-color 120ms ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
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
  backgroundColor: cssVarV2('layer/background/overlayPanel'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.32)',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  animation: `${fadeSlideIn} 180ms cubic-bezier(0.22, 1, 0.36, 1)`,
});

export const userPermRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  borderRadius: '8px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  gap: '12px',
});

export const boardListWrapper = style({
  maxWidth: '1120px',
  width: '100%',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
});

export const boardListHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  flexWrap: 'wrap',
});

export const boardSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
});

export const boardSectionTitle = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px',
  fontWeight: 600,
  color: cssVarV2('text/secondary'),
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
});

export const boardListRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  borderRadius: '10px',
  backgroundColor: cssVarV2('layer/background/overlayPanel'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  cursor: 'pointer',
  transition:
    'transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease',
  gap: '16px',
  selectors: {
    '&:hover': {
      borderColor: cssVar('primaryColor'),
      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.14)',
      transform: 'translateY(-1px)',
    },
  },
});

export const boardRowLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  minWidth: 0,
});

export const boardIconBox = style({
  width: '38px',
  height: '38px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  fontSize: '18px',
  flexShrink: 0,
});

export const boardRowRight = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexShrink: 0,
});

export const breadcrumbBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '14px',
  fontWeight: 600,
});

export const shadcnTableContainer = style({
  width: '100%',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '12px',
  backgroundColor: cssVarV2('layer/background/primary'),
  overflow: 'visible',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
});

export const shadcnTable = style({
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontSize: '13.5px',
  textAlign: 'left',
});

export const shadcnTheadTr = style({
  backgroundColor: cssVarV2('layer/background/secondary'),
});

export const shadcnTh = style({
  height: '44px',
  padding: '0 14px',
  fontWeight: 600,
  fontSize: '12.5px',
  color: cssVarV2('text/secondary'),
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  whiteSpace: 'nowrap',
  userSelect: 'none',
  selectors: {
    '&:first-child': {
      borderTopLeftRadius: '11px',
      width: '36px',
      paddingLeft: '12px',
      paddingRight: '4px',
    },
    '&:nth-child(2)': {
      width: '38px',
      paddingLeft: '8px',
      paddingRight: '8px',
    },
    '&:last-child': {
      borderTopRightRadius: '11px',
      width: '48px',
      textAlign: 'right',
      paddingRight: '14px',
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
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
    },
    '&[data-dragging="true"]': {
      opacity: 0.5,
    },
  },
});

export const shadcnTd = style({
  height: '54px',
  padding: '8px 14px',
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  color: cssVarV2('text/primary'),
  verticalAlign: 'middle',
  selectors: {
    [`${shadcnTr}:last-child &`]: {
      borderBottom: 'none',
    },
    '&:first-child': {
      width: '36px',
      paddingLeft: '12px',
      paddingRight: '4px',
    },
    '&:nth-child(2)': {
      width: '38px',
      paddingLeft: '8px',
      paddingRight: '8px',
    },
    '&:last-child': {
      width: '48px',
      textAlign: 'right',
      paddingRight: '14px',
      position: 'relative',
    },
  },
});

export const gripHandle = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '28px',
  borderRadius: '4px',
  color: cssVarV2('text/secondary'),
  opacity: 0.55,
  cursor: 'grab',
  fontSize: '13px',
  letterSpacing: '-1px',
  userSelect: 'none',
  selectors: {
    '&:hover': {
      opacity: 1,
      backgroundColor: cssVarV2('layer/background/secondary'),
    },
    '&:active': {
      cursor: 'grabbing',
    },
  },
});

export const shadcnCheckbox = style({
  width: '15px',
  height: '15px',
  borderRadius: '4px',
  cursor: 'pointer',
  accentColor: cssVar('primaryColor'),
  verticalAlign: 'middle',
});

export const headerCellLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  fontWeight: 500,
  fontSize: '13.5px',
  color: cssVarV2('text/primary'),
  background: 'none',
  border: 'none',
  padding: '4px 0',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'color 120ms ease',
  selectors: {
    '&:hover': {
      color: cssVar('primaryColor'),
      textDecoration: 'underline',
      textUnderlineOffset: '3px',
    },
  },
});

export const outlinePill = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '3px 11px',
  borderRadius: '9999px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: 'rgba(148, 163, 184, 0.06)',
  color: cssVarV2('text/secondary'),
  fontSize: '12px',
  fontWeight: 500,
  lineHeight: '18px',
  whiteSpace: 'nowrap',
});

export const statusPillBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '3px 11px',
  borderRadius: '9999px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: 'rgba(148, 163, 184, 0.06)',
  color: cssVarV2('text/primary'),
  fontSize: '12px',
  fontWeight: 500,
  lineHeight: '18px',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transition: 'border-color 120ms ease, background-color 120ms ease',
  selectors: {
    '&:hover': {
      borderColor: cssVar('primaryColor'),
      backgroundColor: cssVarV2('layer/background/secondary'),
    },
  },
});

export const inlineNumInput = style({
  width: '54px',
  height: '30px',
  padding: '0 8px',
  borderRadius: '6px',
  border: '1px solid transparent',
  backgroundColor: 'transparent',
  color: cssVarV2('text/primary'),
  fontSize: '13px',
  fontWeight: 500,
  textAlign: 'right',
  outline: 'none',
  transition: 'border-color 120ms ease, background-color 120ms ease',
  selectors: {
    '&:hover': {
      borderColor: cssVarV2('layer/insideBorder/border'),
      backgroundColor: cssVarV2('layer/background/secondary'),
    },
    '&:focus': {
      borderColor: cssVar('primaryColor'),
      backgroundColor: cssVarV2('layer/background/secondary'),
    },
  },
});

export const reviewerSelect = style({
  height: '32px',
  minWidth: '148px',
  padding: '0 10px',
  borderRadius: '8px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: 'transparent',
  color: cssVarV2('text/primary'),
  fontSize: '13px',
  fontWeight: 400,
  cursor: 'pointer',
  outline: 'none',
  transition: 'border-color 120ms ease, background-color 120ms ease',
  selectors: {
    '&[data-Assigned="true"]': {
      borderColor: 'transparent',
      paddingLeft: '4px',
    },
    '&:hover': {
      borderColor: cssVarV2('layer/insideBorder/border'),
      backgroundColor: cssVarV2('layer/background/secondary'),
    },
    '&:focus': {
      borderColor: cssVar('primaryColor'),
    },
  },
});

export const rowMenuBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: 'transparent',
  color: cssVarV2('text/secondary'),
  fontSize: '16px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background-color 120ms ease, color 120ms ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVarV2('layer/background/secondary'),
      color: cssVarV2('text/primary'),
    },
  },
});

export const rowDropdownMenu = style({
  position: 'absolute',
  right: '14px',
  top: '44px',
  zIndex: 120,
  minWidth: '170px',
  padding: '5px',
  borderRadius: '8px',
  backgroundColor: cssVarV2('layer/background/overlayPanel'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.35)',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  textAlign: 'left',
});

export const rowDropdownItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  padding: '7px 10px',
  borderRadius: '5px',
  border: 'none',
  backgroundColor: 'transparent',
  color: cssVarV2('text/primary'),
  fontSize: '12.5px',
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left',
  selectors: {
    '&:hover': {
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    },
    '&[data-danger="true"]': {
      color: '#f87171',
    },
    '&[data-danger="true"]:hover': {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
  },
});

export const tableFooterBar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 4px',
  fontSize: '12.5px',
  color: cssVarV2('text/secondary'),
  flexWrap: 'wrap',
  gap: '12px',
});
