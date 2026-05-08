export const colors = {
  paper: '#f1ece0',
  paperDeep: '#e6dfcc',
  paperEdge: '#d9d2c0',
  ink: '#2a3a30',
  inkSoft: '#5a6a60',
  inkFaint: '#8a9088',
  forest: '#3a5a3e',
  forestDeep: '#2a3a2e',
  forestPale: '#a8c0a8',
  amber: '#a36a3a',
  danger: '#9a3a2e',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radii = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

export const elevation = {
  elev1: {
    shadowColor: 'rgba(45,74,58,0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    shadowOpacity: 1,
    elevation: 4,
  },
} as const;

export const fonts = {
  serif: 'Fraunces_500Medium',
  serifLight: 'Fraunces_300Light',
  serifBold: 'Fraunces_600SemiBold',
  sans: 'Inter_400Regular',
  sansBold: 'Inter_600SemiBold',
} as const;

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label'
  | 'numeral';

export const typography: Record<TextVariant, {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'uppercase';
  fontVariant?: ('tabular-nums')[];
  color?: string;
}> = {
  display:    { fontFamily: fonts.serifLight, fontSize: 56, lineHeight: 60, fontVariant: ['tabular-nums'], letterSpacing: -2 },
  title:      { fontFamily: fonts.serif,      fontSize: 24, lineHeight: 30 },
  heading:    { fontFamily: fonts.serifBold,  fontSize: 18, lineHeight: 24 },
  body:       { fontFamily: fonts.sans,       fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.sansBold,   fontSize: 15, lineHeight: 22 },
  caption:    { fontFamily: fonts.sans,       fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  label:      { fontFamily: fonts.sansBold,   fontSize: 11, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.inkSoft },
  numeral:    { fontFamily: fonts.sansBold,   fontSize: 16, lineHeight: 20, fontVariant: ['tabular-nums'] },
};

export const theme = { colors, space, radii, elevation, fonts, typography } as const;
export type Theme = typeof theme;
