























const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const API_GOC = "https://merchant-query-bright-walter.trycloudflare.com/api/bcr";

// Hàm bóc tách dữ liệu chuẩn theo cấu trúc API thực tế của bạn
const processData = (rawData) => {
    const tables = {};
    
    // API gốc của bạn trả về dạng { code: 200, data: [...] }
    const listData = rawData && rawData.data ? rawData.data : [];

    listData.forEach((item) => {
        // Lấy chính xác mã bàn từ trường "ban" trong API gốc
        const tableName = item.ban ? String(item.ban).trim() : null;
        if (!tableName) return;

        // Chuyển chuỗi kết quả "BTPBP..." thành mảng ['B', 'T', 'P', 'B', 'P']
        let stringResults = item.results || "";
        const arrayCau = stringResults.split('');

        // Khởi tạo object bàn
        tables[tableName] = {
            ban: tableName,
            cau: arrayCau, 
            ti_le_nha_cai: "0%",
            ti_le_nha_con: "0%",
            ket_qua_phien_truoc: null
        };

        const totalGames = arrayCau.length;
        if (totalGames > 0) {
            // Đếm số lần xuất hiện thực tế dựa theo ký tự viết tắt
            const bankerCount = arrayCau.filter(c => c === 'B').length;
            const playerCount = arrayCau.filter(c => c === 'P').length;

            tables[tableName].ti_le_nha_cai = `${((bankerCount / totalGames) * 100).toFixed(1)}%`;
            tables[tableName].ti_le_nha_con = `${((playerCount / totalGames) * 100).toFixed(1)}%`;
            
            // Ký tự cuối cùng của chuỗi chính là kết quả phiên trước
            tables[tableName].ket_qua_phien_truoc = arrayCau[totalGames - 1];
        }
    });

    return tables;
};

// 1. Endpoint lấy toàn bộ các bàn
app.get('/api/tables', async (req, res) => {
    try {
        const response = await axios.get(API_GOC, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 7000
        });
        const processedMap = processData(response.data);
        
        res.json({
            success: true,
            total_tables: Object.keys(processedMap).length,
            data: Object.values(processedMap)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Endpoint lấy chi tiết riêng từng bàn (Không phân biệt hoa thường)
app.get('/api/tables/:tableName', async (req, res) => {
    try {
        const targetTable = req.params.tableName.toLowerCase().trim(); 
        
        const response = await axios.get(API_GOC, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 7000
        });
        const processedMap = processData(response.data);
        const allTableNames = Object.keys(processedMap);

        // Tìm kiếm so khớp bàn
        const exactKey = allTableNames.find(name => name.toLowerCase() === targetTable);

        if (exactKey && processedMap[exactKey]) {
            res.json({
                success: true,
                data: processedMap[exactKey]
            });
        } else {
            res.status(404).json({
                success: false,
                message: `Không tìm thấy dữ liệu cho bàn: ${req.params.tableName}`,
                danh_sach_ban_hien_co: allTableNames
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Hệ thống chạy mượt tại port ${PORT}`);
});
