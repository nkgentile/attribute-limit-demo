import {defineConfig} from 'sanity'

import {attributes} from './plugins/attributes'

export default defineConfig({
  name: 'default',
  title: 'Attribute Limit',

  projectId: 'h7diz1ml',
  dataset: 'dev',

  plugins: [attributes()],

  scheduledPublishing: {
    enabled: false,
  },
})
