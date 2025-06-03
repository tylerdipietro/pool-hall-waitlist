export default {
  expo: {
    name: "Pool Hall Waitlist",
    slug: "pool-hall-waitlist",
    version: "1.0.0",
    platforms: ["ios", "android", "web"],
    web: {
      bundler: "metro",
    },
    extra: {
      apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000',
    },
  },
};
