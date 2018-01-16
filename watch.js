var html = require('choo/html')
var signalhub = require('signalhubws')
var swarm = require('webrtc-swarm')
var hypercore = require('hypercore')
var ram = require('random-access-memory')
var pump = require('pump')
var mimeType = require('./lib/getMimeType')(window.MediaSource.isTypeSupported)
var config = require('./config')

module.exports = watch

function watch (state, emit) {
  var mediaSource = new window.MediaSource()

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

    var elPlayer = document.getElementById('player')
    elPlayer.src = window.URL.createObjectURL(mediaSource)
    elPlayer.play()
  }

  function open () {
    var sourceBuffer = mediaSource.addSourceBuffer(mimeType)

    var hash = document.getElementById('key-input').value
    var feed = hypercore(ram, hash, {sparse: true})
    feed.on('ready', function () {
      feed.download({ linear: true })

      var key = feed.discoveryKey.toString('hex')
      var hub = signalhub(key, config.signalhub)
      var sw = swarm(hub)
      console.log('🌐 connecting to swarm')

      sw.on('peer', function (peer, id) {
        console.log('🙋 new peer found:', id)
        pump(peer, feed.replicate({ live: true, download: true, encrypt: false }), peer)
      })

      var block = 0
      getBlock(function () {
        sourceBuffer.addEventListener('updateend', function () {
          getBlock()
        })
      })

      function getBlock (cb) {
        feed.get(block, function (err, data) {
          console.log('⚡️ appending block ' + block)
          sourceBuffer.appendBuffer(data.buffer)
          block++

          if (cb) return cb()
        })
      }
    })
  }
}
