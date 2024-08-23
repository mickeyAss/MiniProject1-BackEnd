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

router.post("/login", (req, res) => {
    const { phone, password } = req.body;

    if (phone && password) {
        conn.query(
            "SELECT * FROM users_lotto WHERE phone = ? AND password = ?",
            [phone, password],
            (err, result) => {
                if (err) {
                    res.status(500).json({ message: "Database error" });
                    return;
                }
                if (result.length === 0) {
                    // ไม่มีผู้ใช้ในระบบที่ตรงกับข้อมูลที่ให้มา
                    res.status(404).json({ message: "ยังไม่ได้เป็นสมาชิก กรุณาสมัครสมาชิกก่อนเข้าสู่ระบบ" });
                    return;
                }

                // เพิ่มตรวจสอบประเภทของผู้ใช้
                const userType = result[0].type;
                let token;
                if (userType === 'admin') {
                    token = jwt.sign({ phone: result[0].phone, type: 'admin' }, secret, {
                        expiresIn: "1h",
                    });
                } else {
                    token = jwt.sign({ phone: result[0].phone, type: 'user' }, secret, {
                        expiresIn: "1h",
                    });
                }

                res.status(200).json({ message: 'Login successfully', result, userType, token });
            }
        );
    } else {
        res.status(400).json({ message: "Phone and Password are required" });
    }
});


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

