var choo = require('choo')
var html = require('choo/html')

var app = choo()

app.use(function (state, emitter) {
  state.broadcast = {}
  state.broadcast.key = ''

  emitter.on('broadcast:key:set', function (data) {
    state.broadcast.key = data
    emitter.emit('render')
  })
})

app.route('/', home)
app.route('/broadcast', require('./broadcast'))
app.route('/watch', require('./watch'))

document.body.appendChild(app.start())

function home (state, emit) {
  return html`
    <div>
      <h1>hypervision-browser</h1>
      <h3><a href="/broadcast">broadcast</a></h3>
      <h3><a href="/watch">watch</a></h3>
      <br /><br />
      <h3><a href="https://github.com/louiscenter/hypervision-browser/">** instructions **</a></h3>
    </div>
  `
}
