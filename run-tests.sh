#!/bin/bash

echo "🧪 CaddateApp Test Suite Başlatılıyor..."
echo "========================================"

# Backend testleri
echo "📦 Backend testleri çalıştırılıyor..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "📥 Backend dependencies yükleniyor..."
    npm install
fi

echo "🔧 Backend testleri..."
npm test

if [ $? -eq 0 ]; then
    echo "✅ Backend testleri başarılı!"
else
    echo "❌ Backend testleri başarısız!"
    exit 1
fi

# Frontend testleri
echo ""
echo "📱 Frontend testleri çalıştırılıyor..."
cd ..

if [ ! -d "node_modules" ]; then
    echo "📥 Frontend dependencies yükleniyor..."
    npm install
fi

echo "🔧 Frontend testleri..."
npm test

if [ $? -eq 0 ]; then
    echo "✅ Frontend testleri başarılı!"
else
    echo "❌ Frontend testleri başarısız!"
    exit 1
fi

echo ""
echo "🎉 Tüm testler başarılı!"
echo "📊 Test coverage raporları:"
echo "   - Backend: backend/coverage/index.html"
echo "   - Frontend: coverage/index.html"
