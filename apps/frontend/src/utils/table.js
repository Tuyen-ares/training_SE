export const TABLE_ACTION_WIDTHS = Object.freeze({
  compact: 112,
  normal: 144,
  wide: 224,
})

export function actionWidth(size = 'normal') {
  return TABLE_ACTION_WIDTHS[size] || TABLE_ACTION_WIDTHS.normal
}

export function actionColumn({ key = 'action', size = 'normal', fixed = false, ...column } = {}) {
  return {
    ...column,
    title: 'Action',
    key,
    width: actionWidth(size),
    align: 'right',
    ...(fixed ? { fixed: 'right' } : {}),
  }
}
