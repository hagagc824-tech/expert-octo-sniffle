const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const API_GOC = "https://merchant-query-bright-walter.trycloudflare.com/api/bcr";

// Hàm xử lý logic phân tích và phân loại bàn
const processData = (rawData) => {
    const tables = {};

    // Chuẩn hóa dữ liệu đầu vào thành mảng
    let listData = [];
    if (Array.isArray(rawData)) {
        listData = rawData;
    } else if (rawData && typeof rawData === 'object') {
        listData = rawData.data || rawData.list || rawData.results || [];
    }

    listData.forEach((item) => {
        // Nhận diện mã bàn/tên bàn từ API gốc
        const tableName = item.tableName || item.tableId || item.tableNameEN || "Bàn Mặc Định";
        
        if (!tables[tableName]) {
            tables[tableName] = {
                ban: tableName,
                cau: [], 
                ti_le_nha_cai: "0%",
                ti_le_nha_con: "0%",
                ket_qua_phien_truoc: null
            };
        }

        // Đẩy kết quả thực tế (B/P/T) vào mảng cầu
        if (item.result) {
            tables[tableName].cau.push(item.result);
        }
    });

    // Tính toán chi tiết dữ liệu thực cho từng bàn
    Object.keys(tables).forEach((key) => {
        const currentTable = tables[key];
        const totalGames = currentTable.cau.length;

        if (totalGames > 0) {
            // Lọc đếm chính xác số phiên xuất hiện thực tế (Banker / Player)
            const bankerCount = currentTable.cau.filter(c => c === 'B' || c === 'Banker' || c === 'banker').length;
            const playerCount = currentTable.cau.filter(c => c === 'P' || c === 'Player' || c === 'player').length;

            currentTable.ti_le_nha_cai = `${((bankerCount / totalGames) * 100).toFixed(1)}%`;
            currentTable.ti_le_nha_con = `${((playerCount / totalGames) * 100).toFixed(1)}%`;
            
            // Lấy phần tử cuối cùng làm kết quả phiên trước
            currentTable.ket_qua_phien_truoc = currentTable.cau[totalGames - 1];
        }
    });

    return Object.values(tables);
};

// Route chính cung cấp dữ liệu cho Tool/Bot của bạn
app.get('/api/tables', async (req, res) => {
    try {
        const response = await axios.get(API_GOC, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            },
            timeout: 7000
        });
        
        const processed = processData(response.data);
        res.json({
            success: true,
            total_tables: processed.length,
            data: processed
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi kết nối hoặc xử lý dữ liệu từ API gốc",
            error: error.message
        });
    }
});

// Cấu hình PORT động để tương thích với Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API đang chạy mượt mà tại port ${PORT}`);
});
