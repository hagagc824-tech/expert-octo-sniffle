const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const API_GOC = "https://merchant-query-bright-walter.trycloudflare.com/api/bcr";

const processData = (rawData) => {
    const tables = {};
    let listData = [];
    if (Array.isArray(rawData)) {
        listData = rawData;
    } else if (rawData && typeof rawData === 'object') {
        listData = rawData.data || rawData.list || rawData.results || [];
    }

    listData.forEach((item) => {
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

        if (item.result) {
            tables[tableName].cau.push(item.result);
        }
    });

    Object.keys(tables).forEach((key) => {
        const currentTable = tables[key];
        const totalGames = currentTable.cau.length;

        if (totalGames > 0) {
            const bankerCount = currentTable.cau.filter(c => c === 'B' || c === 'Banker' || c === 'banker').length;
            const playerCount = currentTable.cau.filter(c => c === 'P' || c === 'Player' || c === 'player').length;

            currentTable.ti_le_nha_cai = `${((bankerCount / totalGames) * 100).toFixed(1)}%`;
            currentTable.ti_le_nha_con = `${((playerCount / totalGames) * 100).toFixed(1)}%`;
            
            currentTable.ket_qua_phien_truoc = currentTable.cau[totalGames - 1];
        }
    });

    return tables;
};

// 1. Link xem toàn bộ bàn
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

// 2. Link xem riêng từng bàn (Đã sửa logic tìm kiếm thông minh)
app.get('/api/tables/:tableName', async (req, res) => {
    try {
        const targetTable = req.params.tableName.toLowerCase().trim(); 
        
        const response = await axios.get(API_GOC, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 7000
        });
        const processedMap = processData(response.data);
        const allTableNames = Object.keys(processedMap);

        // Tìm kiếm xem có tên bàn nào khớp hoặc chứa ký tự nhập vào không
        const exactKey = allTableNames.find(name => name.toLowerCase() === targetTable);
        const fuzzyKey = exactKey || allTableNames.find(name => name.toLowerCase().includes(targetTable));

        if (fuzzyKey && processedMap[fuzzyKey]) {
            res.json({
                success: true,
                data: processedMap[fuzzyKey]
            });
        } else {
            // Nếu không tìm thấy, trả về danh sách tên bàn thực tế đang có để biết đường gõ
            res.status(404).json({
                success: false,
                message: `Không tìm thấy dữ liệu cho bàn: ${req.params.tableName}`,
                Goi_Y_Cac_Ban_Dang_Hoat_Dong: allTableNames
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});
