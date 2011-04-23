
module.exports = {
  conf: {
    env:'dev',
    mongo: {
      main: {
        server:'localhost',
        port:27017,
        name:'stanzrdev'
      }
    },
    keys: {
      linkedin: {
        key:'JIvFtpTOzqLNNfc2-DwH4g47p-EZAdlxvS8jORnLL7HbtoTeFaqqSZ6MEZIjUKJZ',
        secret:'73BIQurFiKIkMvzIBWw4zAh8Moh2tjafRM-xM3PQ3IcMWbZb3rzn8BNx1zCL49YG',
        callback:'http://stanzr.test/social/linkedin/callback'
      }
    }
  }
}