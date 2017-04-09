function split (array, numberOfPieces, cb) {
  var length = array.length
  var size = Math.floor(length / numberOfPieces)

  var result = []

  for (var i = 0; i < numberOfPieces; i++) {
    var chunk = array.slice(i * size, (i + 1) * size)
    result.push(chunk)
  }

  var leftover = array.slice(numberOfPieces * size, length)
  result.push(leftover)

  cb(result)
}

module.exports = split
