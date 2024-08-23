var express = require('express');
var router = express.Router();
var conn = require('../dbconnect')

module.exports = router;

router.post("/insertnumber", (req, res) => {
    // สร้างฟังก์ชันสำหรับสุ่มเลข 6 หลัก
    function getRandomNumber() {
        return Math.floor(100000 + Math.random() * 900000); // สุ่มเลข 6 หลัก
    }

    // เตรียม Array สำหรับเก็บเลขที่สุ่มได้
    const numbers = [];
    for (let i = 0; i < 100; i++) {
        numbers.push([getRandomNumber()]);
    }

    // ใช้การ query แบบ bulk insert เพื่อนำเลขที่สุ่มได้เข้า database
    conn.query('INSERT INTO `numbers_lotto` (`number`) VALUES ?',
        [numbers],
        function(err, result) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json(result);
            }
        }
    );
});

router.delete("/deletenumber", (req, res) => {
    // ลบข้อมูลจากตาราง numbers_lotto
    conn.query('DELETE FROM numbers_lotto', (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "An error occurred while deleting records from numbers_lotto" });
        }

        // ลบข้อมูลจากตาราง users_lotto โดยไม่ลบข้อมูลที่ type เป็น 'admin'
        conn.query("DELETE FROM users_lotto WHERE type != 'admin'", (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "An error occurred while deleting records from users_lotto" });
            }

            // หากลบข้อมูลจากทั้งสองตารางสำเร็จ
            res.status(200).json({ message: "Delete successfully from both tables" });
        });
    });
});

router.get("/getnumber", (req, res) => {
    try {
        // เรียงลำดับจาก รางวัลที่ 1 ถึง รางวัลที่ 5
        const query = `
            SELECT * 
            FROM numbers_lotto 
            WHERE result IN ('รางวัลที่ 1', 'รางวัลที่ 2', 'รางวัลที่ 3', 'รางวัลที่ 4', 'รางวัลที่ 5')
            ORDER BY 
                CASE 
                    WHEN result = 'รางวัลที่ 1' THEN 1
                    WHEN result = 'รางวัลที่ 2' THEN 2
                    WHEN result = 'รางวัลที่ 3' THEN 3
                    WHEN result = 'รางวัลที่ 4' THEN 4
                    WHEN result = 'รางวัลที่ 5' THEN 5
                    ELSE 6
                END
        `;

        conn.query(query, (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "An error occurred while fetching data" });
            }

            res.json(results); // ส่งข้อมูลทั้งหมดที่ดึงมาในรูปแบบ JSON
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An error occurred" });
    }
});

router.get("/getallnumber", (req, res) => {
    try {
        // เรียกข้อมูลทั้งหมดจากตาราง number_lotto
        conn.query('SELECT * FROM numbers_lotto', (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "An error occurred while fetching data" });
            }

            res.json(results); // ส่งข้อมูลที่ดึงมาในรูปแบบ JSON
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "An error occurred" });
    }
});

router.put('/update-result', (req, res) => {
    try {
        const newResult = req.body.result; 

        const checkExistingQuery = `
            SELECT COUNT(*) AS count
            FROM numbers_lotto 
            WHERE result = ?
        `;
        
        conn.query(checkExistingQuery, [newResult], (err, checkResult) => {
            if (err) {
                console.log(err);
                return res.status(400).send('Error checking existing results');
            }

            if (checkResult[0].count > 0) {
                return res.status(400).send('Duplicate result detected.');
            }

            const selectLidQuery = 'SELECT lottoid FROM numbers_lotto WHERE result = "ไม่ถูกรางวัล" ORDER BY RAND() LIMIT 1';
            
            conn.query(selectLidQuery, (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send('Error selecting lottoid');
                }

                if (result.length === 0) {
                    return res.status(404).send('No lottoid found with result "ไม่ถูกรางวัล"');
                }

                const randomLid = result[0].lottoid;

                // อัปเดตแถวที่สุ่มเลือกด้วยผลลัพธ์ใหม่
                const updateQuery = 'UPDATE numbers_lotto SET result = ? WHERE lottoid = ?';
                conn.query(updateQuery, [newResult, randomLid], (err, updateResult) => {
                    if (err) {
                        console.log(err);
                        return res.status(400).send('Error updating result');
                    }

                    res.status(200).send(`Updated lottoid ${randomLid} with result ${newResult}`);
                });
            });
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send('Server error');
    }
});

router.get('/searchnumber',(req, res) => {
    try {
        // ตรวจสอบว่ามี query parameter `number` หรือไม่
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({ error: 'Missing `number` query parameter' });
        }

        // สร้าง query เพื่อค้นหาหมายเลขที่ระบุด้วยการจับคู่บางส่วน
        const query = 'SELECT * FROM numbers_lotto WHERE number LIKE ?';
        const searchTerm = `%${number}%`; // ค้นหาหมายเลขที่มีค่าของ `number` อยู่ภายใน

        conn.query(query, [searchTerm], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'An error occurred while searching for the number' });
            }

            if (results.length === 0) {
                // ไม่มีข้อมูลที่ตรงกับหมายเลขที่ค้นหา
                return res.status(404).json({ message: 'Number not found' });
            }

            // ส่งข้อมูลที่ค้นพบในรูปแบบ JSON
            res.status(200).json(results);
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred' });
    }
});

