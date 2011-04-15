

var common = require('../lib/common.js') 
var request = common.request
var uuid    = common.uuid
var assert  = common.assert
var eyes    = common.eyes
var util    = common.util
var log     = common.log


var urlprefix = 'http://127.0.0.1:8080'


function get(spec,cb) {
  request.get(spec,handle(cb,'GET',spec))
}

function post(spec,cb) {
  request.post(spec,handle(cb,'POST',spec))
}

function put(spec,cb) {
  request.post(spec,handle(cb,'PUT',spec))
}

function del(spec,cb) {
  request.del(spec,handle(cb,'DELETE',spec))
}


function handle(cb,method,spec) {
  return function(error, response, body) {
    assert.equal(null,error)
    log(method,spec.uri,response.statusCode+': '+body)
    var json = JSON.parse(body)
    cb(json,response)
  }
}



module.exports = {

  ping:function() {
    get(
      {uri:urlprefix+'/api/ping/node'}, 
      function(json){
        assert.ok(json.ok)
        assert.ok(json.now)
      }
    )

    get(
      {uri:urlprefix+'/api/ping/mongo'}, 
      function(json){
        assert.ok(json.ok)
        assert.ok(json.end)
        assert.ok(json.dur)
      }
    )
  },


  auth:function() {
    var nick = 'test-'+uuid().substring(0,8)
    post(
      {uri:urlprefix+'/api/auth/register',
       json:{nick:nick,email:nick+'@example.com',password:nick.toLowerCase()}}, 
      function(json){
        assert.ok(json.ok)

        post(
          {uri:urlprefix+'/api/auth/login',
           json:{nick:nick,password:nick.toLowerCase()}}, 
          function(json,response){
            assert.ok(json.ok)
            //eyes.inspect(response)
          }
        )        
      }
    )

  }

}