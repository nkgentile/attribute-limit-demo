import {orderBy} from 'natural-orderby'

export function reducer(item: any, key: string, array: any[]) {
  if (Array.isArray(item)) {
    array.push({
      key,
      type: 'array',
    })

    for (const subItem of item) {
      reducer(subItem, `${key}[]`, array)
    }
  } else if (typeof item === 'object') {
    array.push({
      key,
      type: 'object',
    })

    for (const subItem in item) {
      if (item.hasOwnProperty(subItem)) {
        reducer(item[subItem], `${key}.${subItem}`, array)
      }
    }
  } else {
    array.push({
      key,
      type: typeof item,
    })
  }

  return array
}

export function uniq(array: any[]) {
  // Generate set with stringified list objects and then parse to array of objects
  return orderBy(
    [...new Set(array.map((o) => JSON.stringify(o)))].map((s) => JSON.parse(s)),
    [(v) => v.key],
    ['asc'],
  )
}
