import { useMemo } from 'react'
import PropTypes from 'prop-types'

import { mergeProps, applyPropHooks } from '../utils'
import { addActions, actions } from '../actions'
import { defaultState } from '../hooks/useTableState'

defaultState.expanded = []

addActions('toggleExpanded', 'useExpanded')

const propTypes = {
  manualExpandedKey: PropTypes.string,
  paginateExpandedRows: PropTypes.bool,
}

export const useExpanded = hooks => {
  hooks.getExpandedToggleProps = []
  hooks.useMain.push(useMain)
}

useExpanded.pluginName = 'useExpanded'

function useMain(instance) {
  PropTypes.checkPropTypes(propTypes, instance, 'property', 'useExpanded')

  const {
    debug,
    rows,
    manualExpandedKey = 'expanded',
    paginateExpandedRows = true,
    hooks,
    state: [{ expanded }, setState],
  } = instance

  const toggleExpandedByPath = (path, set) => {
    const key = path.join('.')

    return setState(old => {
      const exists = old.expanded.includes(key)
      const shouldExist = typeof set !== 'undefined' ? set : !exists
      let newExpanded = new Set(old.expanded)

      if (!exists && shouldExist) {
        newExpanded.add(key)
      } else if (exists && !shouldExist) {
        newExpanded.delete(key)
      } else {
        return old
      }

      return {
        ...old,
        expanded: [...newExpanded.values()],
      }
    }, actions.toggleExpanded)
  }

  hooks.prepareRow.push(row => {
    row.toggleExpanded = set => toggleExpandedByPath(row.path, set)
    row.getExpandedToggleProps = props => {
      return mergeProps(
        {
          onClick: e => {
            e.persist()
            row.toggleExpanded()
          },
          style: {
            cursor: 'pointer',
          },
          title: 'Toggle Expanded',
        },
        applyPropHooks(instance.hooks.getExpandedToggleProps, row, instance),
        props
      )
    }
    return row
  })

  const expandedRows = useMemo(() => {
    if (process.env.NODE_ENV === 'development' && debug)
      console.info('getExpandedRows')

    const expandedRows = []

    // Here we do some mutation, but it's the last stage in the
    // immutable process so this is safe
    const handleRow = row => {
      const key = row.path.join('.')
      row.isExpanded =
        (row.original && row.original[manualExpandedKey]) ||
        expanded.includes(key)

      expandedRows.push(row)

      row.canExpand = row.subRows && !!row.subRows.length

      if (
        paginateExpandedRows &&
        row.isExpanded &&
        row.subRows &&
        row.subRows.length
      ) {
        row.subRows.forEach(handleRow)
      }

      return row
    }

    rows.forEach(handleRow)

    return expandedRows
  }, [debug, rows, manualExpandedKey, expanded, paginateExpandedRows])

  const expandedDepth = findExpandedDepth(expanded)

  return {
    ...instance,
    toggleExpandedByPath,
    expandedDepth,
    rows: expandedRows,
  }
}

function findExpandedDepth(expanded) {
  let maxDepth = 0

  expanded.forEach(key => {
    const path = key.split('.')
    maxDepth = Math.max(maxDepth, path.length)
  })

  return maxDepth
}
