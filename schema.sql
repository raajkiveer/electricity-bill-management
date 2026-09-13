-- Database Schema for Electricity Bill System

CREATE DATABASE IF NOT EXISTS electricity_db_html;
USE electricity_db_html;

-- Login table
CREATE TABLE IF NOT EXISTS Login (
    Username VARCHAR(255) PRIMARY KEY,
    Password VARCHAR(255) NOT NULL
);

-- Consumer table
CREATE TABLE IF NOT EXISTS Consumer (
    Consumer_ID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Address TEXT,
    Phone VARCHAR(20),
    Email VARCHAR(255),
    Connection_Type VARCHAR(50)
);

-- Meter table
CREATE TABLE IF NOT EXISTS Meter (
    Meter_ID INT AUTO_INCREMENT PRIMARY KEY,
    Installation_Date DATE,
    Meter_Type VARCHAR(50),
    Consumer_ID INT,
    FOREIGN KEY (Consumer_ID) REFERENCES Consumer(Consumer_ID)
);

-- Reading table
CREATE TABLE IF NOT EXISTS Reading (
    Reading_ID INT AUTO_INCREMENT PRIMARY KEY,
    Reading_Date DATE,
    Units_Consumed INT,
    Meter_ID INT,
    FOREIGN KEY (Meter_ID) REFERENCES Meter(Meter_ID)
);

-- Bill table
CREATE TABLE IF NOT EXISTS Bill (
    Bill_ID INT AUTO_INCREMENT PRIMARY KEY,
    Bill_Date DATE,
    Due_Date DATE,
    Total_Amount DECIMAL(10,2),
    Status ENUM('Paid', 'Unpaid') DEFAULT 'Unpaid',
    Reading_ID INT,
    FOREIGN KEY (Reading_ID) REFERENCES Reading(Reading_ID)
);

-- Payment table
CREATE TABLE IF NOT EXISTS Payment (
    Payment_ID INT AUTO_INCREMENT PRIMARY KEY,
    Payment_Date DATE,
    Amount DECIMAL(10,2),
    Payment_Mode VARCHAR(50),
    Bill_ID INT,
    FOREIGN KEY (Bill_ID) REFERENCES Bill(Bill_ID)
);

-- UserConsumer mapping table
CREATE TABLE IF NOT EXISTS UserConsumer (
    UserName VARCHAR(255),
    Consumer_ID INT,
    FOREIGN KEY (UserName) REFERENCES Login(Username),
    FOREIGN KEY (Consumer_ID) REFERENCES Consumer(Consumer_ID),
    PRIMARY KEY (UserName, Consumer_ID)
);

-- Insert default admin user
INSERT IGNORE INTO Login (Username, Password) VALUES ('rajesh', 'rajesh@2003');