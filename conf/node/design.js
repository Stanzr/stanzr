
module.exports = {
  conf: {
    env:'design',
    mongo: {
      main: {
        server:'flame.mongohq.com',
        port:27059,
        name:'stanzr01',
        username:'design',
        password:'w1ckl0w1'
      }
    },
    keys: {
      linkedin: {
        key:'JIvFtpTOzqLNNfc2-DwH4g47p-EZAdlxvS8jORnLL7HbtoTeFaqqSZ6MEZIjUKJZ',
        secret:'73BIQurFiKIkMvzIBWw4zAh8Moh2tjafRM-xM3PQ3IcMWbZb3rzn8BNx1zCL49YG',
      },
      twitter: {
        key:'QQfcRCUXyQVPfQqrzw19Q',
        secret:'dzJujZo6jUMExSAWa3qkcQjJwyVAb06QP9veL05nw'
      },
      facebook: {
        rkey:'0190c50506a037b02a70fb5beafd6c54',
        rsecret:'cd7aaec2cfeb61335cc2274c007a2329',
        key:'7d6cb3183bd588c6e94f89d238a0d35b',
        secret:'5b229dec3143d00ff3411f009401de99'
      }
    }
  }
}