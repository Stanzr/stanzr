
var connect = require('connect')

connect(
  connect.logger()
  ,connect.router(function(app){
    app.get('/api/ping',function(req,res){
      res.writeHead(200)
      res.end('ok')
    })
  })
).listen(8080)
