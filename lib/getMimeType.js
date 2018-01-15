var MIME_TYPES = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus']

function getMimeType (supportFn) {
  return MIME_TYPES.map(function (e) {
    return supportFn(e) ? e : null
  }).filter(function (e) {
    return e !== null
  })[0]
}

module.exports = getMimeType
