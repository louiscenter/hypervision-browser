var choo = require('choo')
var html = require('choo/html')
var css = require('sheetify')

var getUserMedia = require('getusermedia')
var recorder = require('media-recorder-stream')
var hypercore = require('hypercore')
var ram = require('random-access-memory')
var signalhub = require('signalhub')
var swarm = require('webrtc-swarm')
var pump = require('pump')
var cluster = require('webm-cluster-stream')

var split = require('./split')

var app = choo()
app.use(function (state, emitter) {
  state.key = ''

  emitter.on('updateKey', function (data) {
    state.key = data
    emitter.emit('render')
  })
})

var style = css`
  :host {
    h1 { color: orange; }
  }
`

var home = function (state, emit) {
  return html`
    <div class=${style}>
      <h1>hypercast.club</h1>
      <h2><a href="/broadcast">Broadcast</a></h2>
      <h2><a href="/watch">Watch</a></h2>
      <div>enter key before clicking "Watch":</div>
      <input type="text" oninput=${ updateKey } value=${ state.key } />
    </div>
  `

  function updateKey (e) {
    emit('updateKey', e.target.value)
  }
}

var broadcast = function (state, emit) {
  return html`
    <div class=${style} onload=${start}>
      <h1>broadcasts</h1>
      <h3>key: ${state.key}</h3>
      <video id="player" autoplay controls muted></video>
    </div>
  `

  function start () {
    getUserMedia(function (err, stream) {
      if (err) {
        console.log('getUserMedia error:', err)
      } else {
        document.getElementById('player').srcObject = stream
        var opts = {
          mimeType: 'video/webm;codecs=vp9,opus',
          videoBitsPerSecond: 500000,
          audioBitsPerSecond: 64000
        }

        var mediaRecorder = recorder(stream, opts)

        var feed = hypercore(ram)

        feed.on('ready', function () {
          console.log('feed ready')

          var key = feed.key.toString('hex')
          var discoveryKey = feed.discoveryKey.toString('hex')

          updateKey(key)

          var hub = signalhub(discoveryKey, ['https://signalhub.mafintosh.com'])

          var sw = swarm(hub)
          sw.on('peer', function (peer, id) {
            console.log('connected to new peer:', id)
            pump(peer, feed.replicate({ live: true, encrypt: false }), peer, function (err) {
              if (err) console.log('pump error:', err)
            })
          })
        })

        var mediaStream = pump(mediaRecorder, cluster(), function (err) {
          if (err) console.log('pump error:', err)
        })

        mediaStream.on('data', function (data) {
          console.log('appending new data:', data)
          // if (data.length > 1000) {
          //   split(data, 30, function (arr) {
          //     arr.forEach(function (chunk) {
          //       feed.append(chunk)
          //     })
          //   })
          // } else {
          //   feed.append(data)
          // }
          feed.append(data)
        })
      }
    })
  }

  function updateKey (key) {
    emit('updateKey', key)
  }
}

var watch = function (state, emit) {
  return html`
    <div class=${style} onload=${start}>
      <h1>watch</h1>
      <video id="player" autoplay controls></video>
    </div>
  `

  function start () {
    var codec = 'video/webm;codecs=vp9,opus'
    var mediaSource = new MediaSource()
    var video = document.getElementById('player')
    video.src = URL.createObjectURL(mediaSource)
    mediaSource.addEventListener('sourceopen', open)

    function open () {
      console.log('ran sourceopen')
      var sourceBuffer = mediaSource.addSourceBuffer(codec)
      var opts = {sparse: true}
      var feed = hypercore(ram, state.key, opts)

      feed.on('ready', function () {
        console.log('feed ready')

        feed.get(0, function () {})

        var key = feed.discoveryKey.toString('hex')
        var hub = signalhub(key, ['https://signalhub.mafintosh.com'])
        var sw = swarm(hub)

        sw.on('peer', function (peer, id) {
          console.log('connected to new peer:', id)
          pump(peer, feed.replicate({ live: true, encrypt: false }), peer, function (err) {
            if (err) console.log('pump error:', err)
          })
        })

        feed.get(0, function (err, data) {
          var buf = data.buffer
          console.log('appending first buffer')
          var queue = []
          sourceBuffer.appendBuffer(buf)

          sourceBuffer.addEventListener('updateend', function () {
            console.log('ran sourceBuffer update')
            if (queue.length > 0 && !sourceBuffer.updating) {
              console.log('shifting queue')
              sourceBuffer.appendBuffer(queue.shift())
            }
          })

          sourceBuffer.addEventListener('error', function (err) {
            console.log('sourceBuffer error: ', err)
          })

          var offset = feed.length
          var buf = 4
          while (buf-- && offset > 1) offset--

          var start = offset

          feed.download({start: start, linear: true})

          feed.get(offset, function loop (err, data) {
            var buf = data.buffer

            if (sourceBuffer.updating || queue.length > 0) {
              console.log('pushing to queue')
              queue.push(buf)
            } else {
              console.log('appending fresh data')
              sourceBuffer.appendBuffer(buf)
            }

            console.log('loop time!')
            feed.get(++offset, loop)
          })
        })
      })
    }

  }
}

app.route('/', home)
app.route('/broadcast', broadcast)
app.route('/watch', watch)

document.body.appendChild(app.start())
