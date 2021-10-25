CREATE DATABASE IF NOT EXISTS development;
USE development;

CREATE TABLE IF NOT EXISTS public.customer (
    customer_id uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    create_date date DEFAULT CURRENT_DATE NOT NULL,
    last_update timestamp with time zone DEFAULT now()
);
INSERT INTO customer (first_name, last_name, email) 
VALUES ('Sansa', 'Stark', 'sansa@gameofthrones.net');
INSERT INTO customer (first_name, last_name, email) 
VALUES ('Tyrion', 'Lannister', 'tyrion@gameofthrones.net');
INSERT INTO customer (first_name, last_name, email) 
VALUES ('Dany', 'Stormborn', 'dany@gameofthrones.net');
INSERT INTO customer (first_name, last_name, email) 
VALUES ('Margaery', 'Tyrell', 'margaery@gameofthrones.net');
INSERT INTO customer (first_name, last_name, email) 
VALUES ('Cersei', 'Lannister', 'cersei@gameofthrones.net');