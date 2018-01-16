var html = require('choo/html')
var signalhub = require('signalhubws')
var swarm = require('webrtc-swarm')
var getUserMedia = require('getusermedia')
var recorder = require('media-recorder-stream')
var hypercore = require('hypercore')
var ram = require('random-access-memory')
var pump = require('pump')
var cluster = require('webm-cluster-stream')
var mimeType = require('./lib/getMimeType')(window.MediaRecorder.isTypeSupported)
var config = require('./config')

module.exports = broadcast

function broadcast (state, emit) {
  return html`
    <div>
      <div style="margin-bottom: 12px">
        <video id="preview" controls autoplay></video>
      </div>

      <div style="margin-bottom: 12px">
        <button onclick=${startBroadcasting}>
          Start broadcast
        </button>
      </div>

      <div>
        Key: ${state.broadcast.key ? state.broadcast.key : 'waiting...'}
      </div>
    </div>
  `

  function startBroadcasting () {
    getUserMedia(function (err, stream) {
      if (err) return console.log('getUserMedia error', err)

      var elPreview = document.getElementById('preview')
      elPreview.muted = true
      elPreview.srcObject = stream

      var mediaRecorder = recorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 200000,
        audioBitsPerSecond: 32000
      })

      var feed = hypercore(ram)
      feed.on('ready', function () {
        var key = feed.key.toString('hex')
        var discoveryKey = feed.discoveryKey.toString('hex')
        emit('broadcast:key:set', key)

        var hub = signalhub(discoveryKey, config.signalhub)
        var sw = swarm(hub)
        sw.on('peer', function (peer, id) {
          pump(peer, feed.replicate({ live: true, encrypt: false }), peer)
        })
      })

      var mediaStream = pump(mediaRecorder, cluster())
      mediaStream.on('data', function (data) {
        console.log('appending to broadcast:', data)
        feed.append(data)
      })
    })
  }
}
