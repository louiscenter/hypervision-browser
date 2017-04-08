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

var app = choo()

app.use(function (state, emitter) {
  state.key = ''

  emitter.on('updateKey', function (data) {
    state.key = data
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
      <label>key</label><input type="text" oninput=${ updateKey } />
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
      <h3>get key in console</h3>
      <video id="player" autoplay controls muted></video>
    </div>
  `

  function start () {
    getUserMedia(function (err, stream) {
      if (err) {
        console.log('error: ', err)
      } else {
        document.getElementById('player').srcObject = stream
        var opts = {
          interval: 1000,
          videoBitsPerSecond: 500000,
          audioBitsPerSecond: 64000
        }

        var mediaRecorder = recorder(stream, opts)

        var feed = hypercore(ram)

        feed.on('ready', function () {
          console.log('feed ready')

          var key = feed.discoveryKey.toString('hex')
          console.log('broadcast key: ', feed.key.toString('hex'))

          var hub = signalhub(key, ['https://signalhub.mafintosh.com'])

          var sw = swarm(hub)
          sw.on('peer', function (peer, id) {
            console.log('connected to new peer: ', id)
            pump(peer, feed.replicate({ live: true, encrypt: false }), peer, function (err) {
              console.log('pump error: ', err)
            })
          })
        })

        var cl = cluster()
        cl.once('data', function (header) {
          console.log('header: ', header)
          cl.on('data', function (cluster) {
            console.log('cluster: ', cluster)
          })
        })

        var mediaStream = pump(mediaRecorder, cl, function (err) {
          console.log('pump ended')
        })

        mediaStream.on('data', function (data) {
          console.log('new data: ', data.length)
          feed.append(data)
        })
      }
    })
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
    console.log('state.key: ', state.key)
    var opts = {sparse: true}
    var feed = hypercore(ram, state.key, opts)

    feed.on('ready', function () {
      console.log('feed ready')

      feed.get(0, function () {})

      var key = feed.discoveryKey.toString('hex')
      var hub = signalhub(key, ['https://signalhub.mafintosh.com'])
      var sw = swarm(hub)

      sw.on('peer', function (peer, id) {
        console.log('connected to new peer: ', id)
        pump(peer, feed.replicate({ live: true, encrypt: false }), peer, function (err) {
          console.log('pump error: ', err)
        })
      })

      feed.get(0, function (err, data) {
        console.log('calculating offset')
        var offset = feed.length
        var buf = 4
        while (buf-- && offset > 1) offset--

        var start = offset

        feed.download({start: start, linear: true})

        feed.get(offset, function loop (err, data) {
          console.log('loop time!')
          feed.get(++offset, loop)
        })
      })
    })
  }
}

app.route('/', home)
app.route('/broadcast', broadcast)
app.route('/watch', watch)

document.body.appendChild(app.start())
