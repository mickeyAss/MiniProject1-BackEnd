var express = require('express');
var router = express.Router();
var conn = require('../dbconnect')

module.exports = router;

router.post("/insertnumber", async(req,res) => {
    conn.query('INSERT INTO `number_lotto` (`number`) VALUES (?)',
        [req.body.number],
        function(err,result){
            res.json(result);
        }
    );
});

router.delete("/deletenumber", (req, res) => {
    conn.query('DELETE FROM `number_lotto`', (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "An error occurred while deleting records" });
        } else if (result.affectedRows === 0) {
            // ไม่มีข้อมูลให้ลบ
            res.status(404).json({ message: "No records found to delete" });
        } else {
            // ลบข้อมูลสำเร็จ
            res.status(200).json({ message: "Delete successfully" });
        }
    });
});

router.get("/getnumber", async (req, res) => {
    try {
        // เรียงลำดับจาก รางวัลที่ 1 ถึง รางวัลที่ 5
        const query = `
            SELECT * 
            FROM number_lotto 
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

router.get("/getallnumber", async (req, res) => {
    try {
        // เรียกข้อมูลทั้งหมดจากตาราง number_lotto
        conn.query('SELECT * FROM number_lotto', (err, results) => {
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

router.put('/update-result', async (req, res) => {
    try {
        const newResult = req.body.result; 
        const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' '); // แปลงวันที่ให้เป็นรูปแบบที่ MySQL รองรับ

        const checkExistingQuery = `
            SELECT COUNT(*) AS count
            FROM number_lotto 
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

            const selectLidQuery = 'SELECT lottoid FROM number_lotto WHERE result = "ไม่ถูกรางวัล" ORDER BY RAND() LIMIT 1';
            
            conn.query(selectLidQuery, (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(400).send('Error selecting lottoid');
                }

                if (result.length === 0) {
                    return res.status(404).send('No lottoid found with result "ไม่ถูกรางวัล"');
                }

                const randomLid = result[0].lottoid;

                // อัปเดตวันที่ในทุกแถวของตาราง
                const updateAllQuery = 'UPDATE number_lotto SET update_date = ?';
                conn.query(updateAllQuery, [currentDate], (err, updateAllResult) => {
                    if (err) {
                        console.log(err);
                        return res.status(400).send('Error updating all rows with the current date');
                    }

                    // อัปเดตแถวที่สุ่มเลือกด้วยผลลัพธ์ใหม่และวันที่
                    const updateQuery = 'UPDATE number_lotto SET result = ?, update_date = ? WHERE lottoid = ?';
                    conn.query(updateQuery, [newResult, currentDate, randomLid], (err, updateResult) => {
                        if (err) {
                            console.log(err);
                            return res.status(400).send('Error updating result');
                        }

                        res.status(200).send(`Updated lottoid ${randomLid} with result ${newResult} and update date ${currentDate}`);
                    });
                });
            });
        });
    } catch (err) {
        console.log(err);
        return res.status(500).send('Server error');
    }
});

router.get('/searchnumber', async (req, res) => {
    try {
        // ตรวจสอบว่ามี query parameter `number` หรือไม่
        const { number } = req.query;

        if (!number) {
            return res.status(400).json({ error: 'Missing `number` query parameter' });
        }

        // สร้าง query เพื่อค้นหาหมายเลขที่ระบุ
        const query = 'SELECT * FROM number_lotto WHERE number = ?';

        conn.query(query, [number], (err, results) => {
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

