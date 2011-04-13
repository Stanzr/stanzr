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

var connect  = exports.connect  = require('connect')
var uuid     = exports.uuid     = require('node-uuid')
var oauth    = exports.oauth    = require('oauth')
var request  = exports.request  = require('request')
var express  = exports.express  = require('express')
var now      = exports.now      = require('now')




// JSON functions

exports.readjson = function(req,win,fail) {
  var bodyarr = [];
  req.on('data',function(chunk){
    bodyarr.push(chunk);
  })
  req.on('end',function(){
    var bodystr = bodyarr.join('');
    util.debug('READJSON:'+req.url+':'+bodystr);
    try {
      var body = JSON.parse(bodystr);
      win && win(body);
    }
    catch(e) {
      fail && fail(e)
    }
  })
}

exports.sendjson = function(res,obj){
  res.writeHead(200,{
    'Content-Type': 'application/json',
    'Cache-Control': 'private, max-age=0'
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