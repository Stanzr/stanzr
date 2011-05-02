


var common = require('./common')

var log      = common.log
var conf     = common.conf

var eyes     = common.eyes
var util     = common.util
var uuid     = common.uuid

var twitter  = common.twitter


var TweetSearch = function(term) {
  var self = this

  self.term = term
  self.running = false


  var twit = new twitter({
    consumer_key: common.conf.keys.twitter.key,
    consumer_secret: common.conf.keys.twitter.secret,
    access_token_key: common.conf.keys.twitter.token.key,
    access_token_secret: common.conf.keys.twitter.token.secret,
  });


  self.start = function(maxmillis,cb) {
    console.dir(self)
    self.running = true

    twit.stream('statuses/filter', {track:term}, function(stream) {
      self.stream = stream

      stream.on('data', function(tweet) {
        console.dir(tweet)
        cb(tweet)
      })

      stream.on('end', function() {
        console.log('ENDDDDDDDDDDDDDDDDDD:'+self.term)
        self.running = false
        setTimeout(function(){self.start(maxmillis,cb)},10000*Math.random())
      })

      stream.on('error', function(error) {
        console.dir(error)
        log('error',error)
      })

      // run for an hour max
      setTimeout(function() {
        stream.destroy()
        self.running = false
      },maxmillis)
    })
  }


  self.stop = function() {
    console.log('STOPPPPPPPPPPPPP:'+self.term)
    if( self.running && self.stream ) {
      self.stream.destroy()
      self.running = false
    }
  }



  self.showUser = function(username,cb) {
    twit.showUser(username,function(data){
      console.dir(data)
      if( 'Error' != data.name ) {
        cb(null,data)
      }
      else {
        cb({err:data,social:'twitter',kind:'showUser',username:username})
      }
    })
  }

}


module.exports = TweetSearch


// test: in folder stanzr; node node/main/lib/tweetsearch.js -config ./conf/node/dev.js '#royalwedding'
if( /tweetsearch\.js$/.exec( process.argv[1] ) ) {
  var ts = new TweetSearch(process.argv[4])
  ts.start(function(tweet){
    console.dir(tweet)
  })
}