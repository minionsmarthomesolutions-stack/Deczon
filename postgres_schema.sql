-- Relational PostgreSQL Schema (E-Commerce, CRM, Billing)
-- Step 2: Convert NoSQL → Relational SQL tables

-- Users & Roles
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    name TEXT,
    role TEXT
);

CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendors (
    id TEXT PRIMARY KEY,
    display_name TEXT,
    company_name TEXT,
    email_address TEXT,
    phone_number TEXT,
    gst_treatment TEXT,
    msme_registered BOOLEAN,
    status TEXT
);

-- Catalog: Categories, Products & Services
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES categories(id) NULL
);

CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    category_id TEXT REFERENCES categories(id) NULL,
    price NUMERIC,
    discount_percent NUMERIC,
    stock INT DEFAULT 0,
    primary_image_url TEXT,
    description TEXT
);

CREATE TABLE services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id) NULL,
    description TEXT,
    primary_image_url TEXT,
    status TEXT
);

CREATE TABLE service_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id TEXT REFERENCES services(id),
    type TEXT, -- 'basic', 'premium', 'elite'
    price NUMERIC,
    features TEXT[]
);

-- Orders & Order Items
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    total NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT REFERENCES orders(id),
    product_id TEXT REFERENCES products(id) NULL,
    service_id TEXT REFERENCES services(id) NULL,
    item_name TEXT,
    price NUMERIC,
    quantity INT
);

-- Billing & Invoices
CREATE TABLE bills (
    id TEXT PRIMARY KEY,
    vendor_id TEXT REFERENCES vendors(id),
    bill_number TEXT UNIQUE,
    bill_date DATE,
    total_amount NUMERIC,
    status TEXT
);

CREATE TABLE bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id TEXT REFERENCES bills(id),
    item_name TEXT,
    quantity NUMERIC,
    rate NUMERIC,
    amount NUMERIC
);

-- Projects
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT,
    customer_id TEXT REFERENCES customers(id),
    status TEXT,
    start_date DATE
);

CREATE TABLE project_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    title TEXT,
    assigned_to TEXT REFERENCES staff(id),
    status TEXT
);

-- Performance Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
