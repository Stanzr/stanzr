


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
    console.dir('tweetsearch, start, '+term)
    self.running = true

    twit.stream('statuses/filter', {track:term}, function(stream) {
      self.stream = stream

      stream.on('data', function(tweet) {
        cb(tweet)
      })

      stream.on('end', function() {
        self.running = false
      })

      stream.on('error', function(error) {
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
    if( self.running && self.stream ) {
      console.log('++++++++++++++++++ STOP '+self.term)

      self.stream.destroy()
      self.running = false
    }
  }



  self.showUser = function(username,cb) {
    twit.showUser(username,function(data){
      if( 'Error' != data.name ) {
        cb(null,data)
      }
      else {
        cb({err:data,social:'twitter',kind:'showUser',user:user})
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