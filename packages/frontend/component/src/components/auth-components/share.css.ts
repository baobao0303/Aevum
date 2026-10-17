import { cssVar } from '@toeverything/theme';
import { globalStyle, style } from '@vanilla-extract/css';
export const authContainer = style({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
});

export const authHeaderWrapper = style({
  marginBottom: '20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  width: '100%',
});
globalStyle(`${authHeaderWrapper} .logo`, {
  display: 'block',
  color: cssVar('black'),
  background: 'transparent',
  margin: '0 auto 10px auto',
  flexShrink: 0,
});

globalStyle(`${authHeaderWrapper} > p:first-of-type`, {
  fontSize: '18px',
  fontWeight: 600,
  letterSpacing: '-0.01em',
  margin: 0,
  lineHeight: '26px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  textAlign: 'center',
});
globalStyle(`${authHeaderWrapper} > p:last-of-type`, {
  fontSize: '18px',
  fontWeight: 600,
  letterSpacing: '-0.01em',
  lineHeight: '26px',
  textAlign: 'center',
  width: '100%',
});

export const authContent = style({
  fontSize: '14px',
  lineHeight: '20px',
  flexGrow: 1,
});

globalStyle(`${authContent} > *:not(:last-child)`, {
  marginBottom: '16px',
});

export const authInputWrapper = style({
  position: 'relative',
  marginBottom: '16px',
  selectors: {
    '&.with-hint': {
      marginBottom: '12px',
    },
  },
});

export const authFooter = style({
  marginTop: '16px',
});

globalStyle(`${authFooter} > *:not(:last-child)`, {
  marginBottom: '16px',
});

globalStyle(`${authInputWrapper} label`, {
  display: 'block',
  color: cssVar('textSecondaryColor'),
  marginBottom: '6px',
  fontSize: '13px',
  fontWeight: 500,
  lineHeight: '18px',
});

globalStyle(`${authInputWrapper} input`, {
  fontSize: '14px',
  fontWeight: 400,
  lineHeight: '20px',
});

export const authInputError = style({
  color: cssVar('errorColor'),
  fontSize: '12px',
  lineHeight: '16px',
  marginTop: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
});

globalStyle(`${authContent} a`, {
  color: cssVar('linkColor'),
});

export const authPageContainer = style({
  height: '100vh',
  width: '100vw',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: cssVar('fontBase'),
  '@media': {
    'screen and (max-width: 1024px)': {
      flexDirection: 'column',
      padding: '100px 20px',
      justifyContent: 'flex-start',
    },
  },
});
globalStyle(`${authPageContainer} .wrapper`, {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  justifyContent: 'center',
  overflow: 'hidden',
  '@media': {
    'screen and (max-width: 1024px)': {
      flexDirection: 'column',
      justifyContent: 'flex-start',
    },
  },
});
globalStyle(`${authPageContainer} .content`, {
  maxWidth: '810px',
  '@media': {
    'screen and (min-width: 1024px)': {
      marginLeft: '200px',
      minWidth: '500px',
      marginRight: '60px',
      flexGrow: 1,
      flexShrink: 0,
      flexBasis: 0,
    },
    'screen and (max-width: 1024px)': {
      maxWidth: '600px',
      width: '100%',
      margin: 'auto',
    },
  },
});
globalStyle(`${authPageContainer} .title`, {
  fontSize: cssVar('fontTitle'),
  fontWeight: 600,
  marginBottom: '28px',
});
globalStyle(`${authPageContainer} .subtitle`, {
  marginBottom: '28px',
});
globalStyle(`${authPageContainer} a`, {
  color: cssVar('linkColor'),
});
export const signInPageContainer = style({
  height: '100vh',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
});
export const input = style({
  width: '330px',
  position: 'relative',
  '@media': {
    'screen and (max-width: 520px)': {
      width: '100%',
    },
  },
});

export const hideInSmallScreen = style({
  '@media': {
    'screen and (max-width: 1024px)': {
      display: 'none',
    },
  },
});

export const illustration = style({
  flexShrink: 0,
  width: '670px',
});
