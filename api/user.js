var express = require('express');
var router = express.Router();
var conn = require('../dbconnect')
var jwt = require('jsonwebtoken');
var secret = 'Fullstack-Login-2024';

router.get("/", async (req, res) => {
    res.json("Hello Word!!!");
});

router.get("/get/:uid", async (req, res) => {
    const { uid } = req.params; // รับค่า uid จากพารามิเตอร์

    try {
        conn.query("SELECT * FROM users WHERE uid = ?", [uid], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(400).json({ error: 'Query error' });
            }
            if (result.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.status(200).json(result[0]); // ส่งข้อมูลผู้ใช้ที่ตรงกับ uid
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post("/login", async (req, res) => {
    const { phone, password } = req.body;

    if (phone && password) {
        conn.query("SELECT * FROM users WHERE phone = ? AND password = ?",
            [phone, password],
            (err, result) => {
                if (err) {
                    res.json({ message: "Database error" });
                    return;
                }
                if (result.length == 0) {
                    res.json({ message: "no user found" });
                    return;
                }
                // เพิ่มตรวจสอบประเภทของผู้ใช้
                const userType = result[0].type; 
                if (userType === 'admin') {
                    var token = jwt.sign({ phone: result[0].phone, type: 'admin' }, secret, {
                        expiresIn: "1h",
                    });
                } else {
                     var  token = jwt.sign({ phone: result[0].phone, type: 'user' }, secret, {
                        expiresIn: "1h",
                    });
                }

                res.status(200).json({ message: 'Login successfully', result ,userType,token});
            }
        );
    } else {
        res.json({ message: "Phone and Password are required" });
    }
})

router.post('/register', async (req, res) => {
    const { name, surname, email, password, phone, wallet } = req.body;

    conn.query('INSERT INTO users (name,surname,email ,password,phone,wallet,type) VALUES (?, ?,?,?,?,?,?)',
        [name, surname, email, password, phone, wallet, "user"],
        function (err, result) {
            if (err) {
                res.json({ message: err });
                return
            }
            res.json({ message: 'ok' });
        }
    );
});


router.put('/update/:uid', async (req, res) => {
    const { uid } = req.params;
    const { name, surname, phone, wallet } = req.body;

    // สร้าง array สำหรับเก็บค่าที่จะถูกอัพเดต
    let fields = [];
    let values = [];

    // ตรวจสอบและเพิ่ม field ที่ต้องการอัพเดต
    if (name) {
        fields.push('name = ?');
        values.push(name);
    }
    if (surname) {
        fields.push('surname = ?');
        values.push(surname);
    }
    if (phone) {
        fields.push('phone = ?');
        values.push(phone);
    }
    if (wallet) {
        fields.push('wallet = ?');
        values.push(wallet);
    }

    // ถ้าไม่มี field ใดที่ต้องการอัพเดต ให้ส่ง response กลับโดยไม่ทำอะไร
    if (fields.length === 0) {
        return res.json({ result: false, message: 'No fields to update' });
    }

    // สร้าง query string สำหรับการอัพเดต
    const query = `UPDATE users SET ${fields.join(', ')} WHERE uid = ?`;
    values.push(uid);

    conn.query(query, values, function (err, result) {
        if (err) {
            return res.json({ result: false, message: err });
        }
        res.json({ result: true, message: 'User updated successfully' });
    });
});

router.put('/updatewallet/:uid', async (req, res) => {
    const { uid } = req.params;
    const { wallet } = req.body;

    conn.query('UPDATE users SET wallet = ? WHERE uid = ?',
        [wallet, uid],
        function (err, result) {
            if (err) {
                res.json({ result: false, message: err });
            }
            res.json({ result: true, message: 'Wallet update successfully' });
        }
    )
})


module.exports = router;