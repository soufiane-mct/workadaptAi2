/**
 * Palette et styles partagés par tous les graphiques ECharts.
 *
 * Centraliser ces valeurs évite les dérives de couleur entre les pages et
 * permet de faire évoluer l'identité visuelle en un seul endroit.
 */
export const CHART_COLORS = {
  primary: '#2f54eb',
  primaryLight: '#6b7fff',
  violet: '#7c3aed',
  grid: '#edf0f7',
  axis: '#6b7488',
  axisFaint: '#98a1b3',
  track: '#e3e8f4',
  surface: '#fbfcff',
} as const;

export const AXIS_LABEL = { fontSize: 11, color: CHART_COLORS.axis };

export const LEGEND_TEXT = { fontSize: 11, color: CHART_COLORS.axis };

export const TOOLTIP = {
  backgroundColor: '#141b2d',
  borderWidth: 0,
  padding: [8, 12],
  textStyle: { color: '#ffffff', fontSize: 11.5 },
  extraCssText: 'border-radius:10px;box-shadow:0 14px 34px -14px rgba(14,20,37,.55);',
};
