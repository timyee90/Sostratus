const { Pool } = require('pg');
const { config } = require('./config.js');

const pool = new Pool({
  user: 'admin',
  host: process.env.dburl,
  database: 'reviews',
  password: config.password,
  port: 5432,
  max: 20,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 0,
});

module.exports = {
  query: (text, value) => {
    return pool.query(text, value);
  },
};
