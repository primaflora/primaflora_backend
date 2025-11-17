const { DataSource } = require('typeorm');

module.exports = new DataSource({
    type: 'postgres',
    url: "postgres://u1kb9ilito1bl8:p2c094098c37805febae4bfa03e9b76847cac63680dab3cb1fec235cceedaa062@c7u1tn6bvvsodf.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d8amr18lqtdt2n",
    ssl: {
        rejectUnauthorized: false,
    },
    entities: [__dirname + '/../entity/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: true,
    logging: true,
}); 