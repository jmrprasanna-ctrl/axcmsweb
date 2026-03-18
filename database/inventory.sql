-- ==========================
-- Database: it_inventory_db
-- ==========================

-- Drop tables if they exist
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS rental_machine_consumables CASCADE;
DROP TABLE IF EXISTS rental_machines CASCADE;
DROP TABLE IF EXISTS conditions CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================
-- Users Table
-- ==========================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    company VARCHAR(100),
    department VARCHAR(100),
    telephone VARCHAR(50),
    email VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(20) DEFAULT 'user',
    password VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- Sample Admin & Manager Users
INSERT INTO users(username, company, department, telephone, email, role, password)
VALUES 
('manager','IT Corp','Sales','0987654321','manager@example.com','manager','manager123');

-- ==========================
-- Categories Table
-- ==========================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

INSERT INTO categories(name)
VALUES
('Photocopier'),('Printer'),('Plotter'),('Computer'),
('Laptop'),('Accessory'),('Consumable'),('Machine');

-- ==========================
-- Vendors Table
-- ==========================
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    category VARCHAR(50) CHECK(category IN ('Photocopier','Printer','Plotter','Computer','Laptop','Accessory','Consumable','Machine'))
);

INSERT INTO vendors(name, address, category)
VALUES
('Vendor A','Colombo, Sri Lanka','Photocopier'),
('Vendor B','Kandy, Sri Lanka','Printer'),
('Vendor C','Galle, Sri Lanka','Laptop');

-- ==========================
-- Products Table
-- ==========================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(20) UNIQUE,
    description VARCHAR(255),
    category_id INT REFERENCES categories(id),
    model VARCHAR(50),
    serial_no VARCHAR(50),
    count INT DEFAULT 0,
    selling_price FLOAT,
    dealer_price FLOAT,
    vendor_id INT REFERENCES vendors(id),
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- Sample Products
INSERT INTO products(product_id, description, category_id, model, serial_no, count, selling_price, dealer_price, vendor_id)
VALUES
('PH0001','Photocopier A','1','Model P1','SN1001',10,50000,45000,1),
('PR0001','Printer B','2','Model PR1','SN2001',15,20000,18000,2),
('LP0001','Laptop C','5','Model L1','SN3001',20,150000,140000,3);

-- ==========================
-- Customers Table
-- ==========================
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    tel VARCHAR(50),
    customer_type VARCHAR(20) DEFAULT 'Silver',
    email VARCHAR(100) UNIQUE,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

INSERT INTO customers(name,address,tel,customer_type,email)
VALUES
('Customer One','Colombo, SL','0112345678','Gold','cust1@example.com'),
('Customer Two','Kandy, SL','0812345678','Silver','cust2@example.com');

-- ==========================
-- Rental Machines Table
-- ==========================
CREATE TABLE rental_machines (
    id SERIAL PRIMARY KEY,
    machine_id VARCHAR(20) UNIQUE NOT NULL,
    customer_id INT NOT NULL REFERENCES customers(id),
    customer_name VARCHAR(100) NOT NULL,
    address TEXT,
    model VARCHAR(100) NOT NULL,
    machine_title VARCHAR(150) NOT NULL,
    serial_no VARCHAR(100),
    start_count INT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- ==========================
-- Rental Machine Consumables Table
-- ==========================
CREATE TABLE rental_machine_consumables (
    id SERIAL PRIMARY KEY,
    rental_machine_id INT REFERENCES rental_machines(id) ON DELETE CASCADE,
    customer_id INT REFERENCES customers(id),
    product_id INT REFERENCES products(id),
    save_batch_id VARCHAR(50),
    consumable_name VARCHAR(150) NOT NULL,
    quantity INT DEFAULT 1,
    unit VARCHAR(50),
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- ==========================
-- Invoices Table
-- ==========================
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_no VARCHAR(20) UNIQUE,
    customer_id INT REFERENCES customers(id),
    total_amount FLOAT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- ==========================
-- Invoice Items Table
-- ==========================
CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id),
    product_id INT REFERENCES products(id),
    qty INT DEFAULT 1,
    rate FLOAT,
    vat FLOAT DEFAULT 0,
    gross FLOAT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- ==========================
-- Expenses Table
-- ==========================
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    amount FLOAT,
    date DATE,
    category VARCHAR(50),
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

INSERT INTO expenses(title,amount,date,category)
VALUES
('Office Rent',50000,'2026-03-01','Fixed'),
('Electricity Bill',15000,'2026-03-05','Utility');

-- ==========================
-- Stocks Table
-- ==========================
CREATE TABLE stocks (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id),
    change INT,
    type VARCHAR(10) CHECK(type IN ('IN','OUT')),
    date TIMESTAMP DEFAULT NOW(),
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- ==========================
-- Conditions Table
-- ==========================
CREATE TABLE conditions (
    id SERIAL PRIMARY KEY,
    condition TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

INSERT INTO conditions(condition)
VALUES
('Payment within 30 days'),
('Goods once sold cannot be returned'),
('Warranty as per manufacturer terms'),
('All disputes subject to local jurisdiction');

-- ==========================
-- UI Settings Table
-- ==========================
CREATE TABLE IF NOT EXISTS ui_settings (
    id SERIAL PRIMARY KEY,
    app_name VARCHAR(120) NOT NULL DEFAULT 'PULMO TECHNOLOGIES',
    footer_text VARCHAR(255) NOT NULL DEFAULT '© All Right Recieved with CRONIT SOLLUTIONS - JMR Prasanna.',
    primary_color VARCHAR(24) NOT NULL DEFAULT '#0f6abf',
    accent_color VARCHAR(24) NOT NULL DEFAULT '#11a36f',
    background_color VARCHAR(24) NOT NULL DEFAULT '#edf3fb',
    button_color VARCHAR(24) NOT NULL DEFAULT '#0f6abf',
    mode_theme VARCHAR(16) NOT NULL DEFAULT 'light',
    logo_path VARCHAR(500),
    invoice_template_pdf_path VARCHAR(500),
    quotation_template_pdf_path VARCHAR(500),
    quotation2_template_pdf_path VARCHAR(500),
    sign_c_path VARCHAR(500),
    sign_v_path VARCHAR(500),
    seal_c_path VARCHAR(500),
    seal_v_path VARCHAR(500),
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);
