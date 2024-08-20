var express = require('express');
var router = express.Router();
var conn = require('../dbconnect')
var jwt = require('jsonwebtoken');
var secret = 'Fullstack-Login-2024';

router.get("/", async (req, res) => {
    res.json("Hello Word!!!");
});

router.get("/get/:uid", (req, res) => {
    const { uid } = req.params; // รับค่า uid จากพารามิเตอร์

    try {
        conn.query("SELECT * FROM users_lotto WHERE uid = ?", [uid], (err, result) => {
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

router.post("/login",(req, res) => {
    const { phone, password } = req.body;

    if (phone && password) {
        conn.query("SELECT * FROM users_lotto WHERE phone = ? AND password = ?",
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

router.post('/register', (req, res) => {
    const { name, surname, email, password, phone, wallet } = req.body;
    const image = 'https://static.vecteezy.com/system/resources/previews/005/544/753/non_2x/profile-icon-design-free-vector.jpg';

    conn.query('INSERT INTO users_lotto (name, surname, email, password, phone, wallet, type, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, surname, email, password, phone, wallet, 'user', image],
        function (err, result) {
            if (err) {
                res.json({ message: err });
                return;
            }
            res.json({ message: 'ok' });
        }
    );
});


router.put('/updatewallet/:uid', (req, res) => {
    const { uid } = req.params;
    const { wallet } = req.body;

    conn.query('UPDATE users_lotto SET wallet = ? WHERE uid = ?',
        [wallet, uid],
        function (err, result) {
            if (err) {
                res.json({ result: false, message: err });
            }
            res.json({ result: true, message: 'Wallet update successfully' });
        }
    )
})

router.get('/check-uidfk/:uid', (req, res) => {
    const { uid } = req.params;

    try {
        const query = `
            SELECT u.*, n.* 
            FROM users_lotto u
            JOIN numbers_lotto n ON u.uid = n.uid_fk
            WHERE u.uid = ?
        `;

        conn.query(query, [uid], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(400).json({ error: 'Query error' });
            }
            if (result.length === 0) {
                return res.status(404).json({ message: 'No matching rows found' });
            }
            res.status(200).json(result );
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.get('/searchnumber',  (req, res) => {
    const { number, uid } = req.query;

    // ตรวจสอบว่ามีเลขลอตเตอรี่และไอดีหรือไม่
    if (!number || !uid) {
        return res.status(400).json({ error: 'Number and uid parameters are required' });
    }

    try {
        const query = `
            SELECT u.*, n.*
            FROM users_lotto u
            JOIN numbers_lotto n ON u.uid = n.uid_fk
            WHERE n.number LIKE ? AND u.uid = ?
        `;

        // ใช้ '%' เพื่อค้นหาหมายเลขที่ตรงกับตัวเลขที่ระบุ
        conn.query(query, [`%${number}%`, uid], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(400).json({ error: 'Query error' });
            }
            if (result.length === 0) {
                return res.status(404).json({ message: 'No matching numbers found' });
            }
            res.status(200).json(result);
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;