router.get('/searchresult', (req, res) => {
    const { number, uid } = req.query;

    // ตรวจสอบว่ามีเลขลอตเตอรี่และไอดีหรือไม่
    if (!number || !uid) {
        return res.status(400).json({ error: 'Number and uid parameters are required' });
    }

    // ตรวจสอบว่าเลขลอตเตอรี่มีความยาว 6 ตัว
    if (number.length !== 6) {
        return res.status(400).json({ error: 'Number must be exactly 6 digits' });
    }

    try {
        const query = `
            SELECT u.*, n.*, n.result AS prize
            FROM users_lotto u
            JOIN numbers_lotto n ON u.uid = n.uid_fk
            WHERE n.number = ? AND u.uid = ?
        `;

        conn.query(query, [number, uid], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(400).json({ error: 'Query error' });
            }
            if (result.length === 0) {
                return res.status(404).json({ message: 'No matching numbers found' });
            }

            // Extract the result/prize information
            const prize = result[0].prize;  // Assuming result contains at least one entry
            let prizeAmount = 0;

            // กำหนดเงินรางวัลตามประเภทของรางวัล
            switch (prize) {
                case 'รางวัลที่ 1':
                    prizeAmount = 60000000;
                    break;
                case 'รางวัลที่ 2':
                    prizeAmount = 200000;
                    break;
                case 'รางวัลที่ 3':
                    prizeAmount = 80000;
                    break;
                case 'รางวัลที่ 4':
                    prizeAmount = 40000;
                    break;
                case 'รางวัลที่ 5':
                    prizeAmount = 20000;
                    break;
                default:
                    prizeAmount = 0; // ถ้าไม่ตรงกับรางวัลที่กำหนด
            }

            res.status(200).json({
                message: prize ,
               result,
            prizeAmount
            }, );
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.get('/check-uidfk/:uid/:lottoid', (req, res) => {
    const { uid, lottoid } = req.params;

    // ตรวจสอบว่ามี uid และ lottoid หรือไม่
    if (!uid || !lottoid) {
        return res.status(400).json({ error: 'Uid and lottoid parameters are required' });
    }

    try {
        const query = `
            SELECT u.*, n.*, n.result AS prize
            FROM users_lotto u
            JOIN numbers_lotto n ON u.uid = n.uid_fk
            WHERE u.uid = ? AND n.lottoid = ?
        `;

        conn.query(query, [uid, lottoid], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(400).json({ error: 'Query error' });
            }
            if (result.length === 0) {
                return res.status(404).json({ message: 'No matching numbers found' });
            }

            // Extract the result/prize information
            const prize = result[0].prize;  // Assuming result contains at least one entry
            let prizeAmount = 0;

            // กำหนดเงินรางวัลตามประเภทของรางวัล
            switch (prize) {
                case 'รางวัลที่ 1':
                    prizeAmount = 60000000;
                    break;
                case 'รางวัลที่ 2':
                    prizeAmount = 200000;
                    break;
                case 'รางวัลที่ 3':
                    prizeAmount = 80000;
                    break;
                case 'รางวัลที่ 4':
                    prizeAmount = 40000;
                    break;
                case 'รางวัลที่ 5':
                    prizeAmount = 20000;
                    break;
                default:
                    prizeAmount = 0; // ถ้าไม่ตรงกับรางวัลที่กำหนด
            }

            res.status(200).json({
                message: prize,
                result,
                prizeAmount
            });
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

router.post('/update-wallet/:uid/:lottoid', (req, res) => {
    const { uid, lottoid } = req.params;
    const { prizeAmount } = req.body;

    // ตรวจสอบว่ามี uid หรือไม่
    if (!uid) {
        return res.status(400).json({ error: 'Uid parameter is required' });
    }
    // ตรวจสอบว่ามี lottoid หรือไม่
    if (!lottoid) {
        return res.status(400).json({ error: 'Lottoid parameter is required' });
    }
    // ตรวจสอบว่าได้รับ prizeAmount จาก request body หรือไม่
    if (prizeAmount === undefined || prizeAmount === null) {
        return res.status(400).json({ error: 'prizeAmount parameter is required in request body' });
    }

    // ดึงค่า wallet และอัปเดต
    const getWalletQuery = `
        SELECT wallet 
        FROM users_lotto 
        WHERE uid = ?
    `;
    
    conn.query(getWalletQuery, [uid], (err, result) => {
        if (err) {
            console.log('Error fetching wallet:', err);
            return res.status(400).json({ error: 'Query error' });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'No user found with the given uid' });
        }

        const currentWallet = parseFloat(result[0].wallet);
        const newWallet = currentWallet + parseFloat(prizeAmount);

        // อัปเดต wallet
        const updateWalletQuery = `
            UPDATE users_lotto 
            SET wallet = ? 
            WHERE uid = ?
        `;
        
        conn.query(updateWalletQuery, [newWallet, uid], (err) => {
            if (err) {
                console.log('Error updating wallet:', err);
                return res.status(400).json({ error: 'Update query error' });
            }

            // ลบแถวจาก numbers_lotto ที่มี lottoid ที่รับมา
            const deleteLottoQuery = `
                DELETE FROM numbers_lotto 
                WHERE lottoid = ?
            `;
            
            conn.query(deleteLottoQuery, [lottoid], (err) => {
                if (err) {
                    console.log('Error deleting lotto record:', err);
                    return res.status(400).json({ error: 'Delete query error' });
                }

                res.status(200).json({
                    message: 'Wallet updated and lotto record deleted successfully',
                    newWallet
                });
            });
        });
    });
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

router.post('/deduct-wallet/:uid', (req, res) => {
    const { uid } = req.params;
    const { wallet } = req.body;

    if (!uid) {
        return res.status(400).json({ error: 'Uid parameter is required' });
    }

    if (wallet === undefined || wallet === null) {
        return res.status(400).json({ error: 'Wallet parameter is required in request body' });
    }

    // ดึงค่า wallet ปัจจุบันจากฐานข้อมูล
    const getWalletQuery = `
        SELECT wallet 
        FROM users_lotto 
        WHERE uid = ?
    `;
    
    conn.query(getWalletQuery, [uid], (err, result) => {
        if (err) {
            console.log('Error fetching wallet:', err);
            return res.status(400).json({ error: 'Query error' });
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'No user found with the given uid' });
        }

        const currentWallet = parseFloat(result[0].wallet);
        const newWallet = currentWallet - parseFloat(wallet);

        if (newWallet < 0) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // อัปเดต wallet ใหม่ในฐานข้อมูล
        const updateWalletQuery = `
            UPDATE users_lotto 
            SET wallet = ? 
            WHERE uid = ?
        `;
        
        conn.query(updateWalletQuery, [newWallet, uid], (err) => {
            if (err) {
                console.log('Error updating wallet:', err);
                return res.status(400).json({ error: 'Update query error' });
            }

            res.status(200).json({
                message: 'Wallet deducted successfully',
                newWallet
            });
        });
    });
});


module.exports = router;