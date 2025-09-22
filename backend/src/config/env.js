const dotenv = require('dotenv');
const path = require('path');


// Carga .env según NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
dotenv.config({ path: path.join(process.cwd(), envFile) });


const config = {
env: process.env.NODE_ENV || 'development',
port: process.env.PORT || 3000,
db: {
host: process.env.DB_HOST || 'localhost',
port: +process.env.DB_PORT || 5432,
name: process.env.DB_NAME || 'finca_dev',
user: process.env.DB_USER || 'postgres',
pass: process.env.DB_PASS || 'postgres',
logging: String(process.env.DB_LOGGING) === 'true'
},
jwt: {
secret: process.env.JWT_SECRET,
refreshSecret: process.env.JWT_REFRESH_SECRET,
accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
}
};


module.exports = { config };