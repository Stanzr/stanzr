/*
Copyright (c) 2011 Richard Rodger

BSD License
-----------

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

1. Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.

3. The names of the copyright holders and contributors may not be used
to endorse or promote products derived from this software without
specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE
*/


var util     = exports.util     = require('util')
var url      = exports.url      = require('url')
var fs       = exports.fs       = require('fs')

var connect  = exports.connect   = require('connect')
var uuid     = exports.uuid      = require('node-uuid')
var request  = exports.request   = require('request')
var express  = exports.express   = require('express')
var now      = exports.now       = require('now')
var assert   = exports.assert    = require('assert')
var eyes     = exports.eyes      = require('eyes')
var cookies  = exports.cookies   = require('cookies')
var _        = exports._         = require('underscore')
var url      = exports.url       = require('url')
var form     = exports.form      = require('connect-form')
var know     = exports.knox      = require('knox')

var oauth    = exports.oauth     = require('../../support/node-oauth')


var twitter  = exports.twitter   = require('twitter')
//var twitter  = exports.twitter   = require('../../support/node-twitter')

var seneca   = exports.seneca    = require('../../support/seneca')
//var seneca   = exports.seneca    = require('seneca')

//var now      = exports.now   = require('now')
var now      = exports.now   = require('../../support/now')


var config = require('config')
var conf = exports.conf = config('conf',{
  env: 'dev',
  hosturl:'http://localhost:8080',
  tweetsearch:false,
  web: {
    port: 8080
  },
  keys: {
    chartaca: {
      key: '3b206e8c-f57a-49f1-9ee3-34fd3b6ce2b5'
    },
    linkedin: {
        key:'k',
        secret:'s',
    },
    twitter: {
      key:'k',
      secret:'s',
      token: {
        key: 'k',
        secret: 's'
      }
    },
    facebook: {
      key:'k',
      secret:'s'
    }
  },
  mongo: {
    main: {
      name: 'stanzrdev',
      server: 'localhost',
      port: 27017,
      username: '',
      password: ''
    }
  }
})
eyes.inspect(conf)


exports.log = function() {
  var sb = []
  for( var i = 0; i < arguments.length; i++ ) {
    try {
      var val = arguments[i]
      sb.push( 'string'==typeof(val) ? val : 'number'==typeof(val) ? val : JSON.stringify(val) )
    }
    catch( e ) {
      util.log(e)
      util.log(arguments[i])
    }
  }
  util.log(sb.join(' '))
}


// JSON functions

exports.readjson = function(req,res,win,fail) {
  var MAX = 10*65535
  var size = 0;
  var bodyarr = []

  req.on('data',function(chunk){
    size += chunk.length
    if( MAX < size ) {
      res.writeHead(200)
      res.end()
    }
    else {
      bodyarr.push(chunk);
    }
  })

  req.on('end',function(){
    if( size < MAX ) {
      var bodystr = bodyarr.join('');
      util.debug('READJSON:'+req.url+':'+bodystr);
      try {
        var body = JSON.parse(bodystr);
        win && win(body);
      }
      catch(e) {
        fail && fail(res,e)
      }
    }
  })
}

exports.sendjson = function(res,obj){
  res.writeHead(200,{
    'Content-Type': 'application/json',
    'Cache-Control': 'private, max-age=0, no-cache, no-store'
  });
  var objstr = JSON.stringify(obj);
  util.debug('SENDJSON:'+objstr);
  res.end( objstr );
}


function die(msg) {
  util.debug(msg)
  process.eixt(1)
}

// mongo functions

var mongodb = require('../../support/node-mongodb-native')

var mongo = {
  mongo: mongodb,
  db: null,
}

mongo.init = function( opts, win, fail ){
  util.log('mongo: '+opts.host+':'+opts.port+'/'+opts.name)

  mongo.db = 
    new mongodb.Db(
      opts.name, 
      new mongodb.Server(opts.host, opts.port, {}), 
      {native_parser:true,auto_reconnect:true});

  mongo.db.open(function(){
    if( opts.username ) {
      mongo.db.authenticate(
        opts.username,
        opts.password,
        function(err){
          if( err) {
            fail ? fail(err) : die(err)
          }
          else {
            win && win(mongo.db)
          }
        })
    }
    else {
      win && win(mongo.db)
    }
  },fail)
}

mongo.res = function( win, fail ){
  return function(err,res) {
    if( err ) {
      util.log('mongo:err:'+JSON.stringify(err));
      fail ? fail(err) : die(err)
    }
    else {
      win && win(res)
    }
  }
}

mongo.open = function(win,fail){
  mongo.db.open(mongo.res(function(){
    util.log('mongo:ok');
    win && win();
  },fail))
}

mongo.coll = function(name,win,fail){
  mongo.db.collection(name,mongo.res(win,fail));
}

exports.mongo = mongo;
