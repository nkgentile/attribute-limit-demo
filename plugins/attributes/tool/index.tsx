import {Badge, Box, Card, Inline, Label, Select, Stack, Text, useToast} from '@sanity/ui'
import {startTransition, Suspense, useDeferredValue, useMemo, useState} from 'react'
import {useObservable} from 'react-rx'
import {catchError, map, of} from 'rxjs'
import {
  DEFAULT_STUDIO_CLIENT_OPTIONS,
  LoadingBlock,
  type Tool,
  useClient,
  useDocumentStore,
  useSchema,
} from 'sanity'
import styled from 'styled-components'

import {reducer, uniq} from './utils'

const UnstyledList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  display: flex;
  flex-flow: column nowrap;
  gap: 0.1lh;
`

const Root = styled(Stack).attrs({
  space: 4,
  padding: [0, 0, 0, 5],
  style: {
    gridTemplateRows: 'min-height 1fr',
  },
})`
  display: grid;
  grid-template-columns: 1fr;

  height: 100%;
  max-height: 100%;
`

function AttributesList({attributes}: {attributes: Array<{key: string; type: string}>}) {
  return (
    <UnstyledList>
      {attributes.map((attribute) => (
        <li key={`${attribute.key}__${attribute.type}`}>
          <Inline space={2} wrap="nowrap">
            <Text>{attribute.key}</Text>
            <Badge>{attribute.type}</Badge>
          </Inline>
        </li>
      ))}
    </UnstyledList>
  )
}

function AttributeTool() {
  const documentStore = useDocumentStore()
  const documentTypes = useDocumentTypes()
  const toast = useToast()

  const [activeTypeName, setActiveTypeName] = useState('')
  const deferredTypeName = useDeferredValue(activeTypeName)

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    startTransition(() => {
      setActiveTypeName(event.currentTarget.value)
    })
  }

  const attributes$ = useMemo(
    () =>
      documentStore
        .listenQuery(
          `*[${deferredTypeName && `_type == $type`}]`,
          {type: deferredTypeName},
          {
            ...DEFAULT_STUDIO_CLIENT_OPTIONS,
            perspective: 'raw',
            throttleTime: 1000,
            tag: deferredTypeName === '' ? `all-attributes` : `${deferredTypeName}-attributes`,
          },
        )
        .pipe(
          map((documents) => reducer(documents, 'root', [])),
          map((attributes) =>
            attributes.reduce<Array<{key: string; type: string}>>((acc, attribute) => {
              if (!(attribute.key === 'root' || attribute.key === 'root[]')) {
                acc.push({
                  ...attribute,
                  key: attribute.key.replace(/^root\[\]\./, ''),
                })
              }

              return acc
            }, []),
          ),
          map(uniq),
          catchError((error) => {
            console.error(error)
            toast.push({
              status: 'error',
              title: 'Error',
              description: `${error}`,
            })
            return of([])
          }),
        ),
    [documentStore, toast, deferredTypeName],
  )

  const attributes = useObservable(attributes$)

  return (
    <Root>
      <Card border padding={4}>
        <Stack space={4}>
          <Box>
            <Label size={4}>Attribute Overview</Label>
          </Box>
          <Box>
            <Text>
              Select a document type to see an overview of the attributes that are currently on that
              type. The <code>all</code> option will show attributes from all document types.
            </Text>
          </Box>
          <Select onChange={handleTypeChange} value={activeTypeName}>
            <option value="">All</option>
            {Array.isArray(documentTypes) &&
              documentTypes.map((type) => (
                <option key={type.name} value={type.name}>
                  {'title' in type ? (type.title ?? type.name) : type.name}
                </option>
              ))}
          </Select>
        </Stack>
      </Card>

      <Card border padding={4} style={{alignSelf: 'stretch'}}>
        <Suspense fallback={<LoadingBlock />}>
          {Array.isArray(attributes) ? (
            <Stack space={4}>
              <Stack space={2}>
                <Label size={4}>Attribute Count:</Label>
                <Text>{attributes.length}</Text>
              </Stack>
              <Stack space={2}>
                <Label size={4}>Attributes:</Label>
                {attributes.length ? <AttributesList attributes={attributes} /> : null}
              </Stack>
            </Stack>
          ) : (
            <LoadingBlock />
          )}
        </Suspense>
      </Card>
    </Root>
  )
}

export default {
  name: 'attributes',
  title: 'Attributes',
  component: AttributeTool,
} satisfies Tool<void>

function useDocumentTypes() {
  const schema = useSchema()
  const client = useClient(DEFAULT_STUDIO_CLIENT_OPTIONS)
  const toast = useToast()
  const documentTypes$ = useMemo(
    () =>
      client.observable
        .fetch<string[]>(
          `
            array::compact(
              array::unique(
                *[!(string::startsWith(_type, "sanity.") || string::startsWith(_type, "system."))]._type
              )
            )
        `,
        )
        .pipe(
          map((typeNames) => typeNames.map((name) => schema.get(name) ?? ({name} as const))),
          catchError((error) => {
            console.error(error)
            toast.push({
              status: 'error',
              title: 'Error',
              description: `${error}`,
            })

            return of([])
          }),
        ),
    [client.observable, schema, toast],
  )

  return useObservable(documentTypes$, [])
}
