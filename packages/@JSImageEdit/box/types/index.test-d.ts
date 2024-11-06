import JSImageEdit from '@JSImageEdit/core'
import Box from '..'

{
  const JSImageEdit = new JSImageEdit()
  JSImageEdit.use(Box, {
    companionUrl: '',
    companionCookiesRule: 'same-origin',
    target: 'body',
    title: 'title',
  })
}
