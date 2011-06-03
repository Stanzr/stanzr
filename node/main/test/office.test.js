
var office = require('../lib/office.js')

var assert = require('assert')

module.exports = {

  chat_makepublishalias: function() {
    assert.equal( 'a-b-c', office.chat.makepublishalias('a','b','c') )
    assert.equal( 'a1-b2-c3', office.chat.makepublishalias('a1','b2','c3') )
    assert.equal( 'a-b-c', office.chat.makepublishalias('a-','-b-','-c') )
    assert.equal( 'a_-_b_-_c', office.chat.makepublishalias('a_','_b_','_c') )
    assert.equal( 'a-b-c', office.chat.makepublishalias('a!@£$%^&*()+={}[];\'\\:"|,./<>?`~§±','b','c') )
  }
}