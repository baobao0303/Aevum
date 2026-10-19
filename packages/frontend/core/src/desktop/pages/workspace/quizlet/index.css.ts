import { cssVarV2 } from '@toeverything/theme/v2';
import { keyframes, style } from '@vanilla-extract/css';

const fadeIn = keyframes({
  from: { opacity: 0, transform: 'translateY(4px)' },
  to: { opacity: 1, transform: 'translateY(0)' },
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
  minWidth: 0,
  height: '100%',
  padding: '0 16px',
  gap: '12px',
  flexWrap: 'nowrap',
  overflow: 'hidden',
});

export const breadcrumbBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '13px',
  fontWeight: 600,
  minWidth: 0,
  flexShrink: 0,
});

export const toolbarGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'nowrap',
  flexShrink: 0,
});

export const viewSwitchGroup = style({
  display: 'inline-flex',
  alignItems: 'center',
  height: '36px',
  padding: '3px',
  borderRadius: '8px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  gap: '4px',
  boxSizing: 'border-box',
  flexShrink: 0,
  whiteSpace: 'nowrap',
});

export const viewSwitchBtn = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  height: '30px',
  padding: '0 14px',
  borderRadius: '6px',
  fontSize: '13.5px',
  fontWeight: 500,
  lineHeight: '20px',
  border: 'none',
  background: 'transparent',
  color: cssVarV2('text/secondary'),
  cursor: 'pointer',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  transition: 'all 140ms ease',
  selectors: {
    '&:hover': {
      color: cssVarV2('text/primary'),
    },
    '&[data-active="true"]': {
      backgroundColor: cssVarV2('layer/background/overlayPanel'),
      color: cssVarV2('text/primary'),
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
    },
  },
});

export const controlInput = style({
  height: '32px',
  padding: '0 12px',
  borderRadius: '6px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  fontSize: '13px',
  lineHeight: '20px',
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

export const actionButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  height: '32px',
  padding: '0 12px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 500,
  lineHeight: '20px',
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

export const outlinePill = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '26px',
  padding: '0 10px',
  borderRadius: '6px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/secondary'),
  fontSize: '12.5px',
  fontWeight: 500,
  lineHeight: '22px',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
});

export const countBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '24px',
  height: '22px',
  padding: '0 6px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 500,
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/primary'),
  color: cssVarV2('text/secondary'),
  fontVariantNumeric: 'tabular-nums',
});

export const contentArea = style({
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  padding: '16px 24px',
  gap: '16px',
  animation: `${fadeIn} 150ms ease-out`,
  scrollbarWidth: 'thin',
  scrollbarColor: `${cssVarV2('layer/insideBorder/border')} transparent`,
});

export const studySetBanner = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  borderRadius: '8px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
  gap: '16px',
  flexWrap: 'wrap',
});

export const bannerTitle = style({
  fontSize: '16px',
  fontWeight: 600,
  color: cssVarV2('text/primary'),
  margin: '0 0 4px 0',
});

export const bannerDesc = style({
  fontSize: '12.5px',
  color: cssVarV2('text/secondary'),
  margin: 0,
});

export const statCard = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 18px',
  borderRadius: '8px',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/primary'),
  minWidth: '100px',
});

export const statNumber = style({
  fontSize: '20px',
  fontWeight: 700,
  color: cssVarV2('text/primary'),
  fontVariantNumeric: 'tabular-nums',
});

export const statLabel = style({
  fontSize: '11px',
  fontWeight: 500,
  color: cssVarV2('text/secondary'),
  marginTop: '2px',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
});

export const shadcnCard = style({
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
});

export const shadcnTableContainer = style({
  width: '100%',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '8px',
  overflow: 'hidden',
  backgroundColor: cssVarV2('layer/background/primary'),
});

export const shadcnTable = style({
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
  fontSize: '13px',
});

export const shadcnThead = style({
  backgroundColor: cssVarV2('layer/background/secondary'),
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const shadcnTh = style({
  padding: '8px 14px',
  fontSize: '12px',
  fontWeight: 500,
  color: cssVarV2('text/secondary'),
  height: '36px',
  boxSizing: 'border-box',
});

export const shadcnTr = style({
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  transition: 'background-color 120ms ease',
  selectors: {
    '&:hover': {
      backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    },
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const shadcnTd = style({
  padding: '10px 14px',
  color: cssVarV2('text/primary'),
  verticalAlign: 'middle',
});

export const modalOverlay = style({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(2px)',
});

export const modalContent = style({
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '10px',
  padding: '24px',
  width: '100%',
  maxWidth: '540px',
  boxShadow:
    '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  maxHeight: '90vh',
  overflowY: 'auto',
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
});

export const formLabel = style({
  fontSize: '12px',
  fontWeight: 600,
  color: cssVarV2('text/secondary'),
});

export const tagChip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 500,
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  color: cssVarV2('text/primary'),
  whiteSpace: 'nowrap',
});

export const folderBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 500,
  backgroundColor: 'rgba(59, 130, 246, 0.1)',
  color: '#3b82f6',
  border: '1px solid rgba(59, 130, 246, 0.25)',
  whiteSpace: 'nowrap',
});

export const collectionBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 500,
  backgroundColor: 'rgba(168, 85, 247, 0.1)',
  color: '#a855f7',
  border: '1px solid rgba(168, 85, 247, 0.25)',
  whiteSpace: 'nowrap',
});

export const filterBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
  padding: '8px 12px',
  borderRadius: '8px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const modalContentLarge = style({
  backgroundColor: cssVarV2('layer/background/primary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '12px',
  padding: '24px',
  width: '100%',
  maxWidth: '780px',
  boxShadow:
    '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
  maxHeight: '90vh',
  overflowY: 'auto',
});

export const dropzoneArea = style({
  border: `2px dashed ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: '8px',
  padding: '24px 16px',
  textAlign: 'center',
  backgroundColor: cssVarV2('layer/background/secondary'),
  cursor: 'pointer',
  transition: 'border-color 150ms ease, background-color 150ms ease',
  selectors: {
    '&:hover': {
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.04)',
    },
  },
});

export const centerStage = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  maxWidth: '980px',
  margin: '8px auto',
  gap: '24px',
});

export const cardInputRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr auto',
  gap: '8px',
  alignItems: 'center',
  padding: '8px 12px',
  borderRadius: '6px',
  backgroundColor: cssVarV2('layer/background/secondary'),
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});
