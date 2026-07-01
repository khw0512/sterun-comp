const { Pool, types } = require('pg');
require('dotenv').config();

// DATE 컬럼을 로컬 타임존으로 변환된 Date 객체가 아닌 'YYYY-MM-DD' 문자열 그대로 반환
types.setTypeParser(types.builtins.DATE, val => val);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = pool;