router.get('/count-lottoid-with-uid',(req, res) => {
    try {
        // สร้าง query เพื่อนับจำนวน lottoid ที่มี uid_fk ไม่เป็น null
        const query = 'SELECT COUNT(lottoid) AS lottoid_count FROM numbers_lotto WHERE uid_fk IS NOT NULL';

        conn.query(query, (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'An error occurred while counting lottoid' });
            }

            // ส่งจำนวนที่นับได้ในรูปแบบ JSON
            res.status(200).json({ lottoid_count: results[0].lottoid_count });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred' });
    }
});
router.put('/update-uid-fk', (req, res) => {
    try {
        const { lottoid, uid_fk } = req.body;

        if (!lottoid || !uid_fk) {
            return res.status(400).json({ error: 'Missing `lottoid` or `uid_fk` in request body' });
        }

        // เริ่มต้น transaction
        conn.beginTransaction(err => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'An error occurred while starting transaction' });
            }

            const updateLottoQuery = `
                UPDATE numbers_lotto nl
                SET nl.uid_fk = ?
                WHERE nl.lottoid = ?;
            `;

            conn.query(updateLottoQuery, [uid_fk, lottoid], (err, result) => {
                if (err) {
                    return conn.rollback(() => {
                        console.error(err);
                        res.status(500).json({ error: 'An error occurred while updating uid_fk' });
                    });
                }

                if (result.affectedRows === 0) {
                    return conn.rollback(() => {
                        res.status(404).json({ message: 'No record found with the specified lottoid' });
                    });
                }

                const selectWalletQuery = `
                    SELECT wallet
                    FROM users_lotto
                    WHERE uid = ?;
                `;

                conn.query(selectWalletQuery, [uid_fk], (err, results) => {
                    if (err) {
                        return conn.rollback(() => {
                            console.error(err);
                            res.status(500).json({ error: 'An error occurred while retrieving wallet data' });
                        });
                    }

                    if (results.length === 0) {
                        return conn.rollback(() => {
                            res.status(404).json({ message: 'No user found with the specified uid' });
                        });
                    }

                    const currentWallet = results[0].wallet;

                    if (currentWallet < 80) {
                        return conn.rollback(() => {
                            res.status(400).json({ message: 'กรุณาเติมเงิน' });
                        });
                    }

                    const newWallet = currentWallet - 80;

                    const updateWalletQuery = `
                        UPDATE users_lotto
                        SET wallet = ?
                        WHERE uid = ?;
                    `;

                    conn.query(updateWalletQuery, [newWallet, uid_fk], (err, result) => {
                        if (err) {
                            return conn.rollback(() => {
                                console.error(err);
                                res.status(500).json({ error: 'An error occurred while updating wallet' });
                            });
                        }

                        conn.commit(err => {
                            if (err) {
                                return conn.rollback(() => {
                                    console.error(err);
                                    res.status(500).json({ error: 'An error occurred while committing transaction' });
                                });
                            }

                            res.status(200).json({ message: `Updated lottoid ${lottoid} with uid_fk ${uid_fk} and wallet updated to ${newWallet}` });
                        });
                    });
                });
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/get-first', (req, res) => {
    const query = `
        SELECT * 
        FROM numbers_lotto 
        WHERE result IN ('รางวัลที่ 1', 'รางวัลที่ 2', 'รางวัลที่ 3', 'รางวัลที่ 4', 'รางวัลที่ 5')
    `;

    conn.query(query, (err, results) => {
        if (err) {
            console.log('Error fetching data:', err);
            return res.status(500).json({ error: 'Database query error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'No matching records found' });
        }

        res.status(200).json(results);
    });
});