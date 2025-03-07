import {definePlugin} from 'sanity'

import AttributeTool from './tool'

export const attributes = definePlugin({
  name: 'attributes',
  tools: [AttributeTool],
})
