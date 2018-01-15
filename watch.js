var html = require('choo/html')
var signalhub = require('signalhub')
var swarm = require('webrtc-swarm')
var hypercore = require('hypercore')
var ram = require('random-access-memory')
var pump = require('pump')

module.exports = watch

function watch (state, emit) {
  var mediaSource = new MediaSource()

  return html`
    <div>
      <div style="margin-bottom: 12px">
        <video id="player" controls autoplay></video>
      </div>

      <div style="margin-bottom: 12px">
        <button onclick=${startWatching}>
          Watch broadcast
        </button>
      </div>

      <div>
        Key: <input type="text" id="key-input"/>
      </div>
    </div>
  `

  function startWatching () {
    mediaSource.addEventListener('sourceopen', open)

    var el_player = document.getElementById('player')
    el_player.src = URL.createObjectURL(mediaSource)
  }

  function open () {
    var sourceBuffer = mediaSource.addSourceBuffer('video/webm;codecs=vp9,opus')

    var hash = document.getElementById('key-input').value
    var feed = hypercore(ram, hash, {sparse: true})
    feed.on('ready', function () {
      console.log('feed ready')

      feed.download({ linear: true })
      console.log('downloading feed')

      var key = feed.discoveryKey.toString('hex')
      var hub = signalhub(key, ['https://signalhub-tvwgmvuztw.now.sh'])
      var sw = swarm(hub)
      console.log('connecting to swarm')

      sw.on('peer', function (peer, id) {
        console.log('new peer found:', id)
        pump(peer, feed.replicate({ live: true, download: true, encrypt: false }), peer)
      })

      var block = 0
      getBlock(function () {
        sourceBuffer.addEventListener('updateend', function () {
          getBlock()
        })
      })

      function getBlock (cb) {
        console.log('getting block', block)
        feed.get(block, function (err, data) {
          console.log('got block ' + block, data)
          sourceBuffer.appendBuffer(data.buffer)
          block++

          if (cb) return cb()
        })
      }
    })
  }
}
