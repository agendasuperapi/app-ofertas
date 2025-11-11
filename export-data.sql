-- Script para exportar dados do Lovable Cloud
-- Execute este script no SQL Editor do Lovable Cloud para exportar dados

-- Exportar user_roles
COPY (SELECT * FROM user_roles) TO STDOUT WITH CSV HEADER;

-- Exportar profiles
COPY (SELECT * FROM profiles) TO STDOUT WITH CSV HEADER;

-- Exportar stores
COPY (SELECT * FROM stores) TO STDOUT WITH CSV HEADER;

-- Exportar products
COPY (SELECT * FROM products) TO STDOUT WITH CSV HEADER;

-- Exportar product_categories
COPY (SELECT * FROM product_categories) TO STDOUT WITH CSV HEADER;

-- Exportar product_addons
COPY (SELECT * FROM product_addons) TO STDOUT WITH CSV HEADER;

-- Exportar product_flavors
COPY (SELECT * FROM product_flavors) TO STDOUT WITH CSV HEADER;

-- Exportar orders
COPY (SELECT * FROM orders) TO STDOUT WITH CSV HEADER;

-- Exportar order_items
COPY (SELECT * FROM order_items) TO STDOUT WITH CSV HEADER;

-- Exportar order_item_addons
COPY (SELECT * FROM order_item_addons) TO STDOUT WITH CSV HEADER;

-- Exportar order_item_flavors
COPY (SELECT * FROM order_item_flavors) TO STDOUT WITH CSV HEADER;

-- Exportar reviews
COPY (SELECT * FROM reviews) TO STDOUT WITH CSV HEADER;

-- Exportar favorites
COPY (SELECT * FROM favorites) TO STDOUT WITH CSV HEADER;
