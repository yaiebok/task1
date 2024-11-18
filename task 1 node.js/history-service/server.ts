import express from 'express';
import pkg from 'pg'; 
const { Pool } = pkg; 
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();
const port = 4000;

app.use(cors());
app.use(bodyParser.json());

// Обработчик для корневого маршрута
app.get('/', (_req, res) => {
    res.send('Welcome to the Actions API!');
});

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'taskDataBase',
    password: 'qwe123',
    port: 5432,
});

// Подключение к базе данных
pool.connect()
    .then(client => {
        console.log('Подключение к базе данных успешно!');
        client.release();
    })
    .catch(error => {
        console.error('Ошибка подключения к базе данных:', error);
    });

// Запись действия
app.post('/actions', async (req, res) => {
    const { product_id, shop_id, action } = req.body;

    try {
        const result = await pool.query('INSERT INTO actions (product_id, shop_id, action) VALUES (\$1, \$2, \$3) RETURNING *', [product_id, shop_id, action]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при записи действия:', error);
        res.status(500).json({ error: 'Ошибка при записи действия' });
    }
});

// Получение истории действий
app.get('/actions', async (req, res) => {
    const { shop_id, plu, date_min, date_max, action } = req.query;

    const query = `
        SELECT a.*, p.name AS product_name, sh.name AS shop_name
        FROM actions a
        JOIN products p ON a.product_id = p.id
        JOIN shops sh ON a.shop_id = sh.id
        WHERE (\$1::int IS NULL OR a.shop_id = \$1)
        AND (\$2::text IS NULL OR p.plu = \$2)
        AND (\$3::timestamp IS NULL OR a.created_at >= \$3)
        AND (\$4::timestamp IS NULL OR a.created_at <= \$4)
        AND (\$5::text IS NULL OR a.action = \$5)
    `;

    try {
        const result = await pool.query(query, [shop_id, plu, date_min, date_max, action]);
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении действий:', error);
        res.status(500).json({ error: 'Ошибка при получении действий' });
    }
});

// Запуск сервера
app.listen(port, () => {
    console.log(`History service running on http://localhost:${port}`);
});
