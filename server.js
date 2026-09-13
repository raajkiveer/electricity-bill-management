const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// Database connection
const db = mysql.createConnection({
  host: process.env.ELECTRICITY_DB_HOST || 'localhost',
  user: process.env.ELECTRICITY_DB_USER || 'root',
  password: process.env.ELECTRICITY_DB_PASSWORD || 'rajesh@2003',
  database: process.env.ELECTRICITY_DB_NAME || 'electricity_db_html'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'electricity_secret_key',
  resave: false,
  saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM Login WHERE Username = ?', [username], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      const user = results[0];
      if (password === user.Password) {
        req.session.user = username;
        req.session.role = username === 'rajesh' ? 'Admin' : 'User';
        res.redirect('/dashboard');
      } else {
        res.send('Invalid credentials');
      }
    } else {
      res.send('Invalid credentials');
    }
  });
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  db.query('INSERT INTO Login (Username, Password) VALUES (?, ?)', [username, password], (err) => {
    if (err) throw err;
    res.send('Account created successfully');
  });
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  res.render('dashboard', { user: req.session.user, role: req.session.role });
});

app.post('/add-consumer', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const { name, address, phone, email, connectionType } = req.body;
  db.query('INSERT INTO Consumer (Name, Address, Phone, Email, Connection_Type) VALUES (?, ?, ?, ?, ?)',
    [name, address, phone, email, connectionType], (err, result) => {
    if (err) throw err;
    const consumerId = result.insertId;
    db.query('INSERT INTO UserConsumer (UserName, Consumer_ID) VALUES (?, ?)', [req.session.user, consumerId]);
    db.query('INSERT INTO Meter (Installation_Date, Meter_Type, Consumer_ID) VALUES (CURDATE(), ?, ?)',
      ['Digital', consumerId]);
    res.send('Consumer added successfully');
  });
});

app.post('/generate-bill', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const { meterId, units } = req.body;
  db.query('SELECT Meter_ID FROM Meter WHERE Meter_ID = ?', [meterId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) return res.send('Invalid Meter ID');
    db.query('INSERT INTO Reading (Reading_Date, Units_Consumed, Meter_ID) VALUES (CURDATE(), ?, ?)',
      [units, meterId], (err, result) => {
      if (err) throw err;
      const readingId = result.insertId;
      const totalAmount = units * 5;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);
      db.query('INSERT INTO Bill (Bill_Date, Due_Date, Total_Amount, Status, Reading_ID) VALUES (CURDATE(), ?, ?, ?, ?)',
        [dueDate.toISOString().split('T')[0], totalAmount, 'Unpaid', readingId]);
      res.send(`Bill generated: Rs. ${totalAmount}`);
    });
  });
});

app.post('/pay-bill', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const { billId, amount, mode } = req.body;
  db.query('SELECT Total_Amount, Status FROM Bill WHERE Bill_ID = ?', [billId], (err, results) => {
    if (err) throw err;
    if (results.length === 0) return res.send('Invalid Bill ID');
    const bill = results[0];
    if (bill.Status === 'Paid') return res.send('Bill already paid');
    const amountNumber = Number.parseFloat(amount);
    const billTotalNumber = Number.parseFloat(bill.Total_Amount);
    if (Number.isNaN(amountNumber)) return res.send('Invalid payment amount');
    if (amountNumber < billTotalNumber) return res.send('Full amount must be paid');
    db.query('INSERT INTO Payment (Payment_Date, Amount, Payment_Mode, Bill_ID) VALUES (CURDATE(), ?, ?, ?)',
      [amountNumber, mode, billId]);
    db.query('UPDATE Bill SET Status = ? WHERE Bill_ID = ?', ['Paid', billId]);
    res.send('Payment successful');
  });
});

