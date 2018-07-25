module.exports = [
  {
    request: {matchUrl: "https://fitbit.com"},
    response: {
      body: '{"home":"page"}'
    }
  },
  {
    request: {matchUrl: /https?:\/\/fitbit.com\/.*/},
    response: {
      status: 404,
      body: "Not found"
    }
  },
  {
    request: {
      matchUrl: "https://fitbit.com/feedback",
      matchMethod: 'POST'
    },
    response: {
      body: "Thanks"
    }
  },
]