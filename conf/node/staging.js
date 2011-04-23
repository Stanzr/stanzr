
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
    },
    keys: {
      linkedin: {
        key:'JIvFtpTOzqLNNfc2-DwH4g47p-EZAdlxvS8jORnLL7HbtoTeFaqqSZ6MEZIjUKJZ',
        secret:'73BIQurFiKIkMvzIBWw4zAh8Moh2tjafRM-xM3PQ3IcMWbZb3rzn8BNx1zCL49YG',
        callback:'http://stanzr.com/social/linkedin/callback'
      }
    }
  }
}