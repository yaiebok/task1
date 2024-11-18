const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

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
    .catch(err => {
        console.error('Ошибка подключения к базе данных:', err.stack);
    });

// Корневой маршрут
app.get('/', (req, res) => {
    res.send('Welcome to the Stock Service API!');
});

// Создание товара
app.post('/products', async (req, res) => {
    const { plu, name } = req.body;
    console.log('Request body:', req.body);

    if (!plu || !name) {
        return res.status(400).json({ error: 'PLU and name are required' });
    }

    try {
        const result = await pool.query('INSERT INTO products (plu, name) VALUES (\$1, \$2) RETURNING *', [plu, name]);
        res.status(201).json(result.rows[0]); // Используем статус 201 для создания
    } catch (error) {
        console.error('Error inserting product:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Создание остатка
app.post('/stock', async (req, res) => {
    const { product_id, shop_id, quantity_on_shelf, quantity_in_order } = req.body;
    console.log('Request body:', req.body);

    if (!product_id || !shop_id || quantity_on_shelf === undefined || quantity_in_order === undefined) {
        return res.status(400).json({ error: 'Product ID, Shop ID, quantity_on_shelf and quantity_in_order are required' });
    }

    try {
        const result = await pool.query('INSERT INTO stock (product_id, shop_id, quantity_on_shelf, quantity_in_order) VALUES (\$1, \$2, \$3, \$4) RETURNING *', [product_id, shop_id, quantity_on_shelf, quantity_in_order]);
        res.status(201).json(result.rows[0]); // Используем статус 201 для создания
    } catch (error) {
        console.error('Error inserting stock:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Увеличение остатка
app.patch('/stock/increase/:id', async (req, res) => {
    const { id } = req.params;
    const { quantity_on_shelf, quantity_in_order } = req.body;

    if (quantity_on_shelf === undefined || quantity_in_order === undefined) {
        return res.status(400).json({ error: 'quantity_on_shelf and quantity_in_order are required' });
    }

    try {
        const result = await pool.query('UPDATE stock SET quantity_on_shelf = quantity_on_shelf + \$1, quantity_in_order = quantity_in_order + \$2 WHERE id = \$3 RETURNING *', [quantity_on_shelf, quantity_in_order, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error increasing stock:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Уменьшение остатка
app.patch('/stock/decrease/:id', async (req, res) => {
    const { id } = req.params;
    const { quantity_on_shelf, quantity_in_order } = req.body;

    if (quantity_on_shelf === undefined || quantity_in_order === undefined) {
        return res.status(400).json({ error: 'quantity_on_shelf and quantity_in_order are required' });
    }

    try {
        const result = await pool.query('UPDATE stock SET quantity_on_shelf = quantity_on_shelf - \$1, quantity_in_order = quantity_in_order - \$2 WHERE id = \$3 RETURNING *', [quantity_on_shelf, quantity_in_order, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error decreasing stock:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Получение остатков по фильтрам
app.get('/stock', async (req, res) => {
    const { plu, shop_id, quantity_on_shelf_min, quantity_on_shelf_max, quantity_in_order_min, quantity_in_order_max } = req.query;

    const query = `
        SELECT s.*, p.name, sh.name as shop_name
        FROM stock s
        JOIN products p ON s.product_id = p.id
        JOIN shops sh ON s.shop_id = sh.id
        WHERE (\$1::text IS NULL OR p.plu = \$1)
        AND (\$2::int IS NULL OR s.shop_id = \$2)
        AND (\$3::int IS NULL OR s.quantity_on_shelf >= \$3)
        AND (\$4::int IS NULL OR s.quantity_on_shelf <= \$4)
        AND (\$5::int IS NULL OR s.quantity_in_order >= \$5)
        AND (\$6::int IS NULL OR s.quantity_in_order <= \$6)
    `;

    try {
        const result = await pool.query(query, [plu, shop_id, quantity_on_shelf_min, quantity_on_shelf_max, quantity_in_order_min, quantity_in_order_max]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching stock:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Получение товаров по фильтрам
app.get('/products', async (req, res) => {
    const { name, plu } = req.query;
    const query = `
        SELECT * FROM products
        WHERE (\$1::text IS NULL OR name ILIKE '%' || \$1 || '%')
        AND (\$2::text IS NULL OR plu = \$2)
    `;

    try {
        const result = await pool.query(query, [name, plu]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Stock service running on http://localhost:${port}`);
});
