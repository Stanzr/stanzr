

var common = require('../lib/common.js') 
var request = common.request
var uuid    = common.uuid
var assert  = common.assert
var eyes    = common.eyes
var util    = common.util
var log     = common.log

var main = require('../lib/main.js')


function getseneca(cb) {
  if( main.seneca ) {
    cb(main.seneca)
  }
  else {
    setTimeout(function(){getseneca(cb)},50)
  }
}


module.exports = {

  seneca: function() {
    getseneca(function(seneca){

      ;seneca.act({on:'stanzr',cmd:'time'},function(err,date){
        assert.isNull(err)
        assert.ok( 'number' == typeof(date.getTime()) )

      ;seneca.act({on:'stanzr',cmd:'ping-mongo'},function(err,out){
        assert.isNull(err)
        assert.equal( 1, out.a )

      }) // mongo-ping
      }) // time

    })
  }

}