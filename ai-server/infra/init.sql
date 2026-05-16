-- infra/init.sql
-- Create database for chat service

-- Chat DB (owned by FastAPI)
CREATE DATABASE chat_db;
GRANT ALL PRIVILEGES ON DATABASE chat_db TO chatbot;