app.get('/consumers', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  let query;
  const scope = req.query.scope;
  const adminSelfOnly = req.session.role === 'Admin' && scope === 'self';
  if (req.session.role === 'Admin' && !adminSelfOnly) {
    query = `
      SELECT c.Consumer_ID, uc.UserName, c.Name, c.Phone, m.Meter_ID
      FROM Consumer c
      JOIN Meter m ON c.Consumer_ID = m.Consumer_ID
      JOIN UserConsumer uc ON uc.Consumer_ID = c.Consumer_ID
    `;
  } else {
    query = `
      SELECT c.Consumer_ID, c.Name, c.Phone, m.Meter_ID
      FROM Consumer c
      JOIN Meter m ON c.Consumer_ID = m.Consumer_ID
      JOIN UserConsumer uc ON uc.Consumer_ID = c.Consumer_ID
      WHERE uc.UserName = ?
    `;
  }
  const params = (req.session.role === 'User' || adminSelfOnly) ? [req.session.user] : [];
  db.query(query, params, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.get('/payment-history', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  let query;
  if (req.session.role === 'Admin') {
    query = `
      SELECT p.Payment_ID, p.Payment_Date, p.Amount, p.Payment_Mode, b.Bill_ID, c.Name, c.Phone
      FROM Payment p
      JOIN Bill b ON p.Bill_ID = b.Bill_ID
      JOIN Reading r ON b.Reading_ID = r.Reading_ID
      JOIN Meter m ON r.Meter_ID = m.Meter_ID
      JOIN Consumer c ON m.Consumer_ID = c.Consumer_ID
      ORDER BY p.Payment_Date DESC
    `;
  } else {
    query = `
      SELECT p.Payment_ID, p.Payment_Date, p.Amount, p.Payment_Mode, b.Bill_ID
      FROM Payment p
      JOIN Bill b ON p.Bill_ID = b.Bill_ID
      JOIN Reading r ON b.Reading_ID = r.Reading_ID
      JOIN Meter m ON r.Meter_ID = m.Meter_ID
      JOIN Consumer c ON m.Consumer_ID = c.Consumer_ID
      JOIN UserConsumer uc ON uc.Consumer_ID = c.Consumer_ID
      WHERE uc.UserName = ?
      ORDER BY p.Payment_Date DESC
    `;
  }
  db.query(query, req.session.role === 'User' ? [req.session.user] : [], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.get('/meter-bills', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  const meterId = req.query.meterId;
  if (!meterId) return res.json([]);

  let query = `
    SELECT b.Bill_ID, b.Bill_Date, b.Due_Date, b.Total_Amount, b.Status
    FROM Bill b
    JOIN Reading r ON b.Reading_ID = r.Reading_ID
    JOIN Meter m ON r.Meter_ID = m.Meter_ID
  `;
  let params = [meterId];

  if (req.session.role === 'User') {
    query += `
      JOIN Consumer c ON m.Consumer_ID = c.Consumer_ID
      JOIN UserConsumer uc ON uc.Consumer_ID = c.Consumer_ID
      WHERE m.Meter_ID = ? AND uc.UserName = ?
    `;
    params = [meterId, req.session.user];
  } else {
    query += `
      WHERE m.Meter_ID = ?
    `;
  }

  query += ' ORDER BY b.Bill_Date DESC, b.Bill_ID DESC';

  db.query(query, params, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.post('/delete-consumer', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  if (req.session.role !== 'Admin') return res.status(403).send('Unauthorized');
  const { consumerId } = req.body;
  if (!consumerId) return res.send('Consumer ID required');

  db.query('SELECT Meter_ID FROM Meter WHERE Consumer_ID = ?', [consumerId], (err, meters) => {
    if (err) throw err;
    const meterIds = meters.map(m => m.Meter_ID);
    if (meterIds.length === 0) {
      db.query('DELETE FROM UserConsumer WHERE Consumer_ID = ?', [consumerId], (err2) => {
        if (err2) throw err2;
        db.query('DELETE FROM Consumer WHERE Consumer_ID = ?', [consumerId], (err3) => {
          if (err3) throw err3;
          return res.send('Consumer deleted');
        });
      });
      return;
    }

    db.query('SELECT Reading_ID FROM Reading WHERE Meter_ID IN (?)', [meterIds], (err2, readings) => {
      if (err2) throw err2;
      const readingIds = readings.map(r => r.Reading_ID);
      if (readingIds.length === 0) {
        db.query('DELETE FROM Meter WHERE Meter_ID IN (?)', [meterIds], (err3) => {
          if (err3) throw err3;
          db.query('DELETE FROM UserConsumer WHERE Consumer_ID = ?', [consumerId], (err4) => {
            if (err4) throw err4;
            db.query('DELETE FROM Consumer WHERE Consumer_ID = ?', [consumerId], (err5) => {
              if (err5) throw err5;
              return res.send('Consumer deleted');
            });
          });
        });
        return;
      }

      db.query('SELECT Bill_ID FROM Bill WHERE Reading_ID IN (?)', [readingIds], (err3, bills) => {
        if (err3) throw err3;
        const billIds = bills.map(b => b.Bill_ID);
        if (billIds.length > 0) {
          db.query('DELETE FROM Payment WHERE Bill_ID IN (?)', [billIds], (err4) => {
            if (err4) throw err4;
            db.query('DELETE FROM Bill WHERE Bill_ID IN (?)', [billIds], (err5) => {
              if (err5) throw err5;
              db.query('DELETE FROM Reading WHERE Reading_ID IN (?)', [readingIds], (err6) => {
                if (err6) throw err6;
                db.query('DELETE FROM Meter WHERE Meter_ID IN (?)', [meterIds], (err7) => {
                  if (err7) throw err7;
                  db.query('DELETE FROM UserConsumer WHERE Consumer_ID = ?', [consumerId], (err8) => {
                    if (err8) throw err8;
                    db.query('DELETE FROM Consumer WHERE Consumer_ID = ?', [consumerId], (err9) => {
                      if (err9) throw err9;
                      return res.send('Consumer deleted');
                    });
                  });
                });
              });
            });
          });
          return;
        }

        db.query('DELETE FROM Reading WHERE Reading_ID IN (?)', [readingIds], (err4) => {
          if (err4) throw err4;
          db.query('DELETE FROM Meter WHERE Meter_ID IN (?)', [meterIds], (err5) => {
            if (err5) throw err5;
            db.query('DELETE FROM UserConsumer WHERE Consumer_ID = ?', [consumerId], (err6) => {
              if (err6) throw err6;
              db.query('DELETE FROM Consumer WHERE Consumer_ID = ?', [consumerId], (err7) => {
                if (err7) throw err7;
                return res.send('Consumer deleted');
              });
            });
          });
        });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
