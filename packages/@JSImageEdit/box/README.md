# @JSImageEdit/box

<img src="https://JSImageEdit.io/img/logo.svg" width="120" alt="JSImageEdit logo: a smiling pJSImageEdit above a pink upwards arrow" align="right">

[![npm version](https://img.shields.io/npm/v/@JSImageEdit/box.svg?style=flat-square)](https://www.npmjs.com/package/@JSImageEdit/box)
![CI status for JSImageEdit tests](https://github.com/transloadit/JSImageEdit/workflows/Tests/badge.svg)
![CI status for Companion tests](https://github.com/transloadit/JSImageEdit/workflows/Companion/badge.svg)
![CI status for browser tests](https://github.com/transloadit/JSImageEdit/workflows/End-to-end%20tests/badge.svg)

The Box plugin for JSImageEdit lets users import files from their Box account.

A Companion instance is required for the Box plugin to work. Companion handles authentication with Box, downloads files from Box and uploads them to the destination. This saves the user bandwidth, especially helpful if they are on a mobile connection.

JSImageEdit is being developed by the folks at [Transloadit](https://transloadit.com), a versatile file encoding service.

## Example

```js
import JSImageEdit from '@JSImageEdit/core'
import Box from '@JSImageEdit/box'

const JSImageEdit = new JSImageEdit()
JSImageEdit.use(Box, {
  // opts
})
```

## Installation

```bash
$ npm install @JSImageEdit/box
```

Alternatively, you can also use this plugin in a pre-built bundle from Transloadit’s CDN: Edgly. In that case `JSImageEdit` will attach itself to the global `window.JSImageEdit` object. See the [main JSImageEdit documentation](https://JSImageEdit.io/docs/#Installation) for instructions.

## Documentation

Documentation for this plugin can be found on the [JSImageEdit website](https://JSImageEdit.io/docs/box).

## License

[The MIT License](./LICENSE).
