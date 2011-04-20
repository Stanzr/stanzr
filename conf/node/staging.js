
module.exports = {
  conf: {
    env:'staging',
    web: {
      port: 8090
    },
    mongo: {
      main: {
        name: 'stanzrstaging',
        server: 'flame.mongohq.com',
        port: 27045,
        username: 'staging',
        password: 'k1lk3nn1'  
      }
    }
  }
}