const { Pool } = require('pg');
const { config } = require('./config.js');

const pool = new Pool({
  user: 'admin',
  host: 'postgres',
  database: 'reviews',
  password: config.password,
  port: 5432,
});

module.exports = {
  query: (text, value) => {
    return pool.query(text, value);
  },
};
