class Scribble {
  constructor () {
    this.defaultColour = '#df4b26'
    this._ref = new Firebase('https://conseal.firebaseio.com/scribble')
    this.canvas = document.getElementById('tutorial')
    this.ctx = this.canvas.getContext('2d')
    this.ctx.lineWidth = 3
  }

  // Calculate offset either layerX/Y or offsetX/Y
  getOffset (event) {
    return {
      x: event.offsetX === undefined ? event.layerX : event.offsetX,
      y: event.offsetY === undefined ? event.layerY : event.offsetY
    }
  }

  // DRAWING CODE - called from Firebase event
  drawLine (data) {
    // get current point
    var coordsTo = data.snapshot.val()
    var self = this
    // get colour
    data.snapshot.ref().parent().parent().child('colour')
    .once('value', function (snap) {
      var colour = snap.val()
      // get previous point
      data.snapshot.ref().parent().child(data.prevName)
      .once('value', function (snap) {
        var coordsFrom = snap.val()
        if (self.ctx) {
          self.ctx.beginPath()
          self.ctx.strokeStyle = colour
          self.ctx.moveTo(coordsFrom.x, coordsFrom.y)
          self.ctx.lineTo(coordsTo.x, coordsTo.y)
          self.ctx.stroke()
        }
      })
    })
  }

  main () {
    var self = this

    console.log(this._ref)
    if (this.ctx) {
      var mouseDowns = Rx.Observable.fromEvent(this.canvas, 'mousedown')
      var mouseUps = Rx.Observable.fromEvent(document, 'mouseup')
      var mouseMoves = Rx.Observable.fromEvent(this.canvas, 'mousemove')
      var clearButton = Rx.Observable.fromEvent($('#clear'), 'click')

      var mouseDrags = mouseDowns.select(function (downEvent) {
        return mouseMoves.takeUntil(mouseUps).select(function (drag) {
          return self.getOffset(drag)
        })
      })

      // UI EVENTS
      mouseDrags.subscribe(function (drags) {
        var colour = $('#colour').val() || this.defaultColour
        var _dragref = self._ref.push({colour: colour})
        drags.subscribe(function (move) {
          _dragref.ref().child('points').push({x: move.x, y: move.y})
        })
      })

      clearButton.subscribe(function () {
        self._ref.remove()
      })

      // FIRBASE EVENTS
      this._ref.observe('child_added')
      .subscribe(function (newLine) {
        newLine.snapshot.child('points').ref()
        .observe('child_added')
        .filter(function (data) { return data.prevName !== null })
        .subscribe(self.drawLine.bind(self))
      })

      this._ref.on('child_removed', function (snap) {
        self.canvas.width = self.canvas.width
        self.ctx.lineWidth = 3
      })
    }
  }
}

var scribble = new Scribble()
scribble.main